import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/server";

type RouteParams = {
  params: {
    userId: string;
  };
};

export async function GET(_: NextRequest, { params }: RouteParams) {
  const userId = params?.userId?.trim();

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
    console.error("Failed to fetch report", userId, error);
    return NextResponse.json(
      { error: "Unable to fetch report" },
      { status: 500 },
    );
  }

  if (!data?.plan) {
    return NextResponse.json(
      { error: "Report not found" },
      { status: 404 },
    );
  }

  return NextResponse.json({ report: data.plan });
}
