// app/api/plan/route.ts
import { NextResponse } from "next/server";
import { searchKBServer } from "@/lib/rag";
import { supabaseServer } from "@/lib/supabaseServer";
import { callClaudeJSONWithRetry } from '@/lib/claude';


// Optional: if you have link snapshots wired
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

const PLATFORM_CANON: Record<string, string> = {
  yt: "YouTube",
  youtube: "YouTube",
  ig: "Instagram",
  instagram: "Instagram",
  tiktok: "TikTok",
  "tik tok": "TikTok",
  twitter: "Twitter/X",
  x: "Twitter/X",
  "twitter/x": "Twitter/X",
  tw: "Twitter/X",
  linkedin: "LinkedIn",
  li: "LinkedIn",
  fb: "Facebook",
  facebook: "Facebook",
  pinterest: "Pinterest",
  twitch: "Twitch",
};
const canonPlatform = (label = "") =>
  PLATFORM_CANON[label.trim().toLowerCase()] ||
  PLATFORM_CANON[label.trim().toLowerCase().replace(/[^\w]/g, "")] ||
  label.trim().replace(/\b\w/g, (c) => c.toUpperCase());

const splitBullets = (s: string) =>
  (s || "")
    .replace(/\r/g, "")
    .split("\n")
    .map((l) => l.replace(/^\s*[-•]\s?/, "").trim())
    .filter(Boolean);

const joinBullets = (lines: string[]) => {
  const uniq = Array.from(new Set(lines.map((l) => l.trim()).filter(Boolean)));
  return uniq.length ? "- " + uniq.join("\n- ") : "";
};

const uniqStrings = (arr?: string[]) => {
  if (!Array.isArray(arr)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of arr) {
    const k = (v || "").trim().toLowerCase();
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(v);
  }
  return out;
};
const uniqObjectsBy = <T,>(arr: T[] | undefined, keyFn: (t: T) => string) => {
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
};

function normalizePlatformStrategies(
  list: { platform: string; strategy: string }[] | undefined
) {
  if (!Array.isArray(list) || list.length === 0) return [];
  const map = new Map<string, string[]>();
  for (const item of list) {
    const plat = canonPlatform(item.platform);
    const bullets = splitBullets(item.strategy);
    const prev = map.get(plat) || [];
    map.set(plat, Array.from(new Set([...prev, ...bullets])));
  }
  return Array.from(map.entries()).map(([platform, bullets]) => ({
    platform,
    strategy: joinBullets(bullets),
  }));
}

function normalizeAnswers(p: Persona) {
  return {
    creatingAs: asArray(p.creatingAs).join(", "),
    identity: asArray(p.identity).join(", "),
    goals: asArray(p.goal),
    platforms: asArray(p.platforms || p.platformFocus || p.focusPlatforms)
      .map(canonPlatform)
      .filter(Boolean),
    topics: asArray(p.topics),
    trends: asArray(p.trends),
    creativity: asArray(p.creativity),

    reach: asArray(p.reach),

    face: Array.isArray(p.face) ? p.face.join(", ") : p.face || "",
    camera: Array.isArray(p.camera) ? p.camera.join(", ") : p.camera || "",

    // ---- these were missing; the prompt expected them
    stuckReason: asArray(p.stuckReason),
    holdingBack: asArray(p.holdingBack),
    triedButDidntWork: asArray(p.triedButDidntWork),
    techComfort: (Array.isArray(p.techComfort) ? p.techComfort[0] : p.techComfort) || "",
    techGaps: asArray(p.techGaps),

    monetizationMethods: asArray(p.monetizationMethods),
    planVsWing: Array.isArray(p.planVsWing) ? p.planVsWing[0] : p.planVsWing,
  };
}

