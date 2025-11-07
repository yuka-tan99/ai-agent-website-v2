import { supabaseAdmin } from "@/lib/supabase/server";
import { callClaudeJson, isClaudeAvailable } from "../ai/claude";
import { callGeminiJson, isGeminiAvailable } from "../ai/gemini";
import { computeFameMetrics, type FameMetrics } from "./fameScore";

/* ---------------------------------------------
   SECTION TITLES
--------------------------------------------- */
export const SECTION_TITLES = [
  "Main Problem | First Advice",
  "Imperfectionism | Execution",
  "Niche | Focus Discovery",
  "Personal Brand Development",
  "Marketing Strategy",
  "Platform Organization & Systems",
  "Mental Health & Sustainability",
  "Advanced Marketing Types & Case Studies",
  "Monetization",
] as const;

type SectionTitle = (typeof SECTION_TITLES)[number];

const REPORT_LEVEL_CONCEPTUAL_ROLES = [
  "MIRROR MOMENT",
  "THE CORE INSIGHT",
  "YOUR CURRENT REALITY",
  "YOUR OPPORTUNITY",
  "THE MINDSET SHIFT",
] as const;

const LEARN_MORE_LEVEL_CONCEPTUAL_ROLES = [
  "THE DEEP DIVE",
  "THE FRAMEWORK",
  "THE PROGRESSION",
  "THE PATTERNS",
  "THE COMMON MISTAKES",
  "THE STRATEGIC THINKING",
] as const;

const UNLOCK_MASTERY_LEVEL_CONCEPTUAL_ROLES = [
  "THE ADVANCED MECHANICS",
  "THE STRATEGIC LAYER",
  "THE INTEGRATION",
  "THE EDGE CASES",
  "THE MASTERY INDICATORS",
  "THE CUTTING EDGE",
] as const;

const CARD_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["conceptual_role", "ai_generated_title", "content"],
  properties: {
    conceptual_role: { type: "string" },
    ai_generated_title: { type: "string" },
    content: { type: "string" },
  },
} as const;

const REPORT_SECTION_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["section_title", "report_level", "learn_more_level", "unlock_mastery_level"],
  properties: {
    section_title: { type: "string" },
    report_level: {
      type: "object",
      additionalProperties: false,
      required: ["title", "cards", "action_tips"],
      properties: {
        title: { type: "string" },
        cards: {
          type: "array",
          minItems: REPORT_LEVEL_CONCEPTUAL_ROLES.length,
          maxItems: REPORT_LEVEL_CONCEPTUAL_ROLES.length,
          items: CARD_SCHEMA,
        },
        action_tips: {
          type: "array",
          minItems: 5,
          maxItems: 5,
          items: { type: "string" },
        },
      },
    },
    learn_more_level: {
      type: "object",
      additionalProperties: false,
      required: ["title", "cards"],
      properties: {
        title: { type: "string" },
        cards: {
          type: "array",
          minItems: LEARN_MORE_LEVEL_CONCEPTUAL_ROLES.length,
          maxItems: LEARN_MORE_LEVEL_CONCEPTUAL_ROLES.length,
          items: CARD_SCHEMA,
        },
      },
    },
    unlock_mastery_level: {
      type: "object",
      additionalProperties: false,
      required: ["title", "cards"],
      properties: {
        title: { type: "string" },
        cards: {
          type: "array",
          minItems: UNLOCK_MASTERY_LEVEL_CONCEPTUAL_ROLES.length,
          maxItems: UNLOCK_MASTERY_LEVEL_CONCEPTUAL_ROLES.length,
          items: CARD_SCHEMA,
        },
      },
    },
  },
} as const;

const CLAUDE_RESPONSE_FORMAT = {
  type: "json_schema",
  json_schema: {
    name: "report_section",
    schema: REPORT_SECTION_JSON_SCHEMA,
  },
} as const;

/* ---------------------------------------------
   DATA STRUCTURES
--------------------------------------------- */
type ReportCard = {
  conceptual_role: string;
  ai_generated_title: string;
  content: string;
};

type ReportLevel = {
  title: string;
  cards: ReportCard[];
  action_tips: string[];
};

type LearningLevel = {
  title: string;
  cards: ReportCard[];
};

