import { supabaseAdmin } from "@/lib/supabase/server";
import { callClaudeJson, isClaudeAvailable } from "../ai/claude";
import { callGeminiJson, isGeminiAvailable } from "../ai/gemini";
import { computeFameMetrics, type FameMetrics } from "./fameScore";

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
  action_tips: string[];
  learn_more?: LearnMoreDetails;
  elaborate_content?: MasteryContent;
};

export type ReportPlan = FameMetrics & {
  sections: ReportSection[];
};

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

const SYSTEM_PROMPT = `
You are a world-class marketing strategist and creator-growth architect who helps people achieve fame and success through social media and digital marketing.
You advise creators at every stage — from starting at zero, plateauing after early traction, or scaling into brand authority. 
You understand luxury, celebrity, performance, and creator marketing, and tailor guidance for diverse roles: entrepreneurs, artists, coaches, brand owners, or niche hobbyists.

Your expertise unites five pillars:
1. Core Marketing Mastery — omnichannel strategy, funnels, content architecture, conversion.
2. Social Media Dynamics — algorithms, engagement psychology, short-form and long-form optimization across TikTok, Instagram, YouTube, X, LinkedIn, and emerging platforms.
3. Brand Development — story, positioning, visual + verbal identity, and distinctive assets.
4. Psychological Insight — motivation, cognitive bias, emotional triggers, attention loops, status signaling, and parasocial trust.
5. Cultural Intelligence — meme culture, generational trends, global vs. local nuance.

Knowledge Integration:
Your background draws from comprehensive marketing literature (personal brand, storytelling, hook psychology, growth frameworks, luxury strategy, imperfectionism, etc.). 
Never cite books, authors, or frameworks by name — express concepts as your own distilled expertise.
Examples:
- Say “Position your customer as the hero,” not “StoryBrand.”
- Say “Provide consistent value before asking,” not “Jab, Jab, Jab, Right Hook.”
- Say “Build mental availability through visibility,” not “How Brands Grow.”

${BOOK_INTEGRATION_PROMPT}

Voice & Writing Style:
Speak with conversational intelligence — smart yet human.
Be direct, clear, motivational, and empathetic.
Short, punchy sentences. Natural pauses with “...” where useful.
No corporate jargon. Respect the reader’s intelligence.
Explain complex strategy simply, like a friend who “gets it.”

Tone guidelines:
- Direct without harshness
- Informative without lecturing
- Empathetic without coddling
- Confident without arrogance
- Real, relatable, and culturally aware

Goal:
Transform struggling creators into thriving digital entrepreneurs through personalized, actionable insight that feels obvious in hindsight. 
Focus on sustainable progress — clarity, confidence, consistency, and authentic growth.

Generate a JSON-only response with fields:
{
  "title": string,
  "content": "400–600 word narrative tailored to the user",
  "action_tips": [
    "Five actionable, personalized tips (no numeric prefixes)"
  ],
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

Each section must be 400–600 words max.
Tone: clear, motivational, and grounded in user context.
Do not include markdown, emojis, or headings.
Base insights on the user’s onboarding responses and fame metrics.
`;

function buildBaseReport(metrics: FameMetrics): ReportPlan {
  return {
    ...metrics,
    sections: [],
  };
}

function sanitizeContent(content: unknown): string {
  if (typeof content !== "string") return "Content is generating...";
  const trimmed = content.trim();
  if (!trimmed) return "Content is generating...";

  const words = trimmed.split(/\s+/);
  if (words.length > 600) {
    return words.slice(0, 600).join(" ");
  }

  return trimmed;
}

function stripLeadingIndex(text: string): string {
  const trimmed = text.trimStart();
  const punctMatch = trimmed.match(/^(\d+)([.)\-:])\s*/);
  if (punctMatch) {
    return trimmed.slice(punctMatch[0].length);
  }
  const spaceMatch = trimmed.match(/^(\d+)\s+/);
  if (spaceMatch) {
    return trimmed.slice(spaceMatch[0].length);
  }
  return trimmed;
}