function deriveSignals(a: ReturnType<typeof normalizeAnswers>) {
  const wantsFace = a.face.toLowerCase().includes("yes");
  const cam = a.camera.toLowerCase();
  const cameraComfort = cam.includes("love")
    ? "high"
    : cam.includes("okay")
    ? "medium"
    : cam.includes("awk") || cam.includes("no")
    ? "low"
    : "unknown";

  const id = a.identity.toLowerCase();
  const stage = id.includes("zero")
    ? "new"
    : id.includes("small")
    ? "early"
    : id.includes("stuck")
    ? "stalled"
    : id.includes("large")
    ? "scaled"
    : id.includes("pivot")
    ? "pivot"
    : "unknown";

  const platforms = Array.isArray(a.platforms) && a.platforms.length > 0
    ? a.platforms
    : []; // no defaults, only what user picked

  return {
    stage,
    wantsFace,
    cameraComfort,
    platforms,
    goals: a.goals,
    audienceHints: a.reach,
    contentInterests: [...a.topics, ...a.trends, ...a.creativity],
    userPainPoints: a.stuckReason,
    planVsWing: a.planVsWing || "",
  };
}

function buildStageNote(sig: ReturnType<typeof deriveSignals>, persona: Record<string, any>) {
  const hours = (persona.timeAvailable || "").toString().toLowerCase();
  const lowTime = /less than 2|2-5/.test(hours);
  const camera = (persona.camera || "").toString().toLowerCase();

  const base =
    sig.stage === "new"
      ? "You’re in the early momentum phase. The goal is quick learning loops: ship simple posts, measure the first two seconds, and repeat what sticks."
      : sig.stage === "early"
      ? "You have a small base. Tighten repeatable formats and build a weekly cadence that compounds. Protect consistency over polish."
      : sig.stage === "stalled"
      ? "You’ve posted before but results flattened. Audit your top 10% posts, double down on hook patterns, and remove low-ROI work for two weeks."
      : sig.stage === "scaled"
      ? "You’re scaling. Standardize your formats, build a content calendar, and delegate editing to push frequency without losing quality."
      : sig.stage === "pivot"
      ? "You’re pivoting. Keep one proven format while you test the new angle. Announce the change and bring the audience along."
      : "We’ll run fast experiments to learn what resonates and then standardize the best patterns.";

  const timeNote = lowTime
    ? " With limited weekly time, run one batching block and one daily publish window. Templates beat perfection."
    : "";

  const style =
    camera.includes("no") || camera.includes("awk")
      ? " Use voiceover, screen demos, or animation as a style choice—not a limitation."
      : "";

  return (base + timeNote + style).trim();
}

function buildStrategyTypeNote(strategyType: string, sig: ReturnType<typeof deriveSignals>) {
  const cadence =
    sig.stage === "new" ? "Daily tiny posts + weekly review." :
    sig.stage === "stalled" ? "Post daily for 14 days and audit winners." :
    "Keep a steady weekly rhythm and iterate.";

  if (strategyType === "plan-first") {
    return `Plan-first works best when you can batch. Outline pillars, write 10 hooks per idea, and schedule posts. ${cadence}`;
  }
  if (strategyType === "wing-it") {
    return `Wing-it favors quick recording. Capture ideas immediately, trim fast, and publish within the hour. Still keep a weekly review so chaos compounds into learning. ${cadence}`;
  }
  return `Hybrid = plan the pillars, improvise the execution. Keep a light ideas doc, then record in short bursts. Use saved templates for captions and end-cards. ${cadence}`;
}

function chartSeeds(sig: ReturnType<typeof deriveSignals>) {
  const base = sig.platforms;
  const slice = base.length ? Math.round(100 / base.length) : 25;
  const platform_focus = base.map((name, i) => ({
    name,
    value: i === 0 ? 100 - slice * (base.length - 1) : slice,
  }));
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
    { name: "Educational", value: 40 },
    { name: "Entertainment", value: 35 },
    { name: "Personal", value: 25 },
  ];
  const pillar_allocation = [
    { name: "Pillar A", value: 40 },
    { name: "Pillar B", value: 35 },
    { name: "Pillar C", value: 25 },
  ];
  return { platform_focus, posting_cadence, content_type_mix, pillar_allocation };
}