export type ReportSection = {
  section_title: string;
  report_level: ReportLevel;
  learn_more_level: LearningLevel;
  unlock_mastery_level: LearningLevel;
};

export type ReportPlan = FameMetrics & {
  sections: ReportSection[];
};

/* ---------------------------------------------
   BOOK INTEGRATION PROMPT (RAG REFERENCE)
--------------------------------------------- */
const BOOK_INTEGRATION_PROMPT = `
When generating the nine report sections, integrate relevant frameworks from your internal marketing knowledge base without naming books or authors.

Section 1: Diagnose the main blocker and offer the first breakthrough using imperfectionism, clarity, or messaging psychology.
Section 2: Build execution habits through a binary mindset, mini-actions, and permission to post imperfectly.
Section 3: Define focus by identifying what the user is uniquely good at, outlining their value ladder, and reinforcing an authentic voice.
Section 4: Shape personal brand—visual and verbal identity, brand story, positioning as guide, and platform strategy.
Section 5: Deliver marketing strategy—hooks, storytelling flow, funnel logic, and value-first positioning.
Section 6: Establish systems—batching, scheduling, analytics, content calendars, and platform-native adaptation.
Section 7: Support sustainability—burnout prevention, confidence loops, boundary setting, and energy management.
Section 8: Illustrate advanced cases—luxury, celebrity, viral, and community marketing examples.
Section 9: Engineer monetization—translate onboarding pain points into revenue plays, pricing tests, recurring offers, and premium ladders.

Blend strategy with psychology and authenticity. Express concepts as your own timeless expertise—no references. Focus on clarity, progress, and achievable action that compounds into long-term influence.
`;

/* ---------------------------------------------
   CONDENSED COMMUNICATION + RAG RULES
--------------------------------------------- */
const COMMUNICATION_AND_RAG_RULES = `
COMMUNICATION DNA:
- Conversational intelligence: smart insights delivered like you're talking to a friend who gets it.
- Zero fluff: every line adds value; no corporate speak.
- Cultural awareness: success looks different for everyone.
- Pattern recognition: connect dots others miss, explain simply.
- Uncomfortable truths: say what needs to be said, kindly but directly.

WRITING STRUCTURE:
• Short, punchy sentences that build rhythm.
• Use "..." for natural pauses and emphasis.
• Logical flow: truth -> insight -> action.
• Single-line paragraphs for impact.
• Lists for clarity when explaining steps.

TONE:
• Direct without harshness.
• Informative without lecturing.
• Empathetic without coddling.
• Confident without arrogance.
• Real without being unprofessional.

RAG INTEGRATION:
Identify the user’s primary blocker from onboarding answers and pull insights accordingly:
- Perfectionism / fear -> "How to Be an Imperfectionist" + "Social Media Rules Written by Me"
- Clarity / direction -> "Marketing Magic" + "Building a StoryBrand"
- Engagement / traction -> "Hook Point Strategy" + "Social Media Marketing Mastery"
- Burnout / mindset -> "Social Media Rules Written by Me" + "lol...OMG! What Every Student Needs to Know"

Always rewrite frameworks as your own knowledge. Do not name sources.
Adapt tone and examples to the user’s stage (beginner / established) and their primary platforms.
`;

