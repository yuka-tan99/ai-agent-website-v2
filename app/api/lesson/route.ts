import { NextResponse } from 'next/server'
import { supabaseRoute } from '@/lib/supabaseServer'
import { generateLesson, generateElaborateLesson, normalizeLessonPack } from '@/lib/agent/orchestrator'
import { ReportSectionId, UserProfile } from '@/types/report'

function toProfile(userId: string, ob: any): UserProfile {
  const v = (ob?.__vars || {}) as any
  const answers = ob || {}
  const stage = (v.stage || 'starting_from_zero') as UserProfile['stage']
  const brandType = (() => {
    const id = String(v.identity || '').toLowerCase()
    if (id.includes('business')) return 'business'
    if (id.includes('artist')) return 'artist_luxury'
    if (id.includes('personal')) return 'personal'
    return 'not_sure'
  })() as UserProfile['brandType']
  const platforms: UserProfile['platforms'] = (() => {
    const out: UserProfile['platforms'] = []
    if (v.platform_pref_tiktok) out.push('tiktok')
    if (v.platform_pref_instagram) out.push('instagram')
    if (v.platform_pref_youtube) out.push('youtube')
    if (v.platform_pref_twitter) out.push('twitter')
    if (v.platform_pref_linkedin) out.push('linkedin')
    return out.length ? out : (['tiktok','instagram'] as const)
  })()
  const blockers: string[] = Array.isArray(answers.Q3) ? answers.Q3 : []
  const timeAvailability = (() => {
    const t = String(v.time_mode || '')
    if (/pro_daily|team/.test(t)) return 'high'
    if (/micro_daily/.test(t)) return 'medium'
    return 'low'
  })() as UserProfile['timeAvailability']
  const comfortWithVisibility = (() => {
    const vis = String(v.visibility || '')
    if (/face_on/.test(vis)) return 'high'
    if (/faceless/.test(vis) || /voiceover/.test(vis)) return 'low'
    return 'medium'
  })() as UserProfile['comfortWithVisibility']
  const technicalSkill: UserProfile['technicalSkill'] = 'intermediate'
  const monetizationUrgency = (v.monetization_urgency || 'low') as UserProfile['monetizationUrgency']
  const goals: string[] = Array.isArray(answers.Q4) ? answers.Q4 : []
  return {
    userId,
    stage,
    brandType,
    platforms,
    blockers,
    timeAvailability,
    comfortWithVisibility,
    technicalSkill,
    monetizationUrgency,
    goals,
  }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const section = (url.searchParams.get('section') || '') as ReportSectionId
    const depthParam = (url.searchParams.get('depth') || '2').trim()
    const depth = depthParam === '3' ? 3 : 2
    if (!section) return NextResponse.json({ error: 'missing section' }, { status: 400 })

    const supa = supabaseRoute()
    const { data: { user } } = await supa.auth.getUser()
    if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    if (process.env.DEBUG_LOG === 'true') console.log('[lesson] start user=', user.id, 'section=', section)

    const { data: ob } = await supa
      .from('onboarding_sessions')
      .select('answers')
      .eq('user_id', user.id)
      .maybeSingle()

    // Check cached lesson first (depth-aware)
    const existing = await supa
      .from('reports')
      .select('plan')
      .eq('user_id', user.id)
      .maybeSingle()
    const prior: any = existing?.data?.plan || null
    if (depth === 2) {
      const cached2 = prior && prior.lessons && prior.lessons[section]
      if (cached2) {
        if (process.env.DEBUG_LOG === 'true') console.log('[lesson] returning cached depth=2 for', section)
        return NextResponse.json({ lesson: normalizeLessonPack(cached2, 2, section) })
      }
    } else {
      const cached3 = prior && prior.lessons_mastery && prior.lessons_mastery[section]
      if (cached3) {
        if (process.env.DEBUG_LOG === 'true') console.log('[lesson] returning cached depth=3 for', section)
        return NextResponse.json({ lesson: normalizeLessonPack(cached3, 3, section) })
      }
    }

    // Enforce payment before generating new lessons; allow if payments table shows success
    {
      const { data: pay } = await supa
        .from('onboarding_sessions')
        .select('purchase_status')
        .eq('user_id', user.id)
        .maybeSingle()
      let isPaid = pay?.purchase_status === 'paid'
      if (process.env.NEXT_PUBLIC_DEV_BYPASS_PLAN === 'true') isPaid = true
      if (!isPaid) {
        const { data: pays } = await supa
          .from('payments')
          .select('id,status,product_key')
          .eq('user_id', user.id)
          .eq('product_key', 'plan')
          .eq('status', 'succeeded')
          .order('id', { ascending: false })
          .limit(1)
        if (Array.isArray(pays) && pays.length) isPaid = true
      }
      if (!isPaid) {
        if (process.env.DEBUG_LOG === 'true') console.log('[lesson] unpaid → 402')
        return NextResponse.json({ error: 'Payment required' }, { status: 402 })
      }
    }

    const profile = toProfile(user.id, ob?.answers || {})
    if (process.env.DEBUG_LOG === 'true') console.log('[lesson] generating… depth=', depth)
    let lesson: any = null;
    try {
      lesson = depth === 3 ? await generateElaborateLesson(section, profile) : await generateLesson(section, profile);
    } catch (e: any) {
      if (process.env.DEBUG_LOG === 'true') console.warn('[lesson] generation failed; depth=', depth, '→ fallback if 3:', e?.message || e);
      if (depth === 3) {
        lesson = await generateLesson(section, profile);
      } else {
        throw e;
      }
    }

    // Persist into plan.lessons to avoid re-generation on future clicks/logins
    try {
      const merged = depth === 3
        ? { ...(prior || {}), lessons_mastery: { ...(prior?.lessons_mastery || {}), [section]: lesson } }
        : { ...(prior || {}), lessons: { ...(prior?.lessons || {}), [section]: lesson } }
      await supa
        .from('reports')
        .upsert({ user_id: user.id, plan: merged }, { onConflict: 'user_id' })
    } catch {}

    return NextResponse.json({ lesson })
  } catch (e: any) {
    if (process.env.DEBUG_LOG === 'true') console.error('[lesson] error:', e?.message || e)
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}