/* -------------------- fallbacks if model is sparse -------------------- */
function buildFallbackIdeas(persona: Record<string, any>, signals: ReturnType<typeof deriveSignals>) {
  const topics = (Array.isArray(persona.topics) ? persona.topics : []).slice(0, 3);
  const goals  = (Array.isArray(persona.goal) ? persona.goal : []);
  const stage  = signals.stage;

  const tilt = goals.includes('sell a service | product') ? 'conversion'
             : goals.includes('build community and express creativity') ? 'community'
             : 'growth';

  const mk = (title: string, outline: string) => ({ title, outline });

  const ideas: Array<{title: string; outline: string}> = [];

  if (topics.length) {
    ideas.push(
      mk(`“What I’d do if I started from 0” in ${topics[0]}`,
         `Hook: one step most people skip.\nSteps 1–3 you’d take this week.\nShow a quick demo.\nCTA: try one today and comment the result.`)
    );
  }

  ideas.push(
    mk(`3 beginner mistakes in ${topics[1] || 'your niche'} (and quick fixes)`,
       `List the mistakes.\nShow a 10-second fix for each.\nOverlay text for clarity.\nCTA: save and share with a friend.`)
  );

  ideas.push(
    mk(`${topics[2] || 'your topic'} in 60 seconds (series #1)`,
       `Promise the outcome in the first 2 seconds.\nExplain with one analogy + one visual.\nEnd with “part 2 tomorrow”.`)
  );

  if (tilt === 'conversion') {
    ideas.push(
      mk(`Before/After: client mini-case`,
         `Show the problem.\nShow the new workflow or tactic.\nResult in one metric.\nSoft CTA to your offer link.`)
    );
  }

  if (stage === 'new') {
    ideas.push(
      mk(`Remix: 1 idea → 3 posts`,
         `Version A: fast tip.\nVersion B: story example.\nVersion C: screen demo.\nAsk viewers which style they prefer.`)
    );
  }

  return ideas;
}

function buildFallbackRisks(signals: ReturnType<typeof deriveSignals>, persona: Record<string, any>) {
  const lowTime = /less than 2|2-5/i.test(String(persona.timeAvailable || ''));
  const risks = [
    'Over-editing instead of publishing experiments',
    'Switching themes too often before patterns emerge',
    'Ignoring what top-performing posts have in common'
  ];
  if (signals.stage === 'stalled') risks.unshift('Repeating formats without changing the hook');
  if (lowTime) risks.push('Planning formats that exceed your weekly time budget');
  return risks;
}

function buildFallbackMonetization(persona: Record<string, any>) {
  const goals  = (Array.isArray(persona.goal) ? persona.goal : []);
  const wantsDeals   = goals.some((g: string) => /brand deals|sponsorship/i.test(g));
  const wantsProduct = goals.some((g: string) => /sell .*product/i.test(g));
  const wantsService = goals.some((g: string) => /service/i.test(g));

  const out: string[] = [];
  if (wantsDeals) out.push('Pick one sponsor category and make 3 “spec” posts; add a media kit link in bio');
  if (wantsProduct) out.push('Draft a 1-page offer (problem → promise → proof → price); soft CTA in 1 of 5 posts');
  if (wantsService) out.push('Create a 2-step DM funnel: value post → “comment keyword”; send booking link');
  out.push('Track weekly: clicks, replies, DMs, and conversion notes in a simple sheet');
  return out;
}

