import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

import {
  fetchStripeSubscription,
  getBillingSnapshot,
  getComplimentaryAccess,
  getStripePriceId,
  syncSubscriptionState,
} from "@/lib/subscription";
import { supabaseRoute } from "@/lib/supabase/route";
import { stripe } from "@/lib/subscription";

function getCustomerId(subscription: Stripe.Subscription): string | null {
  if (typeof subscription.customer === "string") {
    return subscription.customer;
  }
  return subscription.customer?.id ?? null;
}

export async function POST(req: NextRequest) {
  const route = supabaseRoute(req);
  const {
    data: { user },
    error,
  } = await route.getUser();

  if (error) {
    console.error("[subscription/resume] Failed to authenticate user", error);
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
      { error: "No subscription found. Please subscribe to unlock AI chat." },
      { status: 404 },
    );
  }

  let updated: Stripe.Subscription;

  if (existing.cancel_at_period_end && existing.status === "active") {
    updated = await stripe.subscriptions.update(existing.id, {
      cancel_at_period_end: false,
    });
  } else if (existing.status === "canceled" || existing.status === "incomplete_expired") {
    const customerId = getCustomerId(existing);
    if (!customerId) {
      return NextResponse.json(
        { error: "Unable to determine Stripe customer for subscription." },
        { status: 400 },
      );
    }

    updated = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: getStripePriceId() }],
      expand: ["latest_invoice"],
    });
  } else if (!existing.cancel_at_period_end && existing.status === "active") {
    const snapshot = await getBillingSnapshot(user.id);
    return NextResponse.json({
      blocked: true,
      message: "Your subscription is already active.",
      snapshot,
    });
  } else {
    return NextResponse.json(
      {
        error:
          "Unable to resume subscription in the current state. Please contact support.",
      },
      { status: 400 },
    );
  }

  await syncSubscriptionState(user.id, updated);
  const snapshot = await getBillingSnapshot(user.id);

  return NextResponse.json({
    message: "Subscription has been resumed.",
    snapshot,
  });
}
