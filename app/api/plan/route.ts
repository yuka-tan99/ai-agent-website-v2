// app/api/plan/route.ts
import { NextResponse } from "next/server";
import { searchKB } from "@/lib/rag";
import { geminiTextModel, GEMINI_SAFETY } from "@/lib/gemini";

type Persona = Record<string, any>;

/* -------------------- helpers -------------------- */
const asArray = (v: any): string[] => (Array.isArray(v) ? v : v ? [v] : []);

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
    : "unknown";

  const platforms =
    a.platforms.length > 0
      ? a.platforms
      : ["TikTok", "Instagram", "YouTube", "Pinterest"];

  return {
    stage,
    wantsFace,
    cameraComfort,
    platforms,
    goals: a.goals,
    audienceHints: a.reach,
    contentInterests: [...a.topics, ...a.trends, ...a.creativity],
    userPainPoints: a.stuckReason,
  };
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
    {
      name: "Educational",
      value: sig.contentInterests.some((s) =>
        /education|tips|how|coaching/i.test(s)
      )
        ? 45
        : 30,
    },
    { name: "Entertainment", value: 30 },
    { name: "Personal", value: 25 },
  ];

  // simple pillar allocations that mirror goals/topics
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
    next_steps: [
      "Day 1–3: Define 3 pillars",
      "Day 4–7: Batch 5 posts",
      "Day 8–14: Post daily, review",
    ],
    charts: {
      platform_focus: [
        { name: "TikTok", value: 50 },
        { name: "Instagram", value: 30 },
        { name: "YouTube", value: 20 },
      ],
      posting_cadence: [
        { name: "Mon", posts: 2 },
        { name: "Tue", posts: 2 },
        { name: "Wed", posts: 2 },
        { name: "Thu", posts: 2 },
        { name: "Fri", posts: 3 },
        { name: "Sat", posts: 1 },
        { name: "Sun", posts: 1 },
      ],
      content_type_mix: [
        { name: "Educational", value: 50 },
        { name: "Entertainment", value: 30 },
        { name: "Personal", value: 20 },
      ],
      pillar_allocation: [
        { name: "Pillar A", value: 40 },
        { name: "Pillar B", value: 35 },
        { name: "Pillar C", value: 25 },
      ],
    },
  };

  if (!input || typeof input !== "object") return defaults;

  const out: any = { ...defaults, ...input };
  const ensureArr = (v: any, fb: any[]) => (Array.isArray(v) ? v : fb);

  out.platform_strategies = ensureArr(
    out.platform_strategies,
    defaults.platform_strategies
  );
  out.roadblocks = ensureArr(out.roadblocks, defaults.roadblocks);
  out.next_steps = ensureArr(out.next_steps, defaults.next_steps);

  out.charts ||= defaults.charts;
  out.charts.platform_focus = ensureArr(
    out.charts.platform_focus,
    defaults.charts.platform_focus
  );
  out.charts.posting_cadence = ensureArr(
    out.charts.posting_cadence,
    defaults.charts.posting_cadence
  );
  out.charts.content_type_mix = ensureArr(
    out.charts.content_type_mix,
    defaults.charts.content_type_mix
  );
  out.charts.pillar_allocation = ensureArr(
    out.charts.pillar_allocation,
    defaults.charts.pillar_allocation
  );

  return out;
}

function inferPlatforms(persona: Persona): string[] {
  const blob = [
    persona.platforms,
    persona.goal,
    persona.topics,
    persona.creatingAs,
  ]
    .flat()
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const list: string[] = [];
  if (blob.includes("youtube")) list.push("YouTube");
  if (blob.includes("instagram")) list.push("Instagram");
  if (blob.includes("tiktok")) list.push("TikTok");
  if (blob.includes("pinterest")) list.push("Pinterest");
  if (blob.includes("twitter") || blob.includes("x")) list.push("twitter/x");
  if (blob.includes("linkedin")) list.push("LinkedIn");
  if (list.length === 0) list.push("TikTok", "Instagram");
  return Array.from(new Set(list)).slice(0, 4);
}

