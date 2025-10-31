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
  "Story & Positioning",
  "Audience Growth Systems",
  "Revenue & Offers",
  "Binge-Worthy Content",
  "Mental Health & Sustainability",
  "Advanced Marketing Types & Case Studies",
] as const;

type SectionTitle = (typeof SECTION_TITLES)[number];

/* ---------------------------------------------
   DATA STRUCTURES
--------------------------------------------- */
type ReportCard = {
  title: string;
  content: string;
};

type LearnMoreDetails = {
  what_you_will_learn: string;
  action_steps: string[];
  pro_tips: string[];
};

type MasterySection = {
  title: string;
  items: string[];
};

type MasteryContent = {
  overview: string;
  advancedTechniques: MasterySection;
  troubleshooting: MasterySection;
  longTermStrategy: MasterySection;
  expertResources?: string[];
};

export type ReportSection = {
  title: SectionTitle;
  content: string;
  cards?: ReportCard[];
  action_tips: string[];
  learn_more?: LearnMoreDetails;
  elaborate_content?: MasteryContent;
};

export type ReportPlan = FameMetrics & {
  sections: ReportSection[];
};

/* ---------------------------------------------
   BOOK INTEGRATION PROMPT (RAG REFERENCE)
--------------------------------------------- */
const BOOK_INTEGRATION_PROMPT = `
When generating the eight report sections, integrate relevant frameworks from your internal marketing knowledge base without naming books or authors.

Section 1: Diagnose the main blocker and offer the first breakthrough using imperfectionism, clarity, or messaging psychology.
Section 2: Build execution habits through a binary mindset, mini-actions, and permission to post imperfectly.
Section 3: Define focus by identifying what the user is uniquely good at, outlining their value ladder, and reinforcing an authentic voice.
Section 4: Shape personal brand—visual and verbal identity, brand story, positioning as guide, and platform strategy.
Section 5: Deliver marketing strategy—hooks, storytelling flow, funnel logic, and value-first positioning.
Section 6: Establish systems—batching, scheduling, analytics, content calendars, and platform-native adaptation.
Section 7: Support sustainability—burnout prevention, confidence loops, boundary setting, and energy management.
Section 8: Illustrate advanced cases—luxury, celebrity, viral, and community marketing examples.

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
• Logical flow: truth → insight → action.
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
- Perfectionism / fear → "How to Be an Imperfectionist" + "Social Media Rules Written by Me"
- Clarity / direction → "Marketing Magic" + "Building a StoryBrand"
- Engagement / traction → "Hook Point Strategy" + "Social Media Marketing Mastery"
- Burnout / mindset → "Social Media Rules Written by Me" + "lol...OMG! What Every Student Needs to Know"

Always rewrite frameworks as your own knowledge. Do not name sources.
Adapt tone and examples to the user’s stage (beginner / established) and their primary platforms.
`;

