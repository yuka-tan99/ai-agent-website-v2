import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

import {
  getProductByKey,
  getProductByPriceId,
  type ProductConfig,
} from "@/lib/products";
import { supabaseAdmin } from "@/lib/supabase/server";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY ?? "";
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? "";

if (!stripeSecretKey) {
  throw new Error("STRIPE_SECRET_KEY is not set");
}

if (!stripeWebhookSecret) {
  throw new Error("STRIPE_WEBHOOK_SECRET is not set");
}

const stripe = new Stripe(stripeSecretKey);

const REPORT_ACCESS_YEARS = 10;

type PaymentTableStatus =
  | "requires_payment_method"
  | "requires_confirmation"
  | "processing"
  | "succeeded"
  | "canceled"
  | "failed";

function mapToPaymentStatus(
  status: string | null | undefined,
): PaymentTableStatus {
  switch (status) {
    case "paid":
    case "complete":
    case "succeeded":
    case "no_payment_required":
      return "succeeded";
    case "requires_payment_method":
    case "requires_action":
    case "requires_confirmation":
      return "requires_payment_method";
    case "processing":
      return "processing";
    case "canceled":
    case "canceled_subscription":
    case "expired":
      return "canceled";
    case "failed":
    case "unpaid":
    case "void":
    case "uncollectible":
      return "failed";
    default:
      return "processing";
  }
}

export async function POST(req: NextRequest) {
  const signature = req.headers.get("stripe-signature");
  const body = await req.text();

  if (!signature) {
    console.error("Missing Stripe signature header");
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      stripeWebhookSecret,
    );
  } catch (error) {
    console.error("Stripe webhook signature verification failed", error);
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 },
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(
          event.data.object as Stripe.Checkout.Session,
        );
        break;
      case "invoice.paid":
        await handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(
          event.data.object as Stripe.Subscription,
        );
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(
          event.data.object as Stripe.Subscription,
        );
        break;
      default:
        // Ignore other event types for now.
        break;
    }
  } catch (error) {
    console.error(`Stripe webhook handler failed for ${event.type}`, error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 },
    );
  }

  return NextResponse.json({ received: true });
}

function ensureDate(value: Date | null | undefined): string {
  if (!value) {
    return new Date().toISOString();
  }
  return value.toISOString();
}

function addMonths(start: Date, months: number): Date {
  const result = new Date(start);
  result.setMonth(result.getMonth() + months);
  return result;
}

function toDate(unix: number | null | undefined): Date | undefined {
  if (!unix) return undefined;
  return new Date(unix * 1000);
}

function normalizeAccessWindow(
  product: ProductConfig,
  startAt: Date | undefined,
  endAt: Date | undefined,
): { start: Date; end: Date } {
  const now = new Date();
  const candidateStart = startAt ?? now;
  const start = candidateStart > now ? now : candidateStart;

  if (endAt) {
    return { start, end: endAt };
  }

  if (product.access.chatMonths && product.access.chatMonths > 0) {
    return { start, end: addMonths(start, product.access.chatMonths) };
  }

  const end = new Date(start);
  end.setFullYear(end.getFullYear() + REPORT_ACCESS_YEARS);
  return { start, end };
}

