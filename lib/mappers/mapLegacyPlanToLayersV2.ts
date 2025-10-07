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
  const brand = s.personal_brand_development || {}

  const bullets = (x: any, n: number) => asArr(x?.bullets).slice(0, n)
  const quickWins = (list: string[]) => list.slice(0, 3).map((t) => ({ label: t.split(':')[0].slice(0, 24) || 'Quick Win', how: t }))

  const fallbackPersonalization: PersonalizationVars = opts?.personalization || {
    comfort_with_visibility: 'medium', time_availability: 'medium', technical_skill: 'medium', monetization_urgency: 'medium', personality_type: 'creator'
  }

  const plat = opts?.platformStrategies || defaultPlatformStrategies()

  const ensureList = (list: string[], fallback: string[]) => {
    const clean = list.filter((x) => typeof x === 'string' && x.trim()).map((x) => x.trim())
    return clean.length ? clean.slice(0, fallback.length || clean.length) : fallback
  }

  return {
    userName: undefined,
    stage: opts?.stage || '1K-10K',
    primaryPlatform: opts?.primaryPlatform || 'instagram',
    biggestBlocker: opts?.biggestBlocker || 'lack_of_consistency',
    personalization: fallbackPersonalization,
    platformStrategies: plat,
    sections: {
      primaryObstacle: {
        report: {
          title: plan?.main_problem || 'Primary Obstacle',
          bullets: ensureList(bullets(ai, 5), [
            'Adopt a simple publish habit (20 minutes per day).',
            'Track wins weekly to reinforce momentum.',
            'Batch similar tasks to reduce start friction.',
          ]),
          quickWins: quickWins(ensureList(bullets(content, 3), ['Reuse your best-performing hook with a new example.', 'Record a single-take story each morning.', 'Pair short-form with a caption template.'])),
        },
        learnMore: {
          context: foundation?.summary || ai?.summary || 'Consistency compounds algorithmic exposure and skill.',
          framework: {
            name: 'Mini-Habit Ladder',
            steps: ensureList(bullets(content, 3), ['Define your minimum publish bar.', 'Time-block 20-minute creation windows.', 'Run a weekly retro.']),
          },
          tools: undefined,
        },
        elaborate: {
          advanced: ensureList(bullets(metrics, 4), ['Automate idea capture from audience replies.', 'Design a batching pipeline (ideate → script → shoot).']),
          troubleshooting: undefined,
          longTerm: ensureList(bullets(posting, 4), ['Scale to a 30-day content runway.', 'Hire editing help once output is stable.']),
        },
      },
      strategicFoundation: {
        report: {
          title: 'Strategic Foundation',
          bullets: ensureList(bullets(foundation, 5), ['Clarify your transformation promise.', 'Pick three sticky content pillars.', 'List proof points that reinforce your POV.']),
        },
        learnMore: {
          context: foundation?.summary || 'Clarity accelerates recall and followership.',
          framework: {
            name: 'Brand Diamond',
            steps: ensureList(bullets(foundation, 3), ['Audience', 'Offer', 'Promise']),
          },
          tools: undefined,
        },
        elaborate: { sources: undefined, advanced: ensureList(bullets(content, 4), ['Build a swipe file that reflects your brand voice.', 'Codify your visual identity in a lightweight guide.']) },
      },
      personalBrand: {
        report: {
          title: 'Personal Brand Development',
          bullets: ensureList(bullets(brand, 5), ['Craft a repeatable intro + sign-off.', 'Share origin stories that anchor your credibility.', 'Highlight community wins to validate your promise.']),
        },
        learnMore: {
          context: brand?.summary || 'Distinctive stories make you memorable.',
          framework: {
            name: 'Story Strip',
            steps: ensureList(bullets(brand, 3), ['Origin', 'Tension', 'Resolution']),
          },
        },
        elaborate: {
          sources: undefined,
          advanced: ensureList(bullets(brand, 4), ['Film a short brand trailer for profile pin.']),
          troubleshooting: undefined,
          longTerm: undefined,
        },
      },
      marketingStrategy: {
        report: {
          title: 'Marketing Strategy Development',
          bullets: ensureList(bullets(platform, 5), ['Capture emails with a simple lead magnet.', 'Test a low-lift paid offer once per quarter.', 'Repurpose top content into nurture sequences.']),
        },
        learnMore: {
          context: platform?.summary || 'Ownable assets de-risk platform volatility.',
          framework: {
            name: 'Lean Offer Loop',
            steps: ensureList(bullets(platform, 3), ['Hypothesis', 'Pre-sell', 'Deliver']),
          },
        },
        elaborate: {
          advanced: ensureList(bullets(platform, 4), ['Run an audience survey to prioritize offers.']),
          troubleshooting: undefined,
          longTerm: ensureList(bullets(platform, 3), ['Build a simple evergreen funnel.']),
        },
      },
      platformTactics: {
        report: {
          title: 'Platform-Specific Tactics',
          bullets: ensureList(bullets(platform, 5), ['Audit first-two-second hooks quarterly.', 'Use native features weekly (polls, duets, stitches).', 'Cross-post with tailored openings per platform.']),
        },
        learnMore: {
          context: platform?.summary || 'Match the cadence and culture of each network.',
          framework: {
            name: 'Format-Match',
            steps: ensureList(bullets(platform, 3), ['Analyse winners', 'Mirror structure', 'Refine retention']),
          },
        },
        elaborate: {
          advanced: ensureList(bullets(platform, 4), ['Tag content themes to identify shareable formats.']),
          troubleshooting: undefined,
          longTerm: undefined,
        },
      },
      contentExecution: {
        report: {
          title: 'Content Creation & Execution',
          bullets: ensureList([...bullets(content, 3), ...bullets(posting, 2)], ['Batch scripts every Sunday.', 'Record 3 takes per idea and pick the best.', 'Review metrics weekly to tweak hooks.']),
        },
        learnMore: {
          context: content?.summary || 'Systems reduce friction and keep publishing steady.',
          framework: {
            name: 'Ship Loop',
            steps: ensureList(bullets(posting, 3), ['Plan', 'Produce', 'Review']),
          },
        },
        elaborate: {
          advanced: ensureList(bullets(content, 4), ['Create a content OS to track drafts → live.']),
          troubleshooting: undefined,
          longTerm: ensureList(bullets(posting, 4), ['Set a quarterly experiment cadence.']),
        },
      },
      mentalHealth: {
        report: {
          title: 'Mental Health & Sustainability',
          bullets: ensureList(bullets(mental, 5), ['Protect one no-post day per week.', 'Treat each post as an experiment, not a verdict.', 'Celebrate streaks over raw views.']),
        },
        learnMore: {
          context: mental?.summary || 'Energy management sustains growth.',
          framework: {
            name: 'Imperfectionist Playbook',
            steps: ensureList(bullets(mental, 3), ['Permission slip', 'Constraint', 'Ship']),
          },
        },
        elaborate: {
          troubleshooting: undefined,
          advanced: ensureList(bullets(mental, 4), ['Use templates to reduce decision fatigue.']),
          longTerm: ensureList(bullets(mental, 3), ['Schedule quarterly sabbatical weeks.']),
        },
      },
      monetizationPath: {
        report: { title: 'Your Monetization Path', bullets: ensureList(bullets(platform, 5), ['Capture leads weekly.', 'Validate offers with conversations.', 'Reinvest into production quality.']) },
        learnMore: { context: platform?.summary || '', framework: { name: 'Lean Offer Loop', steps: ensureList(bullets(platform, 3), ['Hypothesis', 'Pre-sell', 'Deliver']) } },
        elaborate: { advanced: ensureList(bullets(platform, 4), ['Audit pricing quarterly.']) },
      },
      successMeasurement: {
        report: { title: 'Measure Your Success', bullets: ensureList(bullets(metrics, 5), ['Track weekly output + completion rate.', 'Review retention at 3s/15s marks.', 'Set experiments per metric.']) },
        learnMore: { context: metrics?.summary || '', framework: { name: 'Signal > Noise', steps: ensureList(bullets(metrics, 3), ['Define leading metrics', 'Instrument tracking', 'Review weekly']) }, tools: undefined },
        elaborate: { advanced: ensureList(bullets(metrics, 4), ['Run cohort analysis by content pillar.']) },
      },
    }
  }
}
