export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseRoute } from '@/lib/supabaseServer'
import { callClaudeJSONWithRetry } from '@/lib/claude'

export async function POST(req: NextRequest) {
  try {
    const supa = supabaseRoute()
    const { data: { user } } = await supa.auth.getUser()
    if (!user) return NextResponse.json({}, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const percentages = body?.percentages || {}

    const { data: ob } = await supa
      .from('onboarding_sessions')
      .select('answers')
      .eq('user_id', user.id)
      .maybeSingle()

    const answers = ob?.answers || {}

    let resp: Record<string, string> = {}
    try {
      resp = await callClaudeJSONWithRetry<Record<string, string>>({
        prompt: `You are Marketing Mentor. Return JSON only.\n\nGiven the following percentages and onboarding answers, write one thorough paragraph (3–6 sentences) per key explaining what the number likely means, why it might be that way, and 1–2 specific suggestions. Neutral, supportive tone. Keys: overall, consistency, camera_comfort, planning, tech_comfort, audience_readiness, interest_breadth, experimentation. Output must be a flat JSON object with those keys only.\n\nPERCENTAGES:\n${JSON.stringify(percentages, null, 2)}\n\nONBOARDING_ANSWERS:\n${JSON.stringify(answers, null, 2)}\n\nOUTPUT_SCHEMA:\n{"overall":"","consistency":"","camera_comfort":"","planning":"","tech_comfort":"","audience_readiness":"","interest_breadth":"","experimentation":""}`,
        timeoutMs: 55_000,
        maxTokens: 900,
      }, 1)
    } catch (e) {
      // graceful fallback so UI isn't blocked
      const p = (k: string) => `This dimension reflects how you currently approach ${k.replace(/_/g,' ')}. Use a simple weekly ritual and one measurable habit to nudge this upward over the next 14 days.`
      resp = {
        overall: p('overall execution'),
        consistency: p('consistency'),
        camera_comfort: p('on‑camera comfort'),
        planning: p('planning and batching'),
        tech_comfort: p('tooling and editing'),
        audience_readiness: p('audience clarity'),
        interest_breadth: p('topic focus'),
        experimentation: p('experimentation'),
      }
    }

    return NextResponse.json(resp)
  } catch (e: any) {
    return NextResponse.json({}, { status: 200 })
  }
}

