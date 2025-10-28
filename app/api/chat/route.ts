import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

import { supabaseRoute } from "@/lib/supabase/route";
import { supabaseAdmin } from "@/lib/supabase/server";
import { redactPII } from "@/lib/redact";
import { PRODUCTS } from "@/lib/products";

const DEFAULT_MODEL =
  process.env.LLM_CHAT_MODEL || "gemini-2.0-flash";

const CHAT_PRODUCT_KEYS = Object.values(PRODUCTS)
  .filter((product) => product.access.chatMonths && product.access.chatMonths > 0)
  .map((product) => product.key);

type Message = {
  role: "user" | "assistant" | "system";
  content: string;
};

type RagPayload = {
  persona?: unknown;
  plan?: unknown;
};

function buildSuggestions(
  userMessage: string,
  fallbackCreatorType = "creator",
): string[] {
  const core = [
    "Give me 3 video ideas for this week",
    "How can I improve my engagement?",
    "What hashtags should I use?",
    "Review my content strategy",
    "Map a 7-day posting calendar",
    "Break down what’s working in my niche",
    `How can I stand out as a ${fallbackCreatorType}?`,
    "What should my call-to-actions be?",
  ];

  const targeted: string[] = [];
  const text = userMessage.toLowerCase();

  if (text.includes("video") || text.includes("reel")) {
    targeted.push(
      "Pitch 3 hooks for my next video",
      "Outline a script for a 60-second video",
    );
  }
  if (text.includes("engage") || text.includes("comment")) {
    targeted.push(
      "Give me a comment strategy for this week",
      "How do I boost saves and shares?",
    );
  }
  if (text.includes("hashtag") || text.includes("#")) {
    targeted.push("Recommend 5 evergreen hashtags in my niche");
  }
  if (text.includes("monet") || text.includes("brand")) {
    targeted.push(
      "What monetization paths fit my audience?",
      "Draft an outreach email for brand deals",
    );
  }
  if (!targeted.length) {
    targeted.push(
      "Suggest collaborations I should pursue",
      "Help me optimize my bio in 3 bullets",
    );
  }

  const combined = Array.from(new Set([...targeted, ...core]));
  const picks: string[] = [];
  while (combined.length && picks.length < 4) {
    const idx = Math.floor(Math.random() * combined.length);
    const [choice] = combined.splice(idx, 1);
    picks.push(choice);
  }

  return picks;
}

