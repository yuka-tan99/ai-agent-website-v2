// app/api/plan/route.ts
import { NextResponse } from "next/server";
import { searchKBServer } from "@/lib/rag";
import { geminiTextModel, GEMINI_SAFETY } from "@/lib/gemini";
import { supabaseServer } from "@/lib/supabaseServer";

// Optional shallow public-profile summarizer
let collectSnapshots: undefined | ((urls: string[]) => Promise<any[]>);
let summarizeSnapshots: undefined | ((snaps: any[]) => string);
try {
  // @ts-ignore
  ({ collectSnapshots, summarizeSnapshots } = require("@/lib/publicScrape"));
} catch {}

export const runtime = "nodejs";

type Persona = Record<string, any>;

/* -------------------- helpers -------------------- */
const asArray = (v: any): string[] => (Array.isArray(v) ? v : v ? [v] : []);

function isOnboardingComplete(answers: Record<string, any> | null | undefined): boolean {
  if (!answers || typeof answers !== "object") return false;
  // minimum set you consider “complete” — tweak if needed
  const required = ["creatingAs", "identity", "goal", "platforms", "topics", "reach", "timeAvailable"];
  return required.every((k) => {
    const v = (answers as any)[k];
    return Array.isArray(v) ? v.length > 0 : typeof v === "string" ? v.trim().length > 0 : !!v;
  });
}

/** ---------- Normalization & de-dup helpers ---------- */
const PLATFORM_CANON: Record<string, string> = {
  yt: "YouTube", youtube: "YouTube",
  ig: "Instagram", instagram: "Instagram",
  tiktok: "TikTok", "tik tok": "TikTok",
  twitter: "Twitter/X", x: "Twitter/X", "twitter/x": "Twitter/X", tw: "Twitter/X",
  linkedin: "LinkedIn", li: "LinkedIn",
  fb: "Facebook", facebook: "Facebook",
  pinterest: "Pinterest",
  twitch: "Twitch",
};

function canonPlatform(label: string = ""): string {
  const key = label.trim().toLowerCase();
  return PLATFORM_CANON[key] || PLATFORM_CANON[key.replace(/[^\w]/g, "")] || label.trim().replace(/\b\w/g, (c) => c.toUpperCase());
}

function splitBullets(s: string): string[] {
  if (!s) return [];
  const raw = s.replace(/\r/g, "").split("\n");
  const lines = raw.map((l) => l.replace(/^\s*[-•]\s?/, "").trim()).filter(Boolean);
  return Array.from(new Set(lines));
}

function joinBullets(lines: string[]): string {
  const uniq = Array.from(new Set(lines.map((l) => l.trim()).filter(Boolean)));
  return uniq.length ? "- " + uniq.join("\n- ") : "";
}

function uniqStrings(arr?: string[]): string[] {
  if (!Array.isArray(arr)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of arr) {
    const key = (v || "").trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(v);
  }
  return out;
}

function uniqObjectsBy<T>(arr: T[] | undefined, keyFn: (t: T) => string): T[] {
  if (!Array.isArray(arr)) return [];
  const seen = new Set<string>();
  const out: T[] = [];
  for (const it of arr) {
    const k = keyFn(it).toLowerCase().trim();
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(it);
  }
  return out;
}

function normalizePlatformStrategies(list: { platform: string; strategy: string }[] | undefined) {
  if (!Array.isArray(list) || list.length === 0) return [];
  const map = new Map<string, string[]>();
  for (const item of list) {
    const plat = canonPlatform(item.platform);
    const bullets = splitBullets(item.strategy);
    const prev = map.get(plat) || [];
    map.set(plat, Array.from(new Set([...prev, ...bullets])));
  }
  return Array.from(map.entries()).map(([platform, bullets]) => ({ platform, strategy: joinBullets(bullets) }));
}

