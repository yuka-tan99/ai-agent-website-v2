import { supabaseBrowser } from './supabaseClient'
import { geminiEmbeddings } from './gemini'

// Gemini embeddings -> 768-dim
export async function embed(text: string) {
  const res = await geminiEmbeddings.embedContent({
    content: {
      role: "user", // ✅ required by Gemini SDK
      parts: [{ text }]
    }
  })
  return res.embedding.values // number[]
}

export async function searchKB(query: string, limit = 6) {
  const sb = supabaseBrowser()
  const qEmb = await embed(query)
  const { data, error } = await sb.rpc('match_kb_chunks', {
    query_embedding: qEmb,
    match_count: limit,
    similarity_threshold: 0
  })
  if (error) throw error
  return data as { content: string; document_id: string; similarity: number }[]
}