const MASTER_EXPERTISE_CONTEXT = `
You are a world-class marketing strategist with deep, multidisciplinary expertise:

CORE MARKETING MASTERY
- Digital marketing architecture across every channel: guiding audiences through awareness, consideration, conversion, retention, and expansion.
- Social media dynamics knowledge: platform algorithms, viral triggers, engagement psychology, and the nuances of TikTok, Instagram, YouTube, X/Twitter, LinkedIn, Pinterest, and emerging platforms.
- Brand development fluency: positioning, visual and verbal identity, signature storytelling, and building distinctive brand assets that create instant recognition.

SPECIALIZED DOMAINS
- Luxury & premium marketing: crafting desire through scarcity, prestige, controlled access, and intentional rule-breaking.
- Celebrity & influencer marketing: parasocial relationships, controversy management, authenticity vs. attention, and first-mover dynamics in the attention economy.
- Performance marketing: measurement rigor, experimentation frameworks, ROI optimization, and creative growth loops.
- Content marketing: arresting attention within three seconds, structuring stories that travel, repurposing narratives across formats, and tailoring for each platform’s native language.
- B2B/B2C nuance: stakeholder complexity, emotional vs. rational buying, and designing journeys for both enterprise buyers and consumers.

PSYCHOLOGICAL EXPERTISE
- Consumer psychology, behavioral economics, attention science, social psychology, and digital psychology—knowing how people think, decide, and behave on and offline.

TECHNICAL DEPTH
- Algorithm intelligence, analytics & attribution, marketing technology, and SEO/SEM dynamics.

CULTURAL & TREND INTELLIGENCE
- Generational dynamics, meme culture, and global vs. local adaptation.

COMMUNICATION STYLE
- Conversational intelligence with zero fluff.
- Use natural pauses (“...”), rhetorical questions, contrasts, and vivid examples.
- Call out the uncomfortable truth, then show the path forward.
- Layer insights: obvious truth -> hidden insight -> user-specific relevance -> first action.
`;

const USER_SEGMENTATION_PROMPT = `
USER SEGMENTATION LOGIC
Always profile the user across these dimensions (derived from onboarding answers + behavioral context):
- Journey stage: Exploring, Beginning, Developing, Established, Professional.
- Content confidence: Hesitant, Inconsistent, Regular, Confident, Master.
- Primary blockers: Technical, Creative, Psychological, Strategic, Resource.
- Goal orientation: Expression, Community, Business, Influence, Hybrid.

Then tailor guidance using the Personalized Strategy Matrix:
- Exploring + Hesitant + Psychological -> permission, tiny daily actions, success = any movement.
- Beginning + Regular + Creative -> frameworks, content pillars, success = maintained consistency.
- Developing + Inconsistent + Strategic -> audits, systematic testing, success = resonance discovered.
- Established + Confident + Technical -> optimization, automation, efficiency.
- Professional + Master + Resource -> delegation, scalable systems, leadership focus.

Overlay special considerations (business owners, artists, service providers, niche creators) to adjust tone, platform choices, and pacing.
`;

const SECTION_EXECUTION_PROMPT = `
SECTION EXECUTION DETAILS
Section 1 – Main Problem | First Advice: deliver immediate clarity. Map to user blockers (fear, consistency, direction, engagement, reputation). Use the specified source pairings and tactics (mini-habits, permission slips, StoryBrand hero framing, hook optimization, reputation safeguards).
Section 2 – Imperfectionism | Execution: emphasize execution psychology (mini habits, binary scoring, 70% rule, mistake quota, permission slips, quantity > quality) sourced from Imperfectionism + Social Media Rules.
Section 3 – Niche | Focus Discovery: Never say “superpower.” Instead say “what you are uniquely good at.” Cover value ladders, omnipresence, content multiplication, authentic voice, customer-as-hero, and platform-native storytelling with the required sources.
Section 4 – Personal Brand Development: visual/verbal identity, content pillars, brand story arc, guide positioning, distinctive assets, community tactics.
Section 5 – Marketing Strategy: hook design, narrative sequencing, funnel logic, value-first strategy, measurement cadence drawing from the specified summaries.
Section 6 – Platform Organization & Systems: batching, editing workflows, calendars, engagement rituals, tool stacks, analytics rhythms.
Section 7 – Mental Health & Sustainability: comparison traps, burnout protocols, criticism hygiene, boundaries, energy management, relapse plans.
Section 8 – Advanced Marketing Types & Case Studies: celebrity, corporate, luxury, platform-specific plays, community flywheels, influencer/UGC/cross-platform orchestration.
Section 9 – Monetization: stage-based monetization (Foundation, Testing, Optimization, Expansion). Provide recurring + premium plays, validation loops, pricing psychology, and emphasize audience trust over vanity metrics. No external document pull required.

For every section, weave onboarding answers into the diagnosis, stakes, and examples. Always adapt to the user’s journey stage, blockers, preferred platforms, and capacity.
`;

