// lib/reportMapping.ts
export type Persona = Record<string, any>

const asArray = (v: any): string[] => (!v ? [] : Array.isArray(v) ? v : [v])

/* ---------------- Normalize onboarding ---------------- */
export function normalizeAnswers(p: Persona) {
  // Support decision-tree answers (Q1..Q18) + __vars
  const hasQ = Object.keys(p || {}).some(k => /^Q\d/.test(k)) || !!(p as any).__vars
  if (hasQ) {
    const v = ((p as any).__vars || {}) as Record<string, any>
    const getArr = (k: string): string[] => {
      const a = (p as any)[k]
      return Array.isArray(a) ? a : typeof a === 'string' && a ? [a] : []
    }
    const mapPlatforms = () => {
      const fromVars = [
        v.platform_pref_tiktok ? 'TikTok' : null,
        v.platform_pref_instagram ? 'Instagram' : null,
        v.platform_pref_youtube ? 'YouTube' : null,
        v.platform_pref_twitter ? 'Twitter/X' : null,
        v.platform_pref_linkedin ? 'LinkedIn' : null,
      ].filter(Boolean) as string[]
      if (fromVars.length) return fromVars
      const q = getArr('Q11')
      const map: Record<string,string> = { tiktok:'TikTok', instagram:'Instagram', youtube:'YouTube', twitter:'Twitter/X', linkedin:'LinkedIn' }
      return q.map((x)=> map[x] || x).slice(0,4)
    }
    const face = (() => {
      const vis = String(v.visibility || '')
      if (/face_on/.test(vis)) return 'yes'
      if (/faceless/.test(vis)) return 'no'
      return 'maybe'
    })()
    const camera = String(v.visibility || '')
    const timeAvailable = (() => {
      const t = String(v.time_mode || '')
      if (/pro_daily|team/.test(t)) return '10+ hours'
      if (/micro_daily/.test(t)) return '5-10 hours'
      if (/batch_weekly/.test(t)) return '2-5 hours'
      return ''
    })()
    const holdingBack = (() => {
      const q = getArr('Q3')
      const map: Record<string,string> = {
        no_niche: "i don't know what to post",
        inconsistent: "i can't stay consistent",
        low_engagement: "my content isn't getting attention",
        fear_judgment: "i'm afraid of judgment",
        low_time: "i don't have much time",
        inauthentic: 'i feel inauthentic',
        overwhelm: "i'm overwhelmed by advice",
        technical: 'technical stuff confuses me',
        comparison: 'i compare myself to others',
        stalled: 'my growth has completely stalled',
      }
      return q.map(x=> map[x] || x)
    })()
    const topics = (() => {
      const raw = (p as any).Q10
      if (Array.isArray(raw)) return raw.filter((s:any)=> typeof s === 'string' && s.trim()).map((s:string)=> s.trim())
      const t = String(raw || '').trim()
      if (!t) return []
      return t.split(/[,\n]/).map(s=>s.trim()).filter(Boolean)
    })()
    const goals = (() => {
      const q = getArr('Q4')
      return q
    })()

    return {
      creatingAs: v.identity || '',
      identity: v.stage || '',
      goals,
      platforms: mapPlatforms(),
      topics,
      trends: [],
      creativity: [],
      reach: [],
      face,
      camera,
      vibe: [],
      planVsWing: '',
      contentEnjoyMaking: [],
      contentLoveWatching: [],
      timeAvailable,
      techComfort: '',
      feedbackApproach: '',
      holdingBack,
      triedButDidntWork: [],
      monetizationMethods: [],
    }
  }
  // Backward-compat: support both legacy and new onboarding keys
  const whyHere = p.whyHere as string | undefined
  const journeyStage = p.journeyStage as string | undefined
  const biggestChallenges = asArray((p as any).biggestChallenges)
  const success6mo = asArray((p as any).success6mo)
  const drivingForces = asArray((p as any).drivingForces)
  const desiredFeeling = asArray((p as any).desiredFeeling)
  const contentNatural = asArray((p as any).contentNatural)
  const visibilityComfort = (p as any).visibilityComfort as string | undefined
  const creationReality = (p as any).creationReality as string | undefined
  const deepTopics = asArray((p as any).deepTopics)
  const naturalPlatforms = asArray((p as any).naturalPlatforms)
  const whoNeeds = asArray((p as any).whoNeeds)
  const ageGroup = (p as any).ageGroup as string | undefined
  const metricsAttitude = (p as any).metricsAttitude as string | undefined
  const fears = asArray((p as any).fears)
  const triedAlready = asArray((p as any).triedAlready)
  const handleCriticism = (p as any).handleCriticism as string | undefined
  const monetization = (p as any).monetization as string | undefined
  const dreamPercent = (p as any).dreamPercent as string | undefined

  const mapPlanWing = (s?: string) => {
    if (!s) return ''
    if (/batch|dedicate|team/i.test(s)) return 'plan-first'
    if (/unpredictable|motivation/i.test(s)) return 'wing-it'
    if (/15-30|min/i.test(s)) return 'hybrid'
    return ''
  }
  const mapTime = (s?: string) => {
    if (!s) return ''
    if (/several hours daily|team/i.test(s)) return '10+ hours'
    if (/15-30|min/i.test(s)) return '5-10 hours'
    if (/batch create on weekends/i.test(s)) return '2-5 hours'
    return ''
  }
  const facePref = (() => {
    if (!visibilityComfort) return ''
    if (/love being on camera/i.test(visibilityComfort)) return 'yes'
    if (/stay completely behind/i.test(visibilityComfort)) return 'no'
    return 'maybe'
  })()

  const goalsCombined = [
    ...asArray(p.goal),
    ...success6mo,
    ...drivingForces,
  ]

  const reachCombined = [
    ...asArray(p.reach),
    ...whoNeeds,
    ...(ageGroup ? [ageGroup] : []),
  ]

  return {
    creatingAs: p.creatingAs || whyHere || "",
    identity: p.identity || journeyStage || "",
    goals: goalsCombined,
    platforms: asArray(p.platforms || p.platformFocus || p.focusPlatforms).length ? asArray(p.platforms || p.platformFocus || p.focusPlatforms) : naturalPlatforms,
    topics: asArray(p.topics).length ? asArray(p.topics) : deepTopics,
    trends: asArray(p.trends).length ? asArray(p.trends) : (contentNatural.some(s=>/trend/i.test(s)) ? ['trends'] : []),
    creativity: asArray(p.creativity).length ? asArray(p.creativity) : contentNatural,
    reach: reachCombined,
    face: Array.isArray(p.face) ? p.face.join(", ") : (p.face || facePref || ""),
    camera: Array.isArray(p.camera) ? p.camera.join(", ") : (p.camera || visibilityComfort || ""),
    vibe: asArray(p.vibe || p.friendsDescribe || p.personality).length ? asArray(p.vibe || p.friendsDescribe || p.personality) : desiredFeeling,
    planVsWing: p.planVsWing || mapPlanWing(creationReality),
    contentEnjoyMaking: asArray(p.contentEnjoyMaking).length ? asArray(p.contentEnjoyMaking) : contentNatural,
    contentLoveWatching: asArray(p.contentLoveWatching),
    timeAvailable: p.timeAvailable || mapTime(creationReality),
    techComfort: p.techComfort || "",
    feedbackApproach: p.feedbackApproach || handleCriticism || "",
    holdingBack: asArray(p.holdingBack).length ? asArray(p.holdingBack) : [...biggestChallenges, ...fears],
    triedButDidntWork: asArray(p.triedButDidntWork).length ? asArray(p.triedButDidntWork) : triedAlready,
    monetizationMethods: asArray(p.monetizationMethods),
  }
}

