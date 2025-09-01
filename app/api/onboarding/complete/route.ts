// app/api/onboarding/complete/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function POST(req: NextRequest) {
  try {
    const supa = await supabaseServer();
    const { data: { user } } = await supa.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

    const { sessionId, answers = {}, links = [] } = await req.json();

    if (!sessionId || typeof sessionId !== "string") {
      return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
    }

    // Mark the session as completed by saving answers (and links). Use `id` (PK) per schema.
    const { error } = await supa.from("onboarding_sessions").upsert(
      {
        id: sessionId,          // <-- primary key in your table
        user_id: user.id,
        answers,
        links,
        // Optional: mark the moment the user finished
        claimed_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

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