function sanitizeList(input: unknown, max: number): string[] {
  if (!Array.isArray(input)) return [];
  const cleaned: string[] = [];
  for (const value of input) {
    if (typeof value !== "string") continue;
    const stripped = stripLeadingIndex(value).trim();
    if (!stripped) continue;
    cleaned.push(stripped);
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
  const summary = typeof raw.what_you_will_learn === "string"
    ? raw.what_you_will_learn.trim()
    : "";
  const actionSteps = sanitizeList(raw.action_steps, 5);
  const proTips = sanitizeList(raw.pro_tips, 5);

  if (!summary && !actionSteps.length && !proTips.length) {
    return undefined;
  }

  return {
    what_you_will_learn: summary,
    action_steps: actionSteps,
    pro_tips: proTips,
  };
}

function sanitizeMasterySection(input: unknown): MasterySection | undefined {
  if (!input || typeof input !== "object") return undefined;
  const raw = input as Record<string, unknown>;
  const title = typeof raw.title === "string" ? raw.title.trim() : "";
  const items = sanitizeList(raw.items, 5);
  if (!title && !items.length) return undefined;
  return {
    title,
    items,
  };
}

function sanitizeMasteryContent(input: unknown): MasteryContent | undefined {
  if (!input || typeof input !== "object") return undefined;
  const raw = input as Record<string, unknown>;
  const overview = typeof raw.overview === "string" ? raw.overview.trim() : "";
  const advanced = sanitizeMasterySection(raw.advanced_techniques);
  const troubleshooting = sanitizeMasterySection(raw.troubleshooting);
  const longTerm = sanitizeMasterySection(raw.long_term_strategy);
  const expertResources = sanitizeList(raw.expert_resources, 5);

  if (!overview && !advanced && !troubleshooting && !longTerm && !expertResources.length) {
    return undefined;
  }

  return {
    overview,
    advancedTechniques: advanced ?? { title: "", items: [] },
    troubleshooting: troubleshooting ?? { title: "", items: [] },
    longTermStrategy: longTerm ?? { title: "", items: [] },
    expertResources: expertResources.length ? expertResources : undefined,
  };
}

function extractJsonBlock(text: string): string | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    return null;
  }
  return text.slice(start, end + 1);
}

function isSectionComplete(section: ReportSection | undefined | null): boolean {
  if (!section) return false;
  if (!section.content || section.content.trim().length < 20) return false;
  if (section.content.trim().toLowerCase() === "content is generating...") {
    return false;
  }
  if (!Array.isArray(section.action_tips) || section.action_tips.length < 5) {
    return false;
  }
  return true;
}

type SupabaseAdminClient = ReturnType<typeof supabaseAdmin>;

async function logReportEvent(
  admin: SupabaseAdminClient,
  userId: string,
  eventType: string,
  details?: Record<string, unknown> | string,
) {
  try {
    const payload: Record<string, unknown> = {
      user_id: userId,
      event_type: eventType,
      created_at: new Date().toISOString(),
    };
    if (typeof details === "string") {
      payload.details = details;
    } else if (details) {
      payload.details = JSON.stringify(details);
    }
    await admin.from("report_generation_events").insert(payload);
  } catch (error) {
    console.warn("Failed to log report event", eventType, error);
  }
}

async function saveReport(
  admin: SupabaseAdminClient,
  userId: string,
  plan: ReportPlan,
): Promise<void> {
  const payload = {
    user_id: userId,
    plan,
    fame_score: plan.fame_score,
    updated_at: new Date().toISOString(),
  };
  const { error } = await admin
    .from("reports")
    .upsert(payload, { onConflict: "user_id" });
  if (error) {
    throw error;
  }
}

async function fetchExistingPlan(
  admin: SupabaseAdminClient,
  userId: string,
): Promise<ReportPlan | null> {
  const { data, error } = await admin
    .from("reports")
    .select("plan")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data?.plan) return null;

  const plan = data.plan as ReportPlan;
  if (!Array.isArray(plan.sections)) {
    plan.sections = [];
  }
  return plan;
}