/* ---------------- Derive signals ---------------- */
export function deriveSignals(a: ReturnType<typeof normalizeAnswers>) {
  const wantsFace = a.face.toLowerCase().includes("yes")
  const cam = a.camera.toLowerCase()
  const cameraComfort =
    cam.includes("love") ? "high"
      : cam.includes("okay") ? "medium"
      : cam.includes("awk") || cam.includes("no") ? "low"
      : "unknown"

  const id = a.identity.toLowerCase()
  const stage =
    id.includes("zero") ? "new"
      : id.includes("small") ? "early"
      : id.includes("stuck") ? "stalled"
      : id.includes("large") ? "scaled"
      : id.includes("pivot") ? "pivot"
      : "unknown"

  const platforms = a.platforms.length ? a.platforms : ["TikTok", "Instagram", "YouTube", "Pinterest"]

  return {
    stage,
    wantsFace,
    cameraComfort,
    platforms,
    goals: a.goals,
    audienceHints: a.reach,
    contentInterests: [...a.topics, ...a.trends, ...a.creativity],
    timeAvailable: a.timeAvailable,
    techComfort: a.techComfort,
    planVsWing: a.planVsWing,
    userPainPoints: a.holdingBack,
    triedButDidntWork: a.triedButDidntWork,
    vibe: a.vibe,
    monetizationMethods: a.monetizationMethods,
    contentEnjoyMaking: a.contentEnjoyMaking,
    contentLoveWatching: a.contentLoveWatching,
  }
}