/* -------------------- prompt -------------------- */
/* -------------------- prompt -------------------- */
const DASHBOARD_PROMPT = `
You’re a friendly, plain-spoken social media growth coach. Be direct, useful, and human. Avoid corporate tone.
Use the user’s answers. If something is missing, make ONE reasonable assumption once (but never label it in brackets).

PLATFORM LABELS (use EXACTLY these):
YouTube, Instagram, TikTok, Twitter/X, LinkedIn, Facebook, Pinterest, Twitch

HARD CONSTRAINTS:
- Only include platforms that are explicitly allowed in ALLOWED_PLATFORMS (provided below).
- Do not mention or imply any platform not in ALLOWED_PLATFORMS anywhere (platform_strategies or charts).
- Roadblocks & Fixes must be synthesized ONLY from these onboarding fields:
  identity, stuckReason, goal, reach, holdingBack, triedButDidntWork, techComfort, techGaps.
- Treat on-camera preference as a creative style, not a flaw. Offer positive alternatives (voiceover, animations, screen demos).

OUTPUT (JSON ONLY; no markdown fences)
{
  "your_niche": "A thorough paragraph on the niche angle, no less than 5 sentences, where the user shines, and who they resonate with.",
  "platform_strategies": [{ "platform": "TikTok", "strategy": "- 3–6 short bullets" }],

  "your_roadblocks_and_fix": [
    { "issue": "string", "solution": "- step1\\n- step2\\n- step3" }
  ],

  "engagement_stage": "one of: new, early, stalled, scaled, pivot, unknown",
  "engagement_stage_note": "2–4 sentences: why this stage fits and the next few weeks’ focus.",

  "strategy_type": "one of: plan-first, wing-it, hybrid",
  "strategy_type_note": "2–4 sentences: how to run this approach day-to-day (tools, cadence, templates).",

  "theory": ["Folder idea 1","Folder idea 2","Folder idea 3"],
  "practical_advice": {
    "low_effort_examples": ["Example 1","Example 2","Example 3"],
    "high_effort_examples": ["Example 1","Example 2"]
  },

  "next_steps": ["Day 1–3 ...", "Day 4–7 ...", "Week 2 ..."],

  "content_ideas": [
    { "title": "Tailored idea title", "outline": "3–6 short lines tied to their niche, goals, and style" }
  ],
  "risk_watchouts": ["Risks specific to their stage/goals/time/tech comfort"],
  "monetization_plan": ["Monetization paths mapped to their goals and time budget"],

  "time_budget_note": "1–3 lines about a realistic weekly plan from their timeAvailable",
  "skill_upgrades": ["Hook reps","Editing drill","Analytics cadence"],
  "feedback_approach": "short paragraph with a weekly reflection habit.",

  "kpis": { "weekly_posts": number, "target_view_rate_pct": number, "target_followers_30d": number },

  "charts": {
    "platform_focus": [{ "name": "TikTok", "value": 40 }],
    "posting_cadence": [{ "name": "Mon", "posts": 2 }],
    "content_type_mix": [{ "name": "Educational", "value": 50 }],
    "pillar_allocation": [{ "name": "Pillar A", "value": 40 }]
  }
}

STRICT RULES:
- Use platform labels exactly as listed (e.g., "Twitter/X").
- Do NOT output any platform not present in ALLOWED_PLATFORMS.
- Do NOT duplicate a platform in platform_strategies.
- Roadblocks must be unique, concise, and only derived from the allowed fields above.
- Keep sentences concise and clear. No fluff.
`;

