// app/api/me/access/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseRoute } from '@/lib/supabaseServer'

export async function GET(req: NextRequest) {
  const supa = supabaseRoute()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const product = (url.searchParams.get('product') || 'ai').toLowerCase()

  const now = new Date()
  const nowIso = now.toISOString()

  // Access windows for this user/product
  const { data: windows, error: winErr } = await supa
    .from('access_grants')
    .select('id, product_key, source, access_starts_at, access_ends_at, status, payment_id, created_at, updated_at, grant_reason')
    .eq('user_id', user.id)
    .eq('product_key', product)
    .order('access_starts_at', { ascending: false })

  if (winErr) return NextResponse.json({ error: winErr.message }, { status: 500 })

  // Compute active window
  let active = (windows || []).find(w => (
    w.status === 'active' &&
    w.access_starts_at && w.access_ends_at &&
    w.access_starts_at <= nowIso && nowIso <= w.access_ends_at
  )) || null

  // Fallback: if no grant window, derive access from report purchase within 3 months
  if (!active) {
    const { data: ob } = await supa
      .from('onboarding_sessions')
      .select('purchase_status, claimed_at, updated_at')
      .eq('user_id', user.id)
      .maybeSingle()
    const status = ob?.purchase_status
    const claimedAtStr = (ob?.claimed_at as string | null) || (ob?.updated_at as string | null) || null
    if (status === 'paid' && claimedAtStr) {
      const claimedAt = new Date(claimedAtStr)
      const ends = new Date(claimedAt)
      ends.setMonth(ends.getMonth() + 3)
      if (now <= ends) {
        active = {
          id: undefined as any,
          product_key: product,
          source: 'derived_from_onboarding',
          access_starts_at: claimedAt.toISOString(),
          access_ends_at: ends.toISOString(),
          status: 'active',
          payment_id: null,
          grant_reason: 'Derived: Free 3 months with report purchase',
          created_at: undefined as any,
          updated_at: undefined as any,
        } as any
      }
    }
  }

  // Optional: include latest payments and subscription periods (limited)
  const include = (url.searchParams.get('include') || '').split(',').map(s=>s.trim()).filter(Boolean)
  let payments: any[] | undefined
  let subs: any[] | undefined
  if (include.includes('payments')) {
    const { data } = await supa
      .from('payments')
      .select('id, product_key, amount_cents, status, payment_method_type, card_brand, card_last4, wallet_type, currency, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10)
    payments = data || []
  }
  if (include.includes('subscriptions')) {
    const { data } = await supa
      .from('subscription_periods')
      .select('id, product_key, stripe_subscription_id, stripe_invoice_id, period_start, period_end, price_cents, status, currency, created_at')
      .eq('user_id', user.id)
      .order('period_start', { ascending: false })
      .limit(10)
    subs = data || []
  }

  return NextResponse.json({
    user_id: user.id,
    product_key: product,
    now: nowIso,
    active: !!active,
    active_window: active,
    windows: windows || [],
    payments,
    subscription_periods: subs,
  })
}