function buildSectionPrompt(
  title: SectionTitle,
  answers: Record<string, unknown>,
  metrics: FameMetrics,
): string {
  const serializedAnswers = JSON.stringify(answers, null, 2);
  const serializedMetrics = JSON.stringify(metrics, null, 2);

  return `Generate the section titled "${title}".

User onboarding responses:
${serializedAnswers}

Current metrics:
${serializedMetrics}

Return JSON only, with fields:
{
  "title": "${title}",
  "content": "400-600 word narrative tailored to the user, referencing their answers.",
  "action_tips": [
    "Five actionable tips tailored to the user (no numeric prefixes in the text)"
  ],
  "learn_more": {
    "what_you_will_learn": "2-3 sentence summary combining the Learn More focus and the mastery-level unlock.",
    "action_steps": [
      "Concrete Learn More action steps written like the fallback (no numeric prefixes)."
    ],
    "pro_tips": [
      "High-leverage Pro Tips & Best Practices (no numeric prefixes)."
    ]
  },
  "elaborate_content": {
    "overview": "Strategic framing that invites the user into mastery-level execution.",
    "advanced_techniques": {
      "title": "Label for advanced moves",
      "items": [
        "Five advanced plays tailored to the user (no numeric prefixes)."
      ]
    },
    "troubleshooting": {
      "title": "Label for solving common breakdowns",
      "items": [
        "Five troubleshooting insights (no numeric prefixes)."
      ]
    },
    "long_term_strategy": {
      "title": "Label for compounding systems",
      "items": [
        "Five horizon-3 tactics (no numeric prefixes)."
      ]
    },
    "expert_resources": [
      "Optional templates, case studies, or frameworks (no numeric prefixes)."
    ]
  }
}`;
}

