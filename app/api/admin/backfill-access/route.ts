// app/api/admin/backfill-access/route.ts
// Backfills AI chat access grants for users who have paid for the report
// but are missing an access_grants row. Guarded by ADMIN_JOB_TOKEN.

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'

const AUTH_HEADER = 'x-admin-token'

function monthsAfter(iso: string, months: number) {
  const d = new Date(iso)
  const e = new Date(d)
  e.setMonth(e.getMonth() + months)
  return e.toISOString()
}

async function findMissing(limit = 500) {
  const sb = supabaseAdmin()
  // Pull recent paid sessions with a claimed_at (or updated_at fallback)
  const { data: sessions, error } = await sb
    .from('onboarding_sessions')
    .select('user_id, purchase_status, claimed_at, updated_at')
    .eq('purchase_status', 'paid')
    .order('updated_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(error.message)

  const now = new Date()
  const candidates: Array<{ user_id: string, startIso: string, endIso: string }> = []
  for (const s of sessions || []) {
    const base = (s.claimed_at || s.updated_at) as string | null
    if (!s.user_id || !base) continue
    // Skip if claimed_at is in the far future by mistake
    const startIso = new Date(base) > now ? new Date().toISOString() : base
    const endIso = monthsAfter(startIso, 3)

    // Check if any existing AI grant overlaps [startIso, endIso]
    const { data: grants, error: gErr } = await sb
      .from('access_grants')
      .select('id')
      .eq('user_id', s.user_id)
      .eq('product_key', 'ai')
      .eq('status', 'active')
      .lt('access_starts_at', endIso)
      .gt('access_ends_at', startIso)
      .limit(1)

    if (gErr) throw new Error(gErr.message)
    if (!grants || grants.length === 0) {
      candidates.push({ user_id: s.user_id, startIso, endIso })
    }
  }
  return candidates
}

export async function GET(req: NextRequest) {
  const token = req.headers.get(AUTH_HEADER)
  if (!process.env.ADMIN_JOB_TOKEN || token !== process.env.ADMIN_JOB_TOKEN) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }
  try {
    const missing = await findMissing()
    return NextResponse.json({ count: missing.length, missing })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const token = req.headers.get(AUTH_HEADER)
  if (!process.env.ADMIN_JOB_TOKEN || token !== process.env.ADMIN_JOB_TOKEN) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }
  const sb = supabaseAdmin()
  try {
    const missing = await findMissing()
    let inserted = 0
    for (const m of missing) {
      const { error: insErr } = await sb
        .from('access_grants')
        .insert({
          user_id: m.user_id,
          product_key: 'ai',
          source: 'backfill_from_claimed_at',
          access_starts_at: m.startIso,
          access_ends_at: m.endIso,
          grant_reason: 'Backfill: Free 3 months with report purchase',
          status: 'active',
        })
      if (!insErr) inserted++
    }
    return NextResponse.json({ candidates: missing.length, inserted })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}

