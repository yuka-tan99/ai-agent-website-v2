// app/api/report/route.ts
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { supabaseRoute } from "@/lib/supabaseServer";
import { prepareReportInputs, finalizePlan, computeFameBreakdown, coercePlanShape } from "@/lib/reportMapping";
import { generateLayeredPlanSection, finalizeLayeredPlan, generateLayeredPlanPartial } from '@/lib/generateLayeredPlan'
import { mapLegacyPlanToLayersV2 } from '@/lib/mappers/mapLegacyPlanToLayersV2'
import type { LayersV2, PlatformKey } from '@/types/layersV2'
import { retrieveSectionChunks } from '@/lib/rag/retrieve'
import type { ReportSectionId, UserProfile } from '@/types/report'
import { createClient } from '@supabase/supabase-js'
import { callClaudeJSONWithRetry } from "@/lib/claude";

function onboardingComplete(row: any): boolean {
  const claimed = !!(row && row.claimed_at)
  try {
    const a = row?.answers || {}
    const q18 = a?.Q18
    const hasQ18 = q18 != null && (Array.isArray(q18) ? q18.length > 0 : String(q18).length > 0)
    return claimed || hasQ18
  } catch {
    return claimed
  }
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
    const p: any = existing.data?.plan || null
    const ai = p?._ai_sections || 0
    const fb = p?._fallback_sections || 0
    const hasLayers = !!p?.layers_v2
    console.log("[/api/report][GET] user:", user.id, "hasPlan:", !!p, "aiSections:", ai, "fallbackSections:", fb, "layers_v2:", hasLayers);
  }
  // Derive ui_stage on-the-fly if missing (based on onboarding answers). Do not persist here.
  let plan = existing.data?.plan ?? null
  if (plan && !plan.ui_stage) {
    try {
      const ob = await supa
        .from('onboarding_sessions')
        .select('answers')
        .eq('user_id', user.id)
        .maybeSingle()
      const raw = String((ob.data?.answers as any)?.__vars?.stage || '')
      const uiStage = (
        raw === 'starting_from_zero' ? 'starting' :
        raw === 'early_momentum' ? 'early_momentum' :
        raw === 'growing' ? 'growing' :
        raw === 'plateauing' ? 'plateauing' :
        raw === 'large_optimizing' ? 'large_optimizing' :
        raw === 'restart' ? 'restart' : undefined
      )
      if (uiStage) plan = { ...plan, ui_stage: uiStage }
    } catch {}
  }
  return NextResponse.json({ plan });
}

