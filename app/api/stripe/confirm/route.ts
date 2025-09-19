// app/api/stripe/confirm/route.ts
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseAdmin } from '@/lib/supabaseServer'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' })

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const session_id = url.searchParams.get('session_id') || ''
    if (!session_id) return NextResponse.json({ error: 'missing session_id' }, { status: 400 })

    const session = await stripe.checkout.sessions.retrieve(session_id)
    if (session.status !== 'complete' && session.payment_status !== 'paid') {
      return NextResponse.json({ error: 'session not complete' }, { status: 409 })
    }

    const user_id = (session.metadata?.user_id as string | undefined) || (session.client_reference_id as string | undefined)
    const product_key = (session.metadata?.product_key as string | undefined) || 'plan'
    if (!user_id) return NextResponse.json({ error: 'missing user_id metadata on session' }, { status: 400 })

    const sb = supabaseAdmin()

    // Idempotency: if we already recorded a payment for this session, reuse it
    const { data: existingPay } = await sb
      .from('payments')
      .select('id')
      .eq('checkout_session_id', session.id)
      .maybeSingle()

    let payment_id: number | null = existingPay?.id ?? null
    if (!payment_id) {
      // Insert (idempotent via upsert) payment record with best‑effort details
      let amount_cents: number | undefined
      let status: string | undefined
      let currency: string | undefined
      let payment_intent_id: string | undefined
      let payment_method_type: string | undefined
      let card_brand: string | undefined
      let card_last4: string | undefined
      let wallet_type: string | undefined
      let billing_city: string | undefined
      let billing_state: string | undefined
      let billing_country: string | undefined

      const piId = session.payment_intent as string | undefined
      if (piId) {
        const pi = await stripe.paymentIntents.retrieve(piId, { expand: ['latest_charge'] })
        payment_intent_id = pi.id
        status = pi.status
        currency = pi.currency
        amount_cents = typeof session.amount_total === 'number' ? session.amount_total : pi.amount
        const charge = pi.latest_charge as Stripe.Charge | null
        if (charge && charge.payment_method_details) {
          const pmd = charge.payment_method_details as Stripe.Charge.PaymentMethodDetails
          if ((pmd as any).card) {
            payment_method_type = 'card'
            const c = (pmd as any).card as Stripe.Charge.PaymentMethodDetails.Card
            card_brand = (c.brand ?? undefined) as string | undefined
            card_last4 = (c.last4 ?? undefined) as string | undefined
            wallet_type = (c.wallet?.type ?? undefined) as string | undefined
          } else if ((pmd as any).type) {
            payment_method_type = (pmd as any).type
          }
          const addr = charge.billing_details?.address
          billing_city = addr?.city || undefined
          billing_state = addr?.state || undefined
          billing_country = addr?.country || undefined
        }
      }

      const { data: inserted, error: insErr } = await sb
        .from('payments')
        .upsert({
          user_id,
          product_key,
          amount_cents: amount_cents ?? 0,
          status: status || 'succeeded',
          checkout_session_id: session.id,
          payment_intent_id,
          payment_method_type: payment_method_type || null,
          card_brand: card_brand || null,
          card_last4: card_last4 || null,
          wallet_type: wallet_type || null,
          billing_city: billing_city || null,
          billing_state: billing_state || null,
          billing_country: billing_country || null,
          currency: (session.currency || currency || 'usd') as string,
          raw: { session_id: session.id, payment_intent_id: payment_intent_id || null },
        }, { onConflict: 'checkout_session_id' })
        .select('id')
        .single()
      if (insErr) {
        // Handle race with webhook inserting the same session; fallback to select the existing row
        const code = (insErr as any)?.code || ''
        if (code !== '23505') throw insErr
        const { data: again } = await sb
          .from('payments')
          .select('id')
          .eq('checkout_session_id', session.id)
          .maybeSingle()
        payment_id = again?.id ?? null
      } else {
        payment_id = inserted?.id ?? null
      }
    }

    // Ensure onboarding_sessions reflects plan paid (for the dashboard flow)
    if (product_key === 'plan') {
      const claimedAt = new Date(session.created ? (session.created as number) * 1000 : Date.now()).toISOString()
      await sb
        .from('onboarding_sessions')
        .upsert({ user_id, purchase_status: 'paid', claimed_at: claimedAt, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
    }

    // Grant access if needed (idempotent-ish: we allow multiple rows; caller can verify via /api/me/access)
    if (product_key === 'plan') {
      // Extend by 3 months after any existing future window
      const now = new Date(session.created ? (session.created as number) * 1000 : Date.now())
      const { data: last } = await sb
        .from('access_grants')
        .select('access_ends_at')
        .eq('user_id', user_id)
        .eq('product_key', 'ai')
        .order('access_ends_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      const lastEnd = last?.access_ends_at ? new Date(last.access_ends_at as unknown as string) : undefined
      const starts = lastEnd && lastEnd > now ? lastEnd : now
      const ends = new Date(starts)
      ends.setMonth(ends.getMonth() + 3)
      await sb.from('access_grants').insert({
        user_id,
        product_key: 'ai',
        source: 'bundle_with_plan_manual',
        access_starts_at: starts.toISOString(),
        access_ends_at: ends.toISOString(),
        payment_id,
        grant_reason: 'Manual confirm: Free 3 months with report purchase',
        status: 'active',
      })

      // Best-effort background report generation
      try {
        const { data: rep } = await sb
          .from('reports')
          .select('user_id')
          .eq('user_id', user_id)
          .maybeSingle()
        if (!rep) {
          const { data: ob } = await sb
            .from('onboarding_sessions')
            .select('answers, claimed_at')
            .eq('user_id', user_id)
            .maybeSingle()
          if (ob && (ob.answers || ob.claimed_at)) {
            const { prepareReportInputs, finalizePlan } = await import('@/lib/reportMapping')
            const { callClaudeJSONWithRetry } = await import('@/lib/claude')
            const persona = ob.answers || {}
            const { prompt, fame, answers } = prepareReportInputs(persona, '')
            let raw: any = {}
            try { raw = await callClaudeJSONWithRetry<any>({ prompt, timeoutMs: 45000, maxTokens: 1200 }, 1) } catch {}
            const plan = finalizePlan(raw, answers, fame)
            await sb.from('reports').upsert({ user_id, plan }, { onConflict: 'user_id' })
          }
        }
      } catch (e) {
        console.warn('confirm background report gen failed', e)
      }
    } else if (product_key === 'ai') {
      // If one-time, add 1 month; if subscription, rely on invoice event
      if (session.mode === 'payment') {
        const now = new Date()
        const { data: last } = await sb
          .from('access_grants')
          .select('access_ends_at')
          .eq('user_id', user_id)
          .eq('product_key', 'ai')
          .order('access_ends_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        const lastEnd = last?.access_ends_at ? new Date(last.access_ends_at as unknown as string) : undefined
        const starts = lastEnd && lastEnd > now ? lastEnd : now
        const ends = new Date(starts)
        ends.setMonth(ends.getMonth() + 1)
        await sb.from('access_grants').insert({
          user_id,
          product_key: 'ai',
          source: 'one_month_pass_manual',
          access_starts_at: starts.toISOString(),
          access_ends_at: ends.toISOString(),
          payment_id,
          grant_reason: 'Manual confirm: 1‑month pass',
          status: 'active',
        })
      }
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('confirm error', e)
    return NextResponse.json({ error: e?.message || 'confirm failed' }, { status: 500 })
  }
}
