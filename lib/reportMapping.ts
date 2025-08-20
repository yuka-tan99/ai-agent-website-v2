// lib/reportMapping.ts
export type Persona = Record<string, any>

const asArray = (v: any): string[] => (!v ? [] : Array.isArray(v) ? v : [v])

// --- Normalize answers coming from the onboarding ---
export function normalizeAnswers(p: Persona) {
  return {
    creatingAs: p.creatingAs || '',
    identity: p.identity || '',
    goals: asArray(p.goal),
    platforms: asArray(p.platforms || p.platformFocus || p.focusPlatforms),
    topics: asArray(p.topics),
    trends: asArray(p.trends),
    creativity: asArray(p.creativity),
    reach: asArray(p.reach),
    face: Array.isArray(p.face) ? p.face.join(', ') : (p.face || ''),
    camera: Array.isArray(p.camera) ? p.camera.join(', ') : (p.camera || ''),
    vibe: asArray(p.vibe || p.friendsDescribe || p.personality),
    planVsWing: p.planVsWing || '',
    contentEnjoyMaking: asArray(p.contentEnjoyMaking),
    contentLoveWatching: asArray(p.contentLoveWatching),
    timeAvailable: p.timeAvailable || '',
    techComfort: p.techComfort || '',
    feedbackApproach: p.feedbackApproach || '',
    holdingBack: asArray(p.holdingBack),
    triedButDidntWork: asArray(p.triedButDidntWork),
    monetizationMethods: asArray(p.monetizationMethods),
  }
}

