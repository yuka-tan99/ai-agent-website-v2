// app/api/stripe/checkout/route.ts
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseRoute } from '@/lib/supabaseServer'

const productMap: Record<string, string> = {
  plan: process.env.PRICE_ID_PLAN || '',
  ai: process.env.PRICE_ID_AI || '', // recurring monthly ($6)
  ai_one_time: process.env.PRICE_ID_AI_ONE_TIME || '', // optional: one-time $6 for 1-month pass
  advisor: process.env.PRICE_ID_ADVISOR || '',
  expert: process.env.PRICE_ID_EXPERT || '',
}

export async function POST(req: Request) {
  const url = new URL(req.url)
  const product = url.searchParams.get('product') || 'plan'
  const modeOverride = url.searchParams.get('mode') as 'payment' | 'subscription' | null
  const price = productMap[product]
  const secret = process.env.STRIPE_SECRET_KEY
  // Derive base URL from the incoming request. If localhost, keep localhost;
  // otherwise use forwarded proto/host (works on Vercel) or env fallback.
  const forwardedProto = req.headers.get('x-forwarded-proto') || undefined
  const forwardedHost = req.headers.get('x-forwarded-host') || req.headers.get('host') || undefined
  const hdrOrigin = req.headers.get('origin') || undefined
  const envUrl = process.env.NEXT_PUBLIC_APP_URL
  let appUrl = envUrl || 'http://localhost:3000'
  if (hdrOrigin && /localhost|127\.0\.0\.1/.test(hdrOrigin)) {
    appUrl = hdrOrigin
  } else if (forwardedHost) {
    const proto = forwardedProto || (url.protocol ? url.protocol.replace(':','') : 'https')
    appUrl = `${proto}://${forwardedHost}`
  }
  if (!secret || !price) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })
  }

  const supa = supabaseRoute()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  // Gate certain upsells behind the plan, but allow AI to be purchased standalone
  if (product === 'advisor' || product === 'expert') {
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
  const mode: 'payment' | 'subscription' = modeOverride || (product === 'ai' || product === 'advisor' ? 'subscription' : 'payment')

  // Choose correct price for AI: recurring for subscription, one-time for payment
  let chosenPrice = price
  if (product === 'ai' && mode === 'payment') {
    const oneTime = productMap['ai_one_time']
    if (!oneTime) {
      return NextResponse.json({
        error: 'AI one-month pass requires PRICE_ID_AI_ONE_TIME (one-time $6 price). Create a one-time price in Stripe and set PRICE_ID_AI_ONE_TIME in env, or choose subscription mode.'
      }, { status: 500 })
    }
    chosenPrice = oneTime
  }
  const redirectAfter = product === 'ai' ? '/account' : '/dashboard'
  const cancelPath = product === 'ai' ? '/paywall/ai' : '/paywall'
  // For plan purchases, land directly on the preparing page (with session_id)
  const successPath = product === 'plan'
    ? `/dashboard/preparing?session_id={CHECKOUT_SESSION_ID}`
    : `/success?session_id={CHECKOUT_SESSION_ID}&redirect=${encodeURIComponent(redirectAfter)}`

  const session = await stripe.checkout.sessions.create({
    mode,
    line_items: [{ price: chosenPrice, quantity: 1 }],
    // Land on preparing (plan) or success (ai)
    success_url: `${appUrl}${successPath}`,
    cancel_url: `${appUrl}${cancelPath}`,
    client_reference_id: user.id,
    // Ensure metadata propagates to PaymentIntent/Subscription/Invoice for webhook correlation
    payment_intent_data: mode === 'payment' ? { metadata: { user_id: user.id, product_key: product } } : undefined,
    subscription_data: mode === 'subscription' ? { metadata: { user_id: user.id, product_key: product } } : undefined,
    metadata: { user_id: user.id, product_key: product },
  })

  return NextResponse.json({ url: session.url })
}
