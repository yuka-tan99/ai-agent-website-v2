import { NextRequest, NextResponse } from "next/server";

import {
  fetchStripeSubscription,
  getBillingSnapshot,
  getComplimentaryAccess,
  syncSubscriptionState,
} from "@/lib/subscription";
import { supabaseRoute } from "@/lib/supabase/route";
import { stripe } from "@/lib/subscription";

export async function POST(req: NextRequest) {
  const route = supabaseRoute(req);
  const {
    data: { user },
    error,
  } = await route.getUser();

  if (error) {
    console.error("[subscription/cancel] Failed to authenticate user", error);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const complimentary = await getComplimentaryAccess(user.id);
  if (complimentary.active) {
    const snapshot = await getBillingSnapshot(user.id);
    return NextResponse.json({
      blocked: true,
      message: `Complimentary access active until ${new Date(
        complimentary.expiresAt ?? "",
      ).toLocaleDateString()}`,
      snapshot,
    });
  }

  const existing = await fetchStripeSubscription(user.id);
  if (!existing) {
    return NextResponse.json(
      { error: "No active subscription found" },
      { status: 404 },
    );
  }

  if (existing.cancel_at_period_end) {
    const snapshot = await getBillingSnapshot(user.id);
    return NextResponse.json({
      blocked: true,
      message: "Subscription is already scheduled to cancel.",
      snapshot,
    });
  }

  const updated = await stripe.subscriptions.update(existing.id, {
    cancel_at_period_end: true,
  });

  await syncSubscriptionState(user.id, updated);
  const snapshot = await getBillingSnapshot(user.id);

  return NextResponse.json({
    message: "Subscription will remain active until the end of the current period.",
    snapshot,
  });
}
