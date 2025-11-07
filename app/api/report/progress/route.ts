import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/server";
import { SECTION_TITLES, type ReportSection } from "../../../../lib/report/generate";

type ProgressPayload = {
  userId?: string;
};

const TOTAL_SECTIONS = SECTION_TITLES.length;
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

function isCompleteSection(section: ReportSection | undefined | null): boolean {
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

export async function POST(req: NextRequest) {
  let payload: ProgressPayload;

  try {
    payload = await req.json();
  } catch (error) {
    return NextResponse.json(
      { error: "Invalid JSON payload" },
      { status: 400 },
    );
  }

  const userId = payload.userId?.trim();

  if (!userId) {
    return NextResponse.json(
      { error: "userId is required" },
      { status: 400 },
    );
  }

  const admin = supabaseAdmin();

  const { data, error } = await admin
    .from("reports")
    .select("plan")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("Failed to fetch report progress", userId, error);
    return NextResponse.json(
      { error: "Unable to fetch progress" },
      { status: 500 },
    );
  }

  if (!data?.plan) {
    return NextResponse.json({
      percent: 0,
      fameScore: null,
      sectionsReady: 0,
      status: "pending",
    });
  }

  const plan = data.plan as Record<string, any>;
  const sections = Array.isArray(plan.sections) ? (plan.sections as ReportSection[]) : [];
  const sectionsReady = sections.filter(isCompleteSection).length;
  const percent = Math.min(
    100,
    Math.round((sectionsReady / TOTAL_SECTIONS) * 100),
  );

  const status = sectionsReady >= TOTAL_SECTIONS
    ? "complete"
    : sectionsReady > 0
      ? "in-progress"
      : "pending";

  return NextResponse.json({
    percent,
    fameScore: plan.fame_score ?? null,
    sectionsReady,
    status,
  });
}
