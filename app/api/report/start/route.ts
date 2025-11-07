import { NextRequest, NextResponse } from "next/server";

import {
  generateReportForUser,
  SECTION_TITLES,
  type ReportPlan,
  type ReportSection,
} from "../../../../lib/report/generate";
import { getProductByKey } from "@/lib/products";
import { supabaseAdmin } from "@/lib/supabase/server";

type StartReportPayload = {
  userId?: string;
};

const PLACEHOLDER_TEXT = "content is generating...";

function isMeaningfulText(value: unknown): boolean {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  return trimmed.toLowerCase() !== PLACEHOLDER_TEXT;
}

function cardsMeetRequirement(cards: unknown, expectedCount: number): boolean {
  if (!Array.isArray(cards) || cards.length < expectedCount) return false;
  return cards.slice(0, expectedCount).every((card) =>
    isMeaningfulText((card as { content?: string })?.content),
  );
}

function isReportSectionComplete(section: ReportSection | undefined | null): boolean {
  if (!section) return false;
  const reportLevel = section.report_level;
  const learnMore = section.learn_more_level;
  const mastery = section.unlock_mastery_level;
  if (!reportLevel || !learnMore || !mastery) return false;

  const reportCardsComplete = cardsMeetRequirement(reportLevel.cards, 5);
  const learnMoreComplete = cardsMeetRequirement(learnMore.cards, 6);
  const masteryComplete = cardsMeetRequirement(mastery.cards, 6);
  const actionTipsComplete = Array.isArray(reportLevel.action_tips) && reportLevel.action_tips.length >= 5 && reportLevel.action_tips.every((tip) => isMeaningfulText(tip));

  return reportCardsComplete && learnMoreComplete && masteryComplete && actionTipsComplete;
}

function isReportPlanComplete(plan: unknown): plan is ReportPlan {
  if (!plan || typeof plan !== "object") return false;
  const typed = plan as ReportPlan;
  if (!Array.isArray(typed.sections) || typed.sections.length === 0) return false;
  return SECTION_TITLES.every((title) => {
    const section = typed.sections.find((item) => item.section_title === title);
    return isReportSectionComplete(section);
  });
}

function isLegacySectionComplete(section: unknown): boolean {
  if (!section || typeof section !== "object") return false;
  const summary = (section as { summary?: unknown }).summary;
  return isMeaningfulText(summary);
}

function isLegacyPlanComplete(plan: unknown): boolean {
  if (!Array.isArray(plan) || plan.length === 0) return false;
  return SECTION_TITLES.every((title, index) => {
    const section = plan.find((item) => (item as { title?: string }).title === title)
      ?? plan[index];
    return isLegacySectionComplete(section);
  });
}

function isExistingPlanComplete(plan: unknown): boolean {
  if (isReportPlanComplete(plan)) return true;
  if (isLegacyPlanComplete(plan)) return true;
  return false;
}

function hasActiveReportAccess(grants: Array<Record<string, any>>): boolean {
  const now = Date.now();
  for (const grant of grants) {
    const product = getProductByKey(grant.product_key);
    if (!product?.access?.report) continue;

    const starts = grant.access_starts_at
      ? new Date(grant.access_starts_at).getTime()
      : Number.NEGATIVE_INFINITY;
    const ends = grant.access_ends_at
      ? new Date(grant.access_ends_at).getTime()
      : Number.POSITIVE_INFINITY;

    if (!Number.isFinite(starts) || !Number.isFinite(ends)) {
      continue;
    }

    if (now >= starts && now <= ends) {
      return true;
    }
  }
  return false;
}

export async function POST(req: NextRequest) {
  let body: StartReportPayload;

  try {
    body = await req.json();
  } catch (error) {
    return NextResponse.json(
      { error: "Invalid JSON payload" },
      { status: 400 },
    );
  }

  const userId = body.userId?.trim();

  if (!userId) {
    return NextResponse.json(
      { error: "userId is required" },
      { status: 400 },
    );
  }

  const admin = supabaseAdmin();

  console.info("[report/start] request received", { userId });

  const { data: grants, error: accessError } = await admin
    .from("access_grants")
    .select("product_key, access_starts_at, access_ends_at")
    .eq("user_id", userId);

  if (accessError) {
    console.error("Failed to validate report access", userId, accessError);
    return NextResponse.json(
      { error: "Unable to validate access" },
      { status: 500 },
    );
  }

  if (!grants || !hasActiveReportAccess(grants)) {
    return NextResponse.json(
      { error: "Report access not granted" },
      { status: 403 },
    );
  }

  const { data: existing, error: existingError } = await admin
    .from("reports")
    .select("plan")
    .eq("user_id", userId)
    .maybeSingle();

  if (existingError) {
    console.error("Failed to fetch existing report", userId, existingError);
    return NextResponse.json(
      { error: "Unable to load report" },
      { status: 500 },
    );
  }

  const existingPlan = existing?.plan;
  const planComplete = isExistingPlanComplete(existingPlan);

  if (existingPlan && planComplete) {
    console.info("[report/start] existing complete plan found", { userId });
    return NextResponse.json({ status: "success", report: existingPlan });
  }

  if (existingPlan && !planComplete) {
    console.info("[report/start] existing plan incomplete, regenerating", { userId });
  }

  try {
    console.info("[report/start] generating report", { userId });
    const report = await generateReportForUser(userId);
    console.info("[report/start] report generated", {
      userId,
      sections: report.sections.length,
    });
    return NextResponse.json({ status: "success", report });
  } catch (error) {
    console.error("Failed to generate report", userId, error);
    return NextResponse.json(
      { error: "Failed to generate report" },
      { status: 500 },
    );
  }
}
