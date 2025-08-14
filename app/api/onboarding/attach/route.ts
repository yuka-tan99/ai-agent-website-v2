// app/api/onboarding/attach/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabaseServer } from '@/lib/supabaseServer'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Body = { sessionId?: string; merge?: boolean }
type SessionRow = {
  id: string
  user_id: string | null
  answers: Record<string, any> | null
  links: string[] | null
  updated_at: string | null
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
  try {
    const { sessionId, merge = true } = (await req.json().catch(() => ({}))) as Body
    if (!sessionId || !sessionId.trim()) {
      return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 })
    }

    // must be signed in
    const sb = await supabaseServer()
    const { data: { user }, error: uErr } = await sb.auth.getUser()
    if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 })
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // service client for write
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const key = process.env.SUPABASE_SERVICE_KEY!
    const supa = createClient(url, key)

    // Load or create the target session
    const { data: target, error: readErr } = await supa
      .from('onboarding_sessions')
      .select('id,user_id,answers,links,updated_at')
      .eq('id', sessionId)
      .maybeSingle<SessionRow>()

    if (readErr) return NextResponse.json({ error: readErr.message }, { status: 500 })

    if (!target) {
      const now = new Date().toISOString()
      const { error: insErr } = await supa.from('onboarding_sessions').insert({
        id: sessionId,
        user_id: user.id,
        answers: {},
        links: [],
        updated_at: now,
      })
      if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 })
      return NextResponse.json({ ok: true, attached: true, created: true, mergedFrom: null })
    }

    // If the session belongs to another user, do not reassign
    if (target.user_id && target.user_id !== user.id) {
      return NextResponse.json(
        { ok: false, attached: false, reason: 'session belongs to another user' },
        { status: 409 }
      )
    }

    // --- Optional merge (disabled for fresh flows) ---
    let mergedFrom: string | null = null
    let mergedAnswers = target.answers ?? {}
    let mergedLinks = uniqStrings(target.links ?? [])

    if (merge) {
      const { data: otherSessions, error: listErr } = await supa
        .from('onboarding_sessions')
        .select('id,answers,links,updated_at')
        .eq('user_id', user.id)
        .neq('id', sessionId)
        .order('updated_at', { ascending: false })
        .limit(1) as unknown as { data: SessionRow[] | null, error: any }

      if (!listErr && otherSessions && otherSessions.length > 0) {
        const other = otherSessions[0]
        mergedFrom = other.id
        // Overlay target with user's last session
        mergedAnswers = { ...(mergedAnswers ?? {}), ...(other.answers ?? {}) }
        mergedLinks = uniqStrings([...(mergedLinks ?? []), ...uniqStrings(other.links ?? [])])

        // Optional: clean up the merged-away session
        await supa.from('onboarding_sessions').delete().eq('id', other.id)
      }
    }

    const now = new Date().toISOString()
    const { error: updErr } = await supa
      .from('onboarding_sessions')
      .upsert(
        {
          id: sessionId,
          user_id: user.id,
          answers: mergedAnswers,
          links: mergedLinks,
          updated_at: now,
        },
        { onConflict: 'id' }
      )

    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 })

    return NextResponse.json({ ok: true, attached: true, mergedFrom })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Attach failed' }, { status: 500 })
  }
}