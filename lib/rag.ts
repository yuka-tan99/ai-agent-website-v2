// lib/rag.ts
import { supabaseBrowser } from "./supabaseClient";
import { geminiEmbeddingModel } from "./gemini";

export async function embed(text: string) {
  const model = geminiEmbeddingModel();
  const res = await model.embedContent({
    // role is required for Content in some SDK versions
    content: { role: "user", parts: [{ text }] },
  });
  return res.embedding.values as number[];
}

export async function searchKB(query: string, limit = 6) {
  const sb = supabaseBrowser();
  const qEmb = await embed(query);
  const { data, error } = await sb.rpc("match_kb_chunks", {
    query_embedding: qEmb,
    match_count: limit,
    similarity_threshold: 0,
  });
  if (error) throw error;
  return data as { content: string; document_id: string; similarity: number }[];
}