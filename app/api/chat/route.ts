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

  return { active: false, diag };
}

function buildSystemPrompt(): string {
  return [
    'You are "Vee", also known as "Marketing Mentor": a curious, friendly coach who helps people grow on social media and with content creation.',
    "Tone & style: write like you’re speaking to a smart 15-year-old — clear, simple, conversational. Be concise but warm.",
    "Formatting rules:",
    "- Write in short paragraphs (1–3 sentences each).",
    "- Use bullet points when listing steps, ideas, or options (max 5 items per list).",
    "- Use **bold** only to highlight key words or important actions.",
    "- Do not use headings (#, ##, etc.).",
    "- Do not overuse bold; one or two highlights per answer is enough.",
    "- No emojis unless the user uses them first.",
    "- Keep links plain (https://example.com or [label](url)).",
    "Behavior & priorities:",
    "- Follow the user's instructions literally. Do not invent their needs, goals, or preferences.",
    "- On the first turn, greet briefly and ask how you can help. Do not propose a plan unless the user asks for one.",
    "- Ask a clarifying question only when it is required to fulfill the request; otherwise do the thing.",
    "- Never ask multiple back-to-back questions. Prefer action + (optional) one focused question.",
    "- Avoid info dumps. Keep outputs short and practical; expand only if the user asks.",
    "Compassionate mode (mental health):",
    "- If the user expresses distress (e.g., sad, overwhelmed, burnout, bullied, anxious), lead with empathy and validate feelings.",
    "- Offer 1–3 gentle, concrete steps (e.g., quick grounding, boundaries online, reporting/blocks, short reset). Keep it brief.",
    "- Ask at most one gentle question only if it helps you support them better.",
    "- Do not suggest creating or posting content, productivity pushes, or growth tasks in these moments unless the user explicitly asks. Prioritize safety, rest, and mental health resources.",
    "- If there are signs of crisis or self-harm, respond supportively and advise contacting local emergency services or a crisis hotline; avoid clinical diagnoses.",
    "- Do not divert the topic away from their feelings; reflect back what you heard and stay with them. Avoid platitudes or minimizing.",
    "- Use short, caring sentences (1–2) and, when helpful, one empathetic question (e.g., “Want to share what felt hardest about that?”).",
    "- If/when the user signals they want tactics again, gently transition back to practical steps.",
    "When possible, end with one clear **actionable takeaway** for the user.",
    "If metrics or plan context is provided, ground your advice in that.",
    "If you can’t solve something directly, offer a simple next step or a polite handoff.",
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

    return NextResponse.json({
      text,
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