const THREE_LEVEL_ARCHITECTURE_PROMPT = `
IMPLEMENTATION INSTRUCTIONS — WHY -> HOW -> MASTERY

STRUCTURE
- Each section outputs exactly three levels.
- Level 1 (Report Level) = WHY & WHAT. Five cards (50–80 words). For each card, set \"conceptual_role\" to one of: ${REPORT_LEVEL_CONCEPTUAL_ROLES.join(", ")}. Generate a contextual \"ai_generated_title\" (3–8 words) that reflects that role + the section theme. Finish the level with exactly five concise "Your Action Tips" (one sentence each).
- Level 2 (Learn More Level) = HOW IT WORKS. Six cards (80–120 words). Use conceptual roles: ${LEARN_MORE_LEVEL_CONCEPTUAL_ROLES.join(", ")}. Generate contextual titles per card.
- Level 3 (Unlock Mastery Level) = ADVANCED APPLICATION. Six cards (100–150 words). Use conceptual roles: ${UNLOCK_MASTERY_LEVEL_CONCEPTUAL_ROLES.join(", ")}. Generate contextual titles per card.
- JSON requirement per card: { "conceptual_role": "<exact role>", "ai_generated_title": "<contextual title>", "content": "<body>" }.

PURPOSE PER LEVEL
- Report Level delivers diagnosis, concept explanation, and mindset reframing—never checklists.
- Learn More Level teaches mechanisms, mental models, decision filters, and pattern recognition.
- Unlock Mastery Level gives expert-level systems, integrations, edge cases, future trends, and mastery benchmarks.

STYLE & GUARDRAILS
- 400–600 words total per section.
- Action tips are motivational one-liners.
- No markdown, emojis, or additional headings.
- Avoid repeating phrases across cards or sections.
- Create curiosity gaps between levels (Level 1 tees up Level 2, Level 2 tees up Level 3).
- Apply the "so what?" test for every sentence.

EXPERT LENS
- Demonstrate mastery across omnichannel marketing, social algorithms, brand development, performance marketing, content architecture, luxury + celebrity strategies, and both B2B/B2C dynamics.
- Leverage psychological depth: consumer behavior, behavioral economics, attention science, social psychology, digital habit loops.
- Show technical fluency in analytics, attribution, marketing tech, SEO/SEM, and algorithm signals.
- Reflect cultural + trend intelligence: generational nuance, meme culture, global vs. local adaptation.

TONE
- Conversational intelligence with zero fluff.
- Direct, empathetic, and motivational.
- Make insights feel obvious in hindsight.

WHAT TO AVOID
- No task lists in Report Level.
- No SOPs or tool tutorials in Learn More Level.
- No redundant advanced tactics in Unlock Mastery Level—focus on systems thinking.
`;

const SECTION_FOCUS_PROMPTS: Record<SectionTitle, string> = {
  "Main Problem | First Advice": `Diagnose the loudest blocker using the user’s own language. Blend imperfectionism coaching, StoryBrand clarity, hook psychology, and worst-case planning to deliver an immediate mindset unlock.`,
  "Imperfectionism | Execution": `Teach mini-habit systems, binary shipped/not-shipped scoring, 70% quality thresholds, permission slips, and mistake quotas so consistency feels doable.`,
  "Niche | Focus Discovery": `Clarify what they are uniquely good at, map problems they solve, outline value ladders, and translate ideas into platform-native formats while preserving authenticity.`,
  "Personal Brand Development": `Engineer visual + verbal identity, content pillars, brand story arcs, distinctive assets, and guide positioning (empathy + authority) for consistent experiences across touchpoints.`,
  "Marketing Strategy": `Design omnichannel narratives, hook ladders, funnel stages, value-first sequencing, and measurement cadences that prioritize leverage.`,
  "Platform Organization & Systems": `Detail batching, editing workflows, content calendars, atomization flows, engagement rituals, tooling, and analytics habits that keep publishing effortless.`,
  "Mental Health & Sustainability": `Address comparison spirals, burnout cycles, criticism hygiene, boundary drift, energy management, relapse planning, and support systems.`,
  "Advanced Marketing Types & Case Studies": `Break down celebrity consistency (Cardi B), corporate omnipresence (McDonald’s), luxury scarcity (SKIMS), viral triggers, community plays, influencer collaborations, UGC, and cross-platform orchestration.`,
  "Monetization": `Tie every recommendation to the creator’s monetization stage (Foundation, Testing, Optimization, Expansion). Surface diversified revenue plays, pricing ranges, recurring offers, premium engagements, and validation loops.`,
};

