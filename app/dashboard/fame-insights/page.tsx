export const dynamic = 'force-dynamic'

// Use a plain anchor to avoid Link's client-hook context in this server page
import { redirect } from 'next/navigation'
import { supabaseServer } from '@/lib/supabaseServer'
import FadeIn from '@/components/FadeIn'

async function hasAccess(userId: string) {
  const supa = await supabaseServer()
  const { data } = await supa
    .from('onboarding_sessions')
    .select('purchase_status')
    .eq('user_id', userId)
    .maybeSingle()
  return data?.purchase_status === 'paid'
}

export default async function FameInsightsPage() {
  const supa = await supabaseServer()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) redirect('/signin')

  const { data: rep } = await supa
    .from('reports')
    .select('plan')
    .eq('user_id', user.id)
    .maybeSingle()

  // If no plan found, require access; otherwise show friendly message
  if (!rep?.plan) {
    const access = await hasAccess(user.id)
    if (!access) redirect('/paywall')
    return (
      <main className="container py-8">
        <FadeIn>
          <div className="mb-4">
            <a href="/dashboard" className="inline-flex items-center h-11 px-2 rounded-md gap-2 text-base text-gray-700 hover:text-[var(--accent-grape)] hover:font-semibold transition-colors">← back</a>
          </div>
          <div className="dashboard-card p-6 text-center">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">no report yet</h2>
            <p className="text-sm text-gray-600 mb-4">We couldn’t find your plan on this session. Head back to your dashboard to generate or view it.</p>
            <a href="/dashboard" className="inline-flex items-center justify-center rounded-full bg-[var(--accent-grape)] text-white px-5 py-2 hover:bg-[#874E95] transition">go to dashboard</a>
          </div>
        </FadeIn>
      </main>
    )
  }

  const plan: any = rep.plan
  const breakdown: Array<{ key: string; label: string; percent: number }> = Array.isArray(plan.fame_breakdown) ? plan.fame_breakdown : []

  const getPct = (k: string) => breakdown.find(b => b.key === k)?.percent ?? 0
  const sections = [
    {
      id: 'overall',
      title: `overall: ${Math.round(plan.fame_score ?? 0)}%`,
      desc: `Your overall fame potential reflects your current consistency, comfort on camera, and how well your content style matches your audience. This score blends the core habits that lead to momentum with the clarity of your niche. Keep sharpening what works, and use small experiments each week to steadily raise your average.`,
      icon: 'overall'
    },
    {
      id: 'consistency',
      title: `title consistency: ${Math.round(getPct('consistency'))}%`,
      desc: `This measures how reliably you show up with a repeatable process. Higher consistency makes algorithms trust your account and helps your audience remember you. If your score is lower, try a lighter cadence with clear boundaries (e.g., 1 small post a day for 14 days) and use templates to reduce friction.`,
      icon: 'consistency'
    },
    {
      id: 'camera_comfort',
      title: `camera comfort: ${Math.round(getPct('camera_comfort'))}%`,
      desc: `Being comfortable on camera boosts watch time and makes your ideas feel more personal. If you’re not fully there yet, start with voiceover + b‑roll, then move to short selfie clips. Keep the energy natural, focus on clarity, and aim for a friendly first two seconds.`,
      icon: 'camera'
    },
    {
      id: 'experimentation',
      title: `experimentation: ${Math.round(getPct('experimentation'))}%`,
      desc: `Experimentation is your learning engine. Small tests (hooks, openings, formats) help you find patterns that consistently work. If this score is modest, try one micro‑experiment per post (e.g., hook variant) and review which version held attention best. Keep the winners, retire the rest.`,
      icon: 'lab'
    },
    {
      id: 'planning',
      title: `planning: ${Math.round(getPct('planning'))}%`,
      desc: `Planning reflects how much your process uses simple calendars, batching, and reusable formats. A solid plan lowers decision fatigue and keeps quality consistent even on busy days. Start small—one weekly batch session and a 14‑day posting calendar.`,
      icon: 'calendar'
    },
    {
      id: 'tech_comfort',
      title: `tech comfort: ${Math.round(getPct('tech_comfort'))}%`,
      desc: `Tech comfort measures how smoothly you edit, publish, and analyze content. The easier the tools feel, the more ideas you can ship. Choose one editing workflow and master it before adding complexity.`,
      icon: 'gear'
    },
    {
      id: 'audience_readiness',
      title: `audience readiness: ${Math.round(getPct('audience_readiness'))}%`,
      desc: `Audience readiness captures how clearly you’ve defined who you’re talking to and where they hang out. Clear, narrow audience definitions make hooks sharper and growth faster. Start by writing a one‑sentence description of the person you want to help.`,
      icon: 'users'
    },
    {
      id: 'interest_breadth',
      title: `interest breadth: ${Math.round(getPct('interest_breadth'))}%`,
      desc: `Interest breadth looks at how many topics you can credibly explore without losing clarity. Too broad makes messaging fuzzy; too narrow can stall creativity. Keep 2–3 pillars and remix angles within them.`,
      icon: 'layers'
    },
  ]

  return (
    <main className="container py-8">
      <FadeIn>
        <div className="mb-4">
          <a href="/dashboard" className="inline-flex items-center h-11 px-2 rounded-md gap-2 text-base text-gray-700 hover:text-[var(--accent-grape)] hover:font-semibold transition-colors">← back</a>
        </div>
        <div className="text-center mb-6">
          <h1 className="report-title">understand your fame potential score</h1>
          <div className="report-subtitle">a friendly breakdown of your strengths and simple next steps</div>
        </div>

        {/* One-time expert assessment generated during report creation */}
        {plan.fame_assessment && (
          <div className="dashboard-card p-5 mb-6">
            <div className="text-sm uppercase tracking-wide text-gray-500 mb-2">expert assessment</div>
            <p className="text-gray-800 leading-relaxed">{plan.fame_assessment}</p>
          </div>
        )}

        {/* Sections with fixed meanings + per-section insights generated at report time */}
        <div className="max-w-3xl mx-auto space-y-4">
          {sections.map((s) => (
            <details key={s.id} className="dashboard-card p-4">
              <summary className="cursor-pointer list-none flex items-center justify-between">
                <span className="font-semibold text-gray-900 flex items-center gap-3">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-purple-400" aria-hidden />
                  {s.title}
                </span>
                <span className="text-xl">+</span>
              </summary>
              <div className="mt-3 text-gray-800 leading-relaxed space-y-3">
                <p>{s.desc}</p>
                {plan.fame_section_insights?.[s.id] && (
                  <p className="text-gray-700">{plan.fame_section_insights[s.id]}</p>
                )}
              </div>
            </details>
          ))}
        </div>
      </FadeIn>
    </main>
  )
}