function fillFromPersonaIfMissing(plan: any, persona: Persona) {
  const platforms = inferPlatforms(persona);

  if (!Array.isArray(plan.platform_strategies) || plan.platform_strategies.length === 0) {
    plan.platform_strategies = platforms.map((p) => ({
      platform: p,
      strategy:
        p.toLowerCase().includes("youtube")
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
      {
        issue: "Inconsistent posting",
        solution:
          "- Schedule 14-day cadence.\n- Batch 5 videos today.\n- Post at the same hour.",
      },
      {
        issue: "Weak hooks",
        solution:
          "- 10 hook variations per idea.\n- Lead with outcome or tension.\n- Cut first 2 seconds if slow.",
      },
    ];
  }

  return plan;
}

function mergeRoadblocksFromPersona(plan: any, sig: ReturnType<typeof deriveSignals>) {
  const mapped = (issue: string) => {
    if (/hook|intro|open/i.test(issue))
      return {
        issue: "Weak hooks",
        solution:
          "- Write 10 hook variants per idea\n- Lead with outcome/tension in 2s\n- Cut first 2s if no action\n- Test 3 thumbnails/titles weekly",
      };
    if (/inconsistent|consisten|schedule|routine/i.test(issue))
      return {
        issue: "Inconsistent posting",
        solution:
          "- Batch 5–10 clips every Sun (90 min)\n- Set daily 20-min publish window\n- Track streak; reset weekly targets",
      };
    if (/idea|what to post|uninspired/i.test(issue))
      return {
        issue: "Not sure what to post",
        solution:
          "- Define 3 pillars from interests\n- Save 20 reference videos this week\n- Turn each into 3 remixes (A/B hooks)\n- Keep an ideas doc; add 5/day",
      };
    if (/camera|on-camera|awkward|shy/i.test(issue))
      return {
        issue: "On-camera discomfort",
        solution:
          "- Start with VO + b-roll for 2 weeks\n- Record 3 selfie drafts/day, publish 1\n- Script beats: Hook → 3 points → CTA\n- Eye-level framing + natural light",
      };
    return {
      issue: issue || "Execution gaps",
      solution:
        "- Set weekly targets (posts, watch time)\n- Duplicate top 10% patterns\n- Remove low-ROI tasks for 14 days\n- End each session with next 3 actions",
    };
  };

  const userRB = sig.userPainPoints?.map(mapped) || [];
  const aiRB = Array.isArray(plan.roadblocks) ? plan.roadblocks : [];
  const merged = [...userRB, ...aiRB];

  plan.roadblocks = merged.length
    ? merged
    : [
        {
          issue: "Inconsistent posting",
          solution: "- Batch on Sundays\n- Daily publish window\n- Track streak",
        },
      ];
  return plan;
}

/* -------------------- prompt -------------------- */
const DASHBOARD_PROMPT = `
You are an expert social growth strategist and dashboard designer.
Use ALL relevant answers explicitly. If a field is missing, state one assumption once in the Profile Summary.

OUTPUT (JSON ONLY; no markdown):
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
Rules:
- Align charts with the persona/platform focus and stage.
- Tone: direct, no fluff.
`;

/* -------------------- route -------------------- */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const persona: Persona = body.persona || {};

    // RAG snippet
    const forQuery = [
      persona.goal,
      persona.creatingAs,
      persona.identity,
      persona.topics,
      persona.reach,
    ]
      .flat()
      .filter(Boolean)
      .join(" | ") || "social growth strategy basics";

    let kbText = "";
    try {
      const kb = await searchKB(forQuery, 6);
      kbText = Array.isArray(kb) ? kb.map((k) => k.content).join("\n---\n") : "";
    } catch {}

    // answers/signals/seeds
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
`;

    const model = geminiTextModel();
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      safetySettings: GEMINI_SAFETY,
      generationConfig: {
        temperature: 0.2,
        topP: 0.9,
        maxOutputTokens: 1800,
        responseMimeType: "application/json",
      },
    });

    const raw = (result.response?.text?.() || "").trim();
    if (process.env.DEBUG_PLAN === "true") {
      console.log("[api/plan] RAW len:", raw.length);
      console.log("[api/plan] RAW head:", raw.slice(0, 400));
    }

    // strip accidental fences
    const cleaned = raw
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```$/i, "")
      .trim();

    const largestJson = (t: string) => {
      const s = t.indexOf("{");
      const e = t.lastIndexOf("}");
      return s >= 0 && e > s ? t.slice(s, e + 1) : t;
    };

    let parsed: any = null;
    try {
      parsed = cleaned ? JSON.parse(largestJson(cleaned)) : null;
    } catch {
      if (process.env.DEBUG_PLAN === "true") {
        console.warn("[api/plan] Non-JSON. Head:", cleaned.slice(0, 300));
      }
      parsed = null;
    }

    let plan = coercePlanShape(parsed);
    plan = fillFromPersonaIfMissing(plan, persona);

    // ensure charts exist (fill from seeds if missing)
    plan.charts = {
      platform_focus:
        plan.charts?.platform_focus?.length
          ? plan.charts.platform_focus
          : seeds.platform_focus,
      posting_cadence:
        plan.charts?.posting_cadence?.length
          ? plan.charts.posting_cadence
          : seeds.posting_cadence,
      content_type_mix:
        plan.charts?.content_type_mix?.length
          ? plan.charts.content_type_mix
          : seeds.content_type_mix,
      pillar_allocation:
        plan.charts?.pillar_allocation?.length
          ? plan.charts.pillar_allocation
          : seeds.pillar_allocation,
    };

    plan = mergeRoadblocksFromPersona(plan, signals);

    return NextResponse.json(plan);
  } catch (err: any) {
    console.error("[api/plan] error:", err?.message);
    return NextResponse.json({ error: err?.message || "Internal error" }, { status: 500 });
  }
}