/* -------------------- route -------------------- */
export async function POST(req: Request) {
  try {
    // Require auth and payment before any LLM work
    const supa = await supabaseServer();
    const { data: { user } } = await supa.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { data: pay } = await supa
      .from('onboarding_sessions')
      .select('purchase_status')
      .eq('user_id', user.id)
      .maybeSingle();
    const isPaid = pay?.purchase_status === 'paid';
    if (!isPaid) return NextResponse.json({ error: 'Payment required' }, { status: 402 });

    const body = await req.json().catch(() => ({}));
    const persona: Persona = body.persona || {};
    const links: string[] = Array.isArray(body.links) ? body.links.filter(Boolean) : [];

    // RAG (optional)
    const forQuery =
      [persona.goal, persona.creatingAs, persona.identity, persona.topics, persona.reach]
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

    // Links (optional)
    let linkSummary = "";
    if (links.length && collectSnapshots && summarizeSnapshots) {
      try {
        const snaps = await collectSnapshots(links);
        linkSummary = summarizeSnapshots(snaps);
      } catch (e) {
        console.warn("[api/plan] links snapshot failed:", (e as any)?.message);
      }
    }

    // Signals + seeds
    const answers = normalizeAnswers(persona);
    const signals = deriveSignals(answers);
    const seeds = chartSeeds(signals);
    const allowedPlatforms = signals.platforms; // already normalized to canonical names
    const prompt = `${DASHBOARD_PROMPT}

### ALLOWED_PLATFORMS
${JSON.stringify(allowedPlatforms)}

### RAW_ANSWERS
${JSON.stringify(answers, null, 2)}

### DERIVED_SIGNALS
${JSON.stringify(signals, null, 2)}

### OPTIONAL_KB
${kbText || "(none)"}

### PUBLIC_LINKS_INSIGHTS
${links.length ? linkSummary : "(no links provided)"}
`;

    // ---------- CALL GEMINI ----------
    // const model = geminiTextModel();
    // let raw = "";
    // try {
    //   const result = await model.generateContent({
    //     contents: [{ role: "user", parts: [{ text: prompt }] }],
    //     safetySettings: GEMINI_SAFETY,
    //     generationConfig: {
    //       temperature: 0.2,
    //       topP: 0.9,
    //       maxOutputTokens: 1800,
    //       responseMimeType: "application/json",
    //     },
    //   });
    //   raw = (result.response?.text?.() || "").trim();
    // } catch (e: any) {
    //   console.warn("[api/plan] gemini error:", e?.message || e);
    //   raw = "";
    // }


    let raw = '';
    try {
      const obj = await callClaudeJSONWithRetry<any>({ prompt, timeoutMs: 90000, maxTokens: 2000 }, 2);
      raw = JSON.stringify(obj);
    } catch (e: any) {
      console.warn("[api/plan] llm error:", e?.message || e);
      raw = "";
    }

    // ---------- PARSE ----------
    const cleaned = raw
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```$/i, "")
      .trim();
    const largestJson = (t: string) => {
      const s = t.indexOf("{"), e = t.lastIndexOf("}");
      return s >= 0 && e > s ? t.slice(s, e + 1) : t;
    };

    let parsed: any = null;
    if (cleaned) {
      try {
        parsed = JSON.parse(largestJson(cleaned));
      } catch (e) {
        console.warn("[api/plan] JSON parse failed; using defaults. head:", cleaned.slice(0, 160));
        parsed = null;
      }
    }

    // ---------- COERCE / BACKFILL ----------
    const defaults: any = {
      your_niche: "You have a clear voice. Focus on the overlap between what you enjoy and what your people search for.",
      platform_strategies: [],
      your_roadblocks_and_fix: [],
      engagement_stage: signals.stage,
      strategy_type: "hybrid",
      theory: ["Create a folder of repeatable ideas", "Lead with outcomes", "Ship daily, review weekly"],
      practical_advice: {
        low_effort_examples: ["Quick reactions to trends", "Behind-the-scenes snippets", "Share work-in-progress"],
        high_effort_examples: ["In-depth tutorials", "High-quality showcase pieces"],
      },
      next_steps: ["Day 1–3: define 3 pillars", "Day 4–7: batch 5 posts", "Week 2: post daily and review"],
      content_ideas: [],
      risk_watchouts: [],
      monetization_plan: [],
      time_budget_note: "Plan for 2–5 hours/week: one batch session + a brief daily publish window.",
      skill_upgrades: ["Hooks: write 10/day for 7 days", "Editing: learn 1 zoom/cut pattern", "Analytics: review top 5 posts weekly"],
      feedback_approach: "Every Friday: list 3 that worked (duplicate), remove 1 thing, set 1 new test.",
      kpis: { weekly_posts: 10, target_view_rate_pct: 25, target_followers_30d: 1000 },
      charts: seeds,
    };

    let plan: any = { ...defaults, ...(parsed || {}) };
    // Backfill engagement_stage & strategy_type from signals/persona if missing
    plan.engagement_stage ||= signals.stage;

    const pv = (answers.planVsWing || "").toString().toLowerCase();
    if (!plan.strategy_type) {
      plan.strategy_type =
        pv.includes("plan") ? "plan-first" :
        pv.includes("mix")  ? "hybrid" :
        pv                  ? "wing-it" : "hybrid";
    }

    // --- Cleanup & always-provide long notes ---

    // Remove any stray "[ASSUMPTION: ...]" from the niche
    if (typeof plan.your_niche === "string") {
      plan.your_niche = plan.your_niche
        .replace(/\[ASSUMPTION:[^\]]*\]/gi, "")
        .replace(/\s+/g, " ")
        .trim();
    }

    // Tailored fallbacks if the model omitted sections
    if (!Array.isArray(plan.content_ideas) || plan.content_ideas.length === 0) {
      plan.content_ideas = buildFallbackIdeas(persona, signals);
    }
    if (!Array.isArray(plan.risk_watchouts) || plan.risk_watchouts.length === 0) {
      plan.risk_watchouts = buildFallbackRisks(signals, persona);
    }
    if (!Array.isArray(plan.monetization_plan) || plan.monetization_plan.length === 0) {
      plan.monetization_plan = buildFallbackMonetization(persona);
    }

    // Ensure narrative notes exist (these are the longer texts you want)
    plan.engagement_stage_note = plan.engagement_stage_note || buildStageNote(signals, persona);
    plan.strategy_type_note    = plan.strategy_type_note    || buildStrategyTypeNote(plan.strategy_type, signals);

    // Normalize & filter platform strategies by selected platforms (if any)
    plan.platform_strategies = normalizePlatformStrategies(plan.platform_strategies);
    if (signals.platforms?.length) {
      const allowed = new Set(signals.platforms.map(canonPlatform));
      plan.platform_strategies = plan.platform_strategies.filter((p: any) => allowed.has(canonPlatform(p.platform)));
    }

    // Clean arrays
    plan.next_steps = uniqStrings(plan.next_steps);
    plan.risk_watchouts = uniqStrings(plan.risk_watchouts);
    plan.monetization_plan = uniqStrings(plan.monetization_plan);
    plan.skill_upgrades = uniqStrings(plan.skill_upgrades);
    plan.theory = uniqStrings(plan.theory);
    plan.practical_advice ||= defaults.practical_advice;

    // Charts — ensure present
    if (plan?.charts?.platform_focus) {
      plan.charts.platform_focus = uniqObjectsBy(
        plan.charts.platform_focus.map((p: any) => ({ ...p, name: canonPlatform(p.name) })),
        (p: any) => p.name
      );
    }
    plan.charts = {
      platform_focus: plan.charts?.platform_focus?.length ? plan.charts.platform_focus : seeds.platform_focus,
      posting_cadence: plan.charts?.posting_cadence?.length ? plan.charts.posting_cadence : seeds.posting_cadence,
      content_type_mix: plan.charts?.content_type_mix?.length ? plan.charts.content_type_mix : seeds.content_type_mix,
      pillar_allocation: plan.charts?.pillar_allocation?.length ? plan.charts.pillar_allocation : seeds.pillar_allocation,
    };

    /* 🔽🔽 ADD THIS BLOCK: keep only the selected platforms in the chart */
    if (signals.platforms?.length && Array.isArray(plan.charts.platform_focus)) {
      const allowed = new Set(signals.platforms.map(canonPlatform));
      plan.charts.platform_focus = plan.charts.platform_focus.filter(
        (p: any) => allowed.has(canonPlatform(p.name))
      );
    }
    // Save report for signed-in user (idempotent)
    try {
      if (user) {
        await supa.from("reports").upsert({
          user_id: user.id,
          plan,
          updated_at: new Date().toISOString(),
        });
      }
    } catch (e) {
      console.warn("[api/plan] save failed:", (e as any)?.message);
    }

    return NextResponse.json(plan);
  } catch (err: any) {
    console.error("[api/plan] error:", err?.message || err);
    return NextResponse.json({ error: err?.message || "Internal error" }, { status: 500 });
  }
}
