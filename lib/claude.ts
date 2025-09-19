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
 * Adds AbortController-based timeout, cleans fenced JSON, and includes a
 * tolerant JSON parser to recover from minor format issues.
 */

function parseJsonLoose<T = any>(input: string): T {
  // Fast path
  try { return JSON.parse(input) as T } catch {}

  let s = input.trim();
  // Replace smart quotes
  s = s.replace(/[\u201C\u201D\u201E\u201F]/g, '"').replace(/[\u2018\u2019]/g, "'");
  // Remove trailing commas before } or ]
  s = s.replace(/,\s*([}\]])/g, '$1');
  // If there is extra text around the JSON, try to slice between first { and last }
  const first = s.indexOf('{');
  const last = s.lastIndexOf('}');
  if (first !== -1 && last !== -1 && last > first) {
    const body = s.slice(first, last + 1);
    try { return JSON.parse(body) as T } catch {}
  }
  // Balance braces/brackets if off-by-a-few (best-effort)
  const openCurl = (s.match(/\{/g) || []).length;
  const closeCurl = (s.match(/\}/g) || []).length;
  if (openCurl > closeCurl) s = s + '}'.repeat(openCurl - closeCurl);
  const openSq = (s.match(/\[/g) || []).length;
  const closeSq = (s.match(/\]/g) || []).length;
  if (openSq > closeSq) s = s + ']'.repeat(openSq - closeSq);
  return JSON.parse(s) as T; // final attempt (may still throw)
}
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

    // If response hit token cap, prefer to signal a specific error so caller can retry with more tokens
    const stopReason = (data?.stop_reason || data?.stopReason || '').toString();
    if (stopReason.toLowerCase() === 'max_tokens') {
      const err: any = new Error('Claude stopped due to max_tokens');
      err.code = 'MAX_TOKENS';
      err.stop = 'MAX_TOKENS';
      throw err;
    }

    // Parse JSON strictly, then with a tolerant fallback
    let parsed: T;
    try {
      parsed = JSON.parse(cleaned) as T;
    } catch (strictErr: any) {
      try {
        parsed = parseJsonLoose<T>(cleaned);
        if (process.env.DEBUG_LOG === 'true') console.warn('[Claude] strict JSON.parse failed; recovered via parseJsonLoose');
      } catch (looseErr: any) {
        const err: any = new Error(`Claude JSON parse failed: ${looseErr?.message || looseErr}`);
        err.code = 'JSON_PARSE';
        throw err;
      }
    }
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
    // Backoff for 429
    const is429 = (e?.code === 429 || e?.status === 429 || /\b429\b/.test(String(e?.message || '')));
    const backoffMs = is429 ? Math.max(800, Math.min(3000, Math.round((e?.retryAfter || 0) * 1000) || 1200)) : 0;
    if (backoffMs) await new Promise(r => setTimeout(r, backoffMs));

    // If we hit token limit or got truncated JSON, increase tokens/timeout; otherwise slightly reduce to be safer
    const isMaxTokens = (e?.code === 'MAX_TOKENS' || /max_tokens/i.test(String(e?.message || '')));
    const isParse = (e?.code === 'JSON_PARSE' || /JSON parse/i.test(String(e?.message || '')) || /Unexpected end of JSON input/i.test(String(e?.message || '')));
    const moreTokens = isMaxTokens || isParse;
    const nextTimeout = moreTokens ? Math.min(120000, (args.timeoutMs || 60000) + 20000) : Math.max(20000, Math.floor((args.timeoutMs || 60000) * 0.75));
    const nextTokens = moreTokens ? Math.min(2400, (args.maxTokens || 1400) + 400) : Math.max(900, (args.maxTokens || 1400) - 300);
    if (process.env.DEBUG_LOG === 'true') {
      console.warn('[Claude] retrying with', { nextTokens, nextTimeout, reason: e?.code || e?.message });
    }
    return await callClaudeJSONWithRetry<T>({ ...args, timeoutMs: nextTimeout, maxTokens: nextTokens }, retries - 1);
  }
}
