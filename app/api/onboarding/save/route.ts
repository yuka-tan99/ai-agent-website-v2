// app/api/onboarding/save/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabaseServer } from '@/lib/supabaseServer'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Body = {
  sessionId: string
  answers?: Record<string, any>
  patch?: Record<string, any>   // backward compatible field name
  links?: string[]
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
  if (!v) {
    throw new Error(`Missing required env: ${name}`)
  }
  return v
}

/** Create service client (works anon or authed). */
function serviceClient() {
  const url = requireEnv('NEXT_PUBLIC_SUPABASE_URL')
  const key = requireEnv('SUPABASE_SERVICE_KEY')
  return createClient(url, key)
}

/* ------------------------- POST: upsert (merge) ------------------------- */
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Body
    const sessionId = (body.sessionId || '').trim()
    if (!sessionId) {
      return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 })
    }

    // Try to get current user (optional).
    let userId: string | null = null
    try {
      const sb = await supabaseServer()
      const { data } = await sb.auth.getUser()
      userId = data?.user?.id ?? null
    } catch {
      /* ignore */
    }

    const supa = serviceClient()

    // Read existing so we can merge JSONB safely
    const { data: existing, error: readErr } = await supa
      .from('onboarding_sessions')
      .select('answers, links, user_id')
      .eq('id', sessionId)
      .maybeSingle()

    if (readErr) {
      return NextResponse.json({ error: `[read] ${readErr.message}` }, { status: 500 })
    }

    const incomingAnswers = body.answers ?? body.patch ?? {}
    const mergedAnswers = {
      ...(existing?.answers ?? {}),
      ...(incomingAnswers ?? {}),
    }

    const incomingLinks = uniqStrings(body.links)
    const mergedLinks = uniqStrings([...(existing?.links ?? []), ...incomingLinks])

    const payload: any = {
      id: sessionId,
      answers: mergedAnswers,
      updated_at: new Date().toISOString(),
    }

    if (mergedLinks.length) payload.links = mergedLinks
    // only set/overwrite user_id when present
    if (userId) payload.user_id = userId
    if (!existing) payload.created_at = new Date().toISOString()

    const { error: upsertErr } = await supa
      .from('onboarding_sessions')
      .upsert(payload, { onConflict: 'id' })

    if (upsertErr) {
      return NextResponse.json({ error: `[upsert] ${upsertErr.message}` }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Save failed' }, { status: 500 })
  }
}

/* --------------------------- GET: read for debug --------------------------- */
/** GET /api/onboarding/save?sessionId=...  -> returns stored row (answers+links) */
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
      .select('id, user_id, answers, links, created_at, updated_at')
      .eq('id', sessionId)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: `[read] ${error.message}` }, { status: 500 })
    }

    return NextResponse.json(data || null)
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Read failed' }, { status: 500 })
  }
}