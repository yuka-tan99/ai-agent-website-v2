import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { searchKB } from '@/lib/rag'

type Persona = Record<string, any>

const DASHBOARD_PROMPT = `
You are an expert social media growth strategist. Analyze the user's onboarding answers.
Tone: direct, practical, no fluff.

REQUIRED OUTPUT (JSON ONLY — single object):
{
  "profile_summary": "1 short paragraph on who they are, goal, vibe, current stage.",
  "overall_strategy": "- 3 to 5 bullets.",
  "platform_strategies": [
    { "platform": "TikTok", "strategy": "- 2 to 3 bullets." }
  ],
  "audience_blueprint": "- Who they should target (demographics, interests, psychographics).",
  "content_pillars": ["Pillar A", "Pillar B", "Pillar C"],
  "hook_swipefile": ["Hook example 1", "Hook example 2", "Hook example 3"],
  "cadence_plan": "- Weekly schedule (days, counts, formats).",
  "hashtag_seo": ["keyword or hashtag 1", "keyword or hashtag 2"],
  "collaboration_ideas": ["idea 1", "idea 2"],
  "distribution_playbook": ["cross-posting, repost cadence, newsletter, community drops"],
  "experiments": ["A/B test idea 1", "A/B test idea 2"],
  "timeline_30_60_90": {
    "day_0_30": ["milestone 1", "milestone 2"],
    "day_31_60": ["milestone 3"],
    "day_61_90": ["milestone 4"]
  },
  "weekly_routine": ["Mon: ...", "Tue: ...", "Fri: Review ..."],
  "kpis": {
    "weekly_posts": 10,
    "target_view_rate_pct": 25,
    "target_followers_30d": 1000
  },
  "content_ideas": [
    { "title": "Idea name", "outline": "beats or talking points in 3–5 lines" }
  ],
  "risk_watchouts": ["pitfall 1", "pitfall 2"],
  "next_steps": ["Day 1–3: ...", "Day 4–7: ...", "Day 8–14: ..."],
  "charts": {
    "platform_focus": [{ "name": "TikTok", "value": 40 }],
    "posting_cadence": [
      { "name": "Mon", "posts": 2 }, { "name": "Tue", "posts": 2 },
      { "name": "Wed", "posts": 2 }, { "name": "Thu", "posts": 2 },
      { "name": "Fri", "posts": 3 }, { "name": "Sat", "posts": 1 }, { "name": "Sun", "posts": 1 }
    ],
    "content_type_mix": [
      { "name": "Educational", "value": 50 }, { "name": "Entertainment", "value": 30 }, { "name": "Personal", "value": 20 }
    ],
    "pillar_allocation": [
      { "name": "Pillar A", "value": 40 }, { "name": "Pillar B", "value": 35 }, { "name": "Pillar C", "value": 25 }
    ]
  }
}

Rules:
- Fill EVERY field (make reasonable assumptions if needed).
- Percent charts should ~sum to 100 and align with strategies.
- Keep sentences clean and easy to read.
- Consider answers may be arrays (multi-select).
- Tone: direct, practical, no hype. Output ONLY a single JSON object.
`

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
    },
  }

  if (!input || typeof input !== 'object') return defaults

  const out = { ...defaults, ...input }
  const ensureArr = (v: any, fb: any[]) => (Array.isArray(v) ? v : fb)

  out.platform_strategies = ensureArr(out.platform_strategies, defaults.platform_strategies)
  out.roadblocks = ensureArr(out.roadblocks, defaults.roadblocks)
  out.next_steps = ensureArr(out.next_steps, defaults.next_steps)

  out.charts ||= defaults.charts
  out.charts.platform_focus = ensureArr(out.charts.platform_focus, defaults.charts.platform_focus)
  out.charts.posting_cadence = ensureArr(out.charts.posting_cadence, defaults.charts.posting_cadence)
  out.charts.content_type_mix = ensureArr(out.charts.content_type_mix, defaults.charts.content_type_mix)

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
      strategy:
        p === 'YouTube'
          ? '- 2 Shorts/day.\n- Title = outcome + timeframe.\n- First 2s show result.'
          : '- 1–2 posts/day.\n- Hook in 2s.\n- 3 pillars. Weekly review.',
    }))
  } else {
    // ensure every inferred platform is covered
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
      { issue: 'Inconsistent posting', solution: '- Schedule 14-day cadence.\n- Batch 5 videos today.\n- Post at the same hour.' },
      { issue: 'Weak hooks', solution: '- 10 hook variations per idea.\n- Lead with outcome or tension.\n- Cut first 2 seconds if slow.' },
    ]
  }

  return plan
}

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GOOGLE_API_KEY
    if (!apiKey) return NextResponse.json({ error: 'Missing GOOGLE_API_KEY' }, { status: 500 })

    const body = await req.json().catch(() => ({}))
    const persona: Persona = body.persona || {}

    // Build a targeted RAG query (arrays → strings)
    const flat = (v: any) => (Array.isArray(v) ? v.join(', ') : v || '')
    const query = [flat(persona.goal), flat(persona.creatingAs), flat(persona.identity), flat(persona.topics), flat(persona.reach)]
      .filter(Boolean)
      .join(' | ') || 'social growth strategy basics'

    let kbText = ''
    try {
      const kb = await searchKB(query, 6)
      kbText = Array.isArray(kb) ? kb.map(k => k.content).join('\n---\n') : ''
    } catch { /* ignore RAG errors */ }

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' })

    const prompt = `${DASHBOARD_PROMPT}\n\n### ADDITIONAL KNOWLEDGE\n${kbText}\n\n### USER ANSWERS\n${JSON.stringify({
      answers: persona,
    })}`

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
        topP: 0.9,
        maxOutputTokens: 1200,
        responseMimeType: 'application/json', // <— forces JSON body
      },
    })

    const raw = (result.response.text() || '').trim()
    let parsed: any
    try {
      parsed = raw ? JSON.parse(raw) : null
    } catch {
      console.warn('[api/plan] Non-JSON output, first 300 chars:\n', raw.slice(0, 300))
      parsed = null
    }

    let plan = coercePlanShape(parsed)
    plan = fillFromPersonaIfMissing(plan, persona)

    return NextResponse.json(plan)
  } catch (err: any) {
    console.error('[api/plan] error:', err?.message)
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status: 500 })
  }
}