function normalizeIssueAlias(raw: string): string {
  if (
    /not sure (what|which).*(post|content)/i.test(raw) ||
    /what to post/i.test(raw) ||
    /content to make next/i.test(raw) ||
    /idea(s)?\b.*(stuck|unsure|don.?t know)/i.test(raw)
  ) return "Not sure what content to make next";
  if (/inconsisten|consisten|schedule|routine/i.test(raw)) return "Inconsistent posting";
  if (/hook|intro|open/i.test(raw)) return "Weak hooks";
  if (/camera|on-?camera|awkward|shy/i.test(raw)) return "On-camera discomfort";
  return raw.replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim().replace(/\b\w/g, (c) => c.toUpperCase());
}

function normalizeRoadblocks(list: { issue: string; solution: string }[] | undefined) {
  if (!Array.isArray(list)) return [];
  const byIssue = new Map<string, string[]>();
  for (const rb of list) {
    const canon = normalizeIssueAlias(rb.issue || "");
    const bullets = splitBullets(rb.solution || (rb as any).solution || "");
    const prev = byIssue.get(canon) || [];
    byIssue.set(canon, Array.from(new Set([...prev, ...bullets])));
  }
  return Array.from(byIssue.entries()).map(([issue, bullets]) => ({ issue, solution: joinBullets(bullets) }));
}

function normalizeAnswers(p: Persona) {
  return {
    creatingAs: asArray(p.creatingAs).join(", "),
    identity: asArray(p.identity).join(", "),
    goals: asArray(p.goal),
    platforms: asArray(p.platforms || p.platformFocus || p.focusPlatforms),
    topics: asArray(p.topics),
    trends: asArray(p.trends),
    creativity: asArray(p.creativity),
    reach: asArray(p.reach),
    face: Array.isArray(p.face) ? p.face.join(", ") : p.face || "",
    camera: Array.isArray(p.camera) ? p.camera.join(", ") : p.camera || "",
    stuckReason: asArray(p.stuckReason),
    monetizationMethods: asArray(p.monetizationMethods),
    timeAvailable: Array.isArray(p.timeAvailable) ? p.timeAvailable.join(", ") : p.timeAvailable || "",
  };
}

function deriveSignals(a: ReturnType<typeof normalizeAnswers>) {
  const wantsFace = a.face.toLowerCase().includes("yes");
  const cam = a.camera.toLowerCase();
  const cameraComfort =
    cam.includes("love") ? "high" :
    cam.includes("okay") ? "medium" :
    cam.includes("awk") || cam.includes("no") ? "low" : "unknown";

  const id = a.identity.toLowerCase();
  const stage =
    id.includes("zero") ? "new" :
    id.includes("small") ? "early" :
    id.includes("stuck") ? "stalled" :
    id.includes("large") ? "scaled" :
    id.includes("pivot") ? "pivot" : "unknown";

  const platforms = a.platforms.length > 0 ? a.platforms : ["TikTok", "Instagram", "YouTube", "Pinterest"];

  return {
    stage, wantsFace, cameraComfort, platforms,
    goals: a.goals,
    audienceHints: a.reach,
    contentInterests: [...a.topics, ...a.trends, ...a.creativity],
    userPainPoints: a.stuckReason,
  };
}

function chartSeeds(sig: ReturnType<typeof deriveSignals>) {
  const base = sig.platforms;
  const slice = base.length ? Math.round(100 / base.length) : 25;
  const platform_focus = base.map((name, i) => ({ name, value: i === 0 ? 100 - slice * (base.length - 1) : slice }));
  const posting_cadence = [
    { name: "Mon", posts: sig.stage === "new" ? 2 : 1 },
    { name: "Tue", posts: sig.stage === "new" ? 2 : 1 },
    { name: "Wed", posts: sig.stage === "new" ? 2 : 1 },
    { name: "Thu", posts: sig.stage === "new" ? 2 : 1 },
    { name: "Fri", posts: sig.stage === "new" ? 3 : 2 },
    { name: "Sat", posts: 1 },
    { name: "Sun", posts: 1 },
  ];
  const content_type_mix = [
    { name: "Educational", value: sig.contentInterests.some((s) => /education|tips|how|coaching/i.test(s)) ? 45 : 30 },
    { name: "Entertainment", value: 30 },
    { name: "Personal", value: 25 },
  ];
  const pillar_allocation = [
    { name: "Pillar A", value: 40 },
    { name: "Pillar B", value: 35 },
    { name: "Pillar C", value: 25 },
  ];
  return { platform_focus, posting_cadence, content_type_mix, pillar_allocation };
}

