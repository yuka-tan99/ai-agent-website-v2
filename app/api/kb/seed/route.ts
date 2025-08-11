import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { GoogleGenerativeAI } from '@google/generative-ai'

const GEMINI_EMBED_MODEL = 'text-embedding-004'

const docs = [
  { title: 'TikTok Best Practices', content: `Hooks under 3s, tight captions, native edits. Post 1-3x/day. Use cutaways, on-screen text, trending sounds when relevant.` },
  { title: 'Instagram Growth Basics', content: `Reels > static for discovery. Carousels for saves. Strong cover text. Mix Stories for community and Reels for reach.` },
  { title: 'YouTube Shorts System', content: `Thumbnail in first frame, clear topic, fast pacing. Tell a single idea. Use pinned comments for CTA.` },
  { title: 'Creator On-Camera Tips', content: `Eye level framing, natural light, loudness -14 LUFS. Script hooks: curiosity gap, contrary takes, step-by-step.` },
  { title: 'Engagement Loops', content: `Ask for comments with specific prompts. Reply to comments with content. End with an open loop.` },
]

// ---- Gemini embed helper (returns number[] of length 768)
async function embed(text: string): Promise<number[]> {
  const apiKey = process.env.GOOGLE_API_KEY
  if (!apiKey) throw new Error('Missing GOOGLE_API_KEY')

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: GEMINI_EMBED_MODEL })

  const res = await model.embedContent({ content: { parts: [{ text }] } })
  return res.embedding.values
}

export async function POST() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string
    const service = process.env.SUPABASE_SERVICE_KEY as string
    if (!url || !service) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
    }
    const supa = createClient(url, service)

    for (const d of docs) {
      // insert document row
      const { data: docRow, error: docErr } = await supa
        .from('kb_documents')
        .insert({ title: d.title, source: 'seed' })
        .select()
        .single()
      if (docErr) return NextResponse.json({ error: docErr.message }, { status: 500 })

      // embed content with Gemini
      const emb = await embed(d.content) // -> number[768]

      // insert single chunk (idx 0)
      const { error: chunkErr } = await supa
        .from('kb_chunks')
        .insert({
          document_id: docRow.id,
          chunk_idx: 0,
          content: d.content,
          embedding: emb,
        })
      if (chunkErr) return NextResponse.json({ error: chunkErr.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, inserted: docs.length })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Seed failed' }, { status: 500 })
  }
}