export async function POST(req: NextRequest) {
  const supa = supabaseRoute();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Small helper to record visible progress
  const setProgress = async (phase: string, pct: number) => {
    try {
      await supa.from('report_jobs').upsert({ user_id: user.id, phase, pct, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
      if (process.env.DEBUG_LOG === 'true') console.log(`[/api/report] progress user=${user.id} phase=${phase} pct=${pct}`)
    } catch {}
  }

  try {
    const started = Date.now();
    const body = await req.json().catch(()=> ({}))
    const force = !!body?.force
    const personaOverride = body?.persona

    // gate: if plan exists and not forcing, return it
    if (!force) {
      const existing = await supa
        .from("reports")
        .select("plan")
        .eq("user_id", user.id)
        .maybeSingle();
      if (existing.data?.plan) return NextResponse.json({ plan: existing.data.plan });
    }

    await setProgress('starting', 5)

    // onboarding must be complete
    const ob = await supa
      .from("onboarding_sessions")
      .select("answers, claimed_at")
      .eq("user_id", user.id)
      .maybeSingle();

    if (ob.error) return NextResponse.json({ error: ob.error.message }, { status: 500 });
    if (!onboardingComplete(ob.data)) {
      return NextResponse.json({ error: "Onboarding not complete" }, { status: 400 });
    }

    const persona = personaOverride ?? (ob.data?.answers ?? {});

    // Billing: allow existing plan, otherwise block unpaid (don’t hit LLM)
    try {
      let isPaid = false
      const inv = await supa.from('invoices').select('status').eq('user_id', user.id).maybeSingle()
      isPaid = inv.data?.status === 'paid'
      if (!isPaid) {
        const svcUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
        const svcKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY!
        const admin = createClient(svcUrl, svcKey, { auth: { persistSession: false, autoRefreshToken: false } })
        const pays = (await admin.from('payments').select('id').eq('user_id', user.id).order('id', { ascending: false }).limit(1)).data
        if (Array.isArray(pays) && pays.length) isPaid = true
      }
      if (process.env.DEBUG_LOG === 'true') console.log(`[/api/report][POST] access paid=${isPaid}`)
      if (!isPaid) {
        const existing = await supa.from('reports').select('plan').eq('user_id', user.id).maybeSingle();
        if (existing.data?.plan) return NextResponse.json({ plan: existing.data.plan });
        return NextResponse.json({ error: 'Payment required' }, { status: 402 });
      }
    } catch {}

    const { prompt: basePrompt, fame, answers, seeds } = prepareReportInputs(persona, /* kbText injected later */ '')
    await setProgress('generating_plan', 25)

    // compute “fame” sub-scores immediately (used in aux insights)
    const pctFromAnswers: Record<string, number> = (() => {
      const breakdown = computeFameBreakdown(answers as any)
      const pct: Record<string, number> = { overall: Math.round(fame ?? 0) }
      for (const b of breakdown) pct[b.key] = Math.round(Number(b.percent) || 0)
      return pct
    })()

    // === Legacy baseline plan (kept, compact) ==================================
    // If LLM fails later, we can still map to layers_v2.
    let plan: any = {}
    try {
      const SINGLE_SHOT = false
      const DO_AUX = false

      if (!SINGLE_SHOT) {
        // build a minimal legacy plan (or empty) — you already have this logic;
        // we just keep it very short so it can’t hog tokens
        plan = coercePlanShape({}, seeds, fame)
      }

      // add diagnostics
      plan._gen = { mode: 'plan+aux', model: '(default)' }
      plan.fame_score = fame ?? Math.round(Math.random() * 20 + 40)

      // tiny insights from pctFromAnswers
      plan.fame_breakdown = pctFromAnswers
      plan.fame_section_insights = {
        overall: 'This area can move fast with one repeatable format. Keep changes tiny and daily.',
        consistency: 'Ship 3 small posts weekly; batch drafts on Sunday.',
        camera_comfort: 'Use faceless/voiceover formats while practicing face-on once weekly.',
        planning: 'Define 3 formats; reuse hooks that already worked.',
        tech_comfort: 'Keep edits simple; cut anything that costs >15 min.',
        audience_readiness: 'Clarify who/why in the first sentence.',
        interest_breadth: 'Pick 2 content pillars for 14 days; pause the rest.',
        experimentation: 'Run 1 micro-test per week and log saves/comments.',
      }
    } catch (e) {
      if (process.env.DEBUG_LOG === 'true') console.warn('[/api/report] legacy plan init failed', (e as any)?.message || e)
      plan = {}
    }

    // === Build layers_v2 (NEW: strict per-section, partial upserts) ============
    await setProgress('layers_start', 60)

    // Light profile + RAG snippets (same approach you were using)
    const userId = user.id
    const primaryPlatform = 'instagram' as PlatformKey
    // Derive stage directly from onboarding follower band (Q2)
    let stageBucket: LayersV2['stage'] = '1K-10K'
    try {
      const q2 = (persona as any)?.Q2 || (persona as any)?.__vars?.followers_band || ''
      const v = String(q2 || '').toLowerCase()
      stageBucket = (
        v === 'lt_100' || v === '100_1k' ? '0-1K'
        : v === '1k_10k' ? '1K-10K'
        : v === '10k_50k' ? '10K-100K'
        : v === '50k_plus' ? '100K+'
        : stageBucket
      ) as LayersV2['stage']
    } catch {}
    const personaVars = {
      comfort_with_visibility: 'medium' as const,
      time_availability: 'medium' as const,
      technical_skill: 'medium' as const,
      monetization_urgency: 'medium' as const,
      personality_type: 'creator' as const,
    }
    // Derive biggest blocker directly from user answers (Q3) with a sensible fallback
    let biggestBlocker: LayersV2['biggestBlocker'] = 'fear_of_judgment'
    try {
      const q3 = Array.isArray((persona as any)?.Q3) ? (persona as any).Q3.map((s: any)=> String(s).toLowerCase()) : []
      if (q3.some((s: string)=> /niche|what_to_post|no_niche/.test(s))) biggestBlocker = 'no_niche'
      else if (q3.some((s: string)=> /engage|hook|low_engagement/.test(s))) biggestBlocker = 'low_engagement'
      else if (q3.some((s: string)=> /inconsist|consist|inconsistent/.test(s))) biggestBlocker = 'lack_of_consistency'
      else if (q3.some((s: string)=> /fear|judg/.test(s))) biggestBlocker = 'fear_of_judgment'
    } catch {
      const mainProb = String(plan?.main_problem || '').toLowerCase()
      biggestBlocker = (mainProb.includes('niche') ? 'no_niche'
        : mainProb.includes('engage') ? 'low_engagement'
        : mainProb.includes('consist') ? 'lack_of_consistency' : 'fear_of_judgment') as LayersV2['biggestBlocker']
    }

    // Build concise RAG snippets across all sections tied to user's profile; keep within ~6–7KB
    let ragSnippets = ''
    try {
      // Build a light profile from onboarding to guide retrieval
      const profile: UserProfile = {
        userId,
        stage: ((): any => {
          const s = String(stageBucket)
          if (s === '0-1K' || s === '1K-10K' || s === '10K-100K' || s === '100K+') return s
          return '1K-10K'
        })(),
        brandType: 'personal',
        platforms: ['instagram'],
        blockers: Array.isArray((persona as any)?.Q3) ? (persona as any).Q3.map((v:any)=> String(v)) : [],
        timeAvailability: 'medium',
        comfortWithVisibility: 'medium',
        technicalSkill: 'intermediate',
        monetizationUrgency: 'low',
        goals: Array.isArray((persona as any)?.Q4) ? (persona as any).Q4.map((v:any)=> String(v)) : [],
      }
      const ALL: ReportSectionId[] = ['primary_obstacle_resolution','strategic_foundation','marketing_strategy_development','mental_health_sustainability','content_creation_execution']
      const MAX_PER_SECTION = 2
      const PASSAGE_SLICE = 360
      const OVERALL_CHAR_BUDGET = 6000
      for (const sid of ALL) {
        const chunks = await retrieveSectionChunks(sid, profile, 4)
        if (!chunks?.length) continue
        const block = `\n\n=== ${sid} ===\n` + chunks
          .slice(0, MAX_PER_SECTION)
          .map(c => `(${c.book}) ${String(c.passage || '').slice(0, PASSAGE_SLICE)}`)
          .join('\n')
        if ((ragSnippets + block).length <= OVERALL_CHAR_BUDGET) ragSnippets += block
        else break
      }
    } catch {}

    // Map onboarding stage → compact UI label (requested set)
    const uiStage = (() => {
      try {
        const raw = String((persona as any)?.__vars?.stage || '')
        if (raw === 'starting_from_zero') return 'starting'
        if (raw === 'early_momentum') return 'early_momentum'
        if (raw === 'growing') return 'growing'
        if (raw === 'plateauing') return 'plateauing'
        if (raw === 'large_optimizing') return 'large_optimizing'
        if (raw === 'restart') return 'restart'
      } catch {}
      return undefined
    })()

    // Skeleton to merge into as each section arrives
    let layers_v2: LayersV2 = {
      userName: undefined,
      stage: stageBucket,
      primaryPlatform,
      biggestBlocker,
      personalization: personaVars,
      platformStrategies: {
        instagram: { content_type: 'Visual storytelling (reels + carousels)', posting_frequency: 'Post daily + use Stories', key_metrics: 'Saves, Story replies', growth_hack: 'Carousel hooks; compelling reel covers' },
        tiktok: { content_type: 'Raw, authentic short-form videos', posting_frequency: 'Post 1–3 times daily', key_metrics: 'Completion rate, shares', growth_hack: 'Trend surfing; create original sounds' },
        youtube: { content_type: 'Long-form value + Shorts', posting_frequency: '1–2 long-form/wk + 3–5 Shorts', key_metrics: 'Avg view duration, CTR', growth_hack: 'Series playlists + strong thumbnails' },
      },
      sections: {
        primaryObstacle: { report: { title: '', bullets: [] }, learnMore: { context: '', framework: { name: '', steps: [] } }, elaborate: {} },
        strategicFoundation: { report: { title: '', bullets: [] }, learnMore: { context: '', framework: { name: '', steps: [] } }, elaborate: {} },
        personalBrand: { report: { title: '', bullets: [] }, learnMore: { context: '', framework: { name: '', steps: [] } }, elaborate: {} },
        monetizationPath: { report: { title: '', bullets: [] }, learnMore: { context: '', framework: { name: '', steps: [] } }, elaborate: {} },
        mentalHealth: { report: { title: '', bullets: [] }, learnMore: { context: '', framework: { name: '', steps: [] } }, elaborate: {} },
        successMeasurement: { report: { title: '', bullets: [] }, learnMore: { context: '', framework: { name: '', steps: [] } }, elaborate: {} },
      },
    }

    // Helper to persist partial plan so the UI can render immediately
    const upsertPartial = async () => {
      try {
        await supa
          .from("reports")
          .upsert({ user_id: user.id, plan: { ...(plan || {}), ui_stage: uiStage, layers_v2 } }, { onConflict: "user_id" })
      } catch {}
    }

    // Generate each section with a tiny token budget; save after each
    const order: Array<keyof LayersV2['sections']> = [
      'primaryObstacle','strategicFoundation','personalBrand','monetizationPath','mentalHealth','successMeasurement'
    ]
    let step = 0
    for (const secKey of order) {
      step += 1
      try {
        if (process.env.DEBUG_LOG === 'true') console.log(`[/api/report] layers start section=${secKey}`)
        const part = await generateLayeredPlanSection({
          userName: undefined,
          stage: stageBucket,
          primaryPlatform,
          biggestBlocker,
          personalization: personaVars,
          ragSnippets,
          section: secKey,
        })
        // merge the one section (robust to aliasing from the model)
        const secOut: any = part.sections || {}
        const pick = (k: keyof LayersV2['sections']) => {
          if (secOut[k]) return secOut[k]
          if (k === 'personalBrand') return (secOut as any).personal_brand_development || (secOut as any).personal_brand || (secOut as any).personalBrandDevelopment
          return undefined
        }
        const one = pick(secKey)
        if (one) (layers_v2.sections as any)[secKey] = one
        layers_v2 = finalizeLayeredPlan(layers_v2)
        if (process.env.DEBUG_LOG === 'true') {
          try {
            const r = (layers_v2.sections as any)[secKey]?.report || {}
            const b = Array.isArray(r.bullets) ? r.bullets.length : 0
            console.log(`[/api/report] layers ok section=${secKey} titleLen=${(r.title||'').length} bullets=${b}`)
          } catch {}
        }
        await setProgress(`layers_${secKey}`, 62 + step * 6) // ~62→92
        await upsertPartial()
      } catch (e) {
        console.warn(`[/api/report] layers FAILED section=${secKey}:`, (e as any)?.message || e)
      }
    }

    await setProgress('saving', 94)

    // Final save (layers_v2 already merged; keep legacy plan as metadata)
    const up = await supa
      .from("reports")
      .upsert({ user_id: user.id, plan: { ...(plan || {}), ui_stage: uiStage, layers_v2 } }, { onConflict: "user_id" })
      .select("plan")
      .maybeSingle();

    if (up.error) return NextResponse.json({ error: up.error.message }, { status: 500 });

    await setProgress('done', 100)
    return NextResponse.json({ plan: up.data?.plan ?? { layers_v2 } });
  } catch (err: any) {
    console.error("[/api/report][POST] error", err);
    try {
      const svcUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
      const svcKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY!
      const admin = createClient(svcUrl, svcKey, { auth: { persistSession: false, autoRefreshToken: false } })
      const { data: { user } } = await supabaseRoute().auth.getUser()
      if (user?.id) {
        await admin.from('report_jobs').upsert({ user_id: user.id, phase: 'error', pct: 100, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
      }
    } catch {}
    return NextResponse.json({ error: err?.message || "Failed to generate report" }, { status: 500 });
  }
}
