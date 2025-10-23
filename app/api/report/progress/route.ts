import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/server";

type ProgressPayload = {
  userId?: string;
};

const TOTAL_SECTIONS = 8;

function isCompleteSection(section: any): boolean {
  if (!section) return false;
  const content = typeof section.content === "string" ? section.content.trim() : "";
  if (!content || content.toLowerCase() === "content is generating...") {
    return false;
  }

  if (!Array.isArray(section.action_tips)) return false;
  if (section.action_tips.length < 5) return false;

  return section.action_tips.every((tip: unknown) => {
    if (typeof tip !== "string") return false;
    return tip.trim().length > 0 && tip !== "Tip will be available soon.";
  });
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
  const sections = Array.isArray(plan.sections) ? plan.sections : [];
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
