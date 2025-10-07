// app/api/me/access/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseRoute } from '@/lib/supabaseServer'
import { getAccessInfo } from '@/lib/access'

export async function GET(req: NextRequest) {
  const supa = supabaseRoute()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const product = (url.searchParams.get('product') || 'ai').toLowerCase()

  const now = new Date()
  const nowIso = now.toISOString()

  // Access windows for this user/product
  const { windows, activeWindow, active } = await getAccessInfo(supa, user.id, product, now)

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
    active,
    active_window: activeWindow,
    windows: windows || [],
    payments,
    subscription_periods: subs,
  })
}