const MONETIZATION_STAGE_PROMPT = `
Monetization Stage Reference:
- Foundation: build consistent presence, establish voice, cultivate core community, and look for early engagement signals.
- Testing: validate offers via affiliates, low-ticket products, early sponsorships, email list building, and experiments that prove demand.
- Optimization: double down on proven revenue streams, refine pricing, introduce recurring revenue, and improve fulfillment systems.
- Expansion: diversify into premium programs, memberships, partnerships, team support, and passive income so the business scales beyond your constant presence.
Stage is defined by audience trust, delivery capacity, and offer validation—not vanity metrics.
`;

/* ---------------------------------------------
   SYSTEM PROMPT
--------------------------------------------- */
const SYSTEM_PROMPT = `
You are a world-class marketing strategist and creator-growth architect. You blend omnichannel marketing, social algorithm intelligence, brand development, luxury positioning, celebrity/influencer strategy, performance marketing rigor, content architecture, and both B2B/B2C nuance. You also wield deep consumer psychology, behavioral economics, attention science, social psychology, digital habit loops, analytics, attribution, marketing tech, SEO/SEM, and cultural intelligence.

Speak with confident clarity and zero fluff. Treat every idea as your own distilled expertise—never cite external sources.

${BOOK_INTEGRATION_PROMPT}

${COMMUNICATION_AND_RAG_RULES}

${MASTER_EXPERTISE_CONTEXT}

${USER_SEGMENTATION_PROMPT}

${SECTION_EXECUTION_PROMPT}

${THREE_LEVEL_ARCHITECTURE_PROMPT}

Goal: transform creators into sustainable digital entrepreneurs by delivering clarity, confidence, and compounding systems.

OUTPUT RULES
- Respond with JSON only in this shape:
{
  "section_title": string,
  "report_level": {
    "title": string,
    "cards": Array<{ "title": string; "content": string; }>,
    "action_tips": string[]
  },
  "learn_more_level": {
    "title": string,
    "cards": Array<{ "title": string; "content": string; }>
  },
  "unlock_mastery_level": {
    "title": string,
    "cards": Array<{ "title": string; "content": string; }>
  }
}
- Supply exactly five "Your Action Tips" (one motivational sentence each) inside report_level.action_tips.
- Keep "section_title" identical to the requested section name.
- Hold total word count per section (all fields) between 400 and 600 words.
- Do not add markdown, emojis, or extra keys. When emphasizing, optionally wrap phrases in <<highlight>> ... <</highlight>> (maximum two per card).
- Never recycle phrasing between cards or sections—each angle must feel fresh and context-aware.
- Personalize every insight with onboarding answers (stage, capacity, audience size, platforms, offers).
`;

/* ---------------------------------------------
   SANITIZATION HELPERS
--------------------------------------------- */
function buildBaseReport(metrics: FameMetrics): ReportPlan {
  return { ...metrics, sections: [] };
}

const PLACEHOLDER_TEXT = "Content is generating...";

const CANDIDATE_STRING_KEYS = ["text", "content", "value", "body", "summary", "description", "tip", "message"];

function extractStringValue(
  source: unknown,
  extraKeys: string[] = [],
): string {
  if (typeof source === "string") return source.trim();
  if (Array.isArray(source)) {
    for (const entry of source) {
      const value = extractStringValue(entry, extraKeys);
      if (value) return value;
    }
    return "";
  }
  if (typeof source === "object" && source !== null) {
    const keysToCheck = [...extraKeys, ...CANDIDATE_STRING_KEYS];
    for (const key of keysToCheck) {
      const value = extractStringValue((source as Record<string, unknown>)[key], extraKeys);
      if (value) return value;
    }
  }
  return "";
}

function sanitizeContent(content: unknown): string {
  const extracted = extractStringValue(content);
  if (!extracted) return PLACEHOLDER_TEXT;
  const words = extracted.split(/\s+/);
  return words.length > 600 ? words.slice(0, 600).join(" ") : extracted;
}