async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session,
) {
  const metadata = session.metadata ?? {};
  const productKey = metadata.productKey ?? null;
  const userId =
    metadata.userId ??
    session.client_reference_id ??
    session.customer_details?.email ??
    null;

  let product = getProductByKey(productKey);

  if (!product) {
    const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
      limit: 1,
    });
    const price = lineItems.data[0]?.price;
    const priceId =
      (typeof price === "string" ? price : price?.id) ??
      lineItems.data[0]?.price?.id ??
      null;
    product = getProductByPriceId(priceId);
  }

  if (!product) {
    console.error(
      "Unable to resolve product for checkout session",
      session.id,
    );
    return;
  }

  if (!userId || typeof userId !== "string") {
    console.error(
      "Missing userId metadata for checkout session",
      session.id,
    );
    return;
  }

  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id ?? null;

  let paymentIntent: Stripe.PaymentIntent | null = null;
  if (paymentIntentId) {
    try {
      paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
        expand: ["latest_charge.payment_method_details.card"],
      });
    } catch (error) {
      console.error("Failed to retrieve payment intent", paymentIntentId, error);
    }
  }

  const latestCharge =
    typeof paymentIntent?.latest_charge === "object"
      ? (paymentIntent.latest_charge as Stripe.Charge)
      : null;
  const card = latestCharge?.payment_method_details?.card ?? null;
  const billing = latestCharge?.billing_details?.address ?? null;
  const paymentMethodType =
    paymentIntent?.payment_method_types?.[0] ??
    latestCharge?.payment_method_details?.type ??
    null;

  const amountCents =
    session.amount_total ?? session.amount_subtotal ?? paymentIntent?.amount ?? 0;

  const paymentPayload = {
    user_id: userId,
    product_key: product.key,
    amount_cents: amountCents,
    currency: session.currency ?? paymentIntent?.currency ?? "usd",
    status: mapToPaymentStatus(session.payment_status),
    checkout_session_id: session.id,
    payment_intent_id: paymentIntentId,
    payment_method_type: paymentMethodType,
    card_brand: card?.brand ?? null,
    card_last4: card?.last4 ?? null,
    wallet_type: card?.wallet?.type ?? null,
    billing_city: billing?.city ?? null,
    billing_state: billing?.state ?? null,
    billing_country: billing?.country ?? null,
    raw: {
      checkout_session: session,
      payment_intent: paymentIntent,
    },
  };

  const admin = supabaseAdmin();

  const { data: existingPayment, error: existingPaymentError } = await admin
    .from("payments")
    .select("id")
    .eq("checkout_session_id", session.id)
    .maybeSingle();

  if (existingPaymentError) {
    console.error(
      "Error checking existing payment for session",
      session.id,
      existingPaymentError,
    );
  }

  let paymentId: number;

  if (existingPayment) {
    const { data, error } = await admin
      .from("payments")
      .update(paymentPayload)
      .eq("id", existingPayment.id)
      .select("id")
      .single();

    if (error) {
      console.error("Failed to update payment record", error);
      throw error;
    }

    paymentId = data.id;
  } else {
    const { data, error } = await admin
      .from("payments")
      .insert(paymentPayload)
      .select("id")
      .single();

    if (error) {
      console.error("Failed to insert payment record", error);
      throw error;
    }

    paymentId = data.id;
  }

  if (product.mode === "subscription") {
    const subscriptionId =
      typeof session.subscription === "string"
        ? session.subscription
        : session.subscription?.id ?? null;

    if (!subscriptionId) {
      console.error(
        "Subscription checkout session missing subscription ID",
        session.id,
      );
      return;
    }

    let subscription: Stripe.Subscription | null = null;
    try {
      subscription = await stripe.subscriptions.retrieve(subscriptionId, {
        expand: ["latest_invoice"],
      });
    } catch (error) {
      console.error("Failed to retrieve subscription", subscriptionId, error);
    }

    const subscriptionPeriods = subscription as Stripe.Subscription & {
      current_period_start?: number | null;
      current_period_end?: number | null;
    };
    const start = toDate(subscriptionPeriods?.current_period_start);
    const end = toDate(subscriptionPeriods?.current_period_end);

    await upsertSubscriptionPeriod({
      userId,
      product,
      subscriptionId,
      invoiceId:
        typeof subscription?.latest_invoice === "string"
          ? subscription?.latest_invoice
          : subscription?.latest_invoice?.id ?? null,
      periodStart: start,
      periodEnd: end,
      amountCents,
      currency: session.currency ?? "usd",
      status: subscription?.status ?? "active",
      paymentId,
    });

    await upsertAccessGrant({
      userId,
      product,
      paymentId,
      start,
      end,
      status: subscription?.status ?? "active",
    });
    await markOnboardingAsPaid(admin, userId);
  } else {
    await upsertAccessGrant({
      userId,
      product,
      paymentId,
    });
    await markOnboardingAsPaid(admin, userId);
  }
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const lineItem = invoice.lines.data[0] as
    | (Stripe.InvoiceLineItem & {
        price?: Stripe.Price | string | null;
        period?: { start?: number | null; end?: number | null };
      })
    | undefined;

  const priceField = lineItem?.price ?? null;
  const priceId =
    typeof priceField === "string"
      ? priceField
      : priceField?.id ?? null;

  const product = getProductByPriceId(priceId);
  if (!product) {
    console.error("Unable to resolve product for invoice", invoice.id);
    return;
  }

  const invoiceWithSubscription = invoice as Stripe.Invoice & {
    subscription?: string | Stripe.Subscription;
  };

  const subscriptionId =
    typeof invoiceWithSubscription.subscription === "string"
      ? invoiceWithSubscription.subscription
      : invoiceWithSubscription.subscription?.id ?? null;

  const userId =
    invoice.metadata?.userId ??
    (subscriptionId
      ? await resolveUserIdFromSubscription(subscriptionId)
      : null);

  if (!userId) {
    console.error("Unable to resolve user for invoice", invoice.id);
    return;
  }

  const invoiceWithPaymentIntent = invoice as Stripe.Invoice & {
    payment_intent?: string | Stripe.PaymentIntent;
  };

  const paymentIntentId =
    typeof invoiceWithPaymentIntent.payment_intent === "string"
      ? invoiceWithPaymentIntent.payment_intent
      : invoiceWithPaymentIntent.payment_intent?.id ?? null;

  let paymentIntent: Stripe.PaymentIntent | null = null;
  if (paymentIntentId) {
    try {
      paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
        expand: ["latest_charge.payment_method_details.card"],
      });
    } catch (error) {
      console.error(
        "Failed to retrieve payment intent for invoice",
        paymentIntentId,
        error,
      );
    }
  }

  const latestCharge =
    typeof paymentIntent?.latest_charge === "object"
      ? (paymentIntent.latest_charge as Stripe.Charge)
      : null;
  const card = latestCharge?.payment_method_details?.card ?? null;
  const billing = latestCharge?.billing_details?.address ?? null;
  const paymentMethodType =
    paymentIntent?.payment_method_types?.[0] ??
    latestCharge?.payment_method_details?.type ??
    null;

  const admin = supabaseAdmin();

  let paymentId: number;
  if (paymentIntentId) {
    const { data: existing, error: existingError } = await admin
      .from("payments")
      .select("id")
      .eq("payment_intent_id", paymentIntentId)
      .maybeSingle();

    if (existingError) {
      console.error(
        "Failed checking existing payment for invoice",
        invoice.id,
        existingError,
      );
    }

    if (existing) {
      const { data, error } = await admin
        .from("payments")
        .update({
          user_id: userId,
          product_key: product.key,
          amount_cents: invoice.amount_paid ?? 0,
          currency: invoice.currency ?? "usd",
          status: mapToPaymentStatus(invoice.status),
          payment_intent_id: paymentIntentId,
          payment_method_type: paymentMethodType,
          card_brand: card?.brand ?? null,
          card_last4: card?.last4 ?? null,
          wallet_type: card?.wallet?.type ?? null,
          billing_city: billing?.city ?? null,
          billing_state: billing?.state ?? null,
          billing_country: billing?.country ?? null,
          raw: {
            invoice,
            payment_intent: paymentIntent,
          },
        })
        .eq("id", existing.id)
        .select("id")
        .single();

      if (error) {
        console.error("Failed to update payment for invoice", invoice.id, error);
        throw error;
      }

      paymentId = data.id;
    } else {
      const { data, error } = await admin
        .from("payments")
        .insert({
          user_id: userId,
          product_key: product.key,
          amount_cents: invoice.amount_paid ?? 0,
          currency: invoice.currency ?? "usd",
          status: mapToPaymentStatus(invoice.status),
          payment_intent_id: paymentIntentId,
          payment_method_type: paymentMethodType,
          card_brand: card?.brand ?? null,
          card_last4: card?.last4 ?? null,
          wallet_type: card?.wallet?.type ?? null,
          billing_city: billing?.city ?? null,
          billing_state: billing?.state ?? null,
          billing_country: billing?.country ?? null,
          raw: {
            invoice,
            payment_intent: paymentIntent,
          },
        })
        .select("id")
        .single();

      if (error) {
        console.error("Failed to insert payment for invoice", invoice.id, error);
        throw error;
      }

      paymentId = data.id;
    }
  } else {
    const { data, error } = await admin
      .from("payments")
      .insert({
        user_id: userId,
        product_key: product.key,
        amount_cents: invoice.amount_paid ?? 0,
        currency: invoice.currency ?? "usd",
        status: mapToPaymentStatus(invoice.status),
        raw: {
          invoice,
        },
      })
      .select("id")
      .single();

    if (error) {
      console.error(
        "Failed to insert payment without payment intent",
        invoice.id,
        error,
      );
      throw error;
    }

    paymentId = data.id;
  }

  const period = lineItem?.period ?? null;
  const start = toDate(period?.start ?? undefined);
  const end = toDate(period?.end ?? undefined);

  if (subscriptionId) {
    await upsertSubscriptionPeriod({
      userId,
      product,
      subscriptionId,
      invoiceId: invoice.id,
      periodStart: start,
      periodEnd: end,
      amountCents: invoice.amount_paid ?? 0,
      currency: invoice.currency ?? "usd",
      status: invoice.status ?? "paid",
      paymentId,
    });
  }

  await upsertAccessGrant({
    userId,
    product,
    paymentId,
    start,
    end,
    status: invoice.status ?? "paid",
  });
  await markOnboardingAsPaid(admin, userId);
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const product = resolveProductFromSubscription(subscription);
  if (!product) {
    console.error(
      "Unable to resolve product for subscription update",
      subscription.id,
    );
    return;
  }

  const userId =
    subscription.metadata?.userId ??
    (await resolveUserIdFromSubscription(subscription.id));

  if (!userId) {
    console.error("Unable to resolve user for subscription", subscription.id);
    return;
  }

  const subscriptionPeriods = subscription as Stripe.Subscription & {
    current_period_start?: number | null;
    current_period_end?: number | null;
  };
  const start = toDate(subscriptionPeriods.current_period_start);
  const end = toDate(subscriptionPeriods.current_period_end);

  await upsertSubscriptionPeriod({
    userId,
    product,
    subscriptionId: subscription.id,
    invoiceId: null,
    periodStart: start,
    periodEnd: end,
    amountCents: subscription.items.data[0]?.price?.unit_amount ?? null,
    currency: subscription.items.data[0]?.price?.currency ?? "usd",
    status: subscription.status,
    paymentId: null,
  });

  await upsertAccessGrant({
    userId,
    product,
    paymentId: null,
    start,
    end,
    status: subscription.status,
  });
  const admin = supabaseAdmin();
  await markOnboardingAsPaid(admin, userId);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const product = resolveProductFromSubscription(subscription);
  if (!product) {
    console.error(
      "Unable to resolve product for subscription deletion",
      subscription.id,
    );
    return;
  }

  const userId =
    subscription.metadata?.userId ??
    (await resolveUserIdFromSubscription(subscription.id));

  if (!userId) {
    console.error("Unable to resolve user for subscription", subscription.id);
    return;
  }

  const subscriptionPeriods = subscription as Stripe.Subscription & {
    current_period_start?: number | null;
    current_period_end?: number | null;
  };
  const end = toDate(subscriptionPeriods.current_period_end) ?? new Date();

  await upsertAccessGrant({
    userId,
    product,
    paymentId: null,
    start: toDate(subscriptionPeriods.current_period_start),
    end,
    status: "canceled",
  });

  const admin = supabaseAdmin();
  const { error } = await admin
    .from("subscription_periods")
    .update({
      status: "canceled",
      period_end: ensureDate(end),
    })
    .eq("stripe_subscription_id", subscription.id);

  if (error) {
    console.error(
      "Failed to mark subscription periods canceled",
      subscription.id,
      error,
    );
  }
}

