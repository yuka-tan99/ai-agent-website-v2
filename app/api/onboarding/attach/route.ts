// app/api/onboarding/attach/route.ts
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function POST(req: NextRequest) {
  try {
    const supa = await supabaseServer();
    const {
      data: { user },
    } = await supa.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

    const { sessionId } = await req.json().catch(() => ({}));
    if (!sessionId) return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });

    // 1) read the session draft
    const { data: sess, error: sessErr } = await supa
      .from("onboarding_sessions")
      .select("answers, links")
      .eq("id", sessionId)
      .maybeSingle();
    if (sessErr) throw sessErr;

    const answers = sess?.answers ?? {};
    const links = Array.isArray(sess?.links) ? sess?.links : [];

    // 2) upsert into the per-user onboarding table and mark completed
    const { data: ob, error: obErr } = await supa
      .from("onboarding")
      .upsert(
        {
          user_id: user.id,
          answers,
          links,
          completed_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      )
      .select("user_id")
      .maybeSingle();
    if (obErr) throw obErr;

    return NextResponse.json({ ok: true, user_id: ob?.user_id });
  } catch (e: any) {
    console.error("attach error", e);
    return NextResponse.json({ error: e?.message || "Attach failed" }, { status: 500 });
  }
}