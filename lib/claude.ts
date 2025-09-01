export const SONNET4_ID = "claude-3-7-sonnet-20250219"; // Anthropic Sonnet 4
const DEFAULT_MODEL = process.env.ANTHROPIC_MODEL || SONNET4_ID; // env can still override

type ClaudeArgs = {
  apiKey?: string;
  prompt: string;
  model?: string;      // allow override per-call
  timeoutMs?: number;  // hard cap so we never hang
};

/**
 * Calls Claude and returns parsed JSON (or throws with a readable message).
 * Adds AbortController-based timeout and cleans fenced JSON.
 */
export async function callClaudeJSON<T = any>({
  apiKey,
  prompt,
  model,
  timeoutMs = 60000,
}: ClaudeArgs): Promise<T> {
  const key = apiKey || process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("Missing ANTHROPIC_API_KEY");

  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);

  const _model = model || DEFAULT_MODEL;
  const _t0 = Date.now();

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: _model,
        max_tokens: 2000,
        temperature: 0.4,
        system: "Return JSON only. No prose outside JSON. Keep it concise, clear, and actionable.",
        messages: [{ role: "user", content: prompt }],
      }),
      signal: ctl.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Claude error ${res.status}: ${text || res.statusText}`);
    }

    const data = await res.json();
    const text = (data?.content?.[0]?.text ?? "").toString();

    // Strip off any ```json fences
    const cleaned = text
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```$/i, "");

    // Parse JSON + log timing
    const parsed = JSON.parse(cleaned) as T;
    if (process.env.NODE_ENV !== "production") {
      console.log(
        `[Claude] model=${_model} responded in ${Date.now() - _t0}ms`
      );
    }
    return parsed;
  } catch (e: any) {
    throw new Error(`Claude returned non-JSON or failed: ${e?.message || e}`);
  } finally {
    clearTimeout(timer);
  }
}