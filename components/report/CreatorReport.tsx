'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import Section from './Section'
import TOC from './TOC'
import CopyButton from './CopyButton'
import { PlatformPie, CadenceBar } from '@/components/Charts'

type Plan = {
  profile_summary: string
  overall_strategy: string
  platform_strategies: { platform: string; strategy: string }[]
  roadblocks?: { issue: string; solution: string }[]
  audience_blueprint?: string
  content_pillars?: string[]
  hook_swipefile?: string[]
  cadence_plan?: string
  hashtag_seo?: string[]
  collaboration_ideas?: string[]
  distribution_playbook?: string[]
  experiments?: string[]
  timeline_30_60_90?: { day_0_30?: string[]; day_31_60?: string[]; day_61_90?: string[] }
  weekly_routine?: string[]
  kpis?: { weekly_posts?: number; target_view_rate_pct?: number; target_followers_30d?: number }
  content_ideas?: { title: string; outline: string }[]
  next_steps: string[]
  charts?: {
    platform_focus?: { name: string; value: number }[]
    posting_cadence?: { name: string; posts: number }[]
    content_type_mix?: { name: string; value: number }[]
    pillar_allocation?: { name: string; value: number }[]
  }
}

export default function CreatorReport() {
  const [data, setData] = useState<Plan | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const did = useRef(false)

  useEffect(() => {
    if (did.current) return
    did.current = true

    ;(async () => {
      try {
        const raw = typeof window !== 'undefined' ? localStorage.getItem('onboarding') : null
        const persona = raw ? JSON.parse(raw) : {}
        const res = await fetch('/api/plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ persona }),
        })
        const json = await res.json()
        if (!res.ok || json?.error) {
          setError(json?.error || `Request failed (${res.status})`)
          return
        }
        setData(json)
      } catch (e: any) {
        setError(e.message || 'Failed to load plan')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const rightRail = useMemo(() => <TOC />, [])

  if (loading) return <div className="py-16 text-center text-gray-500">Generating your plan…</div>
  if (error) return <div className="py-16 text-center text-red-600">{error}</div>
  if (!data) return null

  const pf = data.charts?.platform_focus ?? [
    { name: 'TikTok', value: 40 },
    { name: 'Instagram', value: 30 },
    { name: 'YouTube', value: 20 },
    { name: 'Pinterest', value: 10 },
  ]
  const cadence = data.charts?.posting_cadence ?? [
    { name: 'Mon', posts: 2 }, { name: 'Tue', posts: 2 }, { name: 'Wed', posts: 2 },
    { name: 'Thu', posts: 2 }, { name: 'Fri', posts: 3 }, { name: 'Sat', posts: 1 }, { name: 'Sun', posts: 1 },
  ]
  const typeMix = data.charts?.content_type_mix ?? [
    { name: 'Educational', value: 50 },
    { name: 'Entertainment', value: 30 },
    { name: 'Personal', value: 20 },
  ]
  const pillarAlloc = data.charts?.pillar_allocation ?? []

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-8">
      <div className="space-y-10">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold">Your Growth Strategy</h1>
          <p className="text-gray-600">we only give straightforward answers. no fluff.</p>
        </header>

        <Section id="profile" title="Profile Summary">
          <div className="flex items-start justify-between gap-4">
            <p className="leading-relaxed">{data.profile_summary}</p>
            <CopyButton text={data.profile_summary} />
          </div>
        </Section>

        <Section id="overall" title="Overall Strategy">
          <div className="flex items-start justify-between gap-4">
            <p className="leading-relaxed whitespace-pre-wrap">{data.overall_strategy}</p>
            <CopyButton text={data.overall_strategy} />
          </div>
        </Section>

        <Section id="platforms" title="Platform Strategies">
          <div className="grid lg:grid-cols-[1fr_300px] gap-6">
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
            <aside className="rounded-xl border p-4 bg-white">
              <div className="font-semibold mb-2">Platform Focus</div>
              <PlatformPie data={pf} />
              <p className="mt-2 text-xs text-gray-500">Allocation used to prioritize where to post and test first.</p>
            </aside>
          </div>
        </Section>

        {/* ...keep the rest of your sections (audience, pillars, cadence, growth, experiments, roadblocks, 30/60/90, weekly, KPIs, ideas) using the safe fallbacks we set earlier... */}

        <Section id="charts" title="Analytics View">
          <div className="grid sm:grid-cols-2 gap-6">
            <div>
              <div className="font-semibold mb-2">Platform Focus</div>
              <PlatformPie data={pf} />
            </div>
            <div>
              <div className="font-semibold mb-2">Posting Cadence</div>
              <CadenceBar data={cadence} />
            </div>
          </div>
        </Section>

        <footer className="pt-4 pb-10 text-xs text-gray-500">
          Review weekly. Adjust what performs. Keep the pace.
        </footer>
      </div>

      <aside>{rightRail}</aside>
    </div>
  )
}