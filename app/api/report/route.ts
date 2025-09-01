// app/api/report/route.ts
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { supabaseRoute } from "@/lib/supabaseServer";
import { prepareReportInputs, finalizePlan } from "@/lib/reportMapping";
import { callClaudeJSONWithRetry } from "@/lib/claude";

function onboardingComplete(row: any): boolean {
  if (!row) return false;
  if (row.claimed_at) return true;
  try { return Object.keys(row.answers || {}).length >= 3; } catch { return false; }
}

export async function GET() {
  const supa = supabaseRoute();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await supa
    .from("reports")
    .select("plan")
    .eq("user_id", user.id)
    .maybeSingle();
  if (existing.error) return NextResponse.json({ error: existing.error.message }, { status: 500 });
  if (process.env.DEBUG_LOG === 'true') {
    console.log("[/api/report][GET] user:", user.id, "hasPlan:", !!existing.data?.plan);
  }
  return NextResponse.json({ plan: existing.data?.plan ?? null });
}

export async function POST(req: NextRequest) {
  try {
    const started = Date.now();
    const supa = supabaseRoute();
    const { data: { user } } = await supa.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({} as any));
    const { persona: personaOverride, kbText = "", force = true, model } = body;
    if (process.env.DEBUG_LOG === 'true') {
      console.log("[/api/report][POST] user:", user.id, "force:", !!force, "model:", model || '(default)', "personaOverride:", !!personaOverride);
    }

    // if plan already exists and not forcing, return it
    if (!force) {
      const existing = await supa
        .from("reports")
        .select("plan")
        .eq("user_id", user.id)
        .maybeSingle();
      if (existing.data?.plan) return NextResponse.json({ plan: existing.data.plan });
    }

    // fetch onboarding answers
    const ob = await supa
      .from("onboarding_sessions")
      .select("answers, claimed_at")
      .eq("user_id", user.id)
      .maybeSingle();

    if (ob.error) return NextResponse.json({ error: ob.error.message }, { status: 500 });
    const obComplete = onboardingComplete(ob.data);
    if (process.env.DEBUG_LOG === 'true') {
      console.log("[/api/report][POST] onboardingComplete:", obComplete);
    }
    if (!obComplete) {
      return NextResponse.json({ error: "Onboarding not complete" }, { status: 400 });
    }

    const persona = personaOverride ?? (ob.data?.answers ?? {});
    const { prompt, fame, answers } = prepareReportInputs(persona, kbText);

    // Sonnet-4 is now default in callClaudeJSON; pass model only if you want to override
    let raw: any;
    try {
      raw = await callClaudeJSONWithRetry<any>({
        prompt,
        model,                // optional; omit to use DEFAULT_MODEL
        timeoutMs: 60_000,
        maxTokens: 1400,
      }, 1);
      if (process.env.DEBUG_LOG === 'true') console.log("[/api/report][POST] LLM ok");
    } catch (e: any) {
      console.warn("[/api/report][POST] LLM failed:", e?.message || e);
      raw = {}; // finalizePlan will fill sensible defaults from answers/fame
    }

    const plan = finalizePlan(raw, answers, fame);

    const up = await supa
      .from("reports")
      .upsert({ user_id: user.id, plan }, { onConflict: "user_id" })
      .select("plan")
      .maybeSingle();

    if (process.env.DEBUG_LOG === 'true') {
      console.log("[/api/report][POST] upsert:", up.error ? up.error.message : 'ok', "durationMs:", Date.now() - started);
    }
    if (up.error) return NextResponse.json({ error: up.error.message }, { status: 500 });
    return NextResponse.json({ plan: up.data?.plan ?? plan });
  } catch (err: any) {
    console.error("[/api/report][POST] error", err);
    return NextResponse.json({ error: err?.message || "Failed to generate report" }, { status: 500 });
  }
}