async function generateSection(
  admin: SupabaseAdminClient,
  userId: string,
  title: SectionTitle,
  answers: Record<string, unknown>,
  metrics: FameMetrics,
): Promise<ReportSection> {
  const prompt = buildSectionPrompt(title, answers, metrics);

  if (!isClaudeAvailable && !isGeminiAvailable) {
    await logReportEvent(admin, userId, "llm_unavailable", { section: title });
    return {
      title,
      content: "Content is generating...",
      action_tips: [
        "Tip will be available soon.",
        "Tip will be available soon.",
        "Tip will be available soon.",
        "Tip will be available soon.",
        "Tip will be available soon.",
      ],
    };
  }

  const tryClaude = async () => {
    if (!isClaudeAvailable) return null;
    const text = await callClaudeJson({
      system: SYSTEM_PROMPT,
      prompt,
      maxTokens: 2500,
    });
    return { text, provider: "claude" as const };
  };

  const tryGemini = async () => {
    if (!isGeminiAvailable) return null;
    const text = await callGeminiJson({
      prompt: `${SYSTEM_PROMPT}\n\n${prompt}`,
      maxTokens: 2500,
    });
    return { text, provider: "gemini" as const };
  };

  const errors: unknown[] = [];

  const providers: Array<() => Promise<{ text: string; provider: "claude" | "gemini" } | null>> = [
    tryClaude,
    tryGemini,
  ];

  console.info("[report] generating section", {
    userId,
    section: title,
    claude: isClaudeAvailable,
    gemini: isGeminiAvailable,
  });

  for (const provider of providers) {
    try {
      const result = await provider();
      if (!result) continue;
      const json = extractJsonBlock(result.text) ?? result.text;
      const parsed = JSON.parse(json) as Partial<ReportSection>;
      const content = sanitizeContent(parsed.content);
      const actionTips = sanitizeActionTips(parsed.action_tips);
      const learnMore = sanitizeLearnMore((parsed as Record<string, unknown>).learn_more ?? parsed.learn_more);
      const mastery = sanitizeMasteryContent((parsed as Record<string, unknown>).elaborate_content ?? (parsed as Record<string, unknown>).mastery_content);
      if (actionTips.length < 5) {
        while (actionTips.length < 5) {
          actionTips.push("Content is generating...");
        }
      }
      console.info("[report] section generated", {
        userId,
        section: title,
        provider: result.provider,
        wordCount: content.split(/\s+/).filter(Boolean).length,
        learnMoreActionSteps: learnMore?.action_steps.length ?? 0,
        learnMoreProTips: learnMore?.pro_tips.length ?? 0,
        masteryAdvancedItems: mastery?.advancedTechniques.items.length ?? 0,
      });
      return {
        title,
        content,
        action_tips: actionTips,
        learn_more: learnMore,
        elaborate_content: mastery,
      };
    } catch (error) {
      console.error("[report] provider error", {
        userId,
        section: title,
        error,
      });
      errors.push(error);
      await logReportEvent(admin, userId, "section_generation_error", {
        section: title,
        message: error instanceof Error ? error.message : String(error),
      });
      console.error("[report] section generation failed", {
        userId,
        section: title,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const detail = errors.map((error) =>
    error instanceof Error ? error.message : String(error),
  );
  await logReportEvent(admin, userId, "section_generation_failed", {
    section: title,
    errors: detail,
  });
  console.warn("[report] section using placeholder", {
    userId,
    section: title,
  });

  return {
    title,
    content: "Content is generating...",
    action_tips: [
      "Tip will be available soon.",
      "Tip will be available soon.",
      "Tip will be available soon.",
      "Tip will be available soon.",
      "Tip will be available soon.",
    ],
    elaborate_content: undefined,
  };
}

function ensureSectionOrder(sections: ReportSection[]): ReportSection[] {
  const map = new Map<SectionTitle, ReportSection>();
  for (const section of sections) {
    map.set(section.title, section);
  }

  return SECTION_TITLES.map((title) => {
    const existing = map.get(title);
    if (!existing) {
      return {
        title,
        content: "Content is generating...",
        action_tips: [
          "Tip will be available soon.",
          "Tip will be available soon.",
          "Tip will be available soon.",
          "Tip will be available soon.",
          "Tip will be available soon.",
        ],
        elaborate_content: undefined,
      };
    }
    return existing;
  });
}

function countCompletedSections(sections: ReportSection[]): number {
  return sections.filter((section) => isSectionComplete(section)).length;
}

export async function generateReportForUser(
  userId: string,
): Promise<ReportPlan> {
  if (!userId) {
    throw new Error("User ID is required to generate report");
  }

  const admin = supabaseAdmin();

  console.info("[report] generation requested", { userId });

  const { data: onboarding, error: onboardingError } = await admin
    .from("onboarding_sessions")
    .select("answers")
    .eq("user_id", userId)
    .maybeSingle();

  if (onboardingError) {
    throw onboardingError;
  }

  if (!onboarding?.answers) {
    throw new Error("Onboarding answers not found for user");
  }

  const answers = onboarding.answers as Record<string, unknown>;
  const metrics = computeFameMetrics(answers);

  let report = await fetchExistingPlan(admin, userId);
  if (!report) {
    report = buildBaseReport(metrics);
  } else {
    report = {
      ...metrics,
      sections: Array.isArray(report.sections) ? report.sections : [],
    };
  }

  report.sections = ensureSectionOrder(report.sections);

  await logReportEvent(admin, userId, "report_generation_started", {
    sections_ready: countCompletedSections(report.sections),
  });
  console.info("[report] generation started", {
    userId,
    sectionsReady: countCompletedSections(report.sections),
  });

  await saveReport(admin, userId, report);

  for (const title of SECTION_TITLES) {
    const existing = report.sections.find((section) => section.title === title);
    if (isSectionComplete(existing)) {
      continue;
    }

    await logReportEvent(admin, userId, "section_generation_started", { section: title });

    const generated = await generateSection(admin, userId, title, answers, metrics);

    const updatedSections: ReportSection[] = report.sections.map((section) =>
      section.title === title ? generated : section,
    );

    report = {
      ...report,
      sections: ensureSectionOrder(updatedSections),
    };

    await saveReport(admin, userId, report);

    await logReportEvent(admin, userId, "section_generation_completed", {
      section: title,
      completed_sections: countCompletedSections(report.sections),
    });
    console.info("[report] section saved", {
      userId,
      section: title,
      completedSections: countCompletedSections(report.sections),
    });
  }

  await logReportEvent(admin, userId, "report_generation_completed", {
    sections_ready: countCompletedSections(report.sections),
  });
  console.info("[report] generation completed", {
    userId,
    sectionsReady: countCompletedSections(report.sections),
  });

  return report;
}
