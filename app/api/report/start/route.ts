import { NextRequest, NextResponse } from "next/server";

import { generateReportForUser } from "../../../../lib/report/generate";
import { getProductByKey } from "@/lib/products";
import { supabaseAdmin } from "@/lib/supabase/server";

type StartReportPayload = {
  userId?: string;
};

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

  if (existing?.plan) {
    console.info("[report/start] existing plan found", { userId });
    return NextResponse.json({ status: "success", report: existing.plan });
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
