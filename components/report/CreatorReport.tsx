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
  risk_watchouts?: string[]
  monetization_plan?: string[]
  time_budget_note?: string
  skill_upgrades?: string[]
  feedback_approach?: string
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

  useEffect(() => {
    (async () => {
      try {
        const persona = JSON.parse(localStorage.getItem('onboarding') || '{}')
        const res = await fetch('/api/plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ persona }),
          cache: 'no-store',
        })
        const json = await res.json()
        setData(json)
      } catch (e: any) {
        setError(e.message || 'Failed to load plan')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const rightRail = useMemo(
    () => (
      <TOC
        items={[
          ['profile', 'Profile Summary'],
          ['overall', 'Overall Strategy'],
          ['platforms', 'Platform Strategies'],
          ['audience', 'Audience Blueprint'],
          ['pillars', 'Pillars & Hooks'],
          ['cadence-plan', 'Posting Cadence'],
          ['growth', 'Growth Tactics'],
          ['experiments', 'Experiments'],
          ['plan-90', '30/60/90 Plan'],
          ['weekly', 'Weekly Routine'],
          ['kpis', 'KPI Targets'],
          ['ideas', 'Content Ideas'],
          ['risks', 'Risks & Watch-outs'],
          ['monetization', 'Monetization Plan'],
          ['capacity', 'Time & Capacity'],
          ['skills', 'Skill Upgrades'],
          ['feedback', 'Feedback Approach'],
          ['charts', 'Analytics View'],
        ]}
      />
    ),
    []
  )

  if (loading) return <div className="py-16 text-center text-gray-500">Generating your plan…</div>
  if (error) return <div className="py-16 text-center text-red-600">{error}</div>
  if (!data) return null

  const pf = data.charts?.platform_focus || []
  const cadence = data.charts?.posting_cadence || []
  const typeMix = data.charts?.content_type_mix || []
  const pillarAlloc = data.charts?.pillar_allocation || []

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-8">
      <div className="space-y-10">
        {/* Header */}
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold">Your Growth Strategy</h1>
          <p className="text-gray-600">we only give straightforward answers. no fluff.</p>
        </header>

        {/* Profile */}
        <Section id="profile" title="Profile Summary">
          <div className="flex items-start justify-between gap-4">
            <p className="leading-relaxed">{data.profile_summary}</p>
            <CopyButton text={data.profile_summary} />
          </div>
        </Section>

        {/* Overall */}
        <Section id="overall" title="Overall Strategy">
          <div className="flex items-start justify-between gap-4">
            <p className="leading-relaxed whitespace-pre-wrap">{data.overall_strategy}</p>
            <CopyButton text={data.overall_strategy} />
          </div>
        </Section>

        {/* Platform Strategies + Platform Focus chart */}
        <Section id="platforms" title="Platform Strategies">
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
              <aside className="rounded-xl border p-4 bg-white">
                <div className="font-semibold mb-2">Platform Focus</div>
                <PlatformPie data={pf} />
                <p className="mt-2 text-xs text-gray-500">Prioritize where to post and test first.</p>
              </aside>
            )}
          </div>
        </Section>

        {/* Audience Blueprint */}
        {data.audience_blueprint && (
          <Section id="audience" title="Audience Blueprint">
            <p className="leading-relaxed whitespace-pre-wrap">{data.audience_blueprint}</p>
          </Section>
        )}

        {/* Pillars + Hooks with charts on the right */}
        {(data.content_pillars?.length || data.hook_swipefile?.length || pillarAlloc.length || typeMix.length) && (
          <Section id="pillars" title="Pillars & Hook Library">
            <div className="grid lg:grid-cols-[1fr_320px] gap-6">
              <div className="grid sm:grid-cols-2 gap-4">
                {data.content_pillars?.length ? (
                  <div className="rounded-xl border p-4">
                    <div className="font-semibold mb-2">Pillars</div>
                    <ul className="list-disc pl-5 space-y-1 text-sm">
                      {data.content_pillars.map((p, i) => <li key={i}>{p}</li>)}
                    </ul>
                  </div>
                ) : null}
                {data.hook_swipefile?.length ? (
                  <div className="rounded-xl border p-4">
                    <div className="font-semibold mb-2">Hook Swipe File</div>
                    <ul className="list-disc pl-5 space-y-1 text-sm">
                      {data.hook_swipefile.map((h, i) => <li key={i}>{h}</li>)}
                    </ul>
                  </div>
                ) : null}
              </div>

              <aside className="space-y-6">
                {pillarAlloc.length > 0 && (
                  <div className="rounded-xl border p-4 bg-white">
                    <div className="font-semibold mb-2">Pillar Allocation</div>
                    <PlatformPie data={pillarAlloc} />
                  </div>
                )}
                {typeMix.length > 0 && (
                  <div className="rounded-xl border p-4 bg-white">
                    <div className="font-semibold mb-2">Content Type Mix</div>
                    <PlatformPie data={typeMix} />
                  </div>
                )}
              </aside>
            </div>
          </Section>
        )}

        {/* Cadence Plan + chart */}
        {(data.cadence_plan || cadence.length > 0) && (
          <Section id="cadence-plan" title="Posting Cadence">
            <div className="grid lg:grid-cols-[1fr_320px] gap-6">
              {data.cadence_plan && (
                <div>
                  <p className="leading-relaxed whitespace-pre-wrap">{data.cadence_plan}</p>
                </div>
              )}
              {cadence.length > 0 && (
                <aside className="rounded-xl border p-4 bg-white">
                  <div className="font-semibold mb-2">Optimal Weekly Cadence</div>
                  <CadenceBar data={cadence} />
                </aside>
              )}
            </div>
          </Section>
        )}

        {/* Growth Tactics */}
        {(data.hashtag_seo?.length || data.collaboration_ideas?.length || data.distribution_playbook?.length) && (
          <Section id="growth" title="Growth Tactics">
            <div className="grid sm:grid-cols-3 gap-4 text-sm">
              {data.hashtag_seo?.length ? (
                <div className="rounded-xl border p-4">
                  <div className="font-semibold mb-2">Hashtag / SEO</div>
                  <ul className="list-disc pl-5 space-y-1">{data.hashtag_seo.map((k, i) => <li key={i}>{k}</li>)}</ul>
                </div>
              ) : null}
              {data.collaboration_ideas?.length ? (
                <div className="rounded-xl border p-4">
                  <div className="font-semibold mb-2">Collaborations</div>
                  <ul className="list-disc pl-5 space-y-1">{data.collaboration_ideas.map((k, i) => <li key={i}>{k}</li>)}</ul>
                </div>
              ) : null}
              {data.distribution_playbook?.length ? (
                <div className="rounded-xl border p-4">
                  <div className="font-semibold mb-2">Distribution</div>
                  <ul className="list-disc pl-5 space-y-1">{data.distribution_playbook.map((k, i) => <li key={i}>{k}</li>)}</ul>
                </div>
              ) : null}
            </div>
          </Section>
        )}

        {/* Experiments */}
        {data.experiments?.length ? (
          <Section id="experiments" title="Experiments (Run & Measure)">
            <ul className="list-disc pl-5 space-y-1 text-sm">
              {data.experiments.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          </Section>
        ) : null}

        {/* Roadblocks */}
        {Array.isArray((data as any).roadblocks) && (data as any).roadblocks.length > 0 && (
          <Section id="roadblocks" title="Roadblocks & Fixes">
            <div className="grid gap-3">
              {(data as any).roadblocks.map((r: any, i: number) => (
                <details key={i} className="rounded-xl border p-4 bg-white">
                  <summary className="font-medium cursor-pointer list-none">
                    <span className="mr-2">•</span>{r.issue}
                  </summary>
                  <div className="mt-2 text-sm leading-relaxed whitespace-pre-wrap">{r.solution}</div>
                </details>
              ))}
            </div>
          </Section>
        )}

        {/* 30/60/90 */}
        {data.timeline_30_60_90 && (
          <Section id="plan-90" title="30 / 60 / 90-Day Plan">
            <div className="grid sm:grid-cols-3 gap-4 text-sm">
              {data.timeline_30_60_90.day_0_30 && (
                <div className="rounded-xl border p-4">
                  <div className="font-semibold mb-2">Days 0–30</div>
                  <ul className="list-disc pl-5 space-y-1">{data.timeline_30_60_90.day_0_30.map((t, i) => <li key={i}>{t}</li>)}</ul>
                </div>
              )}
              {data.timeline_30_60_90.day_31_60 && (
                <div className="rounded-xl border p-4">
                  <div className="font-semibold mb-2">Days 31–60</div>
                  <ul className="list-disc pl-5 space-y-1">{data.timeline_30_60_90.day_31_60.map((t, i) => <li key={i}>{t}</li>)}</ul>
                </div>
              )}
              {data.timeline_30_60_90.day_61_90 && (
                <div className="rounded-xl border p-4">
                  <div className="font-semibold mb-2">Days 61–90</div>
                  <ul className="list-disc pl-5 space-y-1">{data.timeline_30_60_90.day_61_90.map((t, i) => <li key={i}>{t}</li>)}</ul>
                </div>
              )}
            </div>
          </Section>
        )}

        {/* Weekly routine */}
        {data.weekly_routine?.length ? (
          <Section id="weekly" title="Weekly Operating Routine">
            <ul className="list-disc pl-5 space-y-1 text-sm">
              {data.weekly_routine.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
          </Section>
        ) : null}

        {/* KPI tiles */}
        {data.kpis && (
          <Section id="kpis" title="KPI Targets (Next 30 Days)">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-xl border p-4">
                <div className="text-xs text-gray-500">Weekly Posts</div>
                <div className="text-2xl font-semibold">{data.kpis.weekly_posts ?? 10}</div>
              </div>
              <div className="rounded-xl border p-4">
                <div className="text-xs text-gray-500">View-through Rate</div>
                <div className="text-2xl font-semibold">{data.kpis.target_view_rate_pct ?? 25}%</div>
              </div>
              <div className="rounded-xl border p-4">
                <div className="text-xs text-gray-500">New Followers (30d)</div>
                <div className="text-2xl font-semibold">{data.kpis.target_followers_30d ?? 1000}</div>
              </div>
            </div>
          </Section>
        )}

        {/* Ideas */}
        {data.content_ideas?.length ? (
          <Section id="ideas" title="Content Ideas (Ready to Record)">
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
          <Section id="risks" title="Risks & Watch-outs">
            <ul className="list-disc pl-5 space-y-1 text-sm">
              {data.risk_watchouts.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
          </Section>
        ) : null}

        {/* Monetization */}
        {data.monetization_plan?.length ? (
          <Section id="monetization" title="Monetization Plan">
            <ul className="list-disc pl-5 space-y-1 text-sm">
              {data.monetization_plan.map((m, i) => <li key={i}>{m}</li>)}
            </ul>
          </Section>
        ) : null}

        {/* Time & Capacity */}
        {(data.time_budget_note && data.time_budget_note.trim().length > 0) && (
          <Section id="capacity" title="Time & Capacity">
            <p className="text-sm whitespace-pre-wrap">{data.time_budget_note}</p>
          </Section>
        )}

        {/* Skills */}
        {data.skill_upgrades?.length ? (
          <Section id="skills" title="Skill Upgrades (Next 30 Days)">
            <ul className="list-disc pl-5 space-y-1 text-sm">
              {data.skill_upgrades.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          </Section>
        ) : null}

        {/* Feedback approach */}
        {data.feedback_approach && (
          <Section id="feedback" title="Feedback Approach">
            <p className="text-sm whitespace-pre-wrap">{data.feedback_approach}</p>
          </Section>
        )}

        {/* Analytics (redundant charts if needed elsewhere) */}
        {(pf.length > 0 || cadence.length > 0) && (
          <Section id="charts" title="Analytics View">
            <div className="grid sm:grid-cols-2 gap-6">
              {pf.length > 0 && (
                <div>
                  <div className="font-semibold mb-2">Platform Focus</div>
                  <PlatformPie data={pf} />
                </div>
              )}
              {cadence.length > 0 && (
                <div>
                  <div className="font-semibold mb-2">Optimal Posting Cadence</div>
                  <CadenceBar data={cadence} />
                </div>
              )}
            </div>
          </Section>
        )}

        <footer className="pt-4 pb-10 text-xs text-gray-500">
          Review weekly. Adjust what performs. Keep the pace.
        </footer>
      </div>

      {/* Right rail */}
      <aside>{rightRail}</aside>
    </div>
  )
}