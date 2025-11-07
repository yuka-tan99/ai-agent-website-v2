import { NextRequest, NextResponse } from "next/server";

import { supabaseRoute } from "@/lib/supabase/route";
import { supabaseAdmin } from "@/lib/supabase/server";
import { calculateFameScoreFromAnswers } from "@/lib/personalization/fameScore";
import type { ReportPlan } from "../../../../lib/report/generate";

export async function GET(req: NextRequest) {
  console.info("[legacy-report] /api/reports/plan invoked");
  const route = supabaseRoute(req);
  const { data: authData } = await route.getUser();
  const user = authData?.user;

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = supabaseAdmin();

  const [{ data, error }, { data: onboarding, error: onboardingError }] =
    await Promise.all([
      supabase
        .from("reports")
        .select("plan")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("onboarding_sessions")
        .select("answers")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

  if (error) {
    console.error("[report-plan] fetch failed", error);
    return NextResponse.json({ error: "Failed to fetch plan" }, { status: 500 });
  }

  if (onboardingError && onboardingError.code !== "PGRST116") {
    console.error("[report-plan] onboarding fetch failed", onboardingError);
  }

  const rawPlan = data?.plan;

  let planPayload: unknown = null;
  let fameScore: { score: number; trend: number } | null = null;

  const isReportPlanObject = (value: any): value is ReportPlan =>
    value && typeof value === "object" && Array.isArray(value.sections);

  if (Array.isArray(rawPlan)) {
    planPayload = rawPlan;
  } else if (isReportPlanObject(rawPlan)) {
    planPayload = rawPlan.sections ?? [];
    if (typeof rawPlan.fame_score === "number") {
      fameScore = {
        score: rawPlan.fame_score,
        trend: rawPlan.success_probability ?? 0,
      };
    }
  } else if (rawPlan) {
    planPayload = rawPlan;
  }

  if (!fameScore && onboarding?.answers && Object.keys(onboarding.answers).length) {
    const computed = calculateFameScoreFromAnswers(onboarding.answers);
    fameScore = { score: computed.score, trend: computed.trend };
  }

  const hasOnboarding = Boolean(
    onboarding?.answers && Object.keys(onboarding.answers).length,
  );

  try {
    await supabase.from("report_usage_events").insert({
      user_id: user.id,
      report_id: user.id,
      source: "reports_plan",
      meta: {
        fame_score: fameScore?.score ?? null,
        trend: fameScore?.trend ?? null,
        has_plan: Boolean(planPayload),
      },
    });
  } catch (logError) {
    console.warn("[report-plan] usage log failed", logError);
  }

  return NextResponse.json({ plan: planPayload, fameScore, hasOnboarding });
}
