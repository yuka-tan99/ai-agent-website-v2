// app/api/stripe/checkout/route.ts
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseRoute } from '@/lib/supabaseServer'

const productMap: Record<string, string> = {
  plan: process.env.PRICE_ID_PLAN || '',
  advisor: process.env.PRICE_ID_ADVISOR || '',
  expert: process.env.PRICE_ID_EXPERT || '',
}

export async function POST(req: Request) {
  const url = new URL(req.url)
  const product = url.searchParams.get('product') || 'plan'
  const price = productMap[product]
  const secret = process.env.STRIPE_SECRET_KEY
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  if (!secret || !price) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })
  }

  const supa = supabaseRoute()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  // Gate upsells: must have plan = paid in onboarding_sessions
  if (product !== 'plan') {
    const { data, error } = await supa
      .from('onboarding_sessions')
      .select('purchase_status')
      .eq('user_id', user.id)
      .maybeSingle()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    const hasPlan = data?.purchase_status === 'paid'
    if (!hasPlan) return NextResponse.json({ error: 'Plan required' }, { status: 403 })
  }

  const stripe = new Stripe(secret, { apiVersion: '2024-06-20' })
  const session = await stripe.checkout.sessions.create({
    mode: product === 'advisor' ? 'subscription' : 'payment',
    line_items: [{ price, quantity: 1 }],
    // IMPORTANT: land on /success to wait for webhook to set purchase_status='paid'
    success_url: `${appUrl}/api/stripe/confirm?session_id={CHECKOUT_SESSION_ID}&redirect=/dashboard`,
    cancel_url: `${appUrl}/paywall`,
    metadata: { user_id: user.id, product_key: product },
  })

  return NextResponse.json({ url: session.url })
}