/* ---------------- Fame Potential Score (0–100) ---------------- */
export function computeFameScore(a: ReturnType<typeof normalizeAnswers>) {
  const many = (arr: string[]) => Math.min(1, (arr?.length || 0) / 4)

  const factors = {
    // More encouraging baselines: unknowns map to ~0.6 instead of harsh lows
    time: /(\b10\+|10-20|20|30|hour|daily)/i.test(a.timeAvailable)
      ? 1
      : /5-10|5–10|weekly|some/i.test(a.timeAvailable)
        ? 0.7
        : a.timeAvailable
          ? 0.5
          : 0.6, // unknown → assume moderate readiness
    camera: /love|comfortable|okay/i.test(a.camera)
      ? 1
      : /awk|shy|no/i.test(a.camera)
        ? 0.5
        : 0.7, // unknown → neutral/encouraging
    planning: /plan|schedule|calendar|plan-first/i.test(a.planVsWing)
      ? 1
      : /mix|both|hybrid/i.test(a.planVsWing)
        ? 0.8
        : a.planVsWing
          ? 0.6
          : 0.65,
    tech: /high|comfortable|power/i.test(a.techComfort)
      ? 1
      : /medium/i.test(a.techComfort)
        ? 0.8
        : a.techComfort
          ? 0.6
          : 0.65,
    audience: Math.max(0.35, many(a.reach)),
    interests: Math.max(0.35, many(a.topics) * 0.8 + many(a.creativity) * 0.2),
    experimentation: Math.max(0.4, 1 - many(a.triedButDidntWork)),
  }

  const weights = {
    time: 0.22,
    camera: 0.16,
    planning: 0.16,
    tech: 0.12,
    audience: 0.12,
    interests: 0.12,
    experimentation: 0.10,
  }

  const score01 =
    weights.time * factors.time +
    weights.camera * factors.camera +
    weights.planning * factors.planning +
    weights.tech * factors.tech +
    weights.audience * factors.audience +
    weights.interests * factors.interests +
    weights.experimentation * factors.experimentation

  const pct = Math.round(score01 * 100)
  return Math.max(5, Math.min(95, pct))
}