function coercePlanShape(input: any) {
  const defaults = {
    profile_summary: "Unable to generate right now.",
    overall_strategy: "- Post daily short-form.\n- Optimize hooks.\n- Review weekly.",
    platform_strategies: [] as { platform: string; strategy: string }[],
    roadblocks: [] as { issue: string; solution: string }[],
    next_steps: ["Day 1–3: Define 3 pillars", "Day 4–7: Batch 5 posts", "Day 8–14: Post daily, review"],
    charts: {
      platform_focus: [{ name: "TikTok", value: 50 }, { name: "Instagram", value: 30 }, { name: "YouTube", value: 20 }],
      posting_cadence: [
        { name: "Mon", posts: 2 }, { name: "Tue", posts: 2 }, { name: "Wed", posts: 2 },
        { name: "Thu", posts: 2 }, { name: "Fri", posts: 3 }, { name: "Sat", posts: 1 }, { name: "Sun", posts: 1 },
      ],
      content_type_mix: [{ name: "Educational", value: 50 }, { name: "Entertainment", value: 30 }, { name: "Personal", value: 20 }],
      pillar_allocation: [{ name: "Pillar A", value: 40 }, { name: "Pillar B", value: 35 }, { name: "Pillar C", value: 25 }],
    },
  };
  if (!input || typeof input !== "object") return defaults;
  const out: any = { ...defaults, ...input };
  const ensureArr = (v: any, fb: any[]) => (Array.isArray(v) ? v : fb);
  out.platform_strategies = ensureArr(out.platform_strategies, defaults.platform_strategies);
  out.roadblocks = ensureArr(out.roadblocks, defaults.roadblocks);
  out.next_steps = ensureArr(out.next_steps, defaults.next_steps);
  out.charts ||= defaults.charts;
  out.charts.platform_focus   = ensureArr(out.charts.platform_focus,   defaults.charts.platform_focus);
  out.charts.posting_cadence  = ensureArr(out.charts.posting_cadence,  defaults.charts.posting_cadence);
  out.charts.content_type_mix = ensureArr(out.charts.content_type_mix, defaults.charts.content_type_mix);
  out.charts.pillar_allocation= ensureArr(out.charts.pillar_allocation,defaults.charts.pillar_allocation);
  return out;
}

function inferPlatforms(persona: Persona): string[] {
  const blob = [persona.platforms, persona.goal, persona.topics, persona.creatingAs].flat().filter(Boolean).join(" ").toLowerCase();
  const list: string[] = [];
  if (blob.includes("youtube")) list.push("YouTube");
  if (blob.includes("instagram")) list.push("Instagram");
  if (blob.includes("tiktok")) list.push("TikTok");
  if (blob.includes("pinterest")) list.push("Pinterest");
  if (blob.includes("twitter") || blob.includes("x")) list.push("Twitter/X");
  if (blob.includes("linkedin")) list.push("LinkedIn");
  if (list.length === 0) list.push("TikTok", "Instagram");
  return Array.from(new Set(list)).slice(0, 4);
}

function fillFromPersonaIfMissing(plan: any, persona: Persona) {
  const platforms = inferPlatforms(persona);
  if (!Array.isArray(plan.platform_strategies) || plan.platform_strategies.length === 0) {
    plan.platform_strategies = platforms.map((p) => ({
      platform: p,
      strategy: p.toLowerCase().includes("youtube")
        ? "- 1 long-form/week + 2 Shorts.\n- Title = outcome + timeframe.\n- First 2s show the result."
        : "- 1–2 posts/day.\n- Hook in 2s.\n- 3 pillars. Weekly review.",
    }));
  } else {
    const have = new Set(plan.platform_strategies.map((s: any) => s.platform));
    platforms.forEach((p) => {
      if (!have.has(p)) {
        plan.platform_strategies.push({
          platform: p,
          strategy: "- 1–2 posts/day.\n- Tight hooks.\n- Batch record.\n- Analyze weekly.",
        });
      }
    });
  }
  if (!Array.isArray(plan.roadblocks) || plan.roadblocks.length === 0) {
    plan.roadblocks = [
      { issue: "Inconsistent posting", solution: "- Schedule 14-day cadence.\n- Batch 5 videos today.\n- Post at the same hour." },
      { issue: "Weak hooks",          solution: "- 10 hook variations per idea.\n- Lead with outcome or tension.\n- Cut first 2 seconds if slow." },
    ];
  }
  return plan;
}

