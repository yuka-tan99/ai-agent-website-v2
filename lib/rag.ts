import { supabaseBrowser } from './supabaseClient'
import { openai } from './openai'
const EMBED_MODEL = 'text-embedding-3-small'
export async function embed(text: string) {
  const res = await openai.embeddings.create({ model: EMBED_MODEL, input: text })
  return res.data[0].embedding
}
export async function searchKB(query: string, limit = 6) {
  const sb = supabaseBrowser()
  const qEmb = await embed(query)
  const { data, error } = await sb.rpc('match_kb_chunks', { query_embedding: qEmb, match_count: limit })
  if (error) throw error
  return data as { content: string; document_id: string; similarity: number }[]
}