/* ---------------------------------------------
   SYSTEM PROMPT
--------------------------------------------- */
const SYSTEM_PROMPT = `
You are a world-class marketing strategist and creator-growth architect who helps people achieve fame and success through social media and digital marketing.
You advise creators at every stage — from starting at zero, plateauing after early traction, or scaling into brand authority.

Your expertise unites five pillars:
1. Core Marketing Mastery — omnichannel strategy, funnels, content architecture, conversion.
2. Social Media Dynamics — algorithms, engagement psychology, short-form and long-form optimization.
3. Brand Development — story, positioning, visual + verbal identity, and distinctive assets.
4. Psychological Insight — motivation, cognitive bias, emotional triggers, attention loops, and parasocial trust.
5. Cultural Intelligence — meme culture, generational trends, and global nuance.

Knowledge Integration:
You draw from internal summaries of major marketing, storytelling, growth, and psychology frameworks.
Never cite titles or authors. Express all ideas as your own distilled expertise.

${BOOK_INTEGRATION_PROMPT}

${COMMUNICATION_AND_RAG_RULES}

Goal:
Transform struggling creators into thriving digital entrepreneurs through personalized, actionable insight that feels obvious in hindsight.
Focus on sustainable progress — clarity, confidence, consistency, and authentic growth.

Generate a JSON-only response with fields:
{
  "title": string,
  "content": "20–40 word overview that frames the theme",
  "cards": [
    { "title": "Punchy 3-6 word headline", "content": "50–100 word focused guidance written in second person" },
    { "title": "…", "content": "…" },
    { "title": "…", "content": "…" }
  ],
  "action_tips": ["Five actionable, personalized tips (no numeric prefixes)"],
  "learn_more": {
    "what_you_will_learn": "2–3 sentence summary combining lesson + mastery outcome",
    "action_steps": ["4–5 implementation steps (no numeric prefixes)"],
    "pro_tips": ["3–4 high-leverage best practices (no numeric prefixes)"]
  },
  "elaborate_content": {
    "overview": "Strategic framing inviting mastery-level execution",
    "advanced_techniques": { "title": "Label for advanced plays", "items": ["Five advanced moves (no numeric prefixes)"] },
    "troubleshooting": { "title": "Label for solving blockers", "items": ["Five troubleshooting insights (no numeric prefixes)"] },
    "long_term_strategy": { "title": "Label for compounding systems", "items": ["Five horizon-3 tactics (no numeric prefixes)"] },
    "expert_resources": ["Optional templates, case studies, or frameworks (no numeric prefixes)"]
  }
}

CARD REQUIREMENTS:
- Exactly three cards.
- Each card 50–100 words.
- Titles should feel like UI labels (e.g., "Your Core Challenge").
- Content must be distinct, immediately actionable, and conversational.
- Each card must tackle a different angle—no repeating advice, phrasing, or insights inside the section.
- Do not reuse card ideas already used in other sections; each section’s cards must feel fresh and non-overlapping.
- When you want to emphasize a phrase, wrap it in <<highlight>> ... <</highlight>> (use sparingly, no more than two highlights per card or summary).

Each section must be 400–600 words max across all fields.
Tone: clear, motivational, and grounded in user context.
Do not include markdown, emojis, or headings.
`;

/* ---------------------------------------------
   SANITIZATION HELPERS
--------------------------------------------- */
function buildBaseReport(metrics: FameMetrics): ReportPlan {
  return { ...metrics, sections: [] };
}

function sanitizeContent(content: unknown): string {
  if (typeof content !== "string") return "Content is generating...";
  const trimmed = content.trim();
  if (!trimmed) return "Content is generating...";
  const words = trimmed.split(/\s+/);
  return words.length > 600 ? words.slice(0, 600).join(" ") : trimmed;
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
    if (typeof value !== "string") continue;
    const stripped = stripLeadingIndex(value).trim();
    if (stripped) cleaned.push(stripped);
    if (cleaned.length >= max) break;
  }
  return cleaned;
}

function sanitizeActionTips(input: unknown): string[] {
  return sanitizeList(input, 5);
}

function sanitizeLearnMore(input: unknown): LearnMoreDetails | undefined {
  if (!input || typeof input !== "object") return undefined;
  const raw = input as Record<string, unknown>;
  const summary = typeof raw.what_you_will_learn === "string" ? raw.what_you_will_learn.trim() : "";
  const actionSteps = sanitizeList(raw.action_steps, 5);
  const proTips = sanitizeList(raw.pro_tips, 5);
  if (!summary && !actionSteps.length && !proTips.length) return undefined;
  return { what_you_will_learn: summary, action_steps: actionSteps, pro_tips: proTips };
}

function sanitizeCards(input: unknown): ReportCard[] {
  if (!Array.isArray(input)) return [];
  const sanitized: ReportCard[] = [];
  for (const item of input) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const title = typeof record.title === "string" ? record.title.trim() : "";
    const content = typeof record.content === "string" ? record.content.trim() : "";
    if (!title || !content) continue;
    sanitized.push({ title, content });
    if (sanitized.length >= 3) break;
  }
  return sanitized;
}

function sanitizeMasterySection(input: unknown): MasterySection | undefined {
  if (!input || typeof input !== "object") return undefined;
  const raw = input as Record<string, unknown>;
  const title = typeof raw.title === "string" ? raw.title.trim() : "";
  const items = sanitizeList(raw.items, 5);
  return !title && !items.length ? undefined : { title, items };
}

