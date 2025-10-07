import { LayersV2, PlatformKey, Stage, PersonaType, Blocker, PersonalizationVars, PlatformStrategy } from '@/types/layersV2'

/** Tighter copy + consistent ASCII characters to avoid weird Unicode issues */
export function defaultPlatformStrategies(): Record<PlatformKey, PlatformStrategy> {
  return {
    tiktok: {
      content_type: 'Native, raw short-form (15–45s)',
      posting_frequency: '1–3 posts daily (batch on weekends)',
      key_metrics: '3s hold, 50% retention, shares',
      growth_hack: 'Original sounds + duet/remix chains',
    },
    instagram: {
      content_type: 'Reels + carousels with clear saves value',
      posting_frequency: '1 post daily + Stories most days',
      key_metrics: 'Saves, profile taps, story replies',
      growth_hack: 'Carousel hook lines, cover consistency',
    },
    youtube: {
      content_type: 'High-utility long-form (8–14 min) + Shorts',
      posting_frequency: '1–2 videos weekly (+ 2–4 Shorts)',
      key_metrics: 'Avg view duration, CTR, session time',
      growth_hack: 'Series format + thumbnail/title testing',
    },
  }
}

export function buildLayeredPlanPrompt(args: {
  userName?: string
  stage: Stage
  primaryPlatform: PlatformKey
  biggestBlocker: Blocker
  personalization: PersonalizationVars
  platformStrategies?: Record<PlatformKey, PlatformStrategy>
  ragSnippets?: string
  onlySections?: Array<'primaryObstacle'|'strategicFoundation'|'personalBrand'|'marketingStrategy'|'platformTactics'|'contentExecution'|'mentalHealth'>
  onboardingSummary?: string
}): string {
  const plat = args.platformStrategies || defaultPlatformStrategies()

  const sys = `You are an expert growth + monetization coach for creators and small brands.
Return ONLY valid JSON of type LayersV2 (no markdown). Be specific, compact, and well-structured.
Do not include trailing commas. Escape quotes properly. Keep total JSON under ~800 tokens.

GLOBAL STYLE
- Each section’s report must contain:
  - paragraph: a tailored 120–150 word paragraph (concise, empathetic, actionable).
  - addToYourPlan: exactly 3 bullets, each ≤120 chars, starting with a strong verb, atomic and shippable this week.
- learnMore.context: 120–150 words, distinct focus per section (no overlaps).
- framework.steps: exactly 3 imperative steps.
- Use exact camelCase section keys.

DISTINCT LEARN MORE DESIGNS (fixed per section)
- primaryObstacle.framework.name = "Root Cause Triad" (steps: Observe signals; Test assumptions; Decide action path)
- strategicFoundation.framework.name = "Promise–Proof–Plan" (steps: Define promise; Select proof; Map plan)
- personalBrand.framework.name = "Identity Pyramid" (steps: Core values; Style guide; Signature motif)
- marketingStrategy.framework.name = "Attract–Nurture–Convert" (steps: Entry offer; Nurture arc; Conversion event)
- platformTactics.framework.name = "Hook–Payoff–Loop" (steps: Win first seconds; Deliver payoff; Create next-step loop)
- contentExecution.framework.name = "Plan–Produce–Publish" (steps: Calendar blocks; Batch creation; Review ritual)
- mentalHealth.framework.name = "Trigger–Tool–Track" (steps: Spot trigger; Apply tool; Track streaks)

ANTI-REPETITION (HARD)
- No duplicate bullets across any sections (compare first two words).
- Framework names must be unique per section as specified above.
- Metrics/themes must differ by section (diagnostic, positioning, memorability, funnel, platform, ops, wellbeing).

OUTPUT SHAPE
- sections: { primaryObstacle, strategicFoundation, personalBrand, marketingStrategy, platformTactics, contentExecution, mentalHealth }
  Each section contains:
    report: { paragraph, addToYourPlan[3] }
    learnMore: { context, framework:{ name, steps[3] }, caseStudies[0–1], tools[0–3] }
    elaborate: { sources[0–3], advanced[0–3], troubleshooting[0–3], longTerm[0–3] }
    summary: 1 short sentence (essence of the section)
- analysis.persona = role + behavior (e.g., "Aspiring YouTuber with perfectionist tendencies").
- sections.primaryObstacle.summary MUST equal analysis.primaryObstacle verbatim.

SECTION PURPOSES
- primaryObstacle: Diagnose the biggest blocker now; report.paragraph explains the bottleneck and the validation plan (bullets stay focused on quick validation actions).
- strategicFoundation: Positioning (ICP, transformation, pillars, messaging angles); avoid workflow/platform talk.
- personalBrand: Identity/memorability (pillars->prooflines->motifs, voice rules, signature elements).
- marketingStrategy: Channel mix, entry offer, nurture arc, conversion; 90-day view; funnel metrics.
- platformTactics: Mechanics for ${args.primaryPlatform} aligned to PLATFORM_STRATEGIES; hooks, structure, cadence, feedback loops.
- contentExecution: Weekly operating system; batching, templates, asset library, QA, analytics ritual.
- mentalHealth: Imperfectionist rules, comparison guardrails, recovery plan, boundary scripts, sustainability.

VALIDATION (MODEL MUST SELF-CHECK)
- addToYourPlan bullets exist (3–5) and have unique first two words across all sections.
- Each section uses the specified framework name and 3 steps.
- platformTactics references ${args.primaryPlatform} mechanics using keys from PLATFORM_STRATEGIES (content_type, posting_frequency, key_metrics, growth_hack).

Keep JSON compact and human-readable.`

  const user = `USER_PROFILE:
- Name: ${args.userName || ''}
- Stage: ${args.stage}
- Persona: ${args.personalization.personality_type}
- Primary Platform: ${args.primaryPlatform}
- Primary Blocker: ${args.biggestBlocker}

PERSONALIZATION_VARIABLES:
- comfort_with_visibility: ${args.personalization.comfort_with_visibility}
- time_availability: ${args.personalization.time_availability}
- technical_skill: ${args.personalization.technical_skill}
- monetization_urgency: ${args.personalization.monetization_urgency}
- personality_type: ${args.personalization.personality_type}

PLATFORM_STRATEGIES:
${JSON.stringify(plat, null, 2)}

GOALS:
- Make the user feel understood, helped, analyzed, taught, and encouraged.
- Bias to achievable micro-habits and binary wins.
- Prefer leading indicators over vanity metrics; emphasize monthly follower velocity.

AVAILABLE USER DATA (RAG SNIPPETS):
${args.ragSnippets || '(none)'}

ONBOARDING_SUMMARY:
${args.onboardingSummary || '(none)'}

ONLY_SECTIONS:
${JSON.stringify(args.onlySections || [], null, 2)}

OUTPUT:
Return a single JSON object of type LayersV2 with all required fields. No extra commentary.`

  return `${sys}

${user}`
}
