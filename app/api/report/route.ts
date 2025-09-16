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
    async function setProgress(phase: string, pct: number) {
      try {
        await supa.from('report_jobs').upsert({ user_id: user.id, phase, pct, updated_at: new Date().toISOString() })
      } catch {}
    }

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

    await setProgress('starting', 5)
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

    await setProgress('generating_plan', 30)
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

    let plan = finalizePlan(raw, answers, fame);

    // Add a one-time, thorough fame assessment paragraph based on onboarding + breakdown
    await setProgress('assessment', 55)
    try {
      const breakdown = Array.isArray(plan.fame_breakdown) ? plan.fame_breakdown : []
      const pct: Record<string, number> = {
        overall: Math.round(plan.fame_score ?? 0),
      }
      for (const b of breakdown) pct[b.key] = Math.round(Number(b.percent) || 0)
      const assess = await callClaudeJSONWithRetry<{ assessment: string }>({
        prompt: `You are Marketing Mentor, a social media growth expert. Return JSON only.\n\nWrite ONE thorough paragraph titled 'assessment' (3–7 sentences) that explains the creator's current strengths and weaknesses and the biggest opportunities ahead. Be encouraging and helpful with no fluff. Use the percentages as directional signals, not verdicts. Include 1–2 specific next steps.\n\nPERCENTAGES:\n${JSON.stringify(pct, null, 2)}\n\nONBOARDING_ANSWERS:\n${JSON.stringify(answers, null, 2)}\n\nOUTPUT:\n{"assessment":"..."}`,
        timeoutMs: 45000,
        maxTokens: 500,
      }, 1)
      if (assess && typeof assess.assessment === 'string') {
        (plan as any).fame_assessment = assess.assessment
      }
    } catch {
      // simple fallback so UI never blocks
      const overall = Math.round(plan.fame_score ?? 0)
      ;(plan as any).fame_assessment = `You have solid raw potential (around ${overall}%). Lean on your strongest habits and formats, and shore up the weakest link in your weekly workflow. Keep your scope narrow for two weeks, post on a steady cadence, and run one small experiment per post. This combination compounds quickly.`
    }

    // Per-section insights to show under each section on Fame Insights page
    await setProgress('insights', 75)
    try {
      const breakdown = Array.isArray(plan.fame_breakdown) ? plan.fame_breakdown : []
      const pct: Record<string, number> = {
        overall: Math.round(plan.fame_score ?? 0),
      }
      for (const b of breakdown) pct[b.key] = Math.round(Number(b.percent) || 0)
      const insight = await callClaudeJSONWithRetry<Record<string, string>>({
        prompt: `You are Marketing Mentor. Return JSON only.\n\nWrite one concise but thorough paragraph (3–5 sentences) for EACH of these keys explaining what the user's onboarding answers suggest and the top opportunity to improve that dimension. Encouraging, specific, no fluff.\nKeys: overall, consistency, camera_comfort, planning, tech_comfort, audience_readiness, interest_breadth, experimentation.\n\nPERCENTAGES:\n${JSON.stringify(pct, null, 2)}\n\nONBOARDING_ANSWERS:\n${JSON.stringify(answers, null, 2)}\n\nOUTPUT (flat object with those exact keys):\n{"overall":"","consistency":"","camera_comfort":"","planning":"","tech_comfort":"","audience_readiness":"","interest_breadth":"","experimentation":""}`,
        timeoutMs: 50000,
        maxTokens: 900,
      }, 1)
      if (insight && typeof insight === 'object') {
        (plan as any).fame_section_insights = insight
      }
    } catch {
      const mk = (k: string) => `This area can move fast with one small weekly ritual focused on ${k.replace(/_/g,' ')}. Keep changes tiny and measurable for the next 14 days to build momentum.`
      ;(plan as any).fame_section_insights = {
        overall: mk('overall execution'),
        consistency: mk('consistency'),
        camera_comfort: mk('on‑camera comfort'),
        planning: mk('planning and batching'),
        tech_comfort: mk('tooling and editing'),
        audience_readiness: mk('audience clarity'),
        interest_breadth: mk('topic focus'),
        experimentation: mk('experimentation'),
      }
    }

    await setProgress('saving', 92)
    const up = await supa
      .from("reports")
      .upsert({ user_id: user.id, plan }, { onConflict: "user_id" })
      .select("plan")
      .maybeSingle();

    if (process.env.DEBUG_LOG === 'true') {
      console.log("[/api/report][POST] upsert:", up.error ? up.error.message : 'ok', "durationMs:", Date.now() - started);
    }
    if (up.error) return NextResponse.json({ error: up.error.message }, { status: 500 });
    await setProgress('done', 100)
    return NextResponse.json({ plan: up.data?.plan ?? plan });
  } catch (err: any) {
    console.error("[/api/report][POST] error", err);
    return NextResponse.json({ error: err?.message || "Failed to generate report" }, { status: 500 });
  }
}
