import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

import { getProductByKey } from "@/lib/products";
import { supabaseAdmin } from "@/lib/supabase/server";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY ?? "";

if (!stripeSecretKey) {
  throw new Error("STRIPE_SECRET_KEY is not set");
}

const stripe = new Stripe(stripeSecretKey);

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "http://localhost:3000";

type CheckoutRequestBody = {
  productKey?: string;
  userId?: string;
  successUrl?: string;
  cancelUrl?: string;
};

export async function POST(req: NextRequest) {
  let body: CheckoutRequestBody;
  try {
    body = await req.json();
  } catch (error) {
    console.error("Failed to parse checkout request", error);
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  const { productKey, userId, successUrl, cancelUrl } = body;

  if (!productKey) {
    return NextResponse.json(
      { error: "productKey is required" },
      { status: 400 },
    );
  }

  if (!userId) {
    return NextResponse.json(
      { error: "userId is required" },
      { status: 400 },
    );
  }

  const product = getProductByKey(productKey);
  if (!product) {
    return NextResponse.json(
      { error: `Unknown product key: ${productKey}` },
      { status: 400 },
    );
  }

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: product.mode,
    line_items: [
      {
        price: product.priceId,
        quantity: 1,
      },
    ],
    allow_promotion_codes: true,
    success_url:
      successUrl ||
      `${APP_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: cancelUrl || `${APP_URL}/checkout/cancelled`,
    client_reference_id: userId,
    metadata: {
      productKey: product.key,
      userId,
    },
    customer_creation: "always",
  };

  if (product.mode === "subscription") {
    sessionParams.subscription_data = {
      metadata: {
        productKey: product.key,
        userId,
      },
    };
  }

  try {
    const session = await stripe.checkout.sessions.create(sessionParams);

    if (!session.url) {
      return NextResponse.json(
        { error: "Unable to create checkout session" },
        { status: 500 },
      );
    }

    const admin = supabaseAdmin();

    const { error: insertError } = await admin
      .from("payments")
      .insert({
        user_id: userId,
        product_key: product.key,
        amount_cents: session.amount_total ?? session.amount_subtotal ?? 0,
        currency: session.currency ?? "usd",
        status: "requires_payment_method",
        checkout_session_id: session.id,
        raw: { checkout_session: session },
      });

    if (insertError) {
      // We log but still return the checkout URL so the user can proceed.
      console.error(
        "Failed to insert pending payment for session",
        session.id,
        insertError,
      );
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe checkout session creation failed", error);
    return NextResponse.json(
      { error: "Unable to create checkout session" },
      { status: 500 },
    );
  }
}
