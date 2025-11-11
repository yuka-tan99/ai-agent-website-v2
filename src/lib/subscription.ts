import Stripe from "stripe";

import { getProductByKey, getProductByPriceId, type ProductConfig } from "./products";
import { supabaseAdmin } from "./supabase/server";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY ?? "";
const PRICE_ID_AI = process.env.PRICE_ID_AI ?? "";

if (!STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is not set");
}

if (!PRICE_ID_AI) {
  throw new Error("PRICE_ID_AI is not set");
}

export const stripe = new Stripe(STRIPE_SECRET_KEY);

const COMPLIMENTARY_PRODUCT_KEYS = ["report_plan", "report_chat_bonus"];
const COMPLIMENTARY_ACCESS_MONTHS = 3;
const AI_PRODUCT_KEY = "ai_subscription";

type Nullable<T> = T | null | undefined;

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

function ensureDate(value: Nullable<Date>): string {
  if (!value) {
    return new Date().toISOString();
  }
  return value.toISOString();
}

function toDate(unix: number | null | undefined): Date | undefined {
  if (!unix) return undefined;
  return new Date(unix * 1000);
}

function isActiveStatus(status: Nullable<string>): boolean {
  if (!status) return false;
  return ["active", "trialing", "past_due"].includes(status);
}

function resolveProductFromSubscription(
  subscription: Stripe.Subscription,
): ProductConfig | null {
  const price = subscription.items.data[0]?.price ?? null;
  const priceId =
    (typeof price === "string" ? price : price?.id) ??
    (subscription.items.data[0]?.price &&
    typeof subscription.items.data[0]?.price !== "string"
      ? subscription.items.data[0]?.price?.id
      : null);

  if (!priceId) {
    return null;
  }

  return getProductByPriceId(priceId) ?? null;
}

export type ComplimentaryAccess = {
  active: boolean;
  expiresAt: string | null;
  sourceProductKey: string | null;
};

export async function getComplimentaryAccess(
  userId: string,
): Promise<ComplimentaryAccess> {
  const admin = supabaseAdmin();

  const { data, error } = await admin
    .from("access_grants")
    .select("product_key, access_starts_at")
    .eq("user_id", userId)
    .in("product_key", COMPLIMENTARY_PRODUCT_KEYS)
    .eq("status", "active")
    .order("access_starts_at", { ascending: false })
    .limit(1);

  if (error) {
    console.error("[subscription] Failed to load complimentary access", error);
    return { active: false, expiresAt: null, sourceProductKey: null };
  }

  const grant = data?.[0];
  if (!grant) {
    return { active: false, expiresAt: null, sourceProductKey: null };
  }

  const start = new Date(grant.access_starts_at);
  const expires = addMonths(start, COMPLIMENTARY_ACCESS_MONTHS);
  const active = new Date() < expires;

  return {
    active,
    expiresAt: expires.toISOString(),
    sourceProductKey: grant.product_key ?? null,
  };
}

export type SubscriptionSnapshot = {
  stripeSubscriptionId: string | null;
  status: Stripe.Subscription.Status | null;
  cancelAtPeriodEnd: boolean;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  latestInvoiceId: string | null;
  priceAmountCents: number | null;
  priceCurrency: string | null;
  customerId: string | null;
  trialEnd: string | null;
};

export type BillingSnapshot = {
  complimentary: ComplimentaryAccess;
  subscription: SubscriptionSnapshot | null;
};

export async function getLatestSubscriptionPeriod(userId: string) {
  const admin = supabaseAdmin();

  const { data, error } = await admin
    .from("subscription_periods")
    .select(
      "id, stripe_subscription_id, stripe_invoice_id, period_start, period_end, status",
    )
    .eq("user_id", userId)
    .eq("product_key", AI_PRODUCT_KEY)
    .order("period_end", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[subscription] Failed to load subscription period", error);
  }

  return data ?? null;
}

export async function fetchStripeSubscription(
  userId: string,
): Promise<Stripe.Subscription | null> {
  const latestPeriod = await getLatestSubscriptionPeriod(userId);
  if (!latestPeriod?.stripe_subscription_id) {
    return null;
  }

  try {
    return await stripe.subscriptions.retrieve(latestPeriod.stripe_subscription_id, {
      expand: ["latest_invoice"],
    });
  } catch (error) {
    console.error(
      "[subscription] Failed to retrieve Stripe subscription",
      latestPeriod.stripe_subscription_id,
      error,
    );
    return null;
  }
}

export async function buildSubscriptionSnapshot(
  subscription: Stripe.Subscription | null,
): Promise<SubscriptionSnapshot | null> {
  if (!subscription) {
    return null;
  }

  const periodData = subscription as Stripe.Subscription & {
    current_period_start?: number | null;
    current_period_end?: number | null;
    trial_end?: number | null;
  };
  const currentPeriodStartUnix = periodData.current_period_start ?? null;
  const currentPeriodEndUnix = periodData.current_period_end ?? null;
  const trialEndUnix = periodData.trial_end ?? null;

  const price = subscription.items.data[0]?.price ?? null;
  const amountCents =
    typeof price !== "string"
      ? price?.unit_amount ?? price?.unit_amount_decimal
        ? Number(price.unit_amount_decimal)
        : null
      : null;
  const currency = typeof price !== "string" ? price?.currency ?? null : null;

  return {
    stripeSubscriptionId: subscription.id,
    status: subscription.status ?? null,
    cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
    currentPeriodStart: currentPeriodStartUnix
      ? new Date(currentPeriodStartUnix * 1000).toISOString()
      : null,
    currentPeriodEnd: currentPeriodEndUnix
      ? new Date(currentPeriodEndUnix * 1000).toISOString()
      : null,
    latestInvoiceId:
      typeof subscription.latest_invoice === "string"
        ? subscription.latest_invoice
        : subscription.latest_invoice?.id ?? null,
    priceAmountCents:
      typeof amountCents === "number" ? Math.round(amountCents) : null,
    priceCurrency: currency ?? null,
    customerId:
      typeof subscription.customer === "string"
        ? subscription.customer
        : subscription.customer?.id ?? null,
    trialEnd: trialEndUnix
      ? new Date(trialEndUnix * 1000).toISOString()
      : null,
  };
}

