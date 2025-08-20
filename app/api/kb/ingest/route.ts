// app/api/kb/ingest/route.ts
import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { GoogleGenerativeAI } from "@google/generative-ai"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/* -------------------- helpers -------------------- */
function chunkText(s: string, size = 1800, overlap = 250) {
  const out: string[] = []
  if (!s) return out
  if (size <= 0) return [s]

  let i = 0
  const ov = Math.max(0, Math.min(overlap, size - 1))

  while (i < s.length) {
    const end = Math.min(s.length, i + size)
    out.push(s.slice(i, end))
    if (end >= s.length) break
    i = Math.max(0, end - ov)
  }
  return out
}

async function embed(text: string): Promise<number[]> {
  const key = process.env.GOOGLE_API_KEY
  if (!key) throw new Error("Missing GOOGLE_API_KEY")
  const genAI = new GoogleGenerativeAI(key)
  const model = genAI.getGenerativeModel({ model: "text-embedding-004" })
  const res = await model.embedContent({
    content: { role: "user", parts: [{ text }] },
  })
  return res.embedding.values as number[]
}

/* -------------------- POST (ingest) -------------------- */
export async function POST(req: Request) {
  try {
    // IMPORTANT: import the library file directly to avoid the package's test harness.
    // Do NOT import "pdf-parse" (index.js) — it tries to open ./test/data/05-versions-space.pdf.
    // @ts-ignore
    const pdfParse = (await import("pdf-parse/lib/pdf-parse.js")).default as (b: Buffer) => Promise<{ text: string }>

    const form = await req.formData()
    const file = form.get("file") as File | null
    const title = (form.get("title") as string) || "Untitled PDF"
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

    const parsed = await pdfParse(buf)
    const text = (parsed.text || "").trim()
    if (!text) return NextResponse.json({ error: "Empty PDF text" }, { status: 400 })

    const chunks = chunkText(text, 1800, 250)
    const supa = createClient(url, service)

    // 1) Document row
    const { data: doc, error: docErr } = await supa
      .from("kb_documents")
      .insert({ title, source })
      .select()
      .single()
    if (docErr) return NextResponse.json({ error: docErr.message }, { status: 500 })

    // 2) Chunk rows with embeddings
    const rows: Array<{ document_id: string; chunk_idx: number; content: string; embedding: number[] }> = []
    for (let i = 0; i < chunks.length; i++) {
      const content = chunks[i]
      const embedding = await embed(content)
      rows.push({ document_id: doc.id, chunk_idx: i, content, embedding })
    }

    const { error: chunkErr } = await supa.from("kb_chunks").insert(rows)
    if (chunkErr) return NextResponse.json({ error: chunkErr.message }, { status: 500 })

    return NextResponse.json({ ok: true, document_id: doc.id, chunks: rows.length })
  } catch (err: any) {
    // surface the exact error so we can see if anything still references the old path
    return NextResponse.json({ error: err?.message || "Ingest failed" }, { status: 500 })
  }
}

/* -------------------- GET (sanity check) -------------------- */
export async function GET() {
  console.log("✅ NEW /api/kb/ingest GET v3")
  return NextResponse.json({ ok: true, route: "/api/kb/ingest", version: "3" })
}