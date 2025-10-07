// app/api/report/route.ts
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { supabaseRoute } from "@/lib/supabaseServer";
import { prepareReportInputs, finalizePlan, computeFameBreakdown, coercePlanShape } from "@/lib/reportMapping";
import { generateLayeredPlanSection, finalizeLayeredPlan, generateLayeredPlanPartial } from '@/lib/generateLayeredPlan'
import { mapLegacyPlanToLayersV2 } from '@/lib/mappers/mapLegacyPlanToLayersV2'
import type { LayersV2, PlatformKey, PersonalizationVars } from '@/types/layersV2'
import { retrieveSectionChunks } from '@/lib/rag/retrieve'
import type { ReportSectionId, UserProfile } from '@/types/report'
import { createClient } from '@supabase/supabase-js'
import { callClaudeJSONWithRetry } from "@/lib/claude";

function onboardingComplete(row: any): boolean {
  const claimed = !!(row && row.claimed_at)
  try {
    const a = row?.answers || {}
    // Decision-tree (SmartOnboarding) completion signals
    if (a?.__vars?.stage) return true
    if (typeof a?.stage === 'string' && a.stage.trim().length > 0) return true
    const q2 = a?.Q2
    if ((Array.isArray(q2) && q2.length > 0) || (typeof q2 === 'string' && q2)) return true
    if (typeof a?.identity === 'string' && a.identity.trim().length > 0 && Array.isArray(a?.biggest_challenges) && a.biggest_challenges.length > 0) return true
    // Count answered Q* keys
    const qCount = Object.keys(a).filter(k => /^Q\d/.test(k)).filter(k => {
      const v: any = (a as any)[k]
      return Array.isArray(v) ? v.length > 0 : (v != null && String(v).length > 0)
    }).length
    if (qCount >= 4) return true
    // Legacy guard: explicit final question
    const q18 = a?.Q18
    const hasQ18 = q18 != null && (Array.isArray(q18) ? q18.length > 0 : String(q18).length > 0)
    return claimed || hasQ18
  } catch {
    return claimed
  }
}

const platformAliases: Record<string, PlatformKey> = {
  instagram: 'instagram', ig: 'instagram', reels: 'instagram',
  tiktok: 'tiktok', 'tik tok': 'tiktok', tt: 'tiktok',
  youtube: 'youtube', yt: 'youtube', shorts: 'youtube',
}

function derivePrimaryPlatform(persona: any): PlatformKey {
  const candidates: string[] = []
  const pushValue = (value: unknown) => {
    if (!value) return
    if (Array.isArray(value)) {
      value.forEach(v => pushValue(v))
      return
    }
    const str = String(value).toLowerCase().trim()
    if (str) candidates.push(str)
  }
  pushValue(persona?.primary_platform)
  pushValue(persona?.natural_platforms)
  pushValue(persona?.platforms)
  pushValue(persona?.platform_focus)
  for (const raw of candidates) {
    if (platformAliases[raw]) return platformAliases[raw]
    const key = Object.keys(platformAliases).find(alias => raw.includes(alias))
    if (key) return platformAliases[key]
  }
  return 'instagram'
}