function resolveProductFromSubscription(
  subscription: Stripe.Subscription,
): ProductConfig | undefined {
  const priceId =
    subscription.items.data[0]?.price?.id ??
    (typeof subscription.items.data[0]?.price === "string"
      ? subscription.items.data[0]?.price
      : undefined) ??
    null;

  return getProductByPriceId(priceId);
}

async function resolveUserIdFromSubscription(
  subscriptionId: string,
): Promise<string | null> {
  const admin = supabaseAdmin();

  const { data, error } = await admin
    .from("subscription_periods")
    .select("user_id")
    .eq("stripe_subscription_id", subscriptionId)
    .order("period_end", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error(
      "Failed to resolve user from subscription periods",
      subscriptionId,
      error,
    );
  }

  return data?.user_id ?? null;
}

type SubscriptionPeriodInput = {
  userId: string;
  product: ProductConfig;
  subscriptionId: string;
  invoiceId: string | null;
  periodStart: Date | undefined;
  periodEnd: Date | undefined;
  amountCents: number | null;
  currency: string;
  status: string | null;
  paymentId: number | null;
};

async function upsertSubscriptionPeriod(input: SubscriptionPeriodInput) {
  const admin = supabaseAdmin();

  const periodStart = ensureDate(input.periodStart ?? new Date());
  const periodEnd = ensureDate(
    input.periodEnd ??
      addMonths(input.periodStart ?? new Date(), input.product.access.chatMonths ?? 1),
  );

  const { data: existing, error: selectError } = await admin
    .from("subscription_periods")
    .select("id")
    .eq("stripe_invoice_id", input.invoiceId)
    .maybeSingle();

  if (selectError) {
    console.error(
      "Failed to check existing subscription period",
      input.invoiceId,
      selectError,
    );
  }

  const payload = {
    user_id: input.userId,
    product_key: input.product.key,
    stripe_subscription_id: input.subscriptionId,
    stripe_invoice_id: input.invoiceId,
    period_start: periodStart,
    period_end: periodEnd,
    price_cents: input.amountCents ?? 0,
    currency: input.currency,
    status: input.status ?? "active",
    payment_id: input.paymentId,
  };

  if (existing) {
    const { error } = await admin
      .from("subscription_periods")
      .update(payload)
      .eq("id", existing.id);

    if (error) {
      console.error(
        "Failed to update subscription period",
        existing.id,
        error,
      );
    }
  } else {
    const { error } = await admin.from("subscription_periods").insert(payload);
    if (error) {
      console.error(
        "Failed to insert subscription period",
        input.subscriptionId,
        error,
      );
    }
  }
}

