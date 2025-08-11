// app/api/plan/route.ts
import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { searchKB } from '@/lib/rag'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Persona = Record<string, any>

// -----------------------------
// Utilities
// -----------------------------
function asArray(v: any): string[] { return !v ? [] : Array.isArray(v) ? v : [v] }

// Loosened JSON parser for LLM output that may have code fences, smart quotes, trailing commas, etc.
function parseModelJsonLoose(text: string) {
  if (!text) return null
  let s = text.trim()

  // strip code fences
  s = s.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '')

  // replace smart quotes with straight quotes
  s = s.replace(/[\u201C\u201D]/g, '"').replace(/[\u2018\u2019]/g, "'")

  // if it's not a pure object, slice the largest {...} span
  if (!(s.startsWith('{') && s.endsWith('}'))) {
    const first = s.indexOf('{')
    const last = s.lastIndexOf('}')
    if (first !== -1 && last !== -1 && last > first) {
      s = s.slice(first, last + 1)
    }
  }

  // try parse
  try {
    return JSON.parse(s)
  } catch {
    // remove trailing commas before } or ]
    const noTrailingCommas = s
      .replace(/,\s*([}\]])/g, '$1')
      // collapse stray newlines inside strings (rare LLM glitch)
      .replace(/\r/g, '')
    try {
      return JSON.parse(noTrailingCommas)
    } catch {
      return null
    }
  }
}

// -----------------------------
// Normalization + signals
// -----------------------------
function normalizeAnswers(p: Persona) {
  return {
    creatingAs: p.creatingAs || '',
    identity: p.identity || '',
    goals: asArray(p.goal),
    platformFocus: asArray(p.platforms || p.platformFocus || p.focusPlatforms),
    topics: asArray(p.topics),
    trends: asArray(p.trends),
    creativity: asArray(p.creativity),
    reach: asArray(p.reach),
    face: Array.isArray(p.face) ? p.face.join(', ') : (p.face || ''),      // string
    camera: Array.isArray(p.camera) ? p.camera.join(', ') : (p.camera || ''), // string
    stuckReason: asArray(p.stuckReason),
  }
}

function deriveSignals(a: ReturnType<typeof normalizeAnswers>) {
  const wantsFace = a.face.toLowerCase().includes('yes')
  const cam = a.camera.toLowerCase()
  const cameraComfort =
    cam.includes('love') ? 'high' :
    cam.includes('okay') ? 'medium' :
    cam.includes('awk') || cam.includes('no') ? 'low' : 'unknown'

  const id = a.identity
  const stage =
    id.includes('zero') ? 'new' :
    id.includes('small') ? 'early' :
    id.includes('stuck') ? 'stalled' :
    id.includes('large') ? 'scaled' : 'unknown'

  const platforms = a.platformFocus.length ? a.platformFocus : ['TikTok', 'Instagram', 'YouTube', 'Pinterest']

  return {
    stage, wantsFace, cameraComfort, platforms,
    goals: a.goals,
    audienceHints: a.reach,
    contentInterests: [...a.topics, ...a.trends, ...a.creativity],
    userPainPoints: a.stuckReason,
  }
}