function mergeRoadblocksFromPersona(plan: any, sig: ReturnType<typeof deriveSignals>) {
  const mapped = (issue: string) => {
    if (/hook|intro|open/i.test(issue)) return { issue: "Weak hooks", solution: "- Write 10 hook variants per idea\n- Lead with outcome/tension in 2s\n- Cut first 2s if no action\n- Test 3 thumbnails/titles weekly" };
    if (/inconsistent|consisten|schedule|routine/i.test(issue)) return { issue: "Inconsistent posting", solution: "- Batch 5–10 clips every Sun (90 min)\n- Set daily 20-min publish window\n- Track streak; reset weekly targets" };
    if (/idea|what to post|uninspired/i.test(issue)) return { issue: "Not sure what to post", solution: "- Define 3 pillars from interests\n- Save 20 reference videos this week\n- Turn each into 3 remixes (A/B hooks)\n- Keep an ideas doc; add 5/day" };
    if (/camera|on-camera|awkward|shy/i.test(issue)) return { issue: "On-camera discomfort", solution: "- Start with VO + b-roll for 2 weeks\n- Record 3 selfie drafts/day, publish 1\n- Script beats: Hook → 3 points → CTA\n- Eye-level framing + natural light" };
    return { issue: issue || "Execution gaps", solution: "- Set weekly targets (posts, watch time)\n- Duplicate top 10% patterns\n- Remove low-ROI tasks for 14 days\n- End each session with next 3 actions" };
  };
  const userRB = sig.userPainPoints?.map(mapped) || [];
  const aiRB = Array.isArray(plan.roadblocks) ? plan.roadblocks : [];
  const merged = [...userRB, ...aiRB];
  plan.roadblocks = merged.length ? merged : [{ issue: "Inconsistent posting", solution: "- Batch on Sundays\n- Daily publish window\n- Track streak" }];
  return plan;
}

/* -------------------- prompt -------------------- */
const DASHBOARD_PROMPT = `
You are an expert social growth strategist and dashboard designer.
Use ALL relevant answers explicitly. If a field is missing, state one assumption once in the Profile Summary.

PLATFORM LABELS (use EXACTLY these; each at most once if relevant):
YouTube, Instagram, TikTok, Twitter/X, LinkedIn, Facebook, Pinterest, Twitch

OUTPUT (JSON ONLY; no markdown fences):
{
  "profile_summary": "1 concise paragraph citing brand type, stage, goals, camera comfort, platform focus.",
  "overall_strategy": "- 4–8 concrete bullets tied to answers.",
  "platform_strategies": [{ "platform": "TikTok", "strategy": "- 3–6 bullets customized to persona" }],
  "roadblocks": [{ "issue": "string", "solution": "- step1\\n- step2\\n- step3" }],
  "next_steps": ["Day 1–3 ...", "Day 4–7 ...", "Week 2 ..."],
  "audience_blueprint": "Target segments and why, in 4–8 lines.",
  "content_pillars": ["Pillar A","Pillar B","Pillar C"],
  "hook_swipefile": ["Hook 1","Hook 2","Hook 3"],
  "cadence_plan": "Specific weekly schedule counts, aligned to camera comfort and stage.",
  "hashtag_seo": ["keyword 1","keyword 2"],
  "collaboration_ideas": ["idea 1","idea 2"],
  "distribution_playbook": ["cross-posting, repost cadence, newsletter, community drops"],
  "experiments": ["A/B idea 1","A/B idea 2"],
  "timeline_30_60_90": { "day_0_30": ["..."], "day_31_60": ["..."], "day_61_90": ["..."] },
  "weekly_routine": ["Mon: ...","Tue: ...","Fri: Review ..."],
  "kpis": { "weekly_posts": number, "target_view_rate_pct": number, "target_followers_30d": number },
  "charts": {
    "platform_focus": [{ "name": "TikTok", "value": 40 }],
    "posting_cadence": [{ "name": "Mon", "posts": 2 }],
    "content_type_mix": [{ "name": "Educational", "value": 50 }],
    "pillar_allocation": [{ "name": "Pillar A", "value": 40 }]
  }
}
STRICT RULES:
- Use platform labels exactly as listed; do not invent variants.
- Output each platform at most once in platform_strategies.
- Roadblocks must be unique by issue; do not repeat with casing variations.
- Tone: direct, no fluff.
`;

