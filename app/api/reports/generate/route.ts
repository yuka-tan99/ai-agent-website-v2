import { NextRequest, NextResponse } from "next/server";

import { generateReportForUser } from "../../../../lib/report/generate";
import { supabaseRoute } from "@/lib/supabase/route";

export async function POST(req: NextRequest) {
  console.info("[legacy-report] /api/reports/generate invoked");
  const route = supabaseRoute(req);
  const { data: authData } = await route.getUser();
  const user = authData?.user;

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const report = await generateReportForUser(user.id);

    return NextResponse.json({
      plan: report.sections ?? [],
      fameScore: {
        score: report.fame_score,
        trend: report.success_probability,
      },
    });
  } catch (error) {
    console.error("[report] generation failed", error);
    return NextResponse.json({ error: "Failed to generate report" }, { status: 500 });
  }
}
