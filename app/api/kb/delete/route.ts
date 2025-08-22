import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { title } = await req.json();
    if (!title) return NextResponse.json({ error: "Missing title" }, { status: 400 });

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.SUPABASE_SERVICE_KEY!;
    const supa = createClient(url, key);

    // find matching docs
    const { data: docs, error } = await supa
      .from("kb_documents")
      .select("id,title")
      .ilike("title", title); // accepts exact or case-insensitive

    if (error) throw error;
    if (!docs?.length) return NextResponse.json({ ok: true, removed: 0 });

    // delete chunks first (safe if no CASCADE)
    const ids = docs.map(d => d.id);
    const { error: delChunksErr } = await supa.from("kb_chunks").delete().in("document_id", ids);
    if (delChunksErr) throw delChunksErr;

    const { error: delDocsErr } = await supa.from("kb_documents").delete().in("id", ids);
    if (delDocsErr) throw delDocsErr;

    return NextResponse.json({ ok: true, removed: ids.length });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Delete failed" }, { status: 500 });
  }
}