async function fetchActiveChatGrant(
  supabase: ReturnType<typeof supabaseAdmin>,
  userId: string,
): Promise<{ active: boolean; diag?: Record<string, unknown> }> {
  const DEBUG = process.env.DEBUG_LOG === "true";
  const nowIso = new Date().toISOString();

  const { data: windows, error: winErr } = await supabase
    .from("access_grants")
    .select("product_key, access_starts_at, access_ends_at, status")
    .eq("user_id", userId)
    .in("product_key", CHAT_PRODUCT_KEYS)
    .order("access_starts_at", { ascending: false });

  if (winErr && DEBUG) {
    console.warn("[chat] grant lookup failed", winErr);
  }

  const arr = windows ?? [];
  const grant = arr.find((row) => {
    if ((row.status ?? "active") !== "active") return false;
    if (!row.access_starts_at || !row.access_ends_at) return false;
    return row.access_starts_at <= nowIso && nowIso <= row.access_ends_at;
  });

  if (grant) {
    return { active: true };
  }

  const diag: Record<string, unknown> = {
    windows_count: arr.length,
    now: nowIso,
  };

  if (arr.length) {
    const future = arr
      .filter(
        (row) =>
          (row.status ?? "active") === "active" &&
          row.access_starts_at &&
          row.access_starts_at > nowIso,
      )
      .sort((a, b) =>
        a.access_starts_at!.localeCompare(b.access_starts_at!),
      )[0];
    const past = arr
      .filter(
        (row) =>
          (row.status ?? "active") === "active" &&
          row.access_ends_at &&
          row.access_ends_at < nowIso,
      )
      .sort((a, b) =>
        b.access_ends_at!.localeCompare(a.access_ends_at!),
      )[0];
    if (future) diag.future_window_starts_at = future.access_starts_at;
    if (past) diag.latest_past_window_ended_at = past.access_ends_at;
  }

  const { data: ob } = await supabase
    .from("onboarding_sessions")
    .select("purchase_status, claimed_at, updated_at")
    .eq("user_id", userId)
    .maybeSingle();

  const purchaseStatus = ob?.purchase_status;
  const claimedAtStr = ob?.claimed_at || ob?.updated_at || null;

  if (purchaseStatus === "paid" && claimedAtStr) {
    const claimedAt = new Date(claimedAtStr);
    const ends = new Date(claimedAt);
    ends.setMonth(ends.getMonth() + 3);
    if (new Date() <= ends) {
      diag.fallback = "paid_within_3m";
      diag.fallback_ends_at = ends.toISOString();
      if (DEBUG) console.log("[chat] access via fallback paid_within_3m", diag);
      return { active: true, diag };
    }
    diag.fallback = "paid_expired";
    diag.fallback_ended_at = ends.toISOString();
  } else if (purchaseStatus === "paid") {
    diag.fallback = "paid_no_claimed_at";
  } else {
    diag.fallback = "not_paid";
  }

  const { data: reportRow, error: reportError } = await supabase
    .from("reports")
    .select("updated_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (reportError && DEBUG) {
    console.warn("[chat] report lookup failed", reportError);
  }

  const reportUpdatedAt = reportRow?.updated_at
    ? new Date(reportRow.updated_at as string)
    : null;

  if (reportUpdatedAt && Number.isFinite(reportUpdatedAt.getTime())) {
    const reportEnds = new Date(reportUpdatedAt);
    reportEnds.setMonth(reportEnds.getMonth() + 3);
    if (new Date() <= reportEnds) {
      const detail = {
        ...diag,
        fallback: "report_access_within_3m",
        report_updated_at: reportUpdatedAt.toISOString(),
        report_access_ends_at: reportEnds.toISOString(),
      };
      if (DEBUG) console.log("[chat] access via report fallback", detail);
      return { active: true, diag: detail };
    }
  }

  return { active: false, diag };
}

function buildSystemPrompt(): string {
  return [
    'You are Vee — an AI social media growth strategist, creative mentor, and practical friend. You help creators grow audiences and monetize across TikTok, Instagram, YouTube, and more.',
    'Core energy: friendly, encouraging, emotionally intelligent. No fluff, no condescension. Write like a supportive creative partner who “gets it”.',
    'Default voice guidelines:',
    '- Use short paragraphs (1–3 sentences).',
    '- Keep language clear and conversational. Mention emojis occasionally (max 1–2 per reply) when warmth helps.',
    '- Bold only the most important action or phrase (max twice).',
    '- No headings, numbered lists, or markdown beyond tasteful bold.',
    'Conversation protocol:',
    '1. Open with “Hey {name}, how can I help you today?” on the first response. Reference their current stage or known blocker naturally.',
    '2. Deliver one focused insight or next step that is specific, feasible, and tailored to their context.',
    '3. Close with a single open, empathetic question that keeps momentum.',
    '4. Surface 3–4 short follow-up prompt ideas relevant to the user (e.g., “Suggest a video idea”, “Review my bio”). Present them as plain text bullets at the end under the line “Quick buttons:”.',
    '5. Remember user persona and onboarding signals — stage, struggles, goals, preferred platforms. Bring them into the advice naturally.',
    '6. If the user sounds discouraged or overwhelmed, slow down, validate, and offer gentle next steps before strategy.',
    '7. If you cannot fulfill a request, share the most useful alternative or resource.',
    'Behavior rules:',
    '- Avoid generic platitudes. Every message must feel tailored.',
    '- Stay within 6 short paragraphs max.',
    '- Never fabricate analytics; if missing info, ask briefly or make a helpful assumption.',
    '- When user intent is unclear, ask a single clarifying question after giving at least one insight.',
  ].join("\n");
}

