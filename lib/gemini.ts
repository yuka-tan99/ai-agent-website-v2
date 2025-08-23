// lib/gemini.ts
import { GoogleGenerativeAI } from "@google/generative-ai";

export function getGemini() {
  const key = process.env.GOOGLE_API_KEY;
  if (!key) throw new Error("Missing GOOGLE_API_KEY");
  return new GoogleGenerativeAI(key);
}

/** Text model (Gemini 1.5 Pro) */
export function geminiTextModel() {
  return getGemini().getGenerativeModel({ model: "gemini-2.0-flash-lite" });
}

/** Embedding “model” – returned as a GenerativeModel in current SDKs */
export function geminiEmbeddingModel() {
  // The embeddings API is exposed via a GenerativeModel in recent SDKs.
  // We cast to any because the TS types sometimes lag.
  return getGemini().getGenerativeModel({ model: "text-embedding-004" }) as any;
}

/** Single embed helper (handles both string and Content input requirements) */
export async function embedOne(text: string): Promise<number[]> {
  const model = geminiEmbeddingModel();

  try {
    // Some SDK builds accept a plain string:
    const r = await model.embedContent(text);
    return r.embedding.values as number[];
  } catch {
    // Others require a Content object:
    const r = await model.embedContent({
      content: { role: "user", parts: [{ text }] },
    });
    return r.embedding.values as number[];
  }
}

/** Batch embed (uses batch API when available, falls back to per-item) */
export async function embedBatch(texts: string[]): Promise<number[][]> {
  const model = geminiEmbeddingModel();

  // Try fast path first
  if (typeof model.batchEmbedContents === "function") {
    try {
      const res = await model.batchEmbedContents({
        requests: texts.map((t: string) => ({
          content: { role: "user", parts: [{ text: t }] },
        })),
      });
      return res.embeddings.map((e: any) => e.values as number[]);
    } catch {
      // fall through to per-item below
    }
  }

  // Fallback: embed one-by-one
  const out: number[][] = [];
  for (const t of texts) {
    out.push(await embedOne(t));
  }
  return out;
}

/**
 * Safety settings — allow benign marketing/profile outputs.
 * NOTE: enum strings must match API exactly.
 */
export const GEMINI_SAFETY: any = [
  { category: "HARM_CATEGORY_HATE_SPEECH",      threshold: "BLOCK_NONE" },
  { category: "HARM_CATEGORY_HARASSMENT",       threshold: "BLOCK_NONE" },
  { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",threshold: "BLOCK_NONE" },
  { category: "HARM_CATEGORY_DANGEROUS_CONTENT",threshold: "BLOCK_NONE" },
  { category: "HARM_CATEGORY_CIVIC_INTEGRITY",  threshold: "BLOCK_NONE" },
];