// lib/gemini.ts
import { GoogleGenerativeAI } from "@google/generative-ai";

export function getGemini() {
  const key = process.env.GOOGLE_API_KEY;
  if (!key) throw new Error("Missing GOOGLE_API_KEY");
  return new GoogleGenerativeAI(key);
}

/**
 * Text generative model (Gemini 1.5 Pro).
 */
export function geminiTextModel() {
  return getGemini().getGenerativeModel({ model: "gemini-1.5-pro" });
}

/**
 * Embedding model (text-embedding-004).
 */
export function geminiEmbeddingModel() {
  return getGemini().getGenerativeModel({ model: "text-embedding-004" });
}

/**
 * Safety settings — allow benign marketing/profile outputs.
 * NOTE: enum strings must match API exactly.
 */
export const GEMINI_SAFETY: any = [
  { category: "HARM_CATEGORY_HATE_SPEECH",        threshold: "BLOCK_NONE" },
  { category: "HARM_CATEGORY_HARASSMENT",          threshold: "BLOCK_NONE" },
  { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",   threshold: "BLOCK_NONE" },
  { category: "HARM_CATEGORY_DANGEROUS_CONTENT",   threshold: "BLOCK_NONE" },
  { category: "HARM_CATEGORY_CIVIC_INTEGRITY",     threshold: "BLOCK_NONE" },
];