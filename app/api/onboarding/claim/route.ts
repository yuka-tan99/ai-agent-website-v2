// app/api/claim/route.ts
import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type SessionRow = {
  id: string
  user_id: string | null
  answers: Record<string, any> | null
  links: string[] | null
  updated_at: string | null
  claimed_at?: string | null
}

function uniqStrings(arr?: string[]) {
  if (!Array.isArray(arr)) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const s of arr.map((x) => (x || '').trim()).filter(Boolean)) {
    const k = s.toLowerCase()
    if (!seen.has(k)) { seen.add(k); out.push(s) }
  }
  return out
}

export async function POST(req: Request) {
  const supaSrv = await supabaseServer()
  const { data: { user } } = await supaSrv.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { sessionId } = await req.json().catch(() => ({}))
  if (!sessionId) return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 })

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY!
  const admin = createClient(url, key)

  // 1) Load the target session
  const { data: target, error: readErr } = await admin
    .from('onboarding_sessions')
    .select('id,user_id,answers,links,updated_at,claimed_at')
    .eq('id', sessionId)
    .maybeSingle<SessionRow>()

  if (readErr) {
    return NextResponse.json({ error: readErr.message }, { status: 500 })
  }

  // 2) If it doesn't exist, create & claim immediately
  if (!target) {
    const now = new Date().toISOString()
    const { error: insertErr } = await admin
      .from('onboarding_sessions')
      .insert({
        id: sessionId,
        user_id: user.id,
        answers: {},
        links: [],
        claimed_at: now,
        updated_at: now,
      })
    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 500 })
    }
    return NextResponse.json({ ok: true, sessionId, created: true })
  }

  // 3) If this session is already claimed by *another* user, block
  if (target.user_id && target.user_id !== user.id) {
    return NextResponse.json({ error: 'This session was already claimed by another account.' }, { status: 409 })
  }

  // 4) Optional merge: if this user already has a different session, merge it into the target
  const { data: otherSessions, error: listErr } = await admin
    .from('onboarding_sessions')
    .select('id,answers,links,updated_at')
    .eq('user_id', user.id)
    .neq('id', sessionId)
    .order('updated_at', { ascending: false })
    .limit(1) as unknown as { data: SessionRow[] | null, error: any }

  let mergedFrom: string | null = null
  let mergedAnswers = target.answers ?? {}
  let mergedLinks = uniqStrings(target.links ?? [])

  if (!listErr && otherSessions && otherSessions.length > 0) {
    const other = otherSessions[0]
    mergedFrom = other.id
    // Last-write-wins per key: keep target first, then overlay other (or reverse if you prefer)
    mergedAnswers = { ...(other.answers ?? {}), ...(mergedAnswers ?? {}) }
    mergedLinks = uniqStrings([...(mergedLinks ?? []), ...uniqStrings(other.links ?? [])])

    // (Optional) delete the other session to keep it tidy
    await admin.from('onboarding_sessions').delete().eq('id', other.id)
  }

  // 5) Claim/update the target session for this user
  const now = new Date().toISOString()
  const { error: updateErr } = await admin
    .from('onboarding_sessions')
    .update({
      user_id: user.id,
      answers: mergedAnswers,
      links: mergedLinks,
      claimed_at: target.claimed_at ?? now,
      updated_at: now,
    })
    .eq('id', sessionId)

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, sessionId, mergedFrom })
}