// --- Derive signals the model should respect ---
export function deriveSignals(a: ReturnType<typeof normalizeAnswers>) {
  const wantsFace = a.face.toLowerCase().includes('yes')
  const cam = a.camera.toLowerCase()
  const cameraComfort =
    cam.includes('love') ? 'high'
      : cam.includes('okay') ? 'medium'
      : cam.includes('awk') || cam.includes('no') ? 'low'
      : 'unknown'

  const id = a.identity.toLowerCase()
  const stage =
    id.includes('zero') ? 'new'
      : id.includes('small') ? 'early'
      : id.includes('stuck') ? 'stalled'
      : id.includes('large') ? 'scaled'
      : id.includes('pivot') ? 'pivot'
      : 'unknown'

  const platforms = a.platforms.length ? a.platforms : ['TikTok', 'Instagram', 'YouTube', 'Pinterest']

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

// --- Seed chart data to guarantee visuals even if LLM omits ---
export function chartSeeds(sig: ReturnType<typeof deriveSignals>) {
  const base = sig.platforms
  const slice = base.length ? Math.round(100 / base.length) : 25
  const platform_focus = base.map((name, i) => ({ name, value: i === 0 ? 100 - slice * (base.length - 1) : slice }))
  const posting_cadence = [
    { name: 'Mon', posts: sig.stage === 'new' ? 2 : 1 },
    { name: 'Tue', posts: sig.stage === 'new' ? 2 : 1 },
    { name: 'Wed', posts: sig.stage === 'new' ? 2 : 1 },
    { name: 'Thu', posts: sig.stage === 'new' ? 2 : 1 },
    { name: 'Fri', posts: sig.stage === 'new' ? 3 : 2 },
    { name: 'Sat', posts: 1 },
    { name: 'Sun', posts: 1 },
  ]
  const content_type_mix = [
    { name: 'Educational', value: sig.contentInterests.some(s => /education|tips|how/i.test(s)) ? 45 : 30 },
    { name: 'Entertainment', value: 30 },
    { name: 'Personal', value: 25 },
  ]
  return { platform_focus, posting_cadence, content_type_mix }
}

// --- Prompt builder that injects mapping + KB ---
export function buildPrompt(mapping: {
  answers: ReturnType<typeof normalizeAnswers>,
  signals: ReturnType<typeof deriveSignals>,
  seeds: ReturnType<typeof chartSeeds>,
  kbText?: string
}) {
const DASHBOARD_PROMPT = `
You’re a friendly, plain-spoken social growth strategist. Be direct, helpful, and human. Avoid corporate/robotic tone.
Use the user’s answers. If something is missing, make ONE reasonable assumption once in the profile area.

PLATFORM LABELS (use EXACTLY these; at most once each if relevant):
YouTube, Instagram, TikTok, Twitter/X, LinkedIn, Facebook, Pinterest, Twitch

OUTPUT (JSON ONLY; no markdown fences). Keep language simple and useful:

{
  "your_niche": "One paragraph on niche angle and who it resonates with.",
  "platform_strategies": [
    { "platform": "TikTok", "strategy": "- 3–6 bullets customized to persona" }
  ],
  "your_roadblocks_and_fix": [
    { "issue": "string", "solution": "- step1\\n- step2\\n- step3" }
  ],
  "engagement_stage": "one of: new, early, stalled, scaled, pivot, unknown",
  "strategy_type": "one of: plan-first, wing-it, hybrid",
  "theory": ["Folder idea 1","Folder idea 2","Folder idea 3"],
  "practical_advice": {
    "low_effort_examples": ["Example 1","Example 2","Example 3"],
    "high_effort_examples": ["Example 1","Example 2"]
  },
  "overall_strategy": "- 4–8 short bullets tied to answers.",
  "next_steps": ["Day 1–3 ...", "Day 4–7 ...", "Week 2 ..."],
  "audience_blueprint": "4–8 lines describing target segments and why.",
  "content_pillars": ["Pillar A","Pillar B","Pillar C"],
  "hook_swipefile": ["Hook 1","Hook 2","Hook 3"],
  "cadence_plan": "Specific weekly posting counts aligned to camera comfort and stage.",
  "hashtag_seo": ["keyword 1","keyword 2"],
  "collaboration_ideas": ["idea 1","idea 2"],
  "distribution_playbook": ["cross-post cadence, newsletter, communities"],
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
- Use platform labels exactly as listed (e.g., "Twitter/X" not "twitter/x").
- Don’t duplicate a platform in platform_strategies.
- Roadblocks must be unique by issue and short.
- Keep sentences short and clear. No fluff.
`

  return `${DASHBOARD_PROMPT}

### RAW_ONBOARDING_ANSWERS
${JSON.stringify(mapping.answers, null, 2)}

### DERIVED_SIGNALS
${JSON.stringify(mapping.signals, null, 2)}

### CHART_SEEDS
${JSON.stringify(mapping.seeds, null, 2)}

### OPTIONAL_KB
${mapping.kbText || '(none)'}`
}

// --- Shape & fallback helpers ---
function coercePlanShape(input: any) {
  const defaults = {
    your_niche: "",
    your_roadblocks_and_fix: [] as { issue: string; solution: string }[],
    platform_strategies: [] as { platform: string; strategy: string }[],
    engagement_stage: "unknown",
    strategy_type: "hybrid",
    theory: [] as string[],
    practical_advice: {
      low_effort_examples: [] as string[],
      high_effort_examples: [] as string[],
    },
    overall_strategy: "- Post daily short-form.\n- Optimize hooks.\n- Review weekly.",
    roadblocks: [] as { issue: string; solution: string }[], // keep for backward compat
    next_steps: [
      "Day 1–3: Define 3 pillars",
      "Day 4–7: Batch 5 posts",
      "Day 8–14: Post daily, review",
    ],
    audience_blueprint: "",
    content_pillars: [] as string[],
    hook_swipefile: [] as string[],
    cadence_plan: "",
    hashtag_seo: [] as string[],
    collaboration_ideas: [] as string[],
    distribution_playbook: [] as string[],
    experiments: [] as string[],
    timeline_30_60_90: { day_0_30: [] as string[], day_31_60: [] as string[], day_61_90: [] as string[] },
    weekly_routine: [] as string[],
    kpis: { weekly_posts: 10, target_view_rate_pct: 25, target_followers_30d: 1000 },
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
  }

  if (!input || typeof input !== "object") return defaults

  // shallow merge
  const out: any = { ...defaults, ...input }

  // defensive array/shape guards
  const ensureArr = (v: any, fb: any[]) => (Array.isArray(v) ? v : fb)
  out.platform_strategies = ensureArr(out.platform_strategies, defaults.platform_strategies)
  out.your_roadblocks_and_fix = ensureArr(out.your_roadblocks_and_fix, defaults.your_roadblocks_and_fix)
  out.theory = ensureArr(out.theory, defaults.theory)
  out.next_steps = ensureArr(out.next_steps, defaults.next_steps)
  out.audience_blueprint ||= defaults.audience_blueprint
  out.content_pillars = ensureArr(out.content_pillars, defaults.content_pillars)
  out.hook_swipefile = ensureArr(out.hook_swipefile, defaults.hook_swipefile)
  out.hashtag_seo = ensureArr(out.hashtag_seo, defaults.hashtag_seo)
  out.collaboration_ideas = ensureArr(out.collaboration_ideas, defaults.collaboration_ideas)
  out.distribution_playbook = ensureArr(out.distribution_playbook, defaults.distribution_playbook)
  out.experiments = ensureArr(out.experiments, defaults.experiments)
  out.timeline_30_60_90 ||= defaults.timeline_30_60_90
  out.weekly_routine = ensureArr(out.weekly_routine, defaults.weekly_routine)
  out.kpis ||= defaults.kpis

  out.practical_advice ||= defaults.practical_advice
  out.practical_advice.low_effort_examples = ensureArr(out.practical_advice.low_effort_examples, defaults.practical_advice.low_effort_examples)
  out.practical_advice.high_effort_examples = ensureArr(out.practical_advice.high_effort_examples, defaults.practical_advice.high_effort_examples)

  out.charts ||= defaults.charts
  out.charts.platform_focus = ensureArr(out.charts.platform_focus, defaults.charts.platform_focus)
  out.charts.posting_cadence = ensureArr(out.charts.posting_cadence, defaults.charts.posting_cadence)
  out.charts.content_type_mix = ensureArr(out.charts.content_type_mix, defaults.charts.content_type_mix)
  out.charts.pillar_allocation = ensureArr(out.charts.pillar_allocation, defaults.charts.pillar_allocation)

  // Backward compat: if an older model filled "roadblocks", mirror into your_roadblocks_and_fix on empty
  if (!out.your_roadblocks_and_fix?.length && Array.isArray(out.roadblocks)) {
    out.your_roadblocks_and_fix = out.roadblocks
  }

  return out
}

export function inferPlatforms(persona: Persona): string[] {
  const list: string[] = []
  const from = (...xs: any[]) => xs.flat().filter(Boolean).map((s: string) => s.toLowerCase()).join(' ')
  const blob = from(persona.platforms, persona.goal, persona.topics, persona.creatingAs)
  if (blob.includes('youtube')) list.push('YouTube')
  if (blob.includes('instagram')) list.push('Instagram')
  if (blob.includes('tiktok')) list.push('TikTok')
  if (blob.includes('pinterest')) list.push('Pinterest')
  if (list.length === 0) list.push('TikTok', 'Instagram')
  return Array.from(new Set(list)).slice(0, 4)
}

export function fillFromPersonaIfMissing(plan: any, persona: Persona) {
  const platforms = inferPlatforms(persona)
  if (!Array.isArray(plan.platform_strategies) || plan.platform_strategies.length === 0) {
    plan.platform_strategies = platforms.map(p => ({
      platform: p,
      strategy: p === 'YouTube'
        ? '- 2 Shorts/day.\n- Title = outcome + timeframe.\n- First 2s show result.'
        : '- 1–2 posts/day.\n- Hook in 2s.\n- 3 pillars. Weekly review.',
    }))
  } else {
    const have = new Set(plan.platform_strategies.map((s: any) => s.platform))
    platforms.forEach(p => {
      if (!have.has(p)) {
        plan.platform_strategies.push({
          platform: p,
          strategy: '- 1–2 posts/day.\n- Tight hooks.\n- Batch record.\n- Analyze weekly.',
        })
      }
    })
  }
  if (!Array.isArray(plan.roadblocks) || plan.roadblocks.length === 0) {
    plan.roadblocks = [
      { issue: 'Inconsistent posting', solution: '- Schedule 14-day cadence.\n- Batch 5 videos today.\n- Post same hour.' },
      { issue: 'Weak hooks', solution: '- 10 hook variations per idea.\n- Outcome/tension first.\n- Cut first 2s if slow.' },
    ]
  }
  return plan
}

export function mergeRoadblocksFromPersona(plan: any, sig: ReturnType<typeof deriveSignals>) {
  const mapped = (issue: string) => {
    if (/hook|intro|open/i.test(issue)) return {
      issue: 'Weak hooks',
      solution: '- Write 10 hook variants per idea\n- Lead with outcome/tension in first 2s\n- Cut first 2s if no action\n- Test 3 thumbnails/titles weekly',
    }
    if (/inconsistent|consisten|schedule|routine/i.test(issue)) return {
      issue: 'Inconsistent posting',
      solution: '- Batch 5–10 clips every Sun (90 min)\n- Schedule with a simple calendar\n- Set daily 20-min “publish window”\n- Track streak; reset weekly targets',
    }
    if (/idea|what to post|uninspired/i.test(issue)) return {
      issue: 'Not sure what to post',
      solution: '- Define 3 content pillars from onboarding interests\n- Save 20 reference videos this week\n- Turn each into 3 remixes (A/B hooks)\n- Keep an ideas doc; add 5/day',
    }
    if (/camera|on-camera|awkward|shy/i.test(issue)) return {
      issue: 'On-camera discomfort',
      solution: '- Start with voiceover + b-roll for 2 weeks\n- Record 3 selfie drafts/day, publish 1\n- Script beats: Hook → 3 points → CTA\n- Eye-level framing + natural light',
    }
    return {
      issue: issue || 'Execution gaps',
      solution: '- Set weekly targets (posts/watchtime)\n- Duplicate patterns from top 10% posts\n- Cut low-ROI tasks for 14 days\n- End every session with next 3 actions',
    }
  }

  const userRB = sig.userPainPoints?.map(mapped) || []
  const aiRB = Array.isArray(plan.roadblocks) ? plan.roadblocks : []
  plan.roadblocks = [...userRB, ...aiRB]
  return plan
}