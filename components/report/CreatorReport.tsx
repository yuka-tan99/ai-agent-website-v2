'use client'
import { useEffect, useMemo, useState } from 'react'
import Section from './Section'
import TOC from './TOC'
import CopyButton from './CopyButton'
import { PlatformPie, CadenceBar } from '@/components/Charts'

type Plan = {
  profile_summary: string
  overall_strategy: string
  platform_strategies: { platform: string; strategy: string }[]
  roadblocks: { issue: string; solution: string }[]
  next_steps: string[]
  charts: {
    platform_focus: { name: string; value: number }[]
    posting_cadence: { name: string; posts: number }[]
    content_type_mix?: { name: string; value: number }[]
  }
}

export default function CreatorReport() {
  const [data, setData] = useState<Plan | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    (async () => {
      try {
        const persona = JSON.parse(localStorage.getItem('onboarding') || '{}')
        const res = await fetch('/api/plan', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ persona })
        })
        const json = await res.json()
        setData(json)
      } catch (e: any) {
        setError(e.message || 'Failed to load plan')
      } finally { setLoading(false) }
    })()
  }, [])

  const rightRail = useMemo(() => <TOC />, [])

  if (loading) return <div className="py-16 text-center text-gray-500">Generating your plan…</div>
  if (error) return <div className="py-16 text-center text-red-600">{error}</div>
  if (!data) return null

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-8">
      <div className="space-y-10">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold">Your Growth Strategy</h1>
          <p className="text-gray-600">Straightforward plan based on your answers. No fluff.</p>
        </header>

        <Section id="profile" title="Profile Summary">
          <div className="flex items-start justify-between gap-4">
            <p className="leading-relaxed">{data.profile_summary}</p>
            <CopyButton text={data.profile_summary}/>
          </div>
        </Section>

        <Section id="overall" title="Overall Strategy">
          <div className="flex items-start justify-between gap-4">
            <p className="leading-relaxed whitespace-pre-wrap">{data.overall_strategy}</p>
            <CopyButton text={data.overall_strategy}/>
          </div>
        </Section>

        <Section id="platforms" title="Platform Strategies">
          <div className="grid sm:grid-cols-2 gap-4">
            {data.platform_strategies?.map((p, i) => (
              <div key={i} className="rounded-xl border p-4 bg-white">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold">{p.platform}</h3>
                  <CopyButton text={p.strategy}/>
                </div>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{p.strategy}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section id="roadblocks" title="Roadblocks & Fixes">
          <div className="grid gap-3">
            {data.roadblocks?.map((r, i) => (
              <details key={i} className="rounded-xl border p-4 bg-white">
                <summary className="font-medium cursor-pointer list-none">
                  <span className="mr-2">•</span>{r.issue}
                </summary>
                <div className="mt-2 text-sm leading-relaxed">{r.solution}</div>
              </details>
            ))}
          </div>
        </Section>

        <Section id="next" title="Next Steps (14 days)">
          <ol className="list-decimal pl-5 grid gap-1">
            {data.next_steps?.map((s, i) => <li key={i}>{s}</li>)}
          </ol>
        </Section>

        <Section id="charts" title="Analytics View">
          <div className="grid sm:grid-cols-2 gap-6">
            <div>
              <div className="font-semibold mb-2">Platform Focus</div>
              <PlatformPie data={data.charts.platform_focus} />
            </div>
            <div>
              <div className="font-semibold mb-2">Posting Cadence</div>
              <CadenceBar data={data.charts.posting_cadence} />
            </div>
          </div>
        </Section>

        <footer className="pt-4 pb-10 text-xs text-gray-500">
          Review weekly. Adjust what performs. Keep the pace.
        </footer>
      </div>

      {/* Right rail */}
      <aside>{rightRail}</aside>
    </div>
  )
}