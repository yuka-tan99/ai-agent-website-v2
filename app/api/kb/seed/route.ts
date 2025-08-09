import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { openai } from '@/lib/openai'
const EMBED_MODEL = 'text-embedding-3-small'
async function embed(text: string) { const r = await openai.embeddings.create({ model: EMBED_MODEL, input: text }); return r.data[0].embedding }
const docs = [
  { title: 'TikTok Best Practices', content: `Hooks under 3s, tight captions, native edits. Post 1-3x/day. Use cutaways, on-screen text, trending sounds when relevant.` },
  { title: 'Instagram Growth Basics', content: `Reels > static for discovery. Carousels for saves. Strong cover text. Mix Stories for community and Reels for reach.` },
  { title: 'YouTube Shorts System', content: `Thumbnail in first frame, clear topic, fast pacing. Tell a single idea. Use pinned comments for CTA.` },
  { title: 'Creator On-Camera Tips', content: `Eye level framing, natural light, loudness -14 LUFS. Script hooks: curiosity gap, contrary takes, step-by-step.` },
  { title: 'Engagement Loops', content: `Ask for comments with specific prompts. Reply to comments with content. End with an open loop.` },
]
export async function POST() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string
  const service = process.env.SUPABASE_SERVICE_KEY as string
  if (!url || !service) return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
  const supa = createClient(url, service)
  for (const d of docs) {
    const { data: docRow, error: docErr } = await supa.from('kb_documents').insert({ title: d.title, source: 'seed' }).select().single()
    if (docErr) return NextResponse.json({ error: docErr.message }, { status: 500 })
    const emb = await embed(d.content)
    const { error: chunkErr } = await supa.from('kb_chunks').insert({ document_id: docRow.id, chunk_idx: 0, content: d.content, embedding: emb })
    if (chunkErr) return NextResponse.json({ error: chunkErr.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true, inserted: docs.length })
}