export function computeFameBreakdown(a: ReturnType<typeof normalizeAnswers>) {
  const many = (arr: string[]) => Math.min(1, (arr?.length || 0) / 4)

  const factors = {
    consistency: /(\b10\+|10-20|20|30|hour|daily)/i.test(a.timeAvailable)
      ? 1
      : /5-10|5–10|weekly|some/i.test(a.timeAvailable)
        ? 0.7
        : a.timeAvailable
          ? 0.5
          : 0.6,
    camera_comfort: /love|comfortable|okay/i.test(a.camera)
      ? 1
      : /awk|shy|no/i.test(a.camera)
        ? 0.5
        : 0.7,
    planning: /plan|schedule|calendar|plan-first/i.test(a.planVsWing)
      ? 1
      : /mix|both|hybrid/i.test(a.planVsWing)
        ? 0.8
        : a.planVsWing
          ? 0.6
          : 0.65,
    tech_comfort: /high|comfortable|power/i.test(a.techComfort)
      ? 1
      : /medium/i.test(a.techComfort)
        ? 0.8
        : a.techComfort
          ? 0.6
          : 0.65,
    audience_readiness: Math.max(0.35, many(a.reach)),
    interest_breadth: Math.max(0.35, many(a.topics) * 0.8 + many(a.creativity) * 0.2),
    experimentation: Math.max(0.4, 1 - many(a.triedButDidntWork)),
  }

  const weights = {
    consistency: 0.22,
    camera_comfort: 0.16,
    planning: 0.16,
    tech_comfort: 0.12,
    audience_readiness: 0.12,
    interest_breadth: 0.12,
    experimentation: 0.10,
  }

  const breakdown = Object.keys(weights).map((k) => {
    const key = k as keyof typeof weights
    const weight = weights[key]
    const factor = (factors as any)[key] as number
    const percent = Math.round(weight * factor * 100)
    const label = (
      {
        consistency: 'Consistency',
        camera_comfort: 'Camera comfort',
        planning: 'Planning',
        tech_comfort: 'Tech comfort',
        audience_readiness: 'Audience readiness',
        interest_breadth: 'Interest breadth',
        experimentation: 'Experimentation',
      } as Record<string, string>
    )[key]
    return { key, label, weight, factor, percent }
  })

  return breakdown
}

/* ---------------- Chart seeds (never blank) ---------------- */
export function chartSeeds(sig: ReturnType<typeof deriveSignals>) {
  const base = sig.platforms
  const slice = base.length ? Math.round(100 / base.length) : 25
  const platform_focus = base.map((name, i) => ({ name, value: i === 0 ? 100 - slice * (base.length - 1) : slice }))
  const posting_cadence = [
    { name: "Mon", posts: sig.stage === "new" ? 2 : 1 },
    { name: "Tue", posts: sig.stage === "new" ? 2 : 1 },
    { name: "Wed", posts: sig.stage === "new" ? 2 : 1 },
    { name: "Thu", posts: sig.stage === "new" ? 2 : 1 },
    { name: "Fri", posts: sig.stage === "new" ? 3 : 2 },
    { name: "Sat", posts: 1 },
    { name: "Sun", posts: 1 },
  ]
  const content_type_mix = [
    { name: "Educational", value: sig.contentInterests.some(s => /education|tips|how/i.test(s)) ? 45 : 30 },
    { name: "Entertainment", value: 30 },
    { name: "Personal", value: 25 },
  ]
  return { platform_focus, posting_cadence, content_type_mix }
}

