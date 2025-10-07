"use client"

import React from 'react'
import ReportShell, { ReportData, PlatformKey, LayerGroup } from '@/components/report/ReportShell'
import { supabaseBrowser } from '@/lib/supabaseClient'
import type { LayersV2 } from '@/types/layersV2'
import { isLegacyFallbackSection, isLayeredFallbackSection } from '@/lib/reportFallbacks'

function pick<T>(arr: T[] | undefined, n: number): T[] { return Array.isArray(arr) ? arr.slice(0, n) : [] }

type SectionReadiness = Partial<Record<keyof ReportData['sections'], boolean>>

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
      marketingStrategy: makeGroup('Marketing Strategy Development', pick(platform.bullets || [], 5)),
      platformTactics: makeGroup('Platform-Specific Tactics', pick(platform.bullets || [], 5)),
      contentExecution: makeGroup('Content Creation & Execution', pick(content.bullets || posting.bullets || [], 5)),
      mentalHealth: makeGroup('Mental Health & Sustainability', pick(mental.bullets || [], 5)),
    },
  }
  return data
}

function computeSectionReadiness(plan: any): SectionReadiness {
  const meta = plan?._section_meta || {}
  const sections: any = plan?.sections || {}
  const legacyReady = (key: string) => {
    const origin = meta?.[key]?.origin
    if (!origin) return false
    if (origin === 'fallback') return false
    const secObj: any = sections?.[key] || {}
    if (isLegacyFallbackSection(key, secObj)) return false
    return true
  }
  const layeredReady = (key: string) => {
    const secObj: any = plan?.layers_v2?.sections?.[key] || sections?.[key] || {}
    if (!secObj) return false
    if (isLayeredFallbackSection(key, secObj)) return false
    const report = secObj.report || secObj
    const hasSummary = typeof report?.summary === 'string' && report.summary.trim().length > 0
    const tasks = Array.isArray(report?.addToYourPlan) && report.addToYourPlan.length ? report.addToYourPlan : report?.bullets
    const hasTasks = Array.isArray(tasks) && tasks.filter((v: any) => typeof v === 'string' && v.trim()).length >= 3
    const paragraph = typeof report?.paragraph === 'string' ? report.paragraph.trim() : ''
    return hasSummary && hasTasks && paragraph.length > 0
  }
  return {
    primaryObstacle: layeredReady('primaryObstacle') || legacyReady('ai_marketing_psychology'),
    strategicFoundation: layeredReady('strategicFoundation') || (legacyReady('foundational_psychology') && legacyReady('content_strategy')),
    personalBrand: layeredReady('personalBrand') || (legacyReady('personal_brand_development') && legacyReady('foundational_psychology')),
    marketingStrategy: layeredReady('marketingStrategy') || legacyReady('platform_specific_strategies'),
    platformTactics: layeredReady('platformTactics') || legacyReady('platform_specific_strategies'),
    contentExecution: layeredReady('contentExecution') || (legacyReady('content_strategy') && legacyReady('posting_frequency')),
    mentalHealth: layeredReady('mentalHealth') || legacyReady('mental_health'),
  }
}

export default function ReportShellClient() {
  const [data, setData] = React.useState<ReportData | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [busyRegen, setBusyRegen] = React.useState(false)
  const [sectionReadiness, setSectionReadiness] = React.useState<SectionReadiness>({})
  const sseRef = React.useRef<EventSource | null>(null)
  const fetchLockRef = React.useRef(false)
  // Use a stable global key so typing runs once on this device
  const [typewriterKey] = React.useState<string>('report_typed_v1')

  const applyPlan = React.useCallback((plan: any) => {
    if (!plan) return
    if (plan.layers_v2) {
      const l = plan.layers_v2 as LayersV2
      const secAny: any = l.sections || {}
      const sections: Record<keyof ReportData['sections'], any> = {
        primaryObstacle: secAny.primaryObstacle,
        strategicFoundation: secAny.strategicFoundation,
        personalBrand: secAny.personalBrand || secAny.personal_brand_development,
        marketingStrategy: secAny.marketingStrategy || secAny.monetizationPath,
        platformTactics: secAny.platformTactics || secAny.platformStrategies,
        contentExecution: secAny.contentExecution || secAny.successMeasurement,
        mentalHealth: secAny.mentalHealth,
      }
      const layeredKeys: Array<keyof ReportData['sections']> = [
        'primaryObstacle',
        'strategicFoundation',
        'personalBrand',
        'marketingStrategy',
        'platformTactics',
        'contentExecution',
        'mentalHealth',
      ]
      layeredKeys.forEach((k) => {
        const group = sections[k]
        if (group && isLayeredFallbackSection(k, group)) {
          sections[k] = {
            report: { title: group?.report?.title || '', summary: '', paragraph: '', bullets: [] },
            learnMore: { context: '', framework: { name: '', steps: [] as string[] }, caseStudies: [], tools: [] },
            elaborate: { sources: [], advanced: [], troubleshooting: [], longTerm: [] },
          }
        }
      })
      setData({
        userName: l.userName,
        stage: l.stage,
        primaryPlatform: l.primaryPlatform,
        biggestBlocker: l.biggestBlocker,
        personalization: l.personalization,
        platformStrategies: l.platformStrategies,
        sections: sections as any,
        analysis: (l as any).analysis,
        uiStageLabel: (plan as any).ui_stage,
      } as unknown as ReportData)
    } else {
      const mapped = mapPlanToReportData(plan)
      ;(mapped as any).uiStageLabel = (plan as any).ui_stage
      setData(mapped)
    }
    setSectionReadiness(computeSectionReadiness(plan))
  }, [])

  React.useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/report', { cache: 'no-store' })
        const j = await res.json()
        if (!cancelled && j?.plan) {
          applyPlan(j.plan)
          // Do not mark typed here; TypewriterList will mark after first animation completes
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to load report')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [applyPlan])

  // Live update while any section is still empty
  React.useEffect(() => {
    if (!data) return
    const sections: any = data.sections || {}
    const keys: Array<keyof ReportData['sections']> = ['primaryObstacle','strategicFoundation','personalBrand','marketingStrategy','platformTactics','contentExecution','mentalHealth']
    const anyMissingBullets = keys.some(k => {
      const group: any = (sections as any)[k]
      if (!group) return true
      const report = group.report || group
      const items = Array.isArray(report?.addToYourPlan) && report.addToYourPlan.length ? report.addToYourPlan : report?.bullets
      const taskCount = Array.isArray(items) ? items.filter((v: any) => typeof v === 'string' && v.trim()).length : 0
      return taskCount < 3
    })
    const hasPendingMeta = Object.values(sectionReadiness || {}).some(v => v === false)
    if (!anyMissingBullets && !hasPendingMeta) return

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
        if (p) applyPlan(p)
      } catch {}
      fetchLockRef.current = false
    }

    es.addEventListener('sections', () => { void fetchPlan() })
    es.addEventListener('done', () => { void fetchPlan(); try { es.close() } catch {}; sseRef.current = null })
    es.onerror = () => { try { es.close() } catch {}; sseRef.current = null }
    return () => { try { es.close() } catch {}; sseRef.current = null }
  }, [data, applyPlan, sectionReadiness])

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
      <ReportShell data={data} typewriterKey={typewriterKey} sectionReadiness={sectionReadiness} />
    </div>
  )
}