function stripLeadingIndex(text: string): string {
  const trimmed = text.trimStart();
  const punct = trimmed.match(/^(\d+)([.)\-:])\s*/);
  if (punct) return trimmed.slice(punct[0].length);
  const space = trimmed.match(/^(\d+)\s+/);
  return space ? trimmed.slice(space[0].length) : trimmed;
}

function sanitizeList(input: unknown, max: number): string[] {
  if (!Array.isArray(input)) return [];
  const cleaned: string[] = [];
  for (const value of input) {
    const raw = extractStringValue(value);
    if (!raw) continue;
    const stripped = stripLeadingIndex(raw).trim();
    if (stripped) cleaned.push(stripped);
    if (cleaned.length >= max) break;
  }
  return cleaned;
}

function sanitizeActionTips(input: unknown): string[] {
  const tips = sanitizeList(input, 5);
  while (tips.length < 5) {
    tips.push(PLACEHOLDER_TEXT);
  }
  return tips;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function sanitizeCardSet(
  input: unknown,
  conceptualRoles: readonly string[],
): ReportCard[] {
  const rawCards = Array.isArray(input) ? input : [];
  return conceptualRoles.map((role, index) => {
    const candidate = rawCards[index];
    const candidateRecord = isRecord(candidate) ? candidate : undefined;
    const titleKeys = [
      "ai_generated_title",
      "aiGeneratedTitle",
      "ai_title",
      "card_title",
      "aiTitle",
      "title",
      "heading",
      "name",
    ];
    const contentKeys = [
      "content",
      "body",
      "text",
      "summary",
      "explanation",
      "details",
    ];
    const aiTitleValue = extractStringValue(candidateRecord, titleKeys);
    const sanitizedTitle = aiTitleValue.length ? aiTitleValue : role;
    const contentSource = candidateRecord ?? candidate;
    const sanitizedContent = sanitizeContent(isRecord(contentSource) ? extractStringValue(contentSource, contentKeys) : contentSource);
    return {
      conceptual_role: role,
      ai_generated_title: sanitizedTitle,
      content: sanitizedContent,
    };
  });
}

function sanitizeReportLevel(input: unknown, fallbackTitle = "Report Level"): ReportLevel {
  const raw = isRecord(input) ? input : {};
  const title = typeof raw.title === "string" && raw.title.trim().length
    ? raw.title.trim()
    : fallbackTitle;
  const cards = sanitizeCardSet(raw.cards, REPORT_LEVEL_CONCEPTUAL_ROLES);
  const actionTips = sanitizeActionTips(raw.action_tips);
  return { title, cards, action_tips: actionTips };
}

function sanitizeLearningLevel(
  input: unknown,
  fallbackTitle: string,
  titles: readonly string[],
): LearningLevel {
  const raw = isRecord(input) ? input : {};
  const title = typeof raw.title === "string" && raw.title.trim().length
    ? raw.title.trim()
    : fallbackTitle;
  const cards = sanitizeCardSet(raw.cards, titles);
  return { title, cards };
}

function createPlaceholderCards(roles: readonly string[]): ReportCard[] {
  return roles.map((role) => ({
    conceptual_role: role,
    ai_generated_title: role,
    content: PLACEHOLDER_TEXT,
  }));
}

function createEmptySectionPayload(sectionTitle: SectionTitle | string): ReportSection {
  const normalizedTitle = typeof sectionTitle === "string" ? sectionTitle : sectionTitle;
  return {
    section_title: normalizedTitle,
    report_level: {
      title: "Report Level",
      cards: createPlaceholderCards(REPORT_LEVEL_CONCEPTUAL_ROLES),
      action_tips: Array(5).fill("Content is generating..."),
    },
    learn_more_level: {
      title: "Learn More",
      cards: createPlaceholderCards(LEARN_MORE_LEVEL_CONCEPTUAL_ROLES),
    },
    unlock_mastery_level: {
      title: "Unlock Mastery",
      cards: createPlaceholderCards(UNLOCK_MASTERY_LEVEL_CONCEPTUAL_ROLES),
    },
  };
}

/* ---------------------------------------------
   REPORT GENERATION FLOW
--------------------------------------------- */
function extractJsonBlock(text: string): string | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  return start === -1 || end === -1 || end <= start ? null : text.slice(start, end + 1);
}

