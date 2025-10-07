import { LayersV2, PlatformKey, PersonalizationVars } from '@/types/layersV2'
import { callClaudeJSONWithRetry } from '@/lib/claude'
import { buildLayeredPlanPrompt, defaultPlatformStrategies } from '@/lib/prompts/buildLayeredPlanPrompt'

function trimArr<T>(arr: T[] | undefined, n: number): T[] | undefined {
  if (!Array.isArray(arr)) return undefined
  const out = arr.filter(Boolean).slice(0, n)
  return out.length ? out : undefined
}

const logPrompt = (label: string, prompt: string) => {
  if (process.env.DEBUG_LOG !== 'true') return
  const maxLen = 6000
  const body = prompt.length > maxLen ? `${prompt.slice(0, maxLen)}…` : prompt
  console.log(`[Claude][prompt] ${label} len=${prompt.length}`, body)
}

const logResponse = (label: string, payload: any) => {
  if (process.env.DEBUG_LOG !== 'true') return
  try {
    const sections = Object.keys((payload?.sections ?? {}) as Record<string, any>)
    console.log(`[Claude][response] ${label} sections=${sections.join(',') || '(none)'}`)
  } catch (err: any) {
    console.warn(`[Claude][response] ${label} log failed:`, err?.message || err)
  }
}

const deriveTitle = (summary?: string, paragraph?: string): string => {
  const clean = (summary || paragraph || '').trim()
  if (!clean) return ''
  const sentenceEnd = clean.search(/[.!?]/)
  if (sentenceEnd > 12) return clean.slice(0, sentenceEnd + 1)
  return clean.length > 110 ? `${clean.slice(0, 107)}…` : clean
}

