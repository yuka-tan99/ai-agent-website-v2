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
    if (!user) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }

    const { sessionId, answers = {}, links = [] } = await req.json();

    if (!sessionId) {
      return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
    }

    // Ensure a row exists for this session id
    // (your /api/onboarding/save already creates it, but this is harmless)
    await supa
      .from("onboarding_sessions")
      .upsert(
        {
          id: sessionId,
          user_id: user.id,
          answers,
          links,
          claimed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );

    // Make sure it’s attached to the user even if the row already existed
    const { error } = await supa
      .from("onboarding_sessions")
      .update({
        user_id: user.id,
        answers,
        links,
        claimed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", sessionId);

    if (error) {
      console.error("complete upsert error", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("onboarding/complete error", e);
    return NextResponse.json({ error: e?.message || "Failed to complete onboarding" }, { status: 500 });
  }
}