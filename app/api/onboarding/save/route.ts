// app/api/onboarding/save/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabaseServer } from '@/lib/supabaseServer'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Body = {
  sessionId: string
  answers?: Record<string, any>
  patch?: Record<string, any>   // legacy alias
  links?: string[]
  replace?: boolean             // optional: force replace instead of merge (even when authed)
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

function requireEnv(name: string) {
  const v = process.env[name]
  if (!v) throw new Error(`Missing required env: ${name}`)
  return v
}

/** Service client for server-side write access (no browser SDK). */
function serviceClient() {
  const url = requireEnv('NEXT_PUBLIC_SUPABASE_URL')
  const key = requireEnv('SUPABASE_SERVICE_KEY') // service role
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false }
  })
}

/* --------------------------- POST: create / update --------------------------- */
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Body
    const sessionId = (body.sessionId || '').trim()
    if (!sessionId) {
      return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 })
    }

    // Determine current user (optional). If not signed in, we want a clean slate.
    let userId: string | null = null
    try {
      const sb = await supabaseServer()
      const { data } = await sb.auth.getUser()
      userId = data?.user?.id ?? null
    } catch {
      /* ignore auth lookup failures */
    }

    const supa = serviceClient()

    // Read existing row only if we might merge (i.e., user signed in and not forcing replace)
    const shouldMerge = !!userId && !body.replace

    let existing: { answers: any; links: string[] | null; user_id: string | null } | null = null
    if (shouldMerge) {
      const { data, error } = await supa
        .from('onboarding_sessions')
        .select('answers,links,user_id')
        .eq('id', sessionId)
        .maybeSingle()
      if (error) return NextResponse.json({ error: `[read] ${error.message}` }, { status: 500 })
      existing = data
      // If an existing row belongs to a *different* user, block to avoid mixing accounts.
      if (existing?.user_id && existing.user_id !== userId) {
        return NextResponse.json(
          { error: 'Session belongs to another user', code: 'SESSION_OWNED_BY_OTHER' },
          { status: 409 }
        )
      }
    }

    // Incoming payload
    const incomingAnswers = body.answers ?? body.patch ?? {}
    const incomingLinks = uniqStrings(body.links)

    // For signed-out users (userId === null): **REPLACE** with incoming (fresh start).
    // For signed-in users: merge unless body.replace === true.
    const answers = shouldMerge
      ? { ...(existing?.answers ?? {}), ...(incomingAnswers ?? {}) }
      : (incomingAnswers ?? {})

    const links = shouldMerge
      ? uniqStrings([...(existing?.links ?? []), ...incomingLinks])
      : incomingLinks

    const now = new Date().toISOString()
    const payload: any = {
      id: sessionId,
      answers,
      updated_at: now,
    }

    // Only include links if caller sent any (prevents accidental wipe on partial PATCHes)
    if (Array.isArray(body.links)) payload.links = links

    // Attach user_id if signed in (don’t overwrite a different user because we guard above)
    if (userId) payload.user_id = userId

    const { error: upsertErr } = await supa
      .from('onboarding_sessions')
      .upsert(payload, { onConflict: 'id' })

    if (upsertErr) {
      return NextResponse.json({ error: `[upsert] ${upsertErr.message}` }, { status: 500 })
    }

    return NextResponse.json({ ok: true, userAttached: !!userId, merged: shouldMerge && !body.replace })
  } catch (e: any) {
    console.error('[onboarding/save] POST error:', e)
    return NextResponse.json({ error: e?.message || 'Save failed' }, { status: 500 })
  }
}

/* ----------------------------- GET: read row ----------------------------- */
/** GET /api/onboarding/save?sessionId=... -> returns stored row (answers+links) */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const sessionId = (url.searchParams.get('sessionId') || '').trim()
    if (!sessionId) {
      return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 })
    }

    const supa = serviceClient()
    const { data, error } = await supa
      .from('onboarding_sessions')
      .select('id,user_id,answers,links,created_at,updated_at')
      .eq('id', sessionId)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: `[read] ${error.message}` }, { status: 500 })
    }

    return NextResponse.json(data || null)
  } catch (e: any) {
    console.error('[onboarding/save] GET error:', e)
    return NextResponse.json({ error: e?.message || 'Read failed' }, { status: 500 })
  }
}