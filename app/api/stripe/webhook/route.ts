import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'

// Use latest supported Stripe API version
const stripeSecret = process.env.STRIPE_SECRET_KEY as string
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET as string

export async function POST(req: Request) {
  if (!stripeSecret || !webhookSecret) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })
  }

  const stripe = new Stripe(stripeSecret, { apiVersion: '2024-06-20' })

  let body: Buffer
  try {
    body = Buffer.from(await req.arrayBuffer())
  } catch (err) {
    return NextResponse.json({ error: 'Failed to read request body' }, { status: 400 })
  }

  const sig = (await headers()).get('stripe-signature') as string
  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err: any) {
    console.error('Webhook signature verification failed.', err.message)
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 })
  }

  // Handle event types
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        console.log('✅ Checkout session completed', event.data.object)
        // You could update DB here
        break

      case 'invoice.payment_succeeded':
        console.log('💰 Payment succeeded', event.data.object)
        break

      case 'customer.subscription.deleted':
        console.log('⚠️ Subscription canceled', event.data.object)
        break

      default:
        console.log(`Unhandled event type ${event.type}`)
    }
  } catch (err) {
    console.error('Webhook handler error:', err)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}