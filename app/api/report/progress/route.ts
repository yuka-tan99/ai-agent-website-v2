import { NextResponse } from 'next/server'
import { supabaseRoute } from '@/lib/supabaseServer'
import { isLegacyFallbackSection, isLayeredFallbackSection } from '@/lib/reportFallbacks'

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
      const sec = l2.sections as Record<string, any>
      const keys: string[] = ['primaryObstacle','strategicFoundation','personalBrand','marketingStrategy','platformTactics','contentExecution','mentalHealth']
      let readyCount = 0
      const readyMap: Record<string, boolean> = {}
      keys.forEach((k) => {
        const group = sec[k]
        const report = group?.report || group
        const hasSummary = typeof report?.summary === 'string' && report.summary.trim().length > 0
        const items = Array.isArray(report?.addToYourPlan) && report.addToYourPlan.length ? report.addToYourPlan : report?.bullets
        const hasTasks = Array.isArray(items) && items.filter((v: any) => typeof v === 'string' && v.trim()).length >= 3
        const isFallback = group ? isLayeredFallbackSection(k, group) : false
        const ok = !!(group && hasSummary && hasTasks && !isFallback)
        readyMap[k] = ok
        if (ok) readyCount++
      })
      const done = readyCount >= 1
      const pct = done ? 100 : Math.round((readyCount / keys.length) * 95)
      return NextResponse.json({ done, phase: done ? 'done' : 'hydrating', pct, sections: readyMap })
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
      const s = (sections as any)?.[k]
      const summary = typeof s?.summary === 'string' ? s.summary.trim() : ''
      const bullets = Array.isArray(s?.bullets) ? s.bullets.filter((b: any) => typeof b === 'string' && b.trim()).length : 0
      const fallback = isLegacyFallbackSection(k, s)
      const ok = !!(s && summary.length > 0 && bullets > 0 && !fallback)
      ready[k as string] = ok
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
