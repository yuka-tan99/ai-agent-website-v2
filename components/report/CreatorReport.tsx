'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Section from './Section'
// import TOC from './TOC'
import CopyButton from './CopyButton'
import { PlatformPie, CadenceBar } from '@/components/Charts'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabaseClient'
import DesignStyles from '@/components/DesignStyles' // [ADD]

type Plan = {
  your_niche: string
  platform_strategies: { platform: string; strategy: string }[]
  your_roadblocks_and_fix: { issue: string; solution: string }[]
  engagement_stage?: string
  engagement_stage_note?: string
  strategy_type?: string
  strategy_type_note?: string
  theory: string[]
  practical_advice: { low_effort_examples?: string[]; high_effort_examples?: string[] }
  next_steps: string[]
  content_ideas?: { title: string; outline: string }[]
  risk_watchouts?: string[]
  monetization_plan?: string[]
  time_budget_note?: string
  skill_upgrades?: string[]
  feedback_approach?: string
  charts?: {
    platform_focus?: { name: string; value: number }[]
    posting_cadence?: { name: string; posts: number }[]
    content_type_mix?: { name: string; value: number }[]
    pillar_allocation?: { name: string; value: number }[]
  }
  kpis?: { weekly_posts?: number; target_view_rate_pct?: number; target_followers_30d?: number }
}

// ---- helper: don’t let a weak/empty response clobber a good one
function isValidPlan(p: any): p is Plan {
  return !!p && typeof p === 'object' && Array.isArray(p.platform_strategies) && p.platform_strategies.length > 0
}

