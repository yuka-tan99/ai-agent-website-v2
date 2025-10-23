import { supabase } from "@/lib/supabaseClient";

const notAuthenticatedError = new Error(
  "You need to be signed in before interacting with Supabase data.",
);

async function requireUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) throw error;
  if (!user) throw notAuthenticatedError;

  return user;
}

export type ProfilePayload = {
  city?: string;
  state?: string;
  country?: string;
  location_source?: string;
  signup_provider?: string;
  signup_at?: string;
  last_login_provider?: string;
  last_login_at?: string;
};

export async function upsertProfile(profile: ProfilePayload) {
  const user = await requireUser();

  const { error } = await supabase
    .from("profiles")
    .upsert(
      {
        user_id: user.id,
        ...profile,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

  if (error) throw error;
}

export type OnboardingSessionPayload = {
  answers?: Record<string, unknown>;
  links?: unknown[];
  plan?: Record<string, unknown> | null;
  purchase_status?: "none" | "paid";
  claimed_at?: string | null;
};

export async function upsertOnboardingSession(payload: OnboardingSessionPayload) {
  const user = await requireUser();

  const { error } = await supabase
    .from("onboarding_sessions")
    .upsert(
      {
        user_id: user.id,
        answers: payload.answers ?? {},
        links: payload.links ?? [],
        plan: payload.plan ?? null,
        purchase_status: payload.purchase_status ?? "none",
        claimed_at: payload.claimed_at ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

  if (error) throw error;
}

export type ChatThreadRow = {
  id: number;
  title: string;
  created_at: string;
  updated_at: string;
};

export async function createChatThread(title = "New chat") {
  const user = await requireUser();

  const { data, error } = await supabase
    .from("chat_threads")
    .insert({
      user_id: user.id,
      title,
    })
    .select("id, title, created_at, updated_at")
    .single();

  if (error) throw error;

  return data as ChatThreadRow;
}

export type ChatMessagePayload = {
  threadId: number;
  role: "user" | "assistant" | "system";
  content: string;
  meta?: Record<string, unknown>;
};

export async function appendChatMessage(payload: ChatMessagePayload) {
  const user = await requireUser();

  const { data, error } = await supabase
    .from("chat_messages")
    .insert({
      user_id: user.id,
      thread_id: payload.threadId,
      role: payload.role,
      content: payload.content,
      meta: payload.meta ?? null,
    })
    .select("id, created_at");

  if (error) throw error;

  return data;
}

export type ChatFeedbackPayload = {
  messageId: number;
  messageIndex: number;
  value: "up" | "down" | "cleared";
  message?: string;
};

export async function recordChatFeedback(payload: ChatFeedbackPayload) {
  const user = await requireUser();

  const { error } = await supabase.from("chat_feedback").insert({
    user_id: user.id,
    message_id: payload.messageId,
    message_index: payload.messageIndex,
    value: payload.value,
    message: payload.message ?? null,
  });

  if (error) throw error;
}

export type UsageEventPayload = {
  sessionId?: string;
  promptCount?: number;
  tokensInput?: number;
  tokensOutput?: number;
  costUsdMicros?: number;
  meta?: Record<string, unknown>;
};

export async function trackChatUsage(payload: UsageEventPayload) {
  const user = await requireUser();

  const { error } = await supabase.from("chat_usage_events").insert({
    user_id: user.id,
    session_id: payload.sessionId ?? null,
    prompt_count: payload.promptCount ?? 0,
    tokens_input: payload.tokensInput ?? 0,
    tokens_output: payload.tokensOutput ?? 0,
    cost_usd_micros: payload.costUsdMicros ?? null,
    meta: payload.meta ?? null,
  });

  if (error) throw error;
}
