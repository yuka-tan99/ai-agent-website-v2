// app/api/onboarding/mini-advice/route.ts
import { NextResponse } from "next/server";
import { geminiTextModel, GEMINI_SAFETY } from "@/lib/gemini";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  kind?: "stuck" | "holding";
  identity?: string | string[];
  stuckReason?: string[];       // from “what does 'stuck' feel like?”
  goal?: string[];              // goals
  reach?: string[];             // audience hints
  techComfort?: string;         // tech comfort
  techGaps?: string[];          // tech gaps
  holdingBack?: string[];       // from “what’s holding you back right now?”
};

const asArr = (v: any) => Array.isArray(v) ? v : v ? [v] : [];

const BASE_RULES = `
You are an empathetic creator-coach. Output simple, encouraging advice (2–4 short lines).
Sound human, not corporate. Avoid judgment. Offer one practical next step.
Return ONLY JSON: { "title": "...", "tip": "..." } (no markdown fences).
`;

const PROMPT_STUCK = (b: Body) => `
${BASE_RULES}
TOPIC: Mini advice for someone who feels stuck.
CONTEXT:
identity: ${asArr(b.identity).join(", ") || "(unknown)"}
stuckReason: ${asArr(b.stuckReason).join(", ") || "(none)"}
goals: ${asArr(b.goal).join(", ") || "(none)"}
reach: ${asArr(b.reach).join(", ") || "(none)"}
techComfort: ${b.techComfort || "(unknown)"}
techGaps: ${asArr(b.techGaps).join(", ") || "(none)"}

Title vibe: gentle and empowering (e.g., “the authenticity advantage”, “momentum loves simple”).
`;

const PROMPT_HOLDING = (b: Body) => `
${BASE_RULES}
TOPIC: Mini advice for “what’s holding you back right now?”.
CONTEXT:
identity: ${asArr(b.identity).join(", ") || "(unknown)"}
holdingBack: ${asArr(b.holdingBack).join(", ") || "(none)"}
goals: ${asArr(b.goal).join(", ") || "(none)"}
reach: ${asArr(b.reach).join(", ") || "(none)"}
techComfort: ${b.techComfort || "(unknown)"}
techGaps: ${asArr(b.techGaps).join(", ") || "(none)"}

Title vibe: calm focus (e.g., “clarity is kindness”, “focus beats friction”, “start smaller, win sooner”).
`;

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Body;
    const kind = body.kind === "holding" ? "holding" : "stuck";

    const model = geminiTextModel();
    const prompt = kind === "holding" ? PROMPT_HOLDING(body) : PROMPT_STUCK(body);

    let text = "";
    try {
      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        safetySettings: GEMINI_SAFETY,
        generationConfig: {
          temperature: 0.6,
          topP: 0.9,
          maxOutputTokens: 300,
          responseMimeType: "application/json",
        },
      });
      text = (result.response?.text?.() || "").trim();
    } catch (e: any) {
      // fall through to defaults
    }

    const cleaned = text.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
    let json: any = null;
    try { json = JSON.parse(cleaned); } catch {}

    // Safe defaults if the model hiccups
    if (!json || typeof json !== "object") {
      if (kind === "holding") {
        json = {
          title: "clarity is kindness",
          tip:
            "having many goals is fine, but chasing all at once causes burnout.\n" +
            "pick one primary goal for the next 2 weeks, ship tiny posts toward it,\n" +
            "and review what worked every Friday.",
        };
      } else {
        json = {
          title: "the authenticity advantage",
          tip:
            "you’re not broken — your format just needs a tune-up.\n" +
            "audit your last 10 posts, keep two hook patterns, remix them 3 ways.\n" +
            "small repeats beat big resets.",
        };
      }
    }

    // hard trim
    json.title = String(json.title || "").trim().slice(0, 80);
    json.tip = String(json.tip || "").trim();

    return NextResponse.json(json);
  } catch (e: any) {
    return NextResponse.json(
      { title: "quick nudge", tip: "breathe, start tiny, and let repetition build your momentum." },
      { status: 200 }
    );
  }
}