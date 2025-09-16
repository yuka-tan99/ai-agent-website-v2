// app/api/me/purchase-status/route.ts
import { NextResponse } from 'next/server'
import { supabaseRoute } from '@/lib/supabaseServer'

export async function GET() {
  const supa = supabaseRoute()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauth' }, { status: 401 })
  const { data, error } = await supa
    .from('onboarding_sessions')
    .select('purchase_status')
    .eq('user_id', user.id)
    .maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Primary flag
  let status = data?.purchase_status ?? 'none'

  // Fallback 1: if a report exists, consider it paid
  if (status !== 'paid') {
    const { data: rep } = await supa
      .from('reports')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle()
    if (rep) status = 'paid'
  }

  // Fallback 2: if a successful plan payment exists, consider it paid
  if (status !== 'paid') {
    const { data: pay } = await supa
      .from('payments')
      .select('id, product_key, status')
      .eq('user_id', user.id)
      .eq('product_key', 'plan')
      .eq('status', 'succeeded')
      .order('id', { ascending: false })
      .limit(1)
    if (Array.isArray(pay) && pay.length) status = 'paid'
  }

  // Best-effort persist paid if we derived it (ignore failures under RLS)
  if (status === 'paid' && data?.purchase_status !== 'paid') {
    try {
      await supa
        .from('onboarding_sessions')
        .upsert({ user_id: user.id, purchase_status: 'paid', updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
    } catch {}
  }

  return NextResponse.json({ purchase_status: status })
}