export async function getBillingSnapshot(
  userId: string,
): Promise<BillingSnapshot> {
  const [complimentary, stripeSubscription] = await Promise.all([
    getComplimentaryAccess(userId),
    fetchStripeSubscription(userId),
  ]);

  const subscriptionSnapshot = await buildSubscriptionSnapshot(
    stripeSubscription,
  );

  return {
    complimentary,
    subscription: subscriptionSnapshot,
  };
}

type SubscriptionPeriodInput = {
  userId: string;
  product: ProductConfig;
  subscriptionId: string;
  invoiceId: string | null;
  periodStart: Date | undefined;
  periodEnd: Date | undefined;
  amountCents: number | null;
  currency: string | null;
  status: string | null;
  paymentId: number | null;
};

type AccessGrantInput = {
  userId: string;
  product: ProductConfig;
  paymentId: number | null;
  start?: Date | null | undefined;
  end?: Date | null | undefined;
  status?: string | null;
  source?: string;
};

function normalizeAccessWindow(
  product: ProductConfig,
  startAt: Date | undefined,
  endAt: Date | undefined,
): { start: Date; end: Date } {
  const start = startAt ?? new Date();

  if (endAt) {
    return { start, end: endAt };
  }

  if (product.access.chatMonths && product.access.chatMonths > 0) {
    return { start, end: addMonths(start, product.access.chatMonths) };
  }

  const end = new Date(start);
  end.setFullYear(end.getFullYear() + 1);
  return { start, end };
}

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
    .eq("stripe_subscription_id", input.subscriptionId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (selectError) {
    console.error(
      "[subscription] Failed to check existing subscription period",
      input.subscriptionId,
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
    currency: input.currency ?? "usd",
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
        "[subscription] Failed to update subscription period",
        existing.id,
        error,
      );
    }
  } else {
    const { error } = await admin.from("subscription_periods").insert(payload);
    if (error) {
      console.error(
        "[subscription] Failed to insert subscription period",
        input.subscriptionId,
        error,
      );
    }
  }
}

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
      "[subscription] Failed to lookup existing access grant",
      input.userId,
      input.product.key,
      selectError,
    );
  }

  if (existing) {
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
        console.error(
          "[subscription] Failed to update access grant",
          existing.id,
          error,
        );
      }
    }
  } else {
    const { error } = await admin.from("access_grants").insert(grantPayload);
    if (error) {
      console.error(
        "[subscription] Failed to insert access grant",
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
}

export async function syncSubscriptionState(
  userId: string,
  subscription: Stripe.Subscription,
) {
  const product =
    resolveProductFromSubscription(subscription) ??
    getProductByKey(AI_PRODUCT_KEY);

  if (!product) {
    console.warn(
      "[subscription] Unable to resolve product for subscription",
      subscription.id,
    );
    return;
  }

  const invoiceId =
    typeof subscription.latest_invoice === "string"
      ? subscription.latest_invoice
      : subscription.latest_invoice?.id ?? null;

  const price = subscription.items.data[0]?.price ?? null;
  const amountCents =
    typeof price !== "string"
      ? price?.unit_amount ?? price?.unit_amount_decimal
        ? Number(price.unit_amount_decimal)
        : null
      : null;
  const currency =
    typeof price !== "string" ? price?.currency ?? "usd" : "usd";

  const periodData = subscription as Stripe.Subscription & {
    current_period_start?: number | null;
    current_period_end?: number | null;
  };

  const periodStart = toDate(periodData.current_period_start ?? null);
  const periodEnd = toDate(periodData.current_period_end ?? null);

  await upsertSubscriptionPeriod({
    userId,
    product,
    subscriptionId: subscription.id,
    invoiceId,
    periodStart,
    periodEnd,
    amountCents: typeof amountCents === "number" ? Math.round(amountCents) : null,
    currency,
    status: subscription.status ?? null,
    paymentId: null,
  });

  await upsertAccessGrant({
    userId,
    product,
    paymentId: null,
    start: periodStart,
    end: periodEnd,
    status: subscription.status ?? null,
  });
}

export function getStripePriceId(): string {
  return PRICE_ID_AI;
}

export function canCancelSubscription(
  snapshot: SubscriptionSnapshot | null,
  complimentary: ComplimentaryAccess,
): boolean {
  if (!snapshot) return false;
  if (complimentary.active) return false;
  if (!isActiveStatus(snapshot.status)) return false;
  return snapshot.cancelAtPeriodEnd === false;
}

export function canResumeSubscription(
  snapshot: SubscriptionSnapshot | null,
  complimentary: ComplimentaryAccess,
): boolean {
  if (!snapshot) return false;
  if (complimentary.active) return false;
  if (!isActiveStatus(snapshot.status)) return false;
  return snapshot.cancelAtPeriodEnd === true;
}