export default function CreatorReport() {
  const [data, setData] = useState<Plan | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [authed, setAuthed] = useState<boolean | null>(null)
  const sb = supabaseBrowser()
  const router = useRouter()
  const ranOnce = useRef(false)
  const CACHE_KEY = "report_cache_v1";

  // auth state
  useEffect(() => {
    let unsub: (() => void) | undefined
    sb.auth.getUser().then(({ data }) => setAuthed(!!data.user))
    const sub = sb.auth.onAuthStateChange((_e, s) => setAuthed(!!s?.user))
    unsub = () => sub?.data?.subscription?.unsubscribe?.()
    return () => { try { unsub?.() } catch {} }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // load saved plan, else generate
useEffect(() => {
  if (ranOnce.current) return;
  ranOnce.current = true;

  // 1) Try cached plan for instant paint
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (isValidPlan(parsed)) {
        setData(parsed);
        setLoading(false); // <- instant render
      }
    }
  } catch {}

  // 2) Always try server for freshness (non-blocking if we already rendered)
  (async () => {
    try {
      // Prefer saved server copy
      const saved = await fetch('/api/report', { cache: 'no-store' });
      if (saved.ok) {
        const { plan } = await saved.json();
        if (plan && isValidPlan(plan)) {
          setData(plan);
          try { localStorage.setItem(CACHE_KEY, JSON.stringify(plan)); } catch {}
          setLoading(false);
          return;
        }
      }

      // Otherwise generate (only if we had nothing)
      if (!data) {
        const persona = JSON.parse(localStorage.getItem('onboarding') || '{}');
        const links = JSON.parse(localStorage.getItem('social_links') || '[]');
        const res = await fetch('/api/plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ persona, links }),
          cache: 'no-store',
        });
        if (!res.ok) throw new Error(`Generation failed (${res.status})`);
        const json = await res.json();
        if (isValidPlan(json)) {
          setData(json);
          try { localStorage.setItem(CACHE_KEY, JSON.stringify(json)); } catch {}
        }
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to load plan');
    } finally {
      setLoading(false);
    }
  })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);

  // const rightRail = useMemo(
  //   () => (
  //     <TOC
  //       items={[
  //         ['niche', 'Your Niche'],
  //         ['roadblocks', 'Roadblocks & Fixes'],
  //         ['platforms', 'Platform Strategies'],
  //         ['engagement', 'Engagement Stage'],
  //         ['strategy', 'Strategy Type'],
  //         ['theory', 'Theory'],
  //         ['advice', 'Practical Advice'],
  //         ['plan-90', '30/60/90 Plan'],
  //         ['kpis', 'KPI Targets'],
  //         ['ideas', 'Content Ideas'],
  //         ['risks', 'Risks & Watch-outs'],
  //         ['monetization', 'Monetization Plan'],
  //         ['capacity', 'Time & Capacity'],
  //         ['skills', 'Skill Upgrades'],
  //         ['feedback', 'Feedback Approach']
  //         // ['charts', 'Analytics View'],
  //       ]}
  //     />
  //   ),
  //   []
  // )

  if (loading && !data) {
    return (
      <div className="py-16 text-center">
        {/* loader above the text */}
        <div className="loader mx-auto mb-3" aria-hidden="true" />
        <p className="text-gray-500 text-sm" aria-live="polite" aria-busy="true">
          Generating your plan…
        </p>
      </div>
    )
  }
  if (error && !data) return <div className="py-16 text-center text-red-600">{error}</div>
  if (!data) return null

  const pf = data.charts?.platform_focus || []
  const cadence = data.charts?.posting_cadence || []


  function downloadFullReport() {
  try {
    // programmatically open all collapsibles for the snapshot
    document.querySelectorAll<HTMLButtonElement>('button[aria-expanded="false"]').forEach((btn) => btn.click())

    const html = `
<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>report</title>
<style>
  body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; color:#111827; }
  .container { max-width: 1000px; margin: 40px auto; padding: 0 16px; }
  h1 { font-weight: 300; margin: 0 0 6px; color: #374151; text-align:center; }
  .subtitle { color: #9ca3af; margin: 0 0 24px; text-align:center; }
  .card { border: 1px solid #eee; border-radius: 20px; padding: 16px; margin: 12px 0; }
</style>
</head>
<body>
  <div class="container">
    <h1>your personalized report</h1>
    <div class="subtitle">full expanded export</div>
    ${document.querySelector('[data-mentor-ui]')?.querySelector('.grid')?.innerHTML || ''}
  </div>
</body>
</html>`

    const blob = new Blob([html], { type: "text/html;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "marketing-mentor-report.html"
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  } catch (e) {
    console.error(e)
    alert("Could not export right now. Please try again.")
  }
}

async function downloadFullReportPdf() {
  // Open all collapsibles so the snapshot captures everything
  document
    .querySelectorAll<HTMLButtonElement>('button[aria-expanded="false"]')
    .forEach((btn) => btn.click())

  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf')
  ])

  const container =
    (document.querySelector('[data-mentor-ui] main') as HTMLElement) ||
    (document.querySelector('[data-mentor-ui]') as HTMLElement)

  if (!container) return alert('Could not find report to export.')

  // render to canvas
  const canvas = await html2canvas(container, {
    scale: 2, useCORS: true, backgroundColor: '#ffffff', windowWidth: document.documentElement.scrollWidth
  })
  const imgData = canvas.toDataURL('image/png')

  // fit onto PDF pages
  const pdf = new jsPDF('p', 'mm', 'a4')
  const pageW = pdf.internal.pageSize.getWidth()
  const pageH = pdf.internal.pageSize.getHeight()

  const imgW = pageW
  const imgH = (canvas.height * pageW) / canvas.width

  let y = 0
  let remaining = imgH

  // Add slices if taller than one page
  while (remaining > 0) {
    if (y > 0) pdf.addPage()
    pdf.addImage(imgData, 'PNG', 0, -y, imgW, imgH)
    y += pageH
    remaining -= pageH
  }

  pdf.save('marketing-mentor-report.pdf')
}

  return (
  <div data-mentor-ui className="report-page">
    <DesignStyles /> {/* visual styles only */}
      {authed ? (
        <div className="sticky top-0 left-0 z-20 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/50">
          <div className="max-w-5xl mx-auto px-4 py-3">
            <button
              onClick={() => router.push('/account')}
              className="inline-flex items-center gap-2 text-sm rounded-lg border px-3 py-1.5 hover:bg-gray-50"
              aria-label="Back to account"
            >
              <span className="-ml-1">←</span>
              Back to account
            </button>
          </div>
        </div>
      ) : null}

        <div className="grid grid-cols-1 gap-6 fade-in">
        <div className="space-y-8">
          {/* Header */}
          <div className="mt-6 mb-6">
            <h1 className="report-title">your personalized report</h1>
            <p className="report-subtitle">your path to social media fame</p>
          </div>

          {/* Your Niche */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Section id="niche" title="Your Niche" defaultOpen>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{data.your_niche}</p>
          </Section>

          {Array.isArray(data.your_roadblocks_and_fix) && data.your_roadblocks_and_fix.length > 0 && (
            <Section id="roadblocks" title="Roadblocks & Fixes" defaultOpen={false}>
              <div className="grid gap-3">
                {data.your_roadblocks_and_fix.map((r, i) => (
                  <div key={i} className="rounded-xl border p-4 bg-white">
                    <div className="font-semibold mb-1">• {r.issue}</div>
                    <div className="text-sm leading-relaxed whitespace-pre-wrap">{r.solution}</div>
                  </div>
                ))}
              </div>
            </Section>
          )}
        </div>

        {/* Platform Strategies + Platform Focus */}
        <Section id="platforms" title="Platform Strategies" defaultOpen={false}>
        <div className="grid lg:grid-cols-[1fr_320px] gap-6">
            <div className="grid sm:grid-cols-2 gap-4">
            {data.platform_strategies?.map((p, i) => (
                <div key={i} className="rounded-xl border p-4 bg-white">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">{p.platform}</h3>
                    <CopyButton text={p.strategy} />
                </div>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{p.strategy}</p>
                </div>
            ))}
            </div>

            {pf.length > 0 && (
            <aside className="dashboard-card rounded-3xl p-6">
                <div className="font-semibold mb-2">Platform Focus</div>
                <PlatformPie data={pf} />
                <p className="mt-2 text-xs text-gray-500">Prioritize where to post and test first.</p>
            </aside>
            )}
        </div>
        </Section>

            {/* Engagement Stage */}
            {(data.engagement_stage || data.engagement_stage_note) && (
            <Section id="engagement" title="Engagement Stage" defaultOpen={false}>
                <div className="space-y-2">
                {data.engagement_stage && (
                    <div className="inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium">
                    {String(data.engagement_stage).toUpperCase()}
                    </div>
                )}
                {data.engagement_stage_note && (
                    <p className="leading-relaxed">{data.engagement_stage_note}</p>
                )}
                </div>
            </Section>
            )}

            {/* Strategy Type */}
            {(data.strategy_type || data.strategy_type_note) && (
            <Section id="strategy" title="Strategy Type" defaultOpen={false}>
                <div className="space-y-2">
                {data.strategy_type && (
                    <div className="inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium capitalize">
                    {data.strategy_type}
                    </div>
                )}
                {data.strategy_type_note && (
                    <p className="leading-relaxed">{data.strategy_type_note}</p>
                )}
                </div>
            </Section>
            )}

        {/* Theory */}
        {Array.isArray(data.theory) && data.theory.length > 0 && (
        <Section id="theory" title="Theory" defaultOpen={false}>
            <ul className="list-disc pl-5 space-y-1 text-sm">
            {data.theory.map((t, i) => <li key={i}>{t}</li>)}
            </ul>
        </Section>
        )}

        {/* Practical Advice */}
        <Section id="advice" title="Practical Advice" defaultOpen={false}>
        <div className="grid sm:grid-cols-2 gap-4">
            <div className="rounded-xl border p-4 bg-white">
            <div className="font-semibold mb-2">Low-effort examples</div>
            <ul className="list-disc pl-5 space-y-1 text-sm">
                {(data.practical_advice?.low_effort_examples || []).map((x, i) => <li key={i}>{x}</li>)}
            </ul>
            </div>
            <div className="rounded-xl border p-4 bg-white">
            <div className="font-semibold mb-2">High-effort examples</div>
            <ul className="list-disc pl-5 space-y-1 text-sm">
                {(data.practical_advice?.high_effort_examples || []).map((x, i) => <li key={i}>{x}</li>)}
            </ul>
            </div>
        </div>
        </Section>

        {/* 30/60/90 */}
        {Array.isArray(data.next_steps) && data.next_steps.length > 0 && (
        <Section id="plan-90" title="30 / 60 / 90-Day Plan" defaultOpen={false}>
            <ul className="list-disc pl-5 space-y-1 text-sm">
            {data.next_steps.map((t, i) => <li key={i}>{t}</li>)}
            </ul>
        </Section>
        )}

        {/* KPI tiles */}
        {data.kpis && (
        <Section id="kpis" title="KPI Targets (Next 30 Days)" defaultOpen={false}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="dashboard-card rounded-2xl p-5 text-center">
                <div className="text-xs text-gray-500">Weekly Posts</div>
                <div className="text-2xl font-semibold">{data.kpis.weekly_posts ?? 10}</div>
            </div>
            <div className="dashboard-card rounded-2xl p-5 text-center">
                <div className="text-xs text-gray-500">View-through Rate</div>
                <div className="text-2xl font-semibold">{data.kpis.target_view_rate_pct ?? 25}%</div>
            </div>
            <div className="dashboard-card rounded-2xl p-5 text-center">
                <div className="text-xs text-gray-500">New Followers (30d)</div>
                <div className="text-2xl font-semibold">{data.kpis.target_followers_30d ?? 1000}</div>
            </div>
            </div>
        </Section>
        )}

        {/* Content Ideas */}
        {data.content_ideas?.length ? (
        <Section id="ideas" title="Content Ideas (Ready to Record)" defaultOpen={false}>
            <div className="grid sm:grid-cols-2 gap-4">
            {data.content_ideas.map((c, i) => (
                <div key={i} className="rounded-xl border p-4 bg-white">
                <div className="font-semibold mb-1">{c.title}</div>
                <p className="text-sm whitespace-pre-wrap">{c.outline}</p>
                </div>
            ))}
            </div>
        </Section>
        ) : null}

        {/* Risks */}
        {data.risk_watchouts?.length ? (
        <Section id="risks" title="Risks & Watch-outs" defaultOpen={false}>
            <ul className="list-disc pl-5 space-y-1 text-sm">
            {data.risk_watchouts.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
        </Section>
        ) : null}

        {/* Monetization */}
        {data.monetization_plan?.length ? (
        <Section id="monetization" title="Monetization Plan" defaultOpen={false}>
            <ul className="list-disc pl-5 space-y-1 text-sm">
            {data.monetization_plan.map((m, i) => <li key={i}>{m}</li>)}
            </ul>
        </Section>
        ) : null}


        {/* Time & Capacity */}
        {(data.time_budget_note && data.time_budget_note.trim().length > 0) && (
        <Section id="capacity" title="Time & Capacity" defaultOpen={false}>
            <p className="text-sm whitespace-pre-wrap">{data.time_budget_note}</p>
        </Section>
        )}

        {/* Skills */}
        {data.skill_upgrades?.length ? (
        <Section id="skills" title="Skill Upgrades (Next 30 Days)" defaultOpen={false}>
            <ul className="list-disc pl-5 space-y-1 text-sm">
            {data.skill_upgrades.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
        </Section>
        ) : null}

        {/* Feedback approach */}
        {data.feedback_approach && (
        <Section id="feedback" title="Feedback Approach" defaultOpen={false}>
            <p className="text-sm whitespace-pre-wrap">{data.feedback_approach}</p>
        </Section>
        )}


          <footer className="pt-4 pb-10 text-xs text-gray-500">
            Review weekly. Adjust what performs. Keep the pace.
          </footer>
        </div>

        {/* Right rail */}
        {/* <aside>{rightRail}</aside> */}
      </div>
      {/* Download full report pill */}
      <div className="flex justify-center my-10">
        <button
          onClick={downloadFullReportPdf}
          className="report-download bg-[#8B6F63] text-white hover:bg-[#7A5F58] transition pulse-gentle"
        >
          download full report
        </button>
      </div>
     </div>
  )
}
