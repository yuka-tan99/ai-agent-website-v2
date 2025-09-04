import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseAdmin } from '@/lib/supabaseServer'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const sessionId = (url.searchParams.get('session_id') || '').trim()
  const redirectTo = (url.searchParams.get('redirect') || '').trim()
  if (!sessionId) return NextResponse.json({ error: 'Missing session_id' }, { status: 400 })

  const key = process.env.STRIPE_SECRET_KEY
  if (!key) return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })

  try {
    const stripe = new Stripe(key, { apiVersion: '2024-06-20' })
    const session = await stripe.checkout.sessions.retrieve(sessionId)

    const paid = (session.payment_status === 'paid') || (session.status === 'complete')
    const userId = (session.metadata?.user_id || '').trim()

    if (paid && userId) {
      try {
        const supa = supabaseAdmin()
        const now = new Date().toISOString()
        // Try update first
        const { data: existing, error: updErr } = await supa
          .from('onboarding_sessions')
          .update({ purchase_status: 'paid', updated_at: now })
          .eq('user_id', userId)
          .select('id')
          .maybeSingle()

        if (updErr) {
          console.error('[stripe/confirm] update error:', updErr.message, 'user:', userId, 'session:', sessionId)
        }

        if (!existing) {
          // No row to update — insert minimal row
          const { error: insErr } = await supa
            .from('onboarding_sessions')
            .insert({ user_id: userId, purchase_status: 'paid', updated_at: now })
          if (insErr) {
            console.error('[stripe/confirm] insert error:', insErr.message, 'user:', userId, 'session:', sessionId)
          } else {
            console.log('[stripe/confirm] inserted + set purchase_status=paid for user:', userId, 'session:', sessionId)
          }
        } else {
          console.log('[stripe/confirm] set purchase_status=paid for user:', userId, 'session:', sessionId)
        }
      } catch (e) {
        console.warn('[stripe/confirm] upsert failed:', (e as any)?.message, 'user:', userId, 'session:', sessionId)
      }
    }
    if (redirectTo) {
      try {
        const dest = new URL(redirectTo, url.origin)
        return NextResponse.redirect(dest)
      } catch {}
    }
    return NextResponse.json({ ok: true, paid })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to confirm session' }, { status: 500 })
  }
}
export const runtime = 'nodejs'
