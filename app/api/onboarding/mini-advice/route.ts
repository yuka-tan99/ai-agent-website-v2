// app/api/onboarding/mini-advice/route.ts
import { NextResponse } from "next/server";

// Optional: use Gemini if available
let geminiTextModel: any, GEMINI_SAFETY: any;
try {
  ({ geminiTextModel, GEMINI_SAFETY } = require("@/lib/gemini"));
} catch { /* not configured */ }

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  identity?: string | string[];
  stuckReason?: string[];          // e.g. ["my growth has plateaued", ...]
  goal?: string[];                 // user goals
  reach?: string[];                // audience hints
  techComfort?: string;            // comfort level
  techGaps?: string[];             // areas they want help with
};

const SYSTEM_STYLE = `You are an upbeat, empathetic social media coach.
Write one short, encouraging tip (3–5 sentences).
Be specific, plain-spoken, and practical. No buzzwords or shaming.
Treat on-camera preferences as creative style choices, not flaws.
Lowercase headline vibe is great; keep the body clear and kind. Avoid using hyphen.`;

// Fallback heuristic if LLM isn’t available
function fallbackTip(p: Body): string {
  const stuck = (p.stuckReason || []).join(" ").toLowerCase();
  if (stuck.includes("plateau")) {
    return "Momentum returns when formats repeat. Audit your last 10 posts, keep the two hook patterns with the best hold, and remix each three ways this week. Tiny, repeated wins beat big resets.";
  }
  if (stuck.includes("not sure what content")) {
    return "Pick three topics you could talk about for a month. Save ten example posts you like, and make one fast remix of each. Ship daily drafts—clarity comes from output.";
  }
  if (stuck.includes("engagement")) {
    return "Turn comments into content. Ask one specific question per post, reply with a short video to the best answer, and pin it. People respond to people who respond.";
  }
  if (stuck.includes("time")) {
    return "Use one weekly batch block and one daily publish window. Record three 20-second clips in your batch, trim one per day, and post in minutes—consistency without the overwhelm.";
  }
  return "Shrink the loop: 1 idea → 1 quick draft → publish → review the first two seconds’ retention. Repeat tomorrow. Consistent, tiny cycles compound faster than perfect plans.";
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Body;

    // If no model configured, return heuristic
    const hasGemini = !!process.env.GOOGLE_API_KEY && typeof geminiTextModel === "function";
    const hasClaude = !!process.env.ANTHROPIC_API_KEY;

    const userBlob = JSON.stringify(body, null, 2);
    const userPrompt = `
Create ONE short tip (3–5 sentences) tailored to THIS person:

${userBlob}

Guidelines:
- Encourage, don't judge.
- Offer concrete next steps they can do this week.
- If they prefer off-camera, suggest voiceover, screen demos, or animation as valid styles.
- No hashtags, no generic “be consistent”.
- Return ONLY the tip text (no markdown, no title).`;

    let tip = "";

    if (hasGemini) {
      try {
        const model = geminiTextModel();
        const resp = await model.generateContent({
          contents: [{ role: "user", parts: [{ text: `${SYSTEM_STYLE}\n\n${userPrompt}` }] }],
          safetySettings: GEMINI_SAFETY,
          generationConfig: { temperature: 0.4, topP: 0.9, maxOutputTokens: 200, responseMimeType: "text/plain" },
        });
        tip = (resp.response?.text?.() || "").trim();
      } catch (e) { /* fall through */ }
    } else if (hasClaude) {
      try {
        const r = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-api-key": process.env.ANTHROPIC_API_KEY as string,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: process.env.CLAUDE_MODEL || "claude-3-haiku-20240307",
            max_tokens: 200,
            temperature: 0.4,
            system: SYSTEM_STYLE,
            messages: [{ role: "user", content: userPrompt }],
          }),
        });
        const j = await r.json();
        tip = (j?.content?.[0]?.text || "").trim();
      } catch (e) { /* fall through */ }
    }

    if (!tip) tip = fallbackTip(body);

    // Clean up whitespace
    tip = tip.replace(/\s+/g, " ").trim();

    return NextResponse.json({ tip });
  } catch (e: any) {
    return NextResponse.json({ tip: fallbackTip({}) });
  }
}