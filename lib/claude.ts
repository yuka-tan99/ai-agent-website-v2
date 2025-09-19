export const SONNET4_ID = "claude-3-7-sonnet-20250219"; // Anthropic Sonnet 4
const DEFAULT_MODEL = process.env.ANTHROPIC_MODEL || SONNET4_ID; // env can still override

type ClaudeArgs = {
  apiKey?: string;
  prompt: string;
  model?: string;      // allow override per-call
  timeoutMs?: number;  // hard cap so we never hang
  maxTokens?: number;  // cap output to reduce latency
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
  maxTokens = 1400,
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
        max_tokens: maxTokens,
        temperature: 0.4,
        system: "Return JSON only. No prose outside JSON. Keep it concise, clear, and actionable.",
        messages: [{ role: "user", content: prompt }],
      }),
      signal: ctl.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      const retryAfter = Number(res.headers.get('retry-after') || '0') || 0;
      const err: any = new Error(`Claude error ${res.status}: ${text || res.statusText}`);
      (err.code as any) = res.status;
      (err.status as any) = res.status;
      (err.retryAfter as any) = retryAfter;
      throw err;
    }

    const data = await res.json();
    const text = (data?.content?.[0]?.text ?? "").toString();

    // Strip off any ```json fences
    const cleaned = text
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```$/i, "");

    // Optional debug logging of raw content (truncated)
    if (process.env.DEBUG_LOG === 'true') {
      const preview = cleaned.slice(0, 220).replace(/[\n\r\t]+/g, ' ').trim();
      console.log(`[Claude] model=${_model} took ${Date.now() - _t0}ms, len=${cleaned.length}, preview=`, preview);
    }

    // Parse JSON + log timing
    const parsed = JSON.parse(cleaned) as T;
    if (process.env.NODE_ENV !== "production") {
      console.log(`[Claude] model=${_model} responded in ${Date.now() - _t0}ms`);
    }
    return parsed;
  } catch (e: any) {
    if (process.env.DEBUG_LOG === 'true') {
      console.warn('[Claude] parse/fetch error:', e?.message || e);
    }
    throw new Error(`Claude returned non-JSON or failed: ${e?.message || e}`);
  } finally {
    clearTimeout(timer);
  }
}

export async function callClaudeJSONWithRetry<T = any>(args: ClaudeArgs, retries = 1): Promise<T> {
  try {
    return await callClaudeJSON<T>(args);
  } catch (e: any) {
    if (retries <= 0) throw e;
    // Respect rate limit 429 with a short backoff
    const is429 = (e?.code === 429 || e?.status === 429 || /\b429\b/.test(String(e?.message || '')));
    const backoffMs = is429 ? Math.max(800, Math.min(3000, Math.round((e?.retryAfter || 0) * 1000) || 1200)) : 0;
    if (backoffMs) await new Promise(r => setTimeout(r, backoffMs));
    const t = Math.max(20000, Math.floor((args.timeoutMs || 60000) * 0.75));
    const smaller = Math.max(900, (args.maxTokens || 1400) - 300);
    return await callClaudeJSONWithRetry<T>({ ...args, timeoutMs: t, maxTokens: smaller }, retries - 1);
  }
}
