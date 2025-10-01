"use client"

import React from 'react'
import ReportShell, { ReportData, PlatformKey, LayerGroup } from '@/components/report/ReportShell'
import { supabaseBrowser } from '@/lib/supabaseClient'
import type { LayersV2 } from '@/types/layersV2'

function pick<T>(arr: T[] | undefined, n: number): T[] { return Array.isArray(arr) ? arr.slice(0, n) : [] }

function mapPlanToReportData(plan: any): ReportData {
  const sections = plan?.sections || {}
  const ai = sections.ai_marketing_psychology || {}
  const foundation = sections.foundational_psychology || {}
  const brandDev = sections.personal_brand_development || {}
  const platform = sections.platform_specific_strategies || {}
  const content = sections.content_strategy || {}
  const posting = sections.posting_frequency || {}
  const metrics = sections.metrics_mindset || {}
  const mental = sections.mental_health || {}

  // naive blocker inference from main_problem
  const mp: string = (plan?.main_problem || '').toLowerCase()
  const biggestBlocker: ReportData['biggestBlocker'] = mp.includes('niche') ? 'no_niche' : mp.includes('consist') ? 'lack_of_consistency' : mp.includes('engage') || mp.includes('hook') ? 'low_engagement' : 'fear_of_judgment'

  const makeGroup = (title: string, bullets: string[]): LayerGroup => ({
    report: { title, bullets: pick(bullets, 5), quickWins: [] },
    learnMore: {
      context: foundation.summary || ai.summary || 'Why this matters for your growth.',
      framework: { name: 'Three-Step Play', steps: pick(content.bullets || ai.bullets || [], 3) },
      caseStudies: undefined,
      tools: undefined,
    },
    elaborate: {
      sources: undefined,
      advanced: pick(metrics.bullets || [], 4),
      troubleshooting: undefined,
      longTerm: pick(posting.bullets || [], 5),
    },
  })

  const data: ReportData = {
    userName: undefined,
    stage: '1K-10K',
    primaryPlatform: 'instagram',
    biggestBlocker,
    personalization: {
      comfort_with_visibility: 'medium',
      time_availability: 'medium',
      technical_skill: 'medium',
      monetization_urgency: 'medium',
      personality_type: 'creator',
    },
    platformStrategies: {
      tiktok: { content_type: 'raw_authentic_short', posting_frequency: '1-3x daily', key_metrics: 'completion_rate, shares', growth_hack: 'trend_surfing, original_sounds' },
      instagram: { content_type: 'visual_storytelling', posting_frequency: '1x daily + stories', key_metrics: 'saves, replies', growth_hack: 'carousel_hooks, reel_covers' },
      youtube: { content_type: 'long_form_value', posting_frequency: '1-2x weekly', key_metrics: 'watch_time, CTR', growth_hack: 'thumbnail_psychology, series_creation' },
    },
    sections: {
      primaryObstacle: makeGroup(plan?.main_problem || 'Primary Obstacle', ai.bullets || []),
      strategicFoundation: makeGroup('Strategic Foundation', (foundation.bullets || []).concat(pick(content.bullets || [], 2))),
      personalBrand: makeGroup('Personal Brand Development', (brandDev.bullets || foundation.bullets || [])),
      monetizationPath: makeGroup('Your Monetization Path', pick(platform.bullets || [], 5)),
      mentalHealth: makeGroup('Mental Health', pick(mental.bullets || [], 5)),
      successMeasurement: makeGroup('Measure Your Success', pick(metrics.bullets || [], 5)),
    },
  }
  return data
}

export default function ReportShellClient() {
  const [data, setData] = React.useState<ReportData | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [busyRegen, setBusyRegen] = React.useState(false)
  const sseRef = React.useRef<EventSource | null>(null)
  const fetchLockRef = React.useRef(false)
  // Use a stable global key so typing runs once on this device
  const [typewriterKey] = React.useState<string>('report_typed_v1')

  React.useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/report', { cache: 'no-store' })
        const j = await res.json()
        if (!cancelled && j?.plan) {
          const p = j.plan
          if (p.layers_v2) {
            const l = p.layers_v2 as LayersV2
            setData({
              userName: l.userName,
              stage: l.stage,
              primaryPlatform: l.primaryPlatform,
              biggestBlocker: l.biggestBlocker,
              personalization: l.personalization,
              platformStrategies: l.platformStrategies,
              sections: l.sections,
              analysis: (l as any).analysis,
              uiStageLabel: (p as any).ui_stage,
            } as unknown as ReportData)
          } else {
            const mapped = mapPlanToReportData(p)
            ;(mapped as any).uiStageLabel = (p as any).ui_stage
            setData(mapped)
          }
          // Do not mark typed here; TypewriterList will mark after first animation completes
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to load report')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  // Live update while any section is still empty
  React.useEffect(() => {
    if (!data) return
    const sections: any = data.sections || {}
    const keys: Array<keyof ReportData['sections']> = ['primaryObstacle','strategicFoundation','personalBrand','monetizationPath','mentalHealth','successMeasurement']
    const allReady = keys.every(k => Array.isArray((sections as any)[k]?.report?.bullets) && (sections as any)[k].report.bullets.length > 0)
    if (allReady) return

    // Subscribe to SSE and refetch plan on updates
    if (sseRef.current) { try { sseRef.current.close() } catch {} sseRef.current = null }
    const es = new EventSource('/api/report/stream')
    sseRef.current = es
    const fetchPlan = async () => {
      if (fetchLockRef.current) return
      fetchLockRef.current = true
      try {
        const r = await fetch('/api/report', { cache: 'no-store' })
        const j = await r.json().catch(()=>({}))
        const p = j?.plan
        if (p && p.layers_v2) {
          const l = p.layers_v2 as LayersV2
          setData({
            userName: l.userName,
            stage: l.stage,
            primaryPlatform: l.primaryPlatform,
            biggestBlocker: l.biggestBlocker,
            personalization: l.personalization,
            platformStrategies: l.platformStrategies,
            sections: l.sections,
            analysis: (l as any).analysis,
            uiStageLabel: (p as any).ui_stage,
          } as unknown as ReportData)
        }
      } catch {}
      fetchLockRef.current = false
    }

    es.addEventListener('sections', () => { void fetchPlan() })
    es.addEventListener('done', () => { void fetchPlan(); try { es.close() } catch {}; sseRef.current = null })
    es.onerror = () => { try { es.close() } catch {}; sseRef.current = null }
    return () => { try { es.close() } catch {}; sseRef.current = null }
  }, [data])

  async function regenerate() {
    setBusyRegen(true)
    try {
      // Navigate to preparing to show live progress and let that page handle POST
      window.location.href = '/dashboard/preparing?force=true&min_ready=1'
    } finally {
      setBusyRegen(false)
    }
  }

  if (loading) return null
  if (error || !data) return <div className="text-sm text-red-600">{error || 'No data'}</div>
  return (
    <div className="fade-in relative">
      {/* Dev-only regenerate button */}
      {process.env.NEXT_PUBLIC_DEV_BYPASS_PLAN === 'true' && (
        <button
          type="button"
          onClick={regenerate}
          disabled={busyRegen}
          className="fixed bottom-6 right-6 z-50 rounded-full bg-black/80 text-white px-4 py-2 shadow-lg hover:bg-black disabled:opacity-60"
          title="Regenerate report (force)"
        >
          {busyRegen ? 'Regenerating…' : 'Regenerate report'}
        </button>
      )}
      <ReportShell data={data} typewriterKey={typewriterKey} />
    </div>
  )
}
