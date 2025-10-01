import { callClaudeJSONSystemUser } from '@/lib/claude'

export type OnboardingV2 = {
  version: 'onboarding.v2'
  identity?: 'personal_brand'|'business'|'artist'|'monetize_existing'|'stuck'|'exploring'
  business_type?: 'digital'|'service'|'physical'
  art_medium?: 'music'|'visual'|'writing'|'other'
  exploring_excite?: string

  stage?: 'starting'|'early_momentum'|'growing'|'plateauing'|'large_optimizing'|'restart'
  plateau_causes?: string[]

  biggest_challenges?: string[]
  six_month_success?: string[]
  drivers?: string[]
  audience_feelings?: string[]

  content_natural?: string
  visibility_comfort?: string
  time_capacity?: string
  endless_topics?: string

  natural_platforms?: string[]
  who_needs_you?: string
  who_needs_help_with?: string
  metrics_relationship?: string

  fears?: string[]
  already_tried?: string[]
  handle_criticism?: string

  monetization_approach?: string
  monetization_interests?: string[]
  monetization_current?: string[]

  dream_weight?: string

  platform_confidence?: 'low'|'medium'|'high'
  should_show_q14?: boolean
  should_show_q15?: boolean
}

const SYSTEM_PROMPT = `You are an AI growth coach. Generate clear, kind, and highly actionable guidance for creators and small brands based on the provided normalized onboarding JSON. Prioritize practical execution over theory, authenticity over perfection, and sustainable growth over viral tricks. Use plain language (8th–10th grade), zero jargon, and make every recommendation do-able this week.

You must return valid JSON only that conforms exactly to the schema in this prompt. Do not include markdown, explanations, or extra keys. Honor all limits (counts and character limits). When data is missing, infer sensible defaults from context and note those in the “assumptions” field.`

function buildUserPrompt(onboarding: OnboardingV2): string {
  const template = `Here are the user’s normalized onboarding answers (onboarding.v2): {ONBOARDING_JSON_HERE} Produce a LayeredPlan with 5 sections:
	1.	Primary Obstacle
	2	Strategic Foundation
	3.	Monetization Path
	4.	Mental Health & Sustainability
	5.	Success Measurement {
  "meta": {
    "version": "layeredplan.v1",
    "identity": "personal_brand|business|artist|monetize_existing|stuck|exploring",
    "stage": "starting|early_momentum|growing|plateauing|large_optimizing|restart",
    "platforms": ["tiktok|instagram|youtube|twitter_x|linkedin|multi_equal|lurker"],
    "primary_obstacle": "fear_judgment|inconsistent|what_to_post|no_engagement|no_time|inauthentic|overwhelmed_advice|tech_confusion|comparison|stalled",
    "assumptions": ["max 5 short notes about inferences you made"]
  },
  "sections": [
    {
      "id": "primary_obstacle",
      "report": {
        "title": "string",
        "overview": "120-200 words, empathetic, shows you understand their situation and desired outcome, ends with what will change after applying the steps.",
        "bullets": ["3-5 items, each ≤140 chars, each starts with a verb (e.g., “Define…”, “Test…”)."],
        "addToPlan": ["4-6 items, personalized micro-actions for this week, ≤120 chars, encouraging tone."]
      },
      "learnMore": {
        "context": "120-180 words that explain why this is the first lever to pull and how it unlocks progress.",
        "framework": {
          "name": "string",
          "steps": ["Step 1 (≤140 chars)", "Step 2", "Step 3"]
        },
        "tools": ["1-2 named tools or worksheets with purpose (≤90 chars each)"],
        "caseStudies": ["1-2 short examples (≤90 chars) tied to their identity/stage/platforms"]
      },
      "elaborate": {
        "advanced": ["3-6 advanced tactics, ≤140 chars each"],
        "troubleshooting": ["3-6 if/then fixes mapped to common failure modes, ≤140 chars each"],
        "longTerm": ["3-6 habits/systems that compound over months, ≤140 chars each"],
        "sources": ["3-5 'Book — Chapter/Section' strings"]
      }
    },
    {
      "id": "strategic_foundation",
      "report": { "title": "", "overview": "", "bullets": [], "addToPlan": [] },
      "learnMore": { "context": "", "framework": { "name": "", "steps": [] }, "tools": [], "caseStudies": [] },
      "elaborate": { "advanced": [], "troubleshooting": [], "longTerm": [], "sources": [] }
    },
    {
      "id": "monetization_path",
      "report": { "title": "", "overview": "", "bullets": [], "addToPlan": [] },
      "learnMore": { "context": "", "framework": { "name": "", "steps": [] }, "tools": [], "caseStudies": [] },
      "elaborate": { "advanced": [], "troubleshooting": [], "longTerm": [], "sources": [] }
    },
    {
      "id": "mental_health_sustainability",
      "report": { "title": "", "overview": "", "bullets": [], "addToPlan": [] },
      "learnMore": { "context": "", "framework": { "name": "", "steps": [] }, "tools": [], "caseStudies": [] },
      "elaborate": { "advanced": [], "troubleshooting": [], "longTerm": [], "sources": [] }
    },
    {
      "id": "success_measurement",
      "report": { "title": "", "overview": "", "bullets": [], "addToPlan": [] },
      "learnMore": { "context": "", "framework": { "name": "", "steps": [] }, "tools": [], "caseStudies": [] },
      "elaborate": { "advanced": [], "troubleshooting": [], "longTerm": [], "sources": [] }
    }
  ]
}

Section-specific guidance and routing (light, deterministic)
...
Output contract
Return only a single JSON object exactly matching the schema above. Do not include markdown, comments, or extra keys. Validate counts and character limits before returning.`

  return template.replace('{ONBOARDING_JSON_HERE}', JSON.stringify(onboarding))
}

export async function generateLayeredPlanFromOnboarding(onboarding: OnboardingV2, options?: { timeoutMs?: number; maxTokens?: number }) {
  const system = SYSTEM_PROMPT
  const user = buildUserPrompt(onboarding)
  return await callClaudeJSONSystemUser<any>({ system, user, timeoutMs: options?.timeoutMs ?? 90000, maxTokens: options?.maxTokens ?? 1800 })
}