/** Defensive normalizer to ensure all required keys/limits exist */
function ensureCounts(l: LayersV2): LayersV2 {
  // Normalize possible alternate section keys from the model response
  const secAny: any = (l as any).sections || {}
  // Personal Brand
  if (secAny && !secAny.personalBrand) {
    const alias = secAny.personal_brand_development || secAny.personal_brand || secAny.personalBrandDevelopment
    if (alias) {
      secAny.personalBrand = alias
      delete secAny.personal_brand_development
      delete secAny.personal_brand
      delete secAny.personalBrandDevelopment
    }
  }
  // Strategic Foundation
  if (secAny && secAny.strategic_foundation && !secAny.strategicFoundation) {
    secAny.strategicFoundation = secAny.strategic_foundation
    delete secAny.strategic_foundation
  }
  // Primary Obstacle
  if (secAny && secAny.primary_obstacle_resolution && !secAny.primaryObstacle) {
    secAny.primaryObstacle = secAny.primary_obstacle_resolution
    delete secAny.primary_obstacle_resolution
  }
  // Marketing Strategy (back-compat monetizationPath/marketing_strategy)
  if (secAny && !secAny.marketingStrategy) {
    const alias = secAny.marketing_strategy || secAny.marketingStrategyDevelopment || secAny.monetizationPath || secAny.monetization_path
    if (alias) {
      secAny.marketingStrategy = alias
      delete secAny.marketing_strategy
      delete secAny.marketingStrategyDevelopment
      // keep monetizationPath for back-compat but prefer marketingStrategy
    }
  }
  // Platform Tactics
  if (secAny && !secAny.platformTactics) {
    const alias = secAny.platform_specific_tactics || secAny.platformStrategies || secAny.platform_tactics
    if (alias) {
      secAny.platformTactics = alias
      delete secAny.platform_specific_tactics
      delete secAny.platform_tactics
      // keep platformStrategies if present elsewhere
    }
  }
  // Content Execution
  if (secAny && !secAny.contentExecution) {
    const alias = secAny.content_creation_execution || secAny.contentExecution || secAny.successMeasurement
    if (alias) {
      secAny.contentExecution = alias
      delete secAny.content_creation_execution
      // keep successMeasurement for back-compat
    }
  }
  // Mental Health
  if (secAny && !secAny.mentalHealth) {
    const alias = secAny.mental_health || secAny.mental_health_sustainability || secAny.mentalHealthSustainability
    if (alias) {
      secAny.mentalHealth = alias
      delete secAny.mental_health
      delete secAny.mental_health_sustainability
    }
  }
  const sec: any = (l as any).sections || {}
  const init = () => ({
    report: { title: '', bullets: [] as string[], quickWins: [] as any[] },
    learnMore: { context: '', framework: { name: '', steps: [] as string[] }, caseStudies: undefined, tools: undefined },
    elaborate: { sources: undefined, advanced: undefined, troubleshooting: undefined, longTerm: undefined },
  })

  // ensure all sections exist (7-section model)
  ;(['primaryObstacle','strategicFoundation','personalBrand','marketingStrategy','platformTactics','contentExecution','mentalHealth'] as const).forEach(k => {
    sec[k] = sec[k] || init()
    sec[k].report = sec[k].report || { title: '', bullets: [], quickWins: [] }
    sec[k].learnMore = sec[k].learnMore || { context: '', framework: { name: '', steps: [] } }
    if (!sec[k].learnMore.framework) sec[k].learnMore.framework = { name: '', steps: [] }
    sec[k].elaborate = sec[k].elaborate || { }
  })

  // light shaping for UI limits
  const fixReport = (key: keyof LayersV2['sections']) => {
    const group = sec[key]
    const r = group.report
    const add = Array.isArray(r.addToYourPlan) ? r.addToYourPlan.filter(Boolean).map(String) : []
    const bullets = Array.isArray(r.bullets) ? r.bullets.filter(Boolean).map(String) : []
    if (!bullets.length && add.length) {
      r.bullets = add.slice(0, 5)
    } else if (bullets.length && !add.length) {
      r.addToYourPlan = bullets.slice(0, 5)
    } else if (add.length && bullets.length) {
      // keep them in sync, but prefer model ordering from addToYourPlan
      r.bullets = add.slice(0, 5)
    } else {
      r.bullets = bullets.slice(0, 5)
    }
    r.addToYourPlan = (r.addToYourPlan || r.bullets || []).filter(Boolean).map(String).slice(0, 5)

    const summary = typeof r.summary === 'string' ? r.summary.trim() : ''
    const paragraph = typeof r.paragraph === 'string' ? r.paragraph.trim() : ''
    if (!summary && typeof group.summary === 'string') r.summary = String(group.summary || '').trim()
    const resolvedSummary = typeof r.summary === 'string' ? r.summary.trim() : ''
    if (!group.summary && resolvedSummary) group.summary = resolvedSummary
    if (!r.title) {
      const title = deriveTitle(resolvedSummary, paragraph)
      r.title = title || `Section: ${key}`
    }
    if (!group.summary) {
      const title = deriveTitle(resolvedSummary, paragraph)
      if (title) group.summary = title
    }
    if (r.quickWins && r.quickWins.length === 0) delete (r as any).quickWins
    if (r.quickWins) r.quickWins = r.quickWins.slice(0, 5)
  }
  const fixLearn = (key: keyof LayersV2['sections']) => {
    const fw = sec[key].learnMore.framework
    // Do not auto-pad steps; empty means still generating
    fw.steps = (fw.steps || []).filter(Boolean).slice(0, 3)
    sec[key].learnMore.tools = trimArr(sec[key].learnMore.tools, 5)
    sec[key].learnMore.caseStudies = trimArr(sec[key].learnMore.caseStudies, 2)
  }
  const fixElab = (key: keyof LayersV2['sections']) => {
    sec[key].elaborate.sources = trimArr(sec[key].elaborate.sources, 5)
    sec[key].elaborate.advanced = trimArr(sec[key].elaborate.advanced, 6)
    sec[key].elaborate.troubleshooting = trimArr(sec[key].elaborate.troubleshooting, 6)
    sec[key].elaborate.longTerm = trimArr(sec[key].elaborate.longTerm, 6)
  }

  ;(['primaryObstacle','strategicFoundation','personalBrand','marketingStrategy','platformTactics','contentExecution','mentalHealth'] as const).forEach(k => {
    fixReport(k)
    fixLearn(k)
    fixElab(k)
  })

  return l
}