function hasMeaningfulContent(cards: ReportCard[]): boolean {
  return cards.some((card) => card.content.trim().toLowerCase() !== "content is generating...");
}

function isSectionComplete(section: ReportSection | undefined | null): boolean {
  if (!section) return false;
  const { report_level: reportLevel, learn_more_level: learnMoreLevel, unlock_mastery_level: masteryLevel } = section;
  if (!reportLevel || !learnMoreLevel || !masteryLevel) return false;
  if (reportLevel.cards.length !== REPORT_LEVEL_CONCEPTUAL_ROLES.length) return false;
  if (learnMoreLevel.cards.length !== LEARN_MORE_LEVEL_CONCEPTUAL_ROLES.length) return false;
  if (masteryLevel.cards.length !== UNLOCK_MASTERY_LEVEL_CONCEPTUAL_ROLES.length) return false;
  if (!Array.isArray(reportLevel.action_tips) || reportLevel.action_tips.length < 5) return false;
  return (
    hasMeaningfulContent(reportLevel.cards) &&
    hasMeaningfulContent(learnMoreLevel.cards) &&
    hasMeaningfulContent(masteryLevel.cards)
  );
}

type SupabaseAdminClient = ReturnType<typeof supabaseAdmin>;

async function logReportEvent(admin: SupabaseAdminClient, userId: string, eventType: string, details?: Record<string, unknown> | string) {
  try {
    const payload: Record<string, unknown> = { user_id: userId, event_type: eventType, created_at: new Date().toISOString() };
    if (typeof details === "string") payload.details = details;
    else if (details) payload.details = JSON.stringify(details);
    await admin.from("report_generation_events").insert(payload);
  } catch (error) {
    console.warn("Failed to log report event", eventType, error);
  }
}

async function saveReport(admin: SupabaseAdminClient, userId: string, plan: ReportPlan): Promise<void> {
  const payload = { user_id: userId, plan, fame_score: plan.fame_score, updated_at: new Date().toISOString() };
  const { error } = await admin.from("reports").upsert(payload, { onConflict: "user_id" });
  if (error) throw error;
}

async function fetchExistingPlan(admin: SupabaseAdminClient, userId: string): Promise<ReportPlan | null> {
  const { data, error } = await admin.from("reports").select("plan").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  if (!data?.plan) return null;
  const plan = data.plan as ReportPlan;
  if (!Array.isArray(plan.sections)) plan.sections = [];
  return plan;
}

/* ---------------------------------------------
   SECTION GENERATION
--------------------------------------------- */
function buildSectionPrompt(title: SectionTitle, answers: Record<string, unknown>, metrics: FameMetrics): string {
  const serializedAnswers = JSON.stringify(answers, null, 2);
  const serializedMetrics = JSON.stringify(metrics, null, 2);
  const monetizationDirective =
    title === "Monetization"
      ? `
Specific requirements for this section:
- Translate the onboarding answers (niche, audience size, growth stage, constraints, revenue goals) into monetization paths.
- Provide distinct card topics covering revenue blockers, mindset shifts, and diversified income systems.
- Every action tip, action step, and advanced move should suggest a concrete monetization experiment (offer idea, partnership, pricing test, funnel) the user can try immediately.
- Surface at least one recurring/compounding offer (membership, subscription, retainer) and one premium/high-ticket option tied to their niche.
`
      : "";
  return `Generate the section titled "${title}".
User onboarding responses:
${serializedAnswers}

Current metrics:
${serializedMetrics}

${monetizationDirective}

Return JSON only using the structure defined in SYSTEM_PROMPT.`;
}

