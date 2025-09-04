// app/api/stripe/webhook/route.ts
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseAdmin } from '@/lib/supabaseServer' // must use SERVICE role key!

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' })

export async function POST(req: Request) {
  const sig = (await headers()).get('stripe-signature')
  const whsec = process.env.STRIPE_WEBHOOK_SECRET
  if (!sig || !whsec) return NextResponse.json({ error: 'Missing webhook secret' }, { status: 500 })

  // IMPORTANT: raw body for signature verification
  const raw = Buffer.from(await req.arrayBuffer())

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(raw, sig, whsec)
  } catch (e: any) {
    console.error('Bad signature', e?.message)
    return NextResponse.json({ error: 'Bad signature' }, { status: 400 })
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session
      const user_id = session.metadata?.user_id
      if (!user_id) {
        console.warn('checkout.session.completed missing metadata.user_id')
      } else {
        const sb = supabaseAdmin() // MUST be instantiated with service_role key (bypasses RLS)
        // Ensure a row exists, then set paid
        await sb.from('onboarding_sessions')
          .upsert({ user_id, purchase_status: 'paid', updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
      }
    }
  } catch (e) {
    console.error('Webhook handler error:', e)
    return NextResponse.json({ error: 'handler error' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}