type AccessGrantInput = {
  userId: string;
  product: ProductConfig;
  paymentId: number | null;
  start?: Date | null | undefined;
  end?: Date | null | undefined;
  status?: string | null;
  source?: string;
};

async function upsertAccessGrant(input: AccessGrantInput) {
  const admin = supabaseAdmin();

  const { start, end } = normalizeAccessWindow(
    input.product,
    input.start ?? undefined,
    input.end ?? undefined,
  );

  const grantPayload = {
    user_id: input.userId,
    product_key: input.product.key,
    source: input.source ?? "stripe",
    status:
      input.status && ["canceled", "inactive"].includes(input.status)
        ? "canceled"
        : "active",
    access_starts_at: start.toISOString(),
    access_ends_at: end.toISOString(),
    payment_id: input.paymentId,
    grant_reason: "purchase",
  };

  const { data: existing, error: selectError } = await admin
    .from("access_grants")
    .select("id, access_ends_at")
    .eq("user_id", input.userId)
    .eq("product_key", input.product.key)
    .eq("source", input.source ?? "stripe")
    .order("access_ends_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (selectError) {
    console.error(
      "Failed to lookup existing access grant",
      input.userId,
      input.product.key,
      selectError,
    );
  }

  if (existing) {
    // Only update if the new window extends the access or status changed.
    const existingEnd = new Date(existing.access_ends_at);
    if (
      grantPayload.status === "canceled" ||
      end.getTime() >= existingEnd.getTime()
    ) {
      const { error } = await admin
        .from("access_grants")
        .update(grantPayload)
        .eq("id", existing.id);
      if (error) {
        console.error("Failed to update access grant", existing.id, error);
      }
    }
  } else {
    const { error } = await admin.from("access_grants").insert(grantPayload);
    if (error) {
      console.error(
        "Failed to insert access grant",
        input.product.key,
        input.userId,
        error,
      );
    }
  }

  if (
    input.product.key !== "report_chat_bonus" &&
    input.product.access.report &&
    !input.product.access.chatMonths
  ) {
    const chatBonusProduct = getProductByKey("report_chat_bonus");
    if (chatBonusProduct) {
      await upsertAccessGrant({
        userId: input.userId,
        product: chatBonusProduct,
        paymentId: input.paymentId,
        start,
        status: input.status,
        source: "system",
      });
    }
  }

  if (input.product.access.report) {
    const { error } = await admin
      .from("onboarding_sessions")
      .update({
        purchase_status: "paid",
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", input.userId);

    if (error) {
      console.error(
        "Failed to update onboarding session purchase status",
        input.userId,
        error,
      );
    }
  }
}

async function markOnboardingAsPaid(admin: ReturnType<typeof supabaseAdmin>, userId: string) {
  try {
    await admin
      .from("onboarding_sessions")
      .update({ purchase_status: "paid", claimed_at: new Date().toISOString() })
      .eq("user_id", userId);
  } catch (error) {
    console.error(
      "[subscription] Failed to update onboarding purchase status",
      userId,
      error,
    );
  }
}