/* -------------------- route -------------------- */
export async function POST() {
  try {
    // Require signed-in user
    const sb = await supabaseServer();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Find latest onboarding session for this user
    const { data: sessions, error: sErr } = await sb
      .from("onboarding_sessions")
      .select("answers, links")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(1);

    if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 });

    const answersRaw = sessions?.[0]?.answers || null;
    const linksArr: string[] = Array.isArray(sessions?.[0]?.links) ? sessions![0].links : [];

    if (!isOnboardingComplete(answersRaw)) {
      return NextResponse.json({ error: "Onboarding incomplete" }, { status: 400 });
    }

    // RAG text
    const persona: Persona = answersRaw || {};
    const forQuery = [persona.goal, persona.creatingAs, persona.identity, persona.topics, persona.reach]
      .flat()
      .filter(Boolean)
      .join(" | ") || "social growth strategy basics";

    let kbText = "";
    try {
      const kb = await searchKBServer(forQuery, 6);
      kbText = Array.isArray(kb) ? kb.map((k) => k.content).join("\n---\n") : "";
    } catch (e) {
      console.warn("[api/plan] RAG lookup failed:", (e as any)?.message);
    }

    // Links snapshot (optional)
    let linkSummary = "";
    if (linksArr.length && collectSnapshots && summarizeSnapshots) {
      try {
        const snaps = await collectSnapshots(linksArr);
        linkSummary = summarizeSnapshots(snaps);
      } catch (e) {
        console.warn("[api/plan] links snapshot failed:", (e as any)?.message);
      }
    }

    // Prep prompt
    const answers = normalizeAnswers(persona);
    const signals = deriveSignals(answers);
    const seeds = chartSeeds(signals);

    const prompt = `${DASHBOARD_PROMPT}

### RAW_ANSWERS
${JSON.stringify(answers, null, 2)}

### DERIVED_SIGNALS
${JSON.stringify(signals, null, 2)}

### CHART_SEEDS
${JSON.stringify(seeds, null, 2)}

### OPTIONAL_KB
${kbText || "(none)"}

### PUBLIC_LINKS_INSIGHTS
${linksArr.length ? linkSummary : "(no links provided)"}
`;

    // ---------- CALL GEMINI ----------
    const model = geminiTextModel();
    let raw = "";
    try {
      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        safetySettings: GEMINI_SAFETY,
        generationConfig: {
          temperature: 0.2,
          topP: 0.9,
          maxOutputTokens: 1400,
          responseMimeType: "application/json",
        },
      });
      raw = (result.response?.text?.() || "").trim();
    } catch (e: any) {
      console.warn("[api/plan] gemini error:", e?.message || e);
      raw = "";
    }

    // ---------- CLEAN + PARSE (with repair) ----------
    const cleaned = (raw || "")
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```$/i, "")
      .trim();

    const sliceToLargestJson = (t: string) => {
      const s = t.indexOf("{");
      const e = t.lastIndexOf("}");
      return s >= 0 && e > s ? t.slice(s, e + 1) : t;
    };

    function braceRepair(t: string): string {
      const s = sliceToLargestJson(t);
      let openCurly = 0, openSquare = 0;
      let out = "";
      for (const ch of s) {
        if (ch === "{") openCurly++;
        if (ch === "}") openCurly = Math.max(0, openCurly - 1);
        if (ch === "[") openSquare++;
        if (ch === "]") openSquare = Math.max(0, openSquare - 1);
        out += ch;
      }
      out += "]".repeat(openSquare);
      out += "}".repeat(openCurly);
      return out;
    }

    const tryParse = (t: string) => { try { return JSON.parse(t); } catch { return null; } };

    let parsed: any = null;

    if (!cleaned) {
      console.warn("[api/plan] empty model output; using defaults");
    } else {
      parsed = tryParse(sliceToLargestJson(cleaned));
      if (!parsed) parsed = tryParse(braceRepair(cleaned));
      if (!parsed) {
        try {
          const repairPrompt = `