function chartSeeds(sig: ReturnType<typeof deriveSignals>) {
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

function mergeRoadblocksFromPersona(plan: any, sig: ReturnType<typeof deriveSignals>) {
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
  const merged = [...userRB, ...aiRB]
  plan.roadblocks = merged.length ? merged : [{
    issue: 'Inconsistent posting',
    solution: '- Batch on Sundays\n- Schedule daily publish window\n- Track streak',
  }]
  return plan
}

// -----------------------------
// Prompt + shaping
// -----------------------------
const DASHBOARD_PROMPT = `
You are an expert social growth strategist and dashboard designer.
You will receive:
1) RAW_ONBOARDING_ANSWERS
2) DERIVED_SIGNALS
3) CHART_SEEDS
4) OPTIONAL_KB
Use ALL relevant answers explicitly. Output JSON only.

OUTPUT SHAPE:
{
  "profile_summary": "string",
  "overall_strategy": "string or string[]",
  "platform_strategies": [{ "platform": "TikTok", "strategy": "string or string[]" }],
  "roadblocks": [{ "issue": "string", "solution": "string or string[]" }],
  "next_steps": ["..."],
  "audience_blueprint": "string",
  "content_pillars": ["..."],
  "hook_swipefile": ["..."],
  "cadence_plan": "string",
  "hashtag_seo": ["..."],
  "collaboration_ideas": ["..."],
  "distribution_playbook": ["..."],
  "experiments": ["..."],
  "timeline_30_60_90": { "day_0_30": ["..."], "day_31_60": ["..."], "day_61_90": ["..."] },
  "weekly_routine": ["..."],
  "kpis": { "weekly_posts":  number, "target_view_rate_pct": number, "target_followers_30d": number },
  "charts": {
    "platform_focus": [{ "name": "TikTok", "value": 40 }],
    "posting_cadence": [{ "name": "Mon", "posts": 2 }],
    "content_type_mix": [{ "name": "Educational", "value": 50 }],
    "pillar_allocation": [{ "name": "Pillar A", "value": 40 }]
  }
}
Rules: Align with signals + seeds, keep tone direct.`

function coercePlanShape(input: any) {
  const defaults = {
    profile_summary: 'Unable to generate right now.',
    overall_strategy: '- Post daily short-form.\n- Optimize hooks.\n- Review weekly.',
    platform_strategies: [] as { platform: string; strategy: string }[],
    roadblocks: [] as { issue: string; solution: string }[],
    next_steps: ['Day 1–3: Define 3 pillars', 'Day 4–7: Batch 5 posts', 'Day 8–14: Post daily, review'],
    charts: {
      platform_focus: [
        { name: 'TikTok', value: 50 },
        { name: 'Instagram', value: 30 },
        { name: 'YouTube', value: 20 },
      ],
      posting_cadence: [
        { name: 'Mon', posts: 2 }, { name: 'Tue', posts: 2 }, { name: 'Wed', posts: 2 },
        { name: 'Thu', posts: 2 }, { name: 'Fri', posts: 3 }, { name: 'Sat', posts: 1 }, { name: 'Sun', posts: 1 },
      ],
      content_type_mix: [
        { name: 'Educational', value: 50 },
        { name: 'Entertainment', value: 30 },
        { name: 'Personal', value: 20 },
      ],
      pillar_allocation: [] as { name: string; value: number }[],
    },
  }
  if (!input || typeof input !== 'object') return defaults

  // join arrays if model returned them
  const joinLines = (v: any) =>
    Array.isArray(v) ? v.map((s: any) => String(s)).join('\n- ') : String(v || '').trim()

  const out: any = { ...defaults, ...input }
  if (out.overall_strategy) out.overall_strategy = '- ' + joinLines(out.overall_strategy).replace(/^\-+\s*/, '')
  if (Array.isArray(out.platform_strategies)) {
    out.platform_strategies = out.platform_strategies.map((it: any) => ({
      platform: it.platform,
      strategy: '- ' + joinLines(it.strategy || '').replace(/^\-+\s*/, ''),
    }))
  }
  if (Array.isArray(out.roadblocks)) {
    out.roadblocks = out.roadblocks.map((r: any) => ({
      issue: String(r.issue || ''),
      solution: '- ' + joinLines(r.solution || '').replace(/^\-+\s*/, ''),
    }))
  }

  const ensureArr = (v: any, fb: any[]) => (Array.isArray(v) ? v : fb)
  out.platform_strategies = ensureArr(out.platform_strategies, defaults.platform_strategies)
  out.roadblocks = ensureArr(out.roadblocks, defaults.roadblocks)
  out.next_steps = ensureArr(out.next_steps, defaults.next_steps)

  out.charts ||= defaults.charts
  out.charts.platform_focus = ensureArr(out.charts.platform_focus, defaults.charts.platform_focus)
  out.charts.posting_cadence = ensureArr(out.charts.posting_cadence, defaults.charts.posting_cadence)
  out.charts.content_type_mix = ensureArr(out.charts.content_type_mix, defaults.charts.content_type_mix)
  out.charts.pillar_allocation = ensureArr(out.charts.pillar_allocation, defaults.charts.pillar_allocation)
  return out
}

function inferPlatforms(persona: Persona): string[] {
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

function fillFromPersonaIfMissing(plan: any, persona: Persona) {
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

// -----------------------------
// Route
// -----------------------------
export async function POST(req: Request) {
  try {
    // Toggle paywall if you want (Preview can set PAYWALL_ENABLED=false)
    if (process.env.PAYWALL_ENABLED === 'true') {
      return NextResponse.json({ error: 'Payment required — paywall is enabled' }, { status: 402 })
    }

    const apiKey = process.env.GOOGLE_API_KEY
    if (!apiKey) return NextResponse.json({ error: 'Missing GOOGLE_API_KEY' }, { status: 500 })

    const body = await req.json().catch(() => ({}))
    const persona: Persona = body.persona || {}

    const flat = (v: any) => (Array.isArray(v) ? v.join(', ') : v || '')
    const query = [flat(persona.goal), flat(persona.creatingAs), flat(persona.identity), flat(persona.topics), flat(persona.reach)]
      .filter(Boolean).join(' | ') || 'social growth strategy basics'

    let kbText = ''
    try {
      const kb = await searchKB(query, 6)
      kbText = Array.isArray(kb) ? kb.map(k => k.content).join('\n---\n') : ''
    } catch { /* ignore RAG errors */ }

    const answers = normalizeAnswers(persona)
    const signals = deriveSignals(answers)
    const seeds = chartSeeds(signals)

    const prompt =
`${DASHBOARD_PROMPT}
### RAW_ONBOARDING_ANSWERS
${JSON.stringify(answers, null, 2)}
### DERIVED_SIGNALS
${JSON.stringify(signals, null, 2)}
### CHART_SEEDS
${JSON.stringify(seeds, null, 2)}
### OPTIONAL_KB
${kbText || '(none)'}`

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' })

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
        topP: 0.9,
        maxOutputTokens: 1800,          // a bit more room
        responseMimeType: 'application/json',
      },
    })

    const raw = (result.response.text() || '').trim()

    // 🔧 robust parsing
    let parsed: any = parseModelJsonLoose(raw)

    if (!parsed) {
      console.warn('[api/plan] Non-JSON (showing first 300 chars):\n', raw.slice(0, 300))
    }

    // shape + fill + enforce charts and roadblocks
    let plan = coercePlanShape(parsed)
    plan = fillFromPersonaIfMissing(plan, persona)
    plan.charts = {
      platform_focus: plan.charts?.platform_focus ?? seeds.platform_focus,
      posting_cadence: plan.charts?.posting_cadence ?? seeds.posting_cadence,
      content_type_mix: plan.charts?.content_type_mix ?? seeds.content_type_mix,
      pillar_allocation: plan.charts?.pillar_allocation ?? [],
    }
    plan = mergeRoadblocksFromPersona(plan, signals)

    return NextResponse.json(plan)
  } catch (err: any) {
    console.error('[api/plan] error:', err?.message)
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status: 500 })
  }
}