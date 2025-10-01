import { LayersV2, PlatformKey, PlatformStrategy, PersonalizationVars } from '@/types/layersV2'
import { defaultPlatformStrategies } from '@/lib/prompts/buildLayeredPlanPrompt'

const asArr = (v: any) => Array.isArray(v) ? v : v ? [String(v)] : []

export function mapLegacyPlanToLayersV2(plan: any, opts?: {
  stage?: LayersV2['stage']
  primaryPlatform?: PlatformKey
  biggestBlocker?: LayersV2['biggestBlocker']
  personalization?: PersonalizationVars
  platformStrategies?: Record<PlatformKey, PlatformStrategy>
}): LayersV2 {
  const s = plan?.sections || {}
  const ai = s.ai_marketing_psychology || {}
  const foundation = s.foundational_psychology || {}
  const platform = s.platform_specific_strategies || {}
  const content = s.content_strategy || {}
  const posting = s.posting_frequency || {}
  const metrics = s.metrics_mindset || {}
  const mental = s.mental_health || {}

  const bullets = (x: any, n: number) => asArr(x?.bullets).slice(0, n)
  const quickWins = (list: string[]) => list.slice(0, 3).map((t) => ({ label: t.split(':')[0].slice(0, 24) || 'Quick Win', how: t }))

  const fallbackPersonalization: PersonalizationVars = opts?.personalization || {
    comfort_with_visibility: 'medium', time_availability: 'medium', technical_skill: 'medium', monetization_urgency: 'medium', personality_type: 'creator'
  }

  const plat = opts?.platformStrategies || defaultPlatformStrategies()

  return {
    userName: undefined,
    stage: opts?.stage || '1K-10K',
    primaryPlatform: opts?.primaryPlatform || 'instagram',
    biggestBlocker: opts?.biggestBlocker || 'lack_of_consistency',
    personalization: fallbackPersonalization,
    platformStrategies: plat,
    sections: {
      primaryObstacle: {
        report: { title: plan?.main_problem || 'Primary Obstacle', bullets: bullets(ai, 5), quickWins: quickWins(bullets(content, 2)) },
        learnMore: { context: foundation?.summary || ai?.summary || '', framework: { name: 'Mini‑Habit Ladder', steps: bullets(content, 3) }, tools: undefined },
        elaborate: { advanced: bullets(metrics, 4), troubleshooting: undefined, longTerm: bullets(posting, 4) },
      },
      strategicFoundation: {
        report: { title: 'Strategic Foundation', bullets: bullets(foundation, 5) },
        learnMore: { context: foundation?.summary || '', framework: { name: 'Brand Diamond', steps: bullets(foundation, 3) }, tools: undefined },
        elaborate: { sources: undefined, advanced: bullets(content, 4) },
      },
      monetizationPath: {
        report: { title: 'Your Monetization Path', bullets: bullets(platform, 5) },
        learnMore: { context: platform?.summary || '', framework: { name: 'Lean Offer Loop', steps: bullets(platform, 3) } },
        elaborate: { advanced: bullets(platform, 4) },
      },
      mentalHealth: {
        report: { title: 'Mental Health', bullets: bullets(mental, 5) },
        learnMore: { context: mental?.summary || '', framework: { name: 'Imperfectionist Playbook', steps: bullets(mental, 3) } },
        elaborate: { troubleshooting: undefined },
      },
      successMeasurement: {
        report: { title: 'Measure Your Success', bullets: bullets(metrics, 5) },
        learnMore: { context: metrics?.summary || '', framework: { name: 'Signal > Noise', steps: bullets(metrics, 3) }, tools: undefined },
        elaborate: { advanced: bullets(metrics, 4) },
      },
    }
  }
}