/* ---------------- Prompt builder (forces your 7 sections) ---------------- */
export function buildPrompt(mapping: {
  answers: ReturnType<typeof normalizeAnswers>,
  signals: ReturnType<typeof deriveSignals>,
  seeds: ReturnType<typeof chartSeeds>,
  fameScore: number,
  kbText?: string
}) {
  const DASHBOARD_PROMPT = `
You are Marketing Mentor: a friendly, plain-spoken social growth coach. Be concise, human, and specific. No fluff.

WRITE CLEARLY FOR A 15-YEAR-OLD:
- Short paragraphs (1–3 sentences).
- Use tight bullet lists (max 6 bullets) only when useful.
- Bold just a few **keywords** when it helps scanning.
- Keep tone warm, direct, and actionable.

PLATFORM LABELS (use EXACT strings once each if relevant):
YouTube, Instagram, TikTok, Twitter/X, LinkedIn, Facebook, Pinterest, Twitch

OUTPUT (JSON ONLY; no markdown fences). MUST be STRICTLY parseable by JSON.parse (no trailing commas, no comments, no stray text, no line breaks inside strings). MUST match this schema exactly:

{
  "main_problem": "short noun phrase e.g. 'inconsistent posting'",
  "main_problem_detail": "1-2 paragraphs that summarize the creator's biggest roadblocks and how to fix them",
  "sections": {
    "ai_marketing_psychology": { "summary": "", "bullets": [] },
    "foundational_psychology": { "summary": "", "bullets": [] },
    "platform_specific_strategies": { "summary": "", "bullets": [], "charts": { "platform_focus": [{ "name":"TikTok","value":40 }] } },
    "content_strategy": { "summary": "", "bullets": [] },
    "posting_frequency": { "summary": "", "bullets": [] },
    "metrics_mindset": { "summary": "", "bullets": [] },
    "mental_health": { "summary": "", "bullets": [] }
  }
}

STRICT RULES:
- Use the platform labels exactly as listed.
- Make every bullet a command or a concrete example.
- Keep sentences short. Prefer verbs at the start.
- Produce VALID JSON ONLY (no trailing commas, no comments, no extra keys). Do not include any text outside the JSON object. Escape internal quotes. Keep array items as simple strings without newlines.
 - If OPTIONAL_KB is provided, prefer its content for relevant sections. Weave 1–2 concrete insights per relevant section and cite the source book title once in that section (e.g., "(Source: Title)").
- Do not include any other keys than in the schema.
`

  return `${DASHBOARD_PROMPT}

### RAW_ONBOARDING_ANSWERS
${JSON.stringify(mapping.answers, null, 2)}

### DERIVED_SIGNALS
${JSON.stringify(mapping.signals, null, 2)}

### CHART_SEEDS
${JSON.stringify(mapping.seeds, null, 2)}

### FAME_SCORE_PERCENT
${mapping.fameScore}

### OPTIONAL_KB
${mapping.kbText || "(none)"}
`
}

/* ---------------- Shape & fallbacks for the UI ---------------- */
export function coercePlanShape(input: any, seeds: ReturnType<typeof chartSeeds>, fameScore: number) {
  const emptySec = () => ({ summary: "", bullets: [] as string[] })
  const defaults = {
    fame_score: fameScore,
    main_problem: "inconsistent posting",
    main_problem_detail: "",
    sections: {
      ai_marketing_psychology: emptySec(),
      foundational_psychology: emptySec(),
      platform_specific_strategies: { ...emptySec(), charts: { platform_focus: seeds.platform_focus } },
      content_strategy: emptySec(),
      posting_frequency: emptySec(),
      metrics_mindset: emptySec(),
      mental_health: emptySec(),
    },
  }

  if (!input || typeof input !== "object") return defaults

  const out: any = { ...defaults, ...input }
  out.fame_score = typeof out.fame_score === "number" ? out.fame_score : fameScore
  out.main_problem ||= defaults.main_problem
  out.main_problem_detail = String(out.main_problem_detail || "")
  out.sections ||= defaults.sections

  const fix = (s: any) => {
    if (!s || typeof s !== "object") return emptySec()
    if (!Array.isArray(s.bullets)) s.bullets = []
    s.summary = String(s.summary || "")
    return s
  }

  out.sections.ai_marketing_psychology = fix(out.sections.ai_marketing_psychology)
  out.sections.foundational_psychology = fix(out.sections.foundational_psychology)
  out.sections.platform_specific_strategies = {
    ...fix(out.sections.platform_specific_strategies),
    charts: {
      platform_focus: Array.isArray(out?.sections?.platform_specific_strategies?.charts?.platform_focus)
        ? out.sections.platform_specific_strategies.charts.platform_focus
        : seeds.platform_focus,
    },
  }
  out.sections.content_strategy = fix(out.sections.content_strategy)
  out.sections.posting_frequency = fix(out.sections.posting_frequency)
  out.sections.metrics_mindset = fix(out.sections.metrics_mindset)
  out.sections.mental_health = fix(out.sections.mental_health)

  return out
}

