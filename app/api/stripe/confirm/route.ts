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
        .insert({
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
        })
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

      const reportStart = new Date(now)
      const reportEnd = new Date(reportStart)
      reportEnd.setFullYear(reportEnd.getFullYear() + 5)
      await sb.from('access_grants').insert({
        user_id,
        product_key: 'report',
        source: 'bundle_with_plan_manual',
        access_starts_at: reportStart.toISOString(),
        access_ends_at: reportEnd.toISOString(),
        payment_id,
        grant_reason: 'Manual confirm: Report entitlement',
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
            const { prepareReportInputs, finalizePlan, computeFameBreakdown } = await import('@/lib/reportMapping')
            const { callClaudeJSONWithRetry } = await import('@/lib/claude')
            const persona = ob.answers || {}
            const { prompt, fame, answers } = prepareReportInputs(persona, '')
            let raw: any = {}
            try {
              raw = await callClaudeJSONWithRetry<any>({ prompt, timeoutMs: 70_000, maxTokens: 1900 }, 2)
              if (process.env.DEBUG_LOG === 'true') console.log('[confirm] background LLM ok')
            } catch (e: any) {
              console.warn('[confirm] background LLM failed:', e?.message || e)
            }
            const plan: any = finalizePlan(raw, answers, fame)
            // Enrich with assessment + insights (best effort)
            try {
              const breakdown = computeFameBreakdown(answers as any)
              const pct: Record<string, number> = { overall: Math.round(fame ?? 0) }
              for (const b of breakdown) pct[b.key] = Math.round(Number(b.percent) || 0)
              const [assessRes, insightRes] = await Promise.allSettled([
                callClaudeJSONWithRetry<{ assessment: string }>({
                  prompt: `You are Marketing Mentor, a social media growth expert. Return JSON only.\n\nWrite ONE thorough paragraph titled 'assessment' (3–7 sentences) that explains the creator's current strengths and weaknesses and the biggest opportunities ahead. Be encouraging and helpful with no fluff. Use the percentages as directional signals, not verdicts. Include 1–2 specific next steps.\n\nPERCENTAGES:\n${JSON.stringify(pct, null, 2)}\n\nONBOARDING_ANSWERS:\n${JSON.stringify(answers, null, 2)}\n\nOUTPUT:\n{"assessment":"..."}`,
                  timeoutMs: 60_000,
                  maxTokens: 700,
                }, 2),
                callClaudeJSONWithRetry<Record<string, string>>({
                  prompt: `You are Marketing Mentor. Return JSON only.\n\nWrite one concise but thorough paragraph (3–5 sentences) for EACH of these keys explaining what the user's onboarding answers suggest and the top opportunity to improve that dimension. Encouraging, specific, no fluff.\nKeys: overall, consistency, camera_comfort, planning, tech_comfort, audience_readiness, interest_breadth, experimentation.\n\nPERCENTAGES:\n${JSON.stringify(pct, null, 2)}\n\nONBOARDING_ANSWERS:\n${JSON.stringify(answers, null, 2)}\n\nOUTPUT (flat object with those exact keys):\n{"overall":"","consistency":"","camera_comfort":"","planning":"","tech_comfort":"","audience_readiness":"","interest_breadth":"","experimentation":""}`,
                  timeoutMs: 65_000,
                  maxTokens: 1100,
                }, 2),
              ])
              if (assessRes.status === 'fulfilled' && assessRes.value?.assessment) {
                plan.fame_assessment = assessRes.value.assessment
              } else {
                const overall = Math.round(plan.fame_score ?? fame ?? 0)
                plan.fame_assessment = `You have solid raw potential (around ${overall}%). Lean on your strongest habits and formats, and shore up the weakest link in your weekly workflow. Keep your scope narrow for two weeks, post on a steady cadence, and run one small experiment per post. This combination compounds quickly.`
              }
              if (insightRes.status === 'fulfilled' && typeof insightRes.value === 'object') {
                plan.fame_section_insights = insightRes.value
              } else {
                const mk = (k: string) => `This area can move fast with one small weekly ritual focused on ${k.replace(/_/g,' ')}. Keep changes tiny and measurable for the next 14 days to build momentum.`
                plan.fame_section_insights = {
                  overall: mk('overall execution'),
                  consistency: mk('consistency'),
                  camera_comfort: mk('on‑camera comfort'),
                  planning: mk('planning and batching'),
                  tech_comfort: mk('tooling and editing'),
                  audience_readiness: mk('audience clarity'),
                  interest_breadth: mk('topic focus'),
                  experimentation: mk('experimentation'),
                }
              }
            } catch (e) {
              console.warn('[confirm] enrich extras failed', e)
            }
            await sb.from('reports').upsert({ user_id, plan }, { onConflict: 'user_id' })
            if (process.env.DEBUG_LOG === 'true') console.log('[confirm] background report upsert ok for', user_id)
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
