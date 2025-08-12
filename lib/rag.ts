// lib/rag.ts
import { supabaseServer } from "./supabaseServer"
import { embedOne as embed } from "./gemini"

/** Server-side RAG search (use inside API routes / server components) */
export async function searchKBServer(query: string, limit = 6) {
  try {
    const sb = await supabaseServer()
    const qEmb = await embed(query)

    const { data, error } = await sb.rpc("match_kb_chunks", {
      query_embedding: qEmb,
      match_count: limit,
      similarity_threshold: 0,
    })

    if (error) {
      console.warn("[searchKBServer] supabase rpc error:", error.message)
      return []
    }

    return (data || []) as { content: string; document_id: string; similarity: number }[]
  } catch (err: any) {
    console.warn("[searchKBServer] failed:", err?.message || err)
    return []
  }
}

/**
 * Browser-side shim.
 * Do NOT embed on the client (would expose GOOGLE_API_KEY).
 * If you need client RAG, create a tiny API proxy (e.g. /api/kb/search) that calls searchKBServer.
 */
export async function searchKB(query: string, limit = 6) {
  if (typeof window !== "undefined") {
    console.warn(
      "[searchKB] Called from the browser. For security, use searchKBServer in an API route " +
      "or add a proxy endpoint that calls searchKBServer."
    )
    return []
  }
  // If called from a server context, just delegate.
  return searchKBServer(query, limit)
}

// Optional: re-export a typed single-embed if you still want it here
export { embed }