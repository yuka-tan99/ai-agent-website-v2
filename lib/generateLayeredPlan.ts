import { LayersV2, PlatformKey, PersonalizationVars } from '@/types/layersV2'
import { callClaudeJSONWithRetry } from '@/lib/claude'
import { buildLayeredPlanPrompt, defaultPlatformStrategies } from '@/lib/prompts/buildLayeredPlanPrompt'

function trimArr<T>(arr: T[] | undefined, n: number): T[] | undefined {
  if (!Array.isArray(arr)) return undefined
  const out = arr.filter(Boolean).slice(0, n)
  return out.length ? out : undefined
}

/** Defensive normalizer to ensure all required keys/limits exist */
function ensureCounts(l: LayersV2): LayersV2 {
  // Normalize possible alternate section keys from the model response
  const secAny: any = (l as any).sections || {}
  if (secAny && !secAny.personalBrand) {
    const alias = secAny.personal_brand_development || secAny.personal_brand || secAny.personalBrandDevelopment
    if (alias) {
      secAny.personalBrand = alias
      delete secAny.personal_brand_development
      delete secAny.personal_brand
      delete secAny.personalBrandDevelopment
    }
  }
  const sec = l.sections
  const init = () => ({
    report: { title: '', bullets: [] as string[], quickWins: [] as any[] },
    learnMore: { context: '', framework: { name: '', steps: [] as string[] }, caseStudies: undefined, tools: undefined },
    elaborate: { sources: undefined, advanced: undefined, troubleshooting: undefined, longTerm: undefined },
  })

  // ensure all sections exist (including personalBrand)
  ;(['primaryObstacle','strategicFoundation','personalBrand','monetizationPath','mentalHealth','successMeasurement'] as const).forEach(k => {
    ;(sec as any)[k] = (sec as any)[k] || init()
    ;(sec as any)[k].report = (sec as any)[k].report || { title: '', bullets: [], quickWins: [] }
    ;(sec as any)[k].learnMore = (sec as any)[k].learnMore || { context: '', framework: { name: '', steps: [] } }
    if (!(sec as any)[k].learnMore.framework) (sec as any)[k].learnMore.framework = { name: '', steps: [] }
    ;(sec as any)[k].elaborate = (sec as any)[k].elaborate || { }
  })

  // light shaping for UI limits
  const fixReport = (key: keyof LayersV2['sections']) => {
    const r = sec[key].report
    // Do not backfill bullets during generation; show loader until real content arrives
    r.bullets = (r.bullets || []).filter(Boolean).slice(0, 5)
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

  ;(['primaryObstacle','strategicFoundation','personalBrand','monetizationPath','mentalHealth','successMeasurement'] as const).forEach(k => {
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
  const json = await callClaudeJSONWithRetry<LayersV2>({ prompt, timeoutMs: 90_000, maxTokens: 1100 }, 1)
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
  onlySections: Array<'primaryObstacle'|'strategicFoundation'|'personalBrand'|'monetizationPath'|'mentalHealth'|'successMeasurement'>
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
  const json = await callClaudeJSONWithRetry<LayersV2>({ prompt, timeoutMs: 85_000, maxTokens: 950 }, 1)
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
  section: 'primaryObstacle'|'strategicFoundation'|'personalBrand'|'monetizationPath'|'mentalHealth'|'successMeasurement'
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
  // Small token cap per section; retry will add headroom if needed
  const json = await callClaudeJSONWithRetry<LayersV2>({ prompt, timeoutMs: 85_000, maxTokens: 950 }, 1)
  return ensureCounts(json)
}

export function finalizeLayeredPlan(layers: LayersV2): LayersV2 {
  // Remove any leading "Do:" prefixes and trim bullets
  const stripDo = (s: string) => String(s).replace(/^(\s*do:\s*)+/i, '').trim()
  ;(['primaryObstacle','strategicFoundation','personalBrand','monetizationPath','mentalHealth','successMeasurement'] as const).forEach(k => {
    const r = layers.sections[k].report
    r.bullets = (r.bullets || []).slice(0,5).map(x => stripDo(String(x)))
    if (r.quickWins) r.quickWins = r.quickWins.slice(0,5)
  })
  return ensureCounts(layers)
}
