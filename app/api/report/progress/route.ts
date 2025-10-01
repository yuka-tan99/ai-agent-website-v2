import { NextResponse } from 'next/server'
import { supabaseRoute } from '@/lib/supabaseServer'

export async function GET() {
  const supa = supabaseRoute()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauth' }, { status: 401 })

  const { data: rep } = await supa
    .from('reports')
    .select('plan')
    .eq('user_id', user.id)
    .maybeSingle()

  if (rep?.plan) {
    // If a job is in-flight and not done, prefer job pct for a gradual loader
    const { data: job } = await supa
      .from('report_jobs')
      .select('phase, pct, updated_at')
      .eq('user_id', user.id)
      .maybeSingle()
    if (job && typeof job.pct === 'number' && job.pct < 100) {
      return NextResponse.json({ done: false, phase: job.phase || 'generating', pct: job.pct })
    }

    // Prefer layers_v2 readiness if present
    const l2 = (rep as any).plan?.layers_v2
    if (l2 && l2.sections) {
      const sec = l2.sections
      const keys = ['primaryObstacle','strategicFoundation','personalBrand','monetizationPath','mentalHealth','successMeasurement'] as const
      let readyCount = 0
      keys.forEach((k) => {
        try {
          const r = sec[k]?.report
          if (r && ((Array.isArray(r.bullets) && r.bullets.length > 0) || (r.title && String(r.title).trim().length > 0))) {
            readyCount++
          }
        } catch {}
      })
      const done = readyCount >= 1
      const pct = done ? 100 : Math.round((readyCount / keys.length) * 95)
      return NextResponse.json({ done, phase: done ? 'done' : 'hydrating', pct })
    }

    // Legacy readiness fallback
    const sections = rep.plan?.sections || {}
    const keys = [
      'ai_marketing_psychology',
      'foundational_psychology',
      'platform_specific_strategies',
      'content_strategy',
      'posting_frequency',
      'metrics_mindset',
      'mental_health',
    ] as const
    const ready: Record<string, boolean> = {}
    let count = 0
    keys.forEach((k) => {
      const s = sections?.[k]
      const ok = !!(s && Array.isArray(s.bullets) && s.bullets.length > 0)
      ready[k] = ok
      if (ok) count++
    })
    const hasAny = count >= 1
    const pct = hasAny ? 100 : Math.round((count / keys.length) * 95)
    const phase = hasAny ? 'done' : 'hydrating'
    return NextResponse.json({ done: hasAny, phase, pct, sections: ready })
  }
const { data: job } = await supa
    .from('report_jobs')
    .select('phase, pct, updated_at')
    .eq('user_id', user.id)
    .maybeSingle()

  return NextResponse.json({
    done: false,
    phase: job?.phase || 'queued',
    pct: typeof job?.pct === 'number' ? job.pct : 0,
    updated_at: job?.updated_at || null,
  })
}