/** Legacy one-shot (kept for compatibility) */
export async function generateLayeredPlan(args: {
  userName?: string
  stage: LayersV2['stage']
  primaryPlatform: PlatformKey
  biggestBlocker: LayersV2['biggestBlocker']
  personalization: PersonalizationVars
  ragSnippets?: string
  onboardingSummary?: string
}): Promise<LayersV2> {
  const prompt = buildLayeredPlanPrompt({
    userName: args.userName,
    stage: args.stage,
    primaryPlatform: args.primaryPlatform,
    biggestBlocker: args.biggestBlocker,
    personalization: args.personalization,
    platformStrategies: defaultPlatformStrategies(),
    ragSnippets: args.ragSnippets,
    onboardingSummary: args.onboardingSummary,
  })
  logPrompt('full-plan', prompt)
  const json = await callClaudeJSONWithRetry<LayersV2>({ prompt, timeoutMs: 110_000, maxTokens: 2000 }, 2)
  logResponse('full-plan', json)
  return ensureCounts(json)
}

/** Existing partial (kept for compatibility) */
export async function generateLayeredPlanPartial(args: {
  userName?: string
  stage: LayersV2['stage']
  primaryPlatform: PlatformKey
  biggestBlocker: LayersV2['biggestBlocker']
  personalization: PersonalizationVars
  ragSnippets?: string
  onlySections: Array<'primaryObstacle'|'strategicFoundation'|'personalBrand'|'marketingStrategy'|'platformTactics'|'contentExecution'|'mentalHealth'>
  onboardingSummary?: string
}): Promise<LayersV2> {
  const prompt = buildLayeredPlanPrompt({
    userName: args.userName,
    stage: args.stage,
    primaryPlatform: args.primaryPlatform,
    biggestBlocker: args.biggestBlocker,
    personalization: args.personalization,
    platformStrategies: defaultPlatformStrategies(),
    ragSnippets: args.ragSnippets,
    onlySections: args.onlySections,
    onboardingSummary: args.onboardingSummary,
  })
  logPrompt(`partial ${args.onlySections.join(',')}`, prompt)
  const json = await callClaudeJSONWithRetry<LayersV2>({ prompt, timeoutMs: 105_000, maxTokens: 1900 }, 2)
  logResponse(`partial ${args.onlySections.join(',')}`, json)
  return ensureCounts(json)
}

/** NEW: safest granular generator — exactly ONE section per call, tiny token budget */
export async function generateLayeredPlanSection(args: {
  userName?: string
  stage: LayersV2['stage']
  primaryPlatform: PlatformKey
  biggestBlocker: LayersV2['biggestBlocker']
  personalization: PersonalizationVars
  ragSnippets?: string
  section: 'primaryObstacle'|'strategicFoundation'|'personalBrand'|'marketingStrategy'|'platformTactics'|'contentExecution'|'mentalHealth'
  onboardingSummary?: string
}): Promise<LayersV2> {
  const prompt = buildLayeredPlanPrompt({
    userName: args.userName,
    stage: args.stage,
    primaryPlatform: args.primaryPlatform,
    biggestBlocker: args.biggestBlocker,
    personalization: args.personalization,
    platformStrategies: defaultPlatformStrategies(),
    ragSnippets: args.ragSnippets,
    onboardingSummary: args.onboardingSummary,
    onlySections: [args.section],
  })
  logPrompt(`section ${args.section}`, prompt)
  // Small token cap per section; retry will add headroom if needed
  const json = await callClaudeJSONWithRetry<LayersV2>({ prompt, timeoutMs: 105_000, maxTokens: 1900 }, 2)
  logResponse(`section ${args.section}`, json)
  return ensureCounts(json)
}

export function finalizeLayeredPlan(layers: LayersV2): LayersV2 {
  // Remove any leading "Do:" prefixes and trim bullets
  const stripDo = (s: string) => String(s).replace(/^(\s*do:\s*)+/i, '').trim()
  const sec: any = (layers as any).sections || {}
  ;(['primaryObstacle','strategicFoundation','personalBrand','marketingStrategy','platformTactics','contentExecution','mentalHealth'] as const).forEach(k => {
    const r = sec[k].report
    const planItems = Array.isArray(r.addToYourPlan) && r.addToYourPlan.length ? r.addToYourPlan : r.bullets
    const cleaned = (planItems || []).slice(0,5).map((text: unknown) => stripDo(String(text)))
    r.addToYourPlan = cleaned
    r.bullets = cleaned
    if (typeof r.summary === 'string') r.summary = stripDo(r.summary)
    if (typeof r.title === 'string' && !r.title.trim()) {
      const fallback = deriveTitle(r.summary, r.paragraph)
      if (fallback) r.title = fallback
    }
    if (r.quickWins) r.quickWins = r.quickWins.slice(0,5)
  })
  return ensureCounts(layers)
}