/* ---------------- Legacy helpers (optional) ---------------- */
export function inferPlatforms(persona: Persona): string[] {
  const list: string[] = []
  const from = (...xs: any[]) => xs.flat().filter(Boolean).map((s: string) => s.toLowerCase()).join(" ")
  const blob = from(persona.platforms, persona.goal, persona.topics, persona.creatingAs)
  if (blob.includes("youtube")) list.push("YouTube")
  if (blob.includes("instagram")) list.push("Instagram")
  if (blob.includes("tiktok")) list.push("TikTok")
  if (blob.includes("pinterest")) list.push("Pinterest")
  if (list.length === 0) list.push("TikTok", "Instagram")
  return Array.from(new Set(list)).slice(0, 4)
}

export function fillFromPersonaIfMissing(plan: any, persona: Persona) {
  const platforms = inferPlatforms(persona)
  if (!Array.isArray(plan.platform_strategies) || plan.platform_strategies.length === 0) {
    plan.platform_strategies = platforms.map(p => ({
      platform: p,
      strategy: p === "YouTube"
        ? "- 2 Shorts/day.\n- Title = outcome + timeframe.\n- First 2s show result."
        : "- 1–2 posts/day.\n- Hook in 2s.\n- 3 pillars. Weekly review.",
    }))
  } else {
    const have = new Set(plan.platform_strategies.map((s: any) => s.platform))
    platforms.forEach(p => {
      if (!have.has(p)) {
        plan.platform_strategies.push({
          platform: p,
          strategy: "- 1–2 posts/day.\n- Tight hooks.\n- Batch record.\n- Analyze weekly.",
        })
      }
    })
  }
  if (!Array.isArray(plan.roadblocks) || plan.roadblocks.length === 0) {
    plan.roadblocks = [
      { issue: "Inconsistent posting", solution: "- Schedule 14-day cadence.\n- Batch 5 videos today.\n- Post same hour." },
      { issue: "Weak hooks", solution: "- 10 hook variations per idea.\n- Outcome/tension first.\n- Cut first 2s if slow." },
    ]
  }
  return plan
}

export function mergeRoadblocksFromPersona(plan: any, sig: ReturnType<typeof deriveSignals>) {
  const mapped = (issue: string) => {
    if (/hook|intro|open/i.test(issue)) return {
      issue: "Weak hooks",
      solution: "- Write 10 hook variants per idea\n- Lead with outcome/tension in first 2s\n- Cut first 2s if no action\n- Test 3 thumbnails/titles weekly",
    }
    if (/inconsistent|consisten|schedule|routine/i.test(issue)) return {
      issue: "Inconsistent posting",
      solution: "- Batch 5–10 clips every Sun (90 min)\n- Schedule with a simple calendar\n- Set daily 20-min “publish window”\n- Track streak; reset weekly targets",
    }
    if (/idea|what to post|uninspired/i.test(issue)) return {
      issue: "Not sure what to post",
      solution: "- Define 3 content pillars from onboarding interests\n- Save 20 reference videos this week\n- Turn each into 3 remixes (A/B hooks)\n- Keep an ideas doc; add 5/day",
    }
    if (/camera|on-camera|awkward|shy/i.test(issue)) return {
      issue: "On-camera discomfort",
      solution: "- Start with voiceover + b-roll for 2 weeks\n- Record 3 selfie drafts/day, publish 1\n- Script beats: Hook → 3 points → CTA\n- Eye-level framing + natural light",
    }
    return {
      issue: issue || "Execution gaps",
      solution: "- Set weekly targets (posts/watchtime)\n- Duplicate patterns from top 10% posts\n- Cut low-ROI tasks for 14 days\n- End every session with next 3 actions",
    }
  }

  const userRB = sig.userPainPoints?.map(mapped) || []
  const aiRB = Array.isArray(plan.roadblocks) ? plan.roadblocks : []
  plan.roadblocks = [...userRB, ...aiRB]
  return plan
}