Return a VALID JSON OBJECT ONLY that matches this shape. Fix any truncation.

<<<JSON_CANDIDATE
${cleaned.slice(0, 12000)}
JSON_CANDIDATE>>>
          `.trim();

          const repairResult = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: repairPrompt }] }],
            safetySettings: GEMINI_SAFETY,
            generationConfig: { temperature: 0.0, maxOutputTokens: 900, responseMimeType: "application/json" },
          });

          const repairedRaw = (repairResult.response?.text?.() || "").trim();
          const repairedClean = repairedRaw
            .replace(/^```json\s*/i, "")
            .replace(/^```\s*/i, "")
            .replace(/```$/i, "")
            .trim();

          parsed = tryParse(sliceToLargestJson(repairedClean));
        } catch (e: any) {
          console.warn("[api/plan] repair call failed:", e?.message || e);
        }
      }
      if (!parsed) console.warn("[api/plan] JSON parse failed; continuing with defaults. head:", cleaned.slice(0, 180));
    }

    // ---------- COERCE + NORMALIZE ----------
    let plan = coercePlanShape(parsed);
    plan = fillFromPersonaIfMissing(plan, persona);
    plan = mergeRoadblocksFromPersona(plan, signals);

    plan.platform_strategies = normalizePlatformStrategies(plan.platform_strategies);
    plan.roadblocks          = normalizeRoadblocks(plan.roadblocks);
    plan.next_steps             = uniqStrings(plan.next_steps);
    plan.experiments            = uniqStrings(plan.experiments);
    plan.hashtag_seo            = uniqStrings(plan.hashtag_seo);
    plan.collaboration_ideas    = uniqStrings(plan.collaboration_ideas);
    plan.distribution_playbook  = uniqStrings(plan.distribution_playbook);
    plan.hook_swipefile         = uniqStrings(plan.hook_swipefile);
    plan.content_pillars        = uniqStrings(plan.content_pillars);

    if (plan?.charts?.platform_focus) {
      plan.charts.platform_focus = uniqObjectsBy(
        plan.charts.platform_focus.map((p: any) => ({ ...p, name: canonPlatform(p.name) })),
        (p: any) => p.name
      );
    }
    // const seeds = chartSeeds(deriveSignals(normalizeAnswers(persona)));
    plan.charts = {
      platform_focus:    plan.charts?.platform_focus?.length    ? plan.charts.platform_focus    : seeds.platform_focus,
      posting_cadence:   plan.charts?.posting_cadence?.length   ? plan.charts.posting_cadence   : seeds.posting_cadence,
      content_type_mix:  plan.charts?.content_type_mix?.length  ? plan.charts.content_type_mix  : seeds.content_type_mix,
      pillar_allocation: plan.charts?.pillar_allocation?.length ? plan.charts.pillar_allocation : seeds.pillar_allocation,
    };

    // ---------- Save plan ----------
    try {
      await sb.from("reports").upsert({
        user_id: user.id,
        plan,
        updated_at: new Date().toISOString(),
      });
    } catch (e) {
      console.warn("[api/plan] save failed:", (e as any)?.message);
    }

    return NextResponse.json(plan);
  } catch (err: any) {
    console.error("[api/plan] error:", err?.message || err);
    return NextResponse.json({ error: err?.message || "Internal error" }, { status: 500 });
  }
}