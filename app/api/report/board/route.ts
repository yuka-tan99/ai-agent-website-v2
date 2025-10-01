import { NextResponse } from 'next/server'
import { supabaseRoute } from '@/lib/supabaseServer'
import { UserProfile } from '@/types/report'

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

export async function GET() {
  try {
    const supa = supabaseRoute()
    const { data: { user } } = await supa.auth.getUser()
    if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    // Only ever return cached board cards; do not generate here.
    const existing = await supa
      .from('reports')
      .select('plan')
      .eq('user_id', user.id)
      .maybeSingle()
    const prior = existing?.data?.plan as any
    const cards = Array.isArray(prior?.board_cards) ? prior.board_cards : []
    return NextResponse.json({ cards })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}