function summarizeMainProblem(sig: ReturnType<typeof deriveSignals>, plan: any) {
  const pains = (sig.userPainPoints || []).map(s => String(s).toLowerCase())
  let title = plan?.main_problem || "Inconsistent posting"
  if (pains.some(p => /inconsistent|consisten|schedule|routine/.test(p))) title = "Inconsistent posting"
  else if (pains.some(p => /idea|what to post|uninspired/.test(p))) title = "Unclear content direction"
  else if (pains.some(p => /hook|intro|open/.test(p))) title = "Weak hooks"
  else if (pains.some(p => /camera|on-camera|awkward|shy/.test(p))) title = "On‑camera discomfort"
  else if (pains.some(p => /time|busy|no time/.test(p))) title = "Limited time"

  // Pull up to two roadblock solutions and normalize any list hyphens into sentences
  const fixes = (plan?.roadblocks || []).slice(0, 2).map((rb: any) => String(rb?.solution || '')).filter(Boolean)
  const fixSentences: string[] = []
  for (const text of fixes) {
    const lines = String(text)
      .replace(/\r/g, '')
      .split('\n')
      .map(l => l.replace(/^\s*[-•]\s*/, '').trim())
      .filter(Boolean)
    if (lines.length) fixSentences.push(lines.join('. ') + (lines.length ? '.' : ''))
  }
  const fixText = fixSentences.length ? `Here’s how to fix it: ${fixSentences.join(' ')}` : ''

  const desc =
    title === 'Inconsistent posting'
      ? `You’re shipping in bursts, then losing momentum. Commit to tiny, repeatable reps so you can publish even on low‑energy days. ${fixText}`
      : title === 'Unclear content direction'
      ? `Your topics and pillars are fuzzy, which makes drafting slow and inconsistent. Define 3 repeatable formats and collect reference posts. ${fixText}`
      : title === 'Weak hooks'
      ? `Your openings don’t land fast enough. Lead with the outcome or tension in the first two seconds and cut any warm‑up. ${fixText}`
      : title === 'On‑camera discomfort'
      ? `You hesitate to show up on camera, which slows down output. Start with voiceovers and b‑roll to build rhythm, then graduate to short selfie clips. ${fixText}`
      : title === 'Limited time'
      ? `Your calendar is tight, so you need a lightweight cadence. Use templates and batch quick drafts to keep progress moving daily. ${fixText}`
      : `Focus on small, consistent improvements and reuse what works. ${fixText}`

  return { title, detail: desc.trim() }
}

/* ---------------- Public API used by /api/report ---------------- */
export function prepareReportInputs(persona: any, kbText = "") {
  const answers = normalizeAnswers(persona || {})
  const signals = deriveSignals(answers)
  const seeds = chartSeeds(signals)
  const fame = computeFameScore(answers)
  const prompt = buildPrompt({ answers, signals, seeds, fameScore: fame, kbText })
  return { prompt, fame, answers, signals, seeds }
}

