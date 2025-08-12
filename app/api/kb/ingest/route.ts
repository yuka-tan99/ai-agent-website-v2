import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { GoogleGenerativeAI } from "@google/generative-ai"

// Run on Node (pdf-parse needs Node APIs)
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// simple char-based chunker
function chunkText(s: string, size = 1800, overlap = 250) {
  const out: string[] = []
  if (!s) return out
  if (size <= 0) return [s]

  let i = 0
  const ov = Math.max(0, Math.min(overlap, size - 1)) // keep overlap < size

  while (i < s.length) {
    const end = Math.min(s.length, i + size)
    out.push(s.slice(i, end))
    if (end >= s.length) break                // ✅ stop after last chunk
    i = Math.max(0, end - ov)                 // ✅ move window forward
  }
  return out
}

// ---- embeddings with Gemini text-embedding-004
async function embed(text: string): Promise<number[]> {
  const key = process.env.GOOGLE_API_KEY
  if (!key) throw new Error("Missing GOOGLE_API_KEY")
  const genAI = new GoogleGenerativeAI(key)
  // embeddings model is exposed as a generative model; call .embedContent on it
  const model = genAI.getGenerativeModel({ model: "text-embedding-004" })
  const res = await model.embedContent({
    content: { role: "user", parts: [{ text }] },
  })
  return res.embedding.values as number[]
}

export async function POST(req: Request) {
  try {
    // ✅ import the actual function implementation to avoid ENOENT test file issue
const pdfParse = (await import('pdf-parse')).default; 

    const form = await req.formData()
    const file = form.get("file") as File | null
    const title = (form.get("title") as string) || "book_1.pdf"
    const source = (form.get("source") as string) || "upload"
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 })

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string
    const service = process.env.SUPABASE_SERVICE_KEY as string
    if (!url || !service) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 500 })
    }

    const ab = await file.arrayBuffer()
    const buf = Buffer.from(ab)
    if (!buf.byteLength) {
      return NextResponse.json({ error: "Uploaded file is empty" }, { status: 400 })
    }

    const parsed = await pdfParse(buf)               // ✅ pass Buffer to the function
    const text = (parsed.text || "").trim()
    if (!text) return NextResponse.json({ error: "Empty PDF text" }, { status: 400 })

    const chunks = chunkText(text, 1800, 250)
    const supa = createClient(url, service)

    // 1) create document row
    const { data: doc, error: docErr } = await supa
      .from("kb_documents")
      .insert({ title, source })
      .select()
      .single()
    if (docErr) return NextResponse.json({ error: docErr.message }, { status: 500 })

    // 2) embed + insert chunk rows
    const rows: Array<{
      document_id: string
      chunk_idx: number
      content: string
      embedding: number[]
    }> = []

    for (let i = 0; i < chunks.length; i++) {
      const content = chunks[i]
      const embedding = await embed(content)
      rows.push({ document_id: doc.id, chunk_idx: i, content, embedding })
    }

    const { error: chunkErr } = await supa.from("kb_chunks").insert(rows)
    if (chunkErr) return NextResponse.json({ error: chunkErr.message }, { status: 500 })

    return NextResponse.json({ ok: true, document_id: doc.id, chunks: rows.length })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Ingest failed" }, { status: 500 })
  }
}

// Simple GET so you can prove the route is mounted
export async function GET() {
  return NextResponse.json({ ok: true, route: "/api/kb/ingest" })
}