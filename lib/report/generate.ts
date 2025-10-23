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

export type ReportSection = {
  title: SectionTitle;
  content: string;
  action_tips: string[];
};

export type ReportPlan = FameMetrics & {
  sections: ReportSection[];
};

const SYSTEM_PROMPT = `You are an expert creator growth strategist.
Generate advice for creators to grow their social media influence.
Use plain JSON with fields: title, content, action_tips.
Each section must be 400–600 words max and contain 5 numbered actionable tips.
Tone: clear, motivational, public-friendly, grounded in user context.
Do not include markdown, emojis, or headings.
Base insights on the user’s onboarding responses.`;

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

function sanitizeActionTips(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const cleaned = input
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter((value) => value.length > 0);
  if (cleaned.length > 5) {
    return cleaned.slice(0, 5);
  }
  return cleaned;
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
    "Five numbered, actionable tips tailored to the user"
  ]
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
      });
      return {
        title,
        content,
        action_tips: actionTips,
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
