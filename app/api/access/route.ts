import { NextRequest, NextResponse } from "next/server";

import { getProductByKey } from "@/lib/products";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const userId = url.searchParams.get("userId");

  if (!userId) {
    return NextResponse.json(
      { error: "userId query parameter is required" },
      { status: 400 },
    );
  }

  const admin = supabaseAdmin();
  const { data, error } = await admin
    .from("access_grants")
    .select("product_key, status, access_starts_at, access_ends_at")
    .eq("user_id", userId);

  if (error) {
    console.error("Failed to fetch access grants", userId, error);
    return NextResponse.json(
      { error: "Unable to determine access" },
      { status: 500 },
    );
  }

  const now = Date.now();
  let hasReport = false;
  let chatUntil: Date | null = null;

  for (const grant of data ?? []) {
    const product = getProductByKey(grant.product_key);
    if (!product) continue;

    const start = new Date(grant.access_starts_at).getTime();
    const end = new Date(grant.access_ends_at).getTime();

    if (Number.isNaN(start) || Number.isNaN(end)) continue;
    if (now < start || now > end) continue;

    if (product.access.report) {
      hasReport = true;
    }

    if (product.access.chatMonths && product.access.chatMonths > 0) {
      const candidate = new Date(end);
      if (!chatUntil || candidate.getTime() > chatUntil.getTime()) {
        chatUntil = candidate;
      }
    } else if (product.access.report) {
      const startDate = grant.access_starts_at
        ? new Date(grant.access_starts_at)
        : null;
      if (startDate && Number.isFinite(startDate.getTime())) {
        const candidate = new Date(startDate);
        candidate.setMonth(candidate.getMonth() + 3);
        if (!chatUntil || candidate.getTime() > chatUntil.getTime()) {
          chatUntil = candidate;
        }
      }
    }
  }

  return NextResponse.json({
    report: hasReport,
    chatUntil: chatUntil ? chatUntil.toISOString() : null,
  });
}