export function finalizePlan(rawFromLLM: any, personaOrAnswers: any, fameScore: number) {
  const answers = normalizeAnswers(personaOrAnswers || {})
  const signals = deriveSignals(answers)
  const seeds = chartSeeds(signals)

  // Coerce to UI sections (never missing)
  let plan = coercePlanShape(rawFromLLM, seeds, fameScore)

  // Optional legacy enrichments (safe no-ops for your UI)
  plan = fillFromPersonaIfMissing(plan, personaOrAnswers || {})
  plan = mergeRoadblocksFromPersona(plan, signals)

  plan.fame_score = typeof plan.fame_score === "number" ? plan.fame_score : fameScore
  // Fame breakdown for UI
  try { plan.fame_breakdown = computeFameBreakdown(answers) } catch {}
  // Ensure main problem + detail
  if (!plan.main_problem_detail || plan.main_problem_detail.length < 40) {
    const mp = summarizeMainProblem(signals, plan)
    plan.main_problem = plan.main_problem || mp.title
    plan.main_problem_detail = mp.detail
  }

  // Fill empty sections with sensible defaults so UI never shows blanks
  const ensureSection = (sec: any, kind: string) => {
    const has = !!(sec?.summary) || (Array.isArray(sec?.bullets) && sec.bullets.length)
    if (has) return sec
    const bullets: string[] = []
    let summary = ''
    switch (kind) {
      case 'ai_marketing_psychology':
        summary = 'Use simple psychological cues and clarity to make posts easy to understand and share.'
        bullets.push('Lead with the outcome in 2 seconds', 'Use concrete nouns and verbs', 'Ask one specific question to earn replies')
        break
      case 'foundational_psychology':
        summary = 'Build trust and attention by repeating recognizable patterns and showing social proof.'
        bullets.push('Pick 3 content pillars', 'Repeat hooks that already worked', 'Show quick wins or mini‑case studies')
        break
      case 'platform_specific_strategies':
        summary = 'Focus on 1–2 platforms you can post on daily; mirror what works there.'
        bullets.push('Copy the pacing of top posts', 'Rework one idea into Shorts/Reels/TikTok', 'Use captions to add missing context')
        sec.charts = sec.charts || { platform_focus: seeds.platform_focus }
        break
      case 'content_strategy':
        summary = 'Create repeatable formats so you can ship quickly without losing quality.'
        bullets.push('Define 3 formats you can repeat', 'Keep a swipe file of 20 references', 'Batch 5 drafts on Sunday')
        break
      case 'posting_frequency':
        summary = 'Short, frequent posts beat rare, long ones when you are learning.'
        bullets.push('Post 1 small piece daily for 14 days', 'Review watch‑time on the first 2 seconds', 'Cut slow intros')
        break
      case 'metrics_mindset':
        summary = 'Measure inputs you control and study the first moments of attention.'
        bullets.push('Track posts/week and 2s retention', 'Duplicate patterns from winners', 'Remove low‑ROI tasks for a week')
        break
      case 'mental_health':
        summary = 'Protect energy; treat each post as an experiment, not a verdict.'
        bullets.push('Set a 20‑minute publish window', 'Use templates to reduce friction', 'Celebrate streaks, not views')
        break
    }
    return { ...(sec || {}), summary, bullets }
  }

  plan.sections.ai_marketing_psychology = ensureSection(plan.sections.ai_marketing_psychology, 'ai_marketing_psychology')
  plan.sections.foundational_psychology = ensureSection(plan.sections.foundational_psychology, 'foundational_psychology')
  plan.sections.platform_specific_strategies = ensureSection(plan.sections.platform_specific_strategies, 'platform_specific_strategies')
  plan.sections.content_strategy = ensureSection(plan.sections.content_strategy, 'content_strategy')
  plan.sections.posting_frequency = ensureSection(plan.sections.posting_frequency, 'posting_frequency')
  plan.sections.metrics_mindset = ensureSection(plan.sections.metrics_mindset, 'metrics_mindset')
  plan.sections.mental_health = ensureSection(plan.sections.mental_health, 'mental_health')
  return plan
}