export async function POST(req: NextRequest) {
  const DEBUG = process.env.DEBUG_LOG === "true";
  const startedAt = Date.now();

  let body: { messages?: Message[]; rag?: RagPayload };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const messages: Message[] = Array.isArray(body?.messages)
    ? body.messages
    : [];
  const rag: RagPayload = body?.rag ?? {};

  if (DEBUG) {
    console.log("[chat] incoming request", {
      messages: messages.length,
      hasRag: Boolean(rag && Object.keys(rag).length),
    });
  }

  try {
    const routeClient = supabaseRoute(req);
    const supabase = supabaseAdmin();
    const { data: userResult, error: userError } = await routeClient.getUser();

    if (userError && DEBUG) {
      console.warn("[chat] user lookup error", userError);
    }

    const user = userResult?.user ?? null;

    if (!user) {
      if (DEBUG) console.log("[chat] unauthenticated access");
    return NextResponse.json(
      { text: "Please sign in to chat." },
      { status: 200 },
    );
  }

  const accessStatus = await fetchActiveChatGrant(supabase, user.id);
    if (!accessStatus.active) {
      const payUrl = "/paywall/ai";
      const message =
        "Looks like you don’t have access to your Marketing Mentor yet. Pay only $6/month to continue access.";
      return NextResponse.json(
        {
          text: message,
          reason: "expired_access",
          paywall: payUrl,
          diag: accessStatus.diag,
        },
        { status: 200 },
      );
    }

    const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      if (DEBUG) console.warn("[chat] missing GOOGLE_API_KEY/GEMINI_API_KEY");
      return NextResponse.json(
        { text: "Server missing Google API key." },
        { status: 200 },
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    const candidateModels = [
      DEFAULT_MODEL,
      "gemini-2.0-flash",
      "gemini-1.5-flash",
      "gemini-pro",
    ];

    let selectedModelName = candidateModels[0];
    let model = genAI.getGenerativeModel({ model: selectedModelName });

    const system = buildSystemPrompt();
    const persona = rag?.persona ? JSON.stringify(rag.persona) : "";
    const plan = rag?.plan ? JSON.stringify(rag.plan) : "";
    const context = [persona && `User persona: ${persona}`, plan && `Plan: ${plan}`]
      .filter(Boolean)
      .join("\n");

    const userTurn = messages[messages.length - 1]?.content ?? "";
    const userTurnsCount = messages.filter((msg) => msg.role === "user").length || 1;

    const prompt = [
      system,
      context ? `\nContext:\n${context}\n` : "",
      `Conversation meta: user_turn_index=${userTurnsCount}`,
      "Guidance: If user_turn_index > 1, do not add extra greetings. Respond directly to the user's latest message. If it's a greeting, a brief hello back is enough; if it's an instruction, execute it. If user text shows emotional distress, switch to compassionate mode.",
      `User: ${userTurn}\nAssistant:`,
    ].join("\n");

    let text = "";
    const promptChars = prompt.length;
    if (DEBUG) console.log("[chat] calling model", { model: selectedModelName, promptChars });

    try {
      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: 240,
          temperature: 0.4,
        },
      });
      text = (result?.response?.text?.() || "").toString();
    } catch (error) {
      const err = error as Error;
      if (DEBUG) console.warn("[chat] model error", err.message);
      const message = err.message ?? "";
      let triedFallback = false;

      if (/404|not found|was not found/i.test(message)) {
        for (let i = 1; i < candidateModels.length; i++) {
          try {
            selectedModelName = candidateModels[i];
            model = genAI.getGenerativeModel({ model: selectedModelName });
            if (DEBUG) console.warn("[chat] retrying with model", selectedModelName);
            const altResult = await model.generateContent({
              contents: [{ role: "user", parts: [{ text: prompt }] }],
              generationConfig: {
                maxOutputTokens: 240,
                temperature: 0.4,
              },
            });
            text = (altResult?.response?.text?.() || "").toString();
            triedFallback = true;
            break;
          } catch (fallbackErr) {
            if (DEBUG) {
              console.warn(
                "[chat] fallback model failed",
                selectedModelName,
                (fallbackErr as Error)?.message ?? fallbackErr,
              );
            }
          }
        }
      }

      if (!triedFallback && !text) {
        try {
          const resultLegacy: any = await (model as any).generateContent(prompt);
          text = (resultLegacy?.response?.text?.() || "").toString();
        } catch (legacyErr) {
          if (DEBUG) {
            console.warn("[chat] model call failed twice", legacyErr);
          }
          text =
            "I hit a hiccup generating that. Could you rephrase or ask a smaller question?";
        }
      }
    }

    if (!text) {
      text = "Let’s try that again with a bit more detail.";
    }

    if (DEBUG) {
      console.log("[chat] model ok", {
        model: selectedModelName,
        ms: Date.now() - startedAt,
        outChars: text.length,
      });
    }

    let assistantMessageId: number | null = null;
    const tokensInputEstimate = Math.max(
      1,
      Math.round((userTurn.length || 0) / 4),
    );
    const tokensOutputEstimate = Math.max(
      1,
      Math.round((text.length || 0) / 4),
    );

    try {
      const redUser = redactPII(userTurn);
      const redAssistant = redactPII(text);
      const { data: inserted, error: insertError } = await supabase
        .from("chat_messages")
        .insert([
          {
            user_id: user.id,
            role: "user",
            content: redUser,
            meta: { turns: userTurnsCount },
          },
          {
            user_id: user.id,
            role: "assistant",
            content: redAssistant,
            meta: { model: selectedModelName },
          },
        ])
        .select("id, role");

      if (!insertError) {
        const assistantRow = (inserted ?? []).find(
          (row) => row.role === "assistant",
        );
        if (assistantRow?.id) {
          assistantMessageId = assistantRow.id as number;
        }
      } else if (DEBUG) {
        console.warn("[chat] log persist failed", insertError);
      }
    } catch (error) {
      if (DEBUG) {
        console.warn("[chat] log persist exception", error);
      }
    }

    try {
      const inRate = parseFloat(
        process.env.LLM_COST_PER_KTOK_INPUT_USD || "0",
      );
      const outRate = parseFloat(
        process.env.LLM_COST_PER_KTOK_OUTPUT_USD || "0",
      );
      const costUsd =
        (inRate * tokensInputEstimate + outRate * tokensOutputEstimate) / 1000;
      const costMicros = Math.round(costUsd * 1_000_000);

      await supabase.from("chat_usage_events").insert({
        user_id: user.id,
        session_id: null,
        prompt_count: 1,
        tokens_input: tokensInputEstimate,
        tokens_output: tokensOutputEstimate,
        cost_usd_micros: inRate || outRate ? costMicros : null,
        meta: { model: selectedModelName },
      });
    } catch (error) {
      if (DEBUG) console.warn("chat usage log failed", error);
    }

    const personaObj =
      rag?.persona && typeof rag.persona === "object" && rag.persona !== null
        ? (rag.persona as Record<string, unknown>)
        : null;

    const derivedCreatorType =
      (personaObj?.creatorType as string | undefined) ??
      (personaObj?.creator_type as string | undefined) ??
      (typeof user.user_metadata?.creatorType === "string"
        ? (user.user_metadata?.creatorType as string)
        : undefined) ??
      (typeof user.user_metadata?.creator_type === "string"
        ? (user.user_metadata?.creator_type as string)
        : undefined) ??
      "creator";

    const suggestions = buildSuggestions(userTurn, derivedCreatorType);

    const durationMs = Date.now() - startedAt;
    console.log("[chat] served", {
      userId: user.id,
      model: selectedModelName,
      tokensInput: tokensInputEstimate,
      tokensOutput: tokensOutputEstimate,
      suggestions: suggestions.length,
      durationMs,
    });

    const trimmed = text.trim();
    const suggestionsBlock = suggestions.length
      ? `\n\nQuick buttons:\n${suggestions.map((s) => `• ${s}`).join("\n")}`
      : "";
    const finalText = trimmed.includes("Quick buttons:") ? trimmed : `${trimmed}${suggestionsBlock}`;

    return NextResponse.json({
      text: finalText,
      message_id: assistantMessageId,
      suggestions,
    });
  } catch (error) {
    console.error("[chat] fatal error", (error as Error)?.message || error);
    return NextResponse.json(
      { text: "Sorry, I ran into an issue. Please try again." },
      { status: 200 },
    );
  }
}