function derivePersonalization(persona: any): PersonalizationVars {
  const pick = (...keys: string[]): string => {
    for (const key of keys) {
      const value = (persona ?? {})[key]
      if (Array.isArray(value) && value.length) return String(value[0] ?? '').toLowerCase()
      if (value != null) {
        const str = String(value).toLowerCase().trim()
        if (str) return str
      }
    }
    return ''
  }

  const comfortRaw = pick('visibility_comfort', 'camera', 'camera_comfort', 'cameraComfort')
  const comfort_with_visibility: PersonalizationVars['comfort_with_visibility'] = /(confident|love|comfortable|camera ready)/.test(comfortRaw)
    ? 'high'
    : /(prefer_voice|awkward|shy|low|nervous|not good)/.test(comfortRaw)
      ? 'low'
      : 'medium'

  const timeRaw = pick('time_available', 'timeAvailable', 'time_commitment')
  const time_availability: PersonalizationVars['time_availability'] = /(1|less than|under 3|couple)/.test(timeRaw)
    ? 'low'
    : /(20|30|full|40|daily|12")[^]/.test(timeRaw)
      ? 'high'
      : timeRaw.includes('5-10') || timeRaw.includes('mid') || timeRaw.includes('few')
        ? 'medium'
        : 'medium'

  const techRaw = pick('tech_comfort', 'techComfort', 'platform_confidence', 'platformConfidence', 'tech_skill')
  const technical_skill: PersonalizationVars['technical_skill'] = /(high|expert|confident|comfortable|pro)/.test(techRaw)
    ? 'high'
    : /(low|learning|new|novice|beginner|awkward)/.test(techRaw)
      ? 'low'
      : techRaw.includes('medium') || techRaw.includes('willing')
        ? 'medium'
        : 'medium'

  const monetizationRaw = pick('monetization_approach', 'monetizationUrgency', 'monetization_goal')
  const monetization_urgency: PersonalizationVars['monetization_urgency'] = /(urgent|need|income|now|immediate|replace)/.test(monetizationRaw)
    ? 'high'
    : /(long|later|no rush|experiment|legacy|fun)/.test(monetizationRaw)
      ? 'low'
      : 'medium'

  const identityRaw = pick('identity', 'persona', 'creatingAs', 'brand_type')
  let personality_type: PersonalizationVars['personality_type'] = 'creator'
  if (/business|agency|company|startup/.test(identityRaw)) personality_type = 'business'
  else if (/artist|musician|creative/.test(identityRaw)) personality_type = 'artist'

  return {
    comfort_with_visibility,
    time_availability,
    technical_skill,
    monetization_urgency,
    personality_type,
  }
}

function deriveStageBucket(persona: any, fallback: LayersV2['stage']): LayersV2['stage'] {
  const raw = String(persona?.stage || persona?.growth_stage || '').toLowerCase()
  switch (raw) {
    case 'starting':
    case 'starting_from_zero':
    case 'restart':
      return '0-1K'
    case 'early_momentum':
      return '1K-10K'
    case 'growing':
      return '10K-100K'
    case 'plateauing':
    case 'large_optimizing':
      return '100K+'
    default:
      return fallback
  }
}

function deriveBiggestBlocker(persona: any, fallback: LayersV2['biggestBlocker']): LayersV2['biggestBlocker'] {
  const collect = (...keys: string[]): string[] => {
    const out: string[] = []
    for (const key of keys) {
      const value = (persona ?? {})[key]
      if (Array.isArray(value)) value.forEach(v => out.push(String(v || '').toLowerCase()))
      else if (value) out.push(String(value).toLowerCase())
    }
    return out
  }
  const phrases = collect('biggest_challenges', 'holdingBack', 'stuckReason', 'biggest_blocker', 'pain_points', 'Q3')
  if (phrases.some(p => /niche|what_to_post|direction|clarity|position/.test(p))) return 'no_niche'
  if (phrases.some(p => /engage|engagement|hook|views|reach|audience/.test(p))) return 'low_engagement'
  if (phrases.some(p => /inconsist|consist|routine|schedule|time/.test(p))) return 'lack_of_consistency'
  if (phrases.some(p => /fear|judg|anxiety|confidence|criticism/.test(p))) return 'fear_of_judgment'
  return fallback
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

    if (process.env.DEBUG_LOG === 'true') {
      try {
        const preview = JSON.stringify(persona, null, 2)
        console.log('[\/api/report] onboarding answers payload:', preview?.length ? preview.slice(0, 5000) : preview)
      } catch (err: any) {
        console.log('[\/api/report] onboarding answers payload: <unserializable>', err?.message || err)
      }
    }

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
    const primaryPlatform = derivePrimaryPlatform(persona)
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
    stageBucket = deriveStageBucket(persona, stageBucket)
    const personaVars = derivePersonalization(persona)
    const biggestBlocker: LayersV2['biggestBlocker'] = deriveBiggestBlocker(persona, (() => {
      const mainProb = String(plan?.main_problem || '').toLowerCase()
      if (mainProb.includes('niche')) return 'no_niche'
      if (mainProb.includes('engage')) return 'low_engagement'
      if (mainProb.includes('consist')) return 'lack_of_consistency'
      return 'fear_of_judgment'
    })())

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
    const ALL: ReportSectionId[] = [
      'primary_obstacle_resolution',
      'strategic_foundation',
      'personal_brand_development',
      'marketing_strategy_development',
      'platform_specific_tactics',
      'content_creation_execution',
      'mental_health_sustainability'
    ]
      // Keep RAG compact to avoid LLM truncation and speed up responses
      const MAX_PER_SECTION = 1
      const PASSAGE_SLICE = 280
      const OVERALL_CHAR_BUDGET = 4800
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
        marketingStrategy: { report: { title: '', bullets: [] }, learnMore: { context: '', framework: { name: '', steps: [] } }, elaborate: {} },
        platformTactics: { report: { title: '', bullets: [] }, learnMore: { context: '', framework: { name: '', steps: [] } }, elaborate: {} },
        contentExecution: { report: { title: '', bullets: [] }, learnMore: { context: '', framework: { name: '', steps: [] } }, elaborate: {} },
        mentalHealth: { report: { title: '', bullets: [] }, learnMore: { context: '', framework: { name: '', steps: [] } }, elaborate: {} },
      },
    }

    // Status tracker for logging + UI introspection
    type SectKey = keyof LayersV2['sections']
    const genStatus: Record<string, { report: boolean; learnMore: boolean; elaborate: boolean; t0?: number; t1?: number; ok?: boolean; error?: string }> = {}

    // Helper to persist partial plan so the UI can render immediately
    const upsertPartial = async () => {
      try {
        await supa
          .from("reports")
          .upsert({ user_id: user.id, plan: { ...(plan || {}), ui_stage: uiStage, layers_v2, generation_status: genStatus } }, { onConflict: "user_id" })
      } catch {}
    }

    // Generate each section with a tiny token budget; save after each
    type Section7Key = 'primaryObstacle'|'strategicFoundation'|'personalBrand'|'marketingStrategy'|'platformTactics'|'contentExecution'|'mentalHealth'
    const order: Section7Key[] = [
      'primaryObstacle','strategicFoundation','personalBrand','marketingStrategy','platformTactics','contentExecution','mentalHealth'
    ]
    const CONCURRENCY = 2
    const total = order.length
    let completed = 0

    const processOne = async (secKey: Section7Key) => {
      try {
        genStatus[secKey] = { report: false, learnMore: false, elaborate: false, t0: Date.now() }
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
        const secOut: any = part.sections || {}
        const pick = (k: keyof LayersV2['sections']) => {
          if (secOut[k]) return secOut[k]
          if (k === 'personalBrand') return (secOut as any).personal_brand_development || (secOut as any).personal_brand || (secOut as any).personalBrandDevelopment
          if (k === 'marketingStrategy') return (secOut as any).marketing_strategy || (secOut as any).marketingStrategyDevelopment
          if (k === 'platformTactics') return (secOut as any).platform_specific_tactics || (secOut as any).platformStrategies || (secOut as any).platform_tactics
          if (k === 'contentExecution') return (secOut as any).content_creation_execution || (secOut as any).contentExecution
          return undefined
        }
        const one = pick(secKey)
        if (one) (layers_v2.sections as any)[secKey] = one
        layers_v2 = finalizeLayeredPlan(layers_v2)
        try {
          const grp: any = (layers_v2.sections as any)[secKey] || {}
          const tasks = Array.isArray(grp?.report?.addToYourPlan) && grp.report.addToYourPlan.length ? grp.report.addToYourPlan : grp?.report?.bullets
          const hasReport = Array.isArray(tasks) && tasks.filter((t: any) => typeof t === 'string' && t.trim()).length >= 3
          const hasLearn = typeof grp?.learnMore?.context === 'string' && grp.learnMore.context.trim().length >= 120 && Array.isArray(grp?.learnMore?.framework?.steps) && grp.learnMore.framework.steps.length === 3
          const hasElab = !!(
            (Array.isArray(grp?.elaborate?.advanced) && grp.elaborate.advanced.length > 0) ||
            (Array.isArray(grp?.elaborate?.troubleshooting) && grp.elaborate.troubleshooting.length > 0) ||
            (Array.isArray(grp?.elaborate?.longTerm) && grp.elaborate.longTerm.length > 0)
          )
          Object.assign(genStatus[secKey], { report: hasReport, learnMore: hasLearn, elaborate: hasElab, ok: hasReport && hasLearn, t1: Date.now() })
          if (process.env.DEBUG_LOG === 'true') {
            const ms = (genStatus[secKey].t1! - genStatus[secKey].t0!)
            const preview = Array.isArray(tasks) ? tasks.slice(0, 2).map((t: any) => (typeof t === 'string' ? t.trim().slice(0, 80) : '')).join(' | ') : ''
            console.log(`[/api/report] section=${secKey} ok=${genStatus[secKey].ok} report=${hasReport} learnMore=${hasLearn} elaborate=${hasElab} in ${ms}ms ${preview ? `tasks="${preview}"` : ''}`)
          }
        } catch {}
      } catch (e) {
        console.warn(`[/api/report] layers FAILED section=${secKey}:`, (e as any)?.message || e)
        try { Object.assign(genStatus[secKey], { ok: false, error: String((e as any)?.message || e), t1: Date.now() }) } catch {}
      } finally {
        completed += 1
        const pct = 62 + Math.round((completed / total) * 30) // ~62→92
        await setProgress(`layers_${secKey}`, Math.min(92, pct))
        await upsertPartial()
      }
    }

    // simple batching with fixed concurrency
    for (let i = 0; i < order.length; i += CONCURRENCY) {
      const batch = order.slice(i, i + CONCURRENCY)
      await Promise.allSettled(batch.map((k) => processOne(k)))
    }

    await setProgress('saving', 94)

    // Final save (layers_v2 already merged; keep legacy plan as metadata)
    const up = await supa
      .from("reports")
      .upsert({ user_id: user.id, plan: { ...(plan || {}), ui_stage: uiStage, layers_v2, generation_status: genStatus, generation_finished_at: new Date().toISOString() } }, { onConflict: "user_id" })
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