async function generateSection(admin: SupabaseAdminClient, userId: string, title: SectionTitle, answers: Record<string, unknown>, metrics: FameMetrics): Promise<ReportSection> {
  const prompt = buildSectionPrompt(title, answers, metrics);

  if (!isClaudeAvailable && !isGeminiAvailable) {
    await logReportEvent(admin, userId, "llm_unavailable", { section: title });
    return createEmptySectionPayload(title);
  }

  const tryClaude = async () => {
    if (!isClaudeAvailable) return null;
    const text = await callClaudeJson({
      system: SYSTEM_PROMPT,
      prompt,
      maxTokens: 2500,
      responseFormat: CLAUDE_RESPONSE_FORMAT,
    });
    return { text, provider: "claude" as const };
  };

  const tryGemini = async () => {
    if (!isGeminiAvailable) return null;
    const text = await callGeminiJson({ prompt: `${SYSTEM_PROMPT}\n\n${prompt}`, maxTokens: 2500 });
    return { text, provider: "gemini" as const };
  };

  const providers = [tryClaude, tryGemini];
  const errors: unknown[] = [];

  for (const provider of providers) {
    try {
      const result = await provider();
      if (!result) continue;
      const json = extractJsonBlock(result.text) ?? result.text;
      const parsed = JSON.parse(json) as Partial<ReportSection>;
      const sectionTitle = typeof parsed.section_title === "string" && parsed.section_title.trim().length
        ? parsed.section_title.trim()
        : title;
      const reportLevel = sanitizeReportLevel(parsed.report_level, "Report Level");
      const learnMoreLevel = sanitizeLearningLevel(
        parsed.learn_more_level,
        "Learn More",
        LEARN_MORE_LEVEL_CONCEPTUAL_ROLES,
      );
      const unlockMasteryLevel = sanitizeLearningLevel(
        parsed.unlock_mastery_level,
        "Unlock Mastery",
        UNLOCK_MASTERY_LEVEL_CONCEPTUAL_ROLES,
      );
      const payload = {
        section_title: sectionTitle,
        report_level: reportLevel,
        learn_more_level: learnMoreLevel,
        unlock_mastery_level: unlockMasteryLevel,
      };
      console.info(`[report] section "${title}" generated via ${result.provider}`);
      return payload;
    } catch (error) {
      errors.push(error);
      await logReportEvent(admin, userId, "section_generation_error", { section: title, message: String(error) });
    }
  }

  console.warn(`[report] section "${title}" fell back to placeholder after errors`, errors);
  await logReportEvent(admin, userId, "section_generation_failed", { section: title, errors });
  return createEmptySectionPayload(title);
}

/* ---------------------------------------------
   REPORT FLOW
--------------------------------------------- */
function ensureSectionOrder(sections: ReportSection[]): ReportSection[] {
  const map = new Map<string, ReportSection>();
  for (const section of sections) {
    if (section?.section_title) {
      map.set(section.section_title, section);
    }
  }
  return SECTION_TITLES.map((title) => map.get(title) ?? createEmptySectionPayload(title));
}

function countCompletedSections(sections: ReportSection[]): number {
  return sections.filter(isSectionComplete).length;
}

export async function generateReportForUser(userId: string): Promise<ReportPlan> {
  if (!userId) throw new Error("User ID is required to generate report");

  const admin = supabaseAdmin();
  const { data: onboarding, error: onboardingError } = await admin.from("onboarding_sessions").select("answers").eq("user_id", userId).maybeSingle();
  if (onboardingError) throw onboardingError;
  if (!onboarding?.answers) throw new Error("Onboarding answers not found for user");

  const answers = onboarding.answers as Record<string, unknown>;
  const metrics = computeFameMetrics(answers);

  let report = (await fetchExistingPlan(admin, userId)) ?? buildBaseReport(metrics);
  report.sections = ensureSectionOrder(report.sections);

  await logReportEvent(admin, userId, "report_generation_started", { sections_ready: countCompletedSections(report.sections) });
  await saveReport(admin, userId, report);

  for (const title of SECTION_TITLES) {
    const existing = report.sections.find((s) => s.section_title === title);
    if (isSectionComplete(existing)) continue;

    await logReportEvent(admin, userId, "section_generation_started", { section: title });
    const generated = await generateSection(admin, userId, title, answers, metrics);
    report.sections = ensureSectionOrder(report.sections.map((s) => (s.section_title === title ? generated : s)));
    await saveReport(admin, userId, report);
    await logReportEvent(admin, userId, "section_generation_completed", { section: title, completed_sections: countCompletedSections(report.sections) });
  }

  await logReportEvent(admin, userId, "report_generation_completed", { sections_ready: countCompletedSections(report.sections) });
  return report;
}
