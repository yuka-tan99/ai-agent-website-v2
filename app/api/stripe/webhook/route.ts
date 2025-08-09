import Stripe from 'stripe'
import { headers } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request){
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  const stripeSecret = process.env.STRIPE_SECRET_KEY
  const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string
  const supaService = process.env.SUPABASE_SERVICE_KEY as string

  if(!webhookSecret || !stripeSecret || !supaUrl || !supaService) return new Response('not configured', { status: 500 })

  const buf = Buffer.from(await req.arrayBuffer())
  const sig = (await headers()).get('stripe-signature') as string

  const stripe = new Stripe(stripeSecret, { apiVersion: '2023-10-16' })
  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(buf, sig, webhookSecret)
  } catch (err:any) {
    return new Response(`Webhook Error: ${err.message}`, { status: 400 })
  }

  const supa = createClient(supaUrl, supaService)

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const user_id = session.metadata?.user_id
    const product_key = session.metadata?.product_key || 'plan'
    const amount_cents = session.amount_total || 0
    const currency = session.currency || 'usd'
    if (user_id) {
      await supa.from('purchases').insert({ user_id, product_key, amount_cents, currency, status: 'paid' })
    }
  }

  return new Response('ok')
}
