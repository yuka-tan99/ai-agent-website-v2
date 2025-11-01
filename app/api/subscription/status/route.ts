import { NextRequest, NextResponse } from "next/server";

import { getBillingSnapshot } from "@/lib/subscription";
import { supabaseRoute } from "@/lib/supabase/route";

export async function GET(req: NextRequest) {
  const route = supabaseRoute(req);
  const {
    data: { user },
    error,
  } = await route.getUser();

  if (error) {
    console.error("[subscription] Failed to authenticate user", error);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const snapshot = await getBillingSnapshot(user.id);
  return NextResponse.json(snapshot);
}
