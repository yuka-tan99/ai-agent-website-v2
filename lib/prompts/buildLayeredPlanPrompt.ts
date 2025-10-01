import { LayersV2, PlatformKey, Stage, PersonaType, Blocker, PersonalizationVars, PlatformStrategy } from '@/types/layersV2'

export function defaultPlatformStrategies(): Record<PlatformKey, PlatformStrategy> {
  return {
    tiktok: {
      content_type: 'Raw, authentic short‑form videos',
      posting_frequency: 'Post 1–3 times daily',
      key_metrics: 'Completion rate, shares',
      growth_hack: 'Trend surfing; create original sounds',
    },
    instagram: {
      content_type: 'Visual storytelling (reels + carousels)',
      posting_frequency: 'Post daily + use Stories',
      key_metrics: 'Saves, Story replies',
      growth_hack: 'Carousel hooks; compelling reel covers',
    },
    youtube: {
      content_type: 'Long‑form, high‑value videos',
      posting_frequency: 'Post 1–2 times weekly',
      key_metrics: 'Watch time, CTR',
      growth_hack: 'Thumbnail psychology; build series',
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
  onlySections?: Array<'primaryObstacle'|'strategicFoundation'|'personalBrand'|'monetizationPath'|'mentalHealth'|'successMeasurement'>
  onboardingSummary?: string
}): string {
  const plat = args.platformStrategies || defaultPlatformStrategies()
  const sys = `You are an expert growth + monetization coach for creators and small brands. Return only valid JSON matching the LayersV2 schema (no markdown). Keep output concise and structured: each bullets array 3–5, quickWins 3–5, framework.steps exactly 3. For each section, learnMore.context must be a tight 200–250 word paragraph tailored to the user and RAG. Keep strings specific. Target JSON compactness.`;
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
- Make user feel understood, helped, analyzed, taught, and encouraged.
- Balance aspiration with achievability (micro-habits, binary wins).
- Provide both strategy and tactics; authenticity first.

INSTRUCTIONS:
- Build sections: primaryObstacle, strategicFoundation, personalBrand, monetizationPath, mentalHealth, successMeasurement.
  - Important: Use the exact camelCase key names shown above (e.g., personalBrand). Do not use snake_case or alternative names.
- For each section produce:
  - report: { title, bullets[3–5], quickWins[3–5] }
  - learnMore: { context(200–250 words), framework: { name, steps[3] }, caseStudies[0–2], tools[0–5] }
  - elaborate: { sources[0–5], advanced[0–6], troubleshooting[0–6], longTerm[0–6] }
  - summary: one short sentence capturing the essence of the section
- Tailor content to ${args.stage} and ${args.primaryPlatform}. Respect personalization variables.
- Leading indicators > vanity metrics; emphasize meaningful interactions and monthly follower velocity.
- Mental health: include imperfectionist interventions, comparison guardrails, burnout prevention, impostor evidence bank.

ANALYSIS REQUIREMENTS:
- Always include an \`analysis\` object with two strings: { "persona", "primaryObstacle" } — even when generating a single section.
- \`analysis.persona\` must combine role + behavior (e.g., "Aspiring YouTuber with perfectionist tendencies"). Avoid vague labels.
- Add \`sections.primaryObstacle.summary\` (one concise sentence). The exact text MUST be identical to \`analysis.primaryObstacle\`.
- Do NOT output placeholder/example text like "string – ...". Use the user’s answers and RAG for real summaries.

AVAILABLE USER DATA (RAG SNIPPETS):
${args.ragSnippets || '(none)'}

ONBOARDING_SUMMARY (high-signal answers; use concisely):
${args.onboardingSummary || '(none)'}

OUTPUT:
Return a single JSON object of type LayersV2 with all required fields. Include the \`analysis\` object and \`sections.primaryObstacle.summary\` as specified. No extra commentary or markdown. Keep JSON compact and within ~1,200 tokens.

If ONLY_SECTIONS is provided below, include ONLY those keys inside \`sections\` but STILL include the top-level keys and the \`analysis\` object.

ONLY_SECTIONS:
${JSON.stringify(args.onlySections || [], null, 2)}`
  return `${sys}

${user}`
}