function sanitizeMasteryContent(input: unknown): MasteryContent | undefined {
  if (!input || typeof input !== "object") return undefined;
  const raw = input as Record<string, unknown>;
  const overview = typeof raw.overview === "string" ? raw.overview.trim() : "";
  const advanced = sanitizeMasterySection(raw.advanced_techniques);
  const troubleshooting = sanitizeMasterySection(raw.troubleshooting);
  const longTerm = sanitizeMasterySection(raw.long_term_strategy);
  const expertResources = sanitizeList(raw.expert_resources, 5);
  if (!overview && !advanced && !troubleshooting && !longTerm && !expertResources.length) return undefined;
  return {
    overview,
    advancedTechniques: advanced ?? { title: "", items: [] },
    troubleshooting: troubleshooting ?? { title: "", items: [] },
    longTermStrategy: longTerm ?? { title: "", items: [] },
    expertResources: expertResources.length ? expertResources : undefined,
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

function isSectionComplete(section: ReportSection | undefined | null): boolean {
  if (!section) return false;
  if (!section.content || section.content.trim().length < 20) return false;
  if (section.content.trim().toLowerCase() === "content is generating...") return false;
  if (!Array.isArray(section.action_tips) || section.action_tips.length < 5) return false;
  if (!Array.isArray(section.cards) || section.cards.length < 3) return false;
  return true;
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
  return `Generate the section titled "${title}".
User onboarding responses:
${serializedAnswers}

Current metrics:
${serializedMetrics}

Return JSON only using the structure defined in SYSTEM_PROMPT.`;
}

async function generateSection(admin: SupabaseAdminClient, userId: string, title: SectionTitle, answers: Record<string, unknown>, metrics: FameMetrics): Promise<ReportSection> {
  const prompt = buildSectionPrompt(title, answers, metrics);

  if (!isClaudeAvailable && !isGeminiAvailable) {
    await logReportEvent(admin, userId, "llm_unavailable", { section: title });
    return { title, content: "Content is generating...", action_tips: Array(5).fill("Tip will be available soon.") };
  }

  const tryClaude = async () => {
    if (!isClaudeAvailable) return null;
    const text = await callClaudeJson({ system: SYSTEM_PROMPT, prompt, maxTokens: 2500 });
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
      const content = sanitizeContent(parsed.content);
      const cards = sanitizeCards((parsed as Record<string, unknown>).cards);
      const actionTips = sanitizeActionTips(parsed.action_tips);
      const learnMore = sanitizeLearnMore((parsed as Record<string, unknown>).learn_more);
      const mastery = sanitizeMasteryContent((parsed as Record<string, unknown>).elaborate_content);
      while (actionTips.length < 5) actionTips.push("Content is generating...");
      return { title, content, cards, action_tips: actionTips, learn_more: learnMore, elaborate_content: mastery };
    } catch (error) {
      errors.push(error);
      await logReportEvent(admin, userId, "section_generation_error", { section: title, message: String(error) });
    }
  }

  await logReportEvent(admin, userId, "section_generation_failed", { section: title, errors });
  return {
    title,
    content: "Content is generating...",
    cards: [],
    action_tips: Array(5).fill("Tip will be available soon."),
  };
}

/* ---------------------------------------------
   REPORT FLOW
--------------------------------------------- */
function ensureSectionOrder(sections: ReportSection[]): ReportSection[] {
  const map = new Map<SectionTitle, ReportSection>();
  for (const s of sections) map.set(s.title, s);
  return SECTION_TITLES.map(
    (t) =>
      map.get(t) ?? {
        title: t,
        content: "Content is generating...",
        action_tips: Array(5).fill("Tip will be available soon."),
      },
  );
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
    const existing = report.sections.find((s) => s.title === title);
    if (isSectionComplete(existing)) continue;

    await logReportEvent(admin, userId, "section_generation_started", { section: title });
    const generated = await generateSection(admin, userId, title, answers, metrics);
    report.sections = ensureSectionOrder(report.sections.map((s) => (s.title === title ? generated : s)));
    await saveReport(admin, userId, report);
    await logReportEvent(admin, userId, "section_generation_completed", { section: title, completed_sections: countCompletedSections(report.sections) });
  }

  await logReportEvent(admin, userId, "report_generation_completed", { sections_ready: countCompletedSections(report.sections) });
  return report;
}
