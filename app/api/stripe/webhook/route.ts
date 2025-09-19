// app/api/stripe/webhook/route.ts
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseAdmin } from '@/lib/supabaseServer' // must use SERVICE role key!
import { prepareReportInputs, finalizePlan, computeFameBreakdown } from '@/lib/reportMapping'
import { callClaudeJSONWithRetry } from '@/lib/claude'

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
      const user_id = session.metadata?.user_id || undefined
      const product_key = session.metadata?.product_key || undefined

      const sb = supabaseAdmin() // service role (bypasses RLS)

      // Mark user as paid in onboarding_sessions only for plan purchases
      if (user_id) {
        const eventTimeIso = new Date((event.created as number) * 1000).toISOString()
        if (product_key === 'plan') {
          await sb
            .from('onboarding_sessions')
            .upsert({ user_id, purchase_status: 'paid', claimed_at: eventTimeIso, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
        }
      } else {
        console.warn('checkout.session.completed missing metadata.user_id')
      }

      // Try to persist a detailed payment record
      try {
        const piId = session.payment_intent as string | undefined
        let status: string | undefined
        let currency: string | undefined
        let amount_cents: number | undefined
        let payment_method_type: string | undefined
        let card_brand: string | undefined
        let card_last4: string | undefined
        let wallet_type: string | undefined
        let billing_city: string | undefined
        let billing_state: string | undefined
        let billing_country: string | undefined
        let payment_intent_id: string | undefined
        let checkout_session_id: string | undefined = session.id

        if (piId) {
          const pi = await stripe.paymentIntents.retrieve(piId, { expand: ['latest_charge'] })
          payment_intent_id = pi.id
          status = pi.status
          currency = pi.currency
          amount_cents = typeof session.amount_total === 'number' ? session.amount_total : pi.amount

          const charge = pi.latest_charge as Stripe.Charge | null
          if (charge && charge.payment_method_details) {
            const pmd = charge.payment_method_details as Stripe.Charge.PaymentMethodDetails
            // Detect card and wallet info (Apple Pay appears as card + wallet.type='apple_pay')
            if ((pmd as any).card) {
              payment_method_type = 'card'
              const c = (pmd as any).card as Stripe.Charge.PaymentMethodDetails.Card
              card_brand = (c.brand ?? undefined) as string | undefined
              card_last4 = (c.last4 ?? undefined) as string | undefined
              wallet_type = c.wallet?.type
            } else if ((pmd as any).type) {
              // fallback; not always present in types, but keep for non-card methods
              payment_method_type = (pmd as any).type
            }
            const addr = charge.billing_details?.address
            billing_city = addr?.city || undefined
            billing_state = addr?.state || undefined
            billing_country = addr?.country || undefined
          }
        }

        if (user_id) {
          const { data: inserted, error: insErr } = await sb
            .from('payments')
            .insert({
              user_id,
              product_key: product_key || 'plan',
              amount_cents: amount_cents ?? 0,
              status: status || 'succeeded',
              checkout_session_id,
              payment_intent_id,
              payment_method_type: payment_method_type || null,
              card_brand: card_brand || null,
              card_last4: card_last4 || null,
              wallet_type: wallet_type || null,
              billing_city: billing_city || null,
              billing_state: billing_state || null,
              billing_country: billing_country || null,
              currency: (session.currency || currency || 'usd') as string,
              raw: { event_id: event.id, session_id: session.id, payment_intent_id: payment_intent_id || null },
            })
            .select('id')
            .single()
          if (insErr) throw insErr

          // Auto-grant AI chat access based on purchase
          if (product_key === 'plan') {
            // Add 3 months of AI access on top of any existing future window
            const now = new Date((event.created as number) * 1000)
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
            await sb
              .from('access_grants')
              .insert({
                user_id,
                product_key: 'ai',
                source: 'bundle_with_plan',
                access_starts_at: starts.toISOString(),
                access_ends_at: ends.toISOString(),
                payment_id: inserted?.id ?? null,
                grant_reason: 'Free 3 months with report purchase',
                status: 'active',
              })

            // Best-effort background report generation so it's ready when user lands
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
                  const persona = ob.answers || {}
                  const { prompt, fame, answers } = prepareReportInputs(persona, '')
                  let raw: any = {}
                  try {
                    raw = await callClaudeJSONWithRetry<any>({ prompt, timeoutMs: 45000, maxTokens: 1200 }, 1)
                    if (process.env.DEBUG_LOG === 'true') console.log('[webhook] background LLM ok')
                  } catch (e: any) {
                    console.warn('[webhook] background LLM failed:', e?.message || e)
                  }
                  let plan = finalizePlan(raw, answers, fame)
                  // Enrich with assessment + insights (best-effort; tolerate failures)
                  try {
                    const breakdown = computeFameBreakdown(answers as any)
                    const pct: Record<string, number> = { overall: Math.round(fame ?? 0) }
                    for (const b of breakdown) pct[b.key] = Math.round(Number(b.percent) || 0)

                    const [assessRes, insightRes] = await Promise.allSettled([
                      callClaudeJSONWithRetry<{ assessment: string }>({
                        prompt: `You are Marketing Mentor, a social media growth expert. Return JSON only.\n\nWrite ONE thorough paragraph titled 'assessment' (3–7 sentences) that explains the creator's current strengths and weaknesses and the biggest opportunities ahead. Be encouraging and helpful with no fluff. Use the percentages as directional signals, not verdicts. Include 1–2 specific next steps.\n\nPERCENTAGES:\n${JSON.stringify(pct, null, 2)}\n\nONBOARDING_ANSWERS:\n${JSON.stringify(answers, null, 2)}\n\nOUTPUT:\n{"assessment":"..."}`,
                        timeoutMs: 45_000,
                        maxTokens: 500,
                      }, 1),
                      callClaudeJSONWithRetry<Record<string, string>>({
                        prompt: `You are Marketing Mentor. Return JSON only.\n\nWrite one concise but thorough paragraph (3–5 sentences) for EACH of these keys explaining what the user's onboarding answers suggest and the top opportunity to improve that dimension. Encouraging, specific, no fluff.\nKeys: overall, consistency, camera_comfort, planning, tech_comfort, audience_readiness, interest_breadth, experimentation.\n\nPERCENTAGES:\n${JSON.stringify(pct, null, 2)}\n\nONBOARDING_ANSWERS:\n${JSON.stringify(answers, null, 2)}\n\nOUTPUT (flat object with those exact keys):\n{"overall":"","consistency":"","camera_comfort":"","planning":"","tech_comfort":"","audience_readiness":"","interest_breadth":"","experimentation":""}`,
                        timeoutMs: 50_000,
                        maxTokens: 900,
                      }, 1),
                    ])
                    if (assessRes.status === 'fulfilled' && assessRes.value?.assessment) {
                      ;(plan as any).fame_assessment = assessRes.value.assessment
                    } else {
                      const overall = Math.round(plan.fame_score ?? fame ?? 0)
                      ;(plan as any).fame_assessment = `You have solid raw potential (around ${overall}%). Lean on your strongest habits and formats, and shore up the weakest link in your weekly workflow. Keep your scope narrow for two weeks, post on a steady cadence, and run one small experiment per post. This combination compounds quickly.`
                    }
                    if (insightRes.status === 'fulfilled' && typeof insightRes.value === 'object') {
                      ;(plan as any).fame_section_insights = insightRes.value
                    } else {
                      const mk = (k: string) => `This area can move fast with one small weekly ritual focused on ${k.replace(/_/g,' ')}. Keep changes tiny and measurable for the next 14 days to build momentum.`
                      ;(plan as any).fame_section_insights = {
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
                    console.warn('[webhook] enrich extras failed', e)
                  }
                  try {
                    await sb.from('reports').upsert({ user_id, plan }, { onConflict: 'user_id' })
                    if (process.env.DEBUG_LOG === 'true') console.log('[webhook] background report upsert ok for', user_id)
                  } catch (e) { console.warn('background report upsert failed', e) }
                }
              }
            } catch (e) {
              console.warn('background report generation failed', e)
            }
          } else if (product_key === 'ai') {
            if (session.mode === 'payment') {
              // One‑month pass: grant exactly 1 month. If existing future access exists, start after it.
              const now = new Date()
              const { data: last, error: lastErr } = await sb
                .from('access_grants')
                .select('access_ends_at')
                .eq('user_id', user_id)
                .eq('product_key', 'ai')
                .order('access_ends_at', { ascending: false })
                .limit(1)
                .maybeSingle()
              if (lastErr) console.warn('lookup last grant failed', lastErr)
              const lastEnd = last?.access_ends_at ? new Date(last.access_ends_at as unknown as string) : undefined
              const starts = lastEnd && lastEnd > now ? lastEnd : now
              const ends = new Date(starts)
              ends.setMonth(ends.getMonth() + 1)
              await sb
                .from('access_grants')
                .insert({
                  user_id,
                  product_key: 'ai',
                  source: 'one_month_pass',
                  access_starts_at: starts.toISOString(),
                  access_ends_at: ends.toISOString(),
                  payment_id: inserted?.id ?? null,
                  grant_reason: 'AI access purchase (1‑month pass)',
                  status: 'active',
                })
            } else if (session.mode === 'subscription') {
              // Do not grant here; rely on invoice.payment_succeeded to align exactly with Stripe billing period
            }
          }
        }
      } catch (err) {
        console.error('Failed to record payment details:', err)
      }
    }
    else if (event.type === 'invoice.payment_succeeded') {
      // Extend access for active subscriptions; also log subscription period
      const invoice = event.data.object as Stripe.Invoice
      let user_id = (invoice.metadata?.user_id as string | undefined) || undefined
      let product_key = (invoice.metadata?.product_key as string | undefined) || 'ai'
      const subId = invoice.subscription as string | undefined
      const period_start = invoice.lines?.data?.[0]?.period?.start || invoice.period_start
      const period_end = invoice.lines?.data?.[0]?.period?.end || invoice.period_end
      const amount_cents = typeof invoice.amount_paid === 'number' ? invoice.amount_paid : undefined
      const currency = invoice.currency

      const sb = supabaseAdmin()

      // Fallback: If metadata missing on invoice, try subscription metadata
      if (!user_id && subId) {
        try {
          const sub = await stripe.subscriptions.retrieve(subId)
          user_id = (sub.metadata?.user_id as string | undefined) || user_id
          product_key = (sub.metadata?.product_key as string | undefined) || product_key
        } catch (e) {
          console.warn('Failed to retrieve subscription for metadata', e)
        }
      }
      if (user_id && period_start && period_end) {
        try {
          await sb.from('subscription_periods').insert({
            user_id,
            product_key,
            stripe_subscription_id: subId || null,
            stripe_invoice_id: invoice.id,
            period_start: new Date(period_start * 1000).toISOString(),
            period_end: new Date(period_end * 1000).toISOString(),
            price_cents: amount_cents ?? 0,
            status: invoice.status || 'paid',
            currency: currency || 'usd',
          })

          await sb.from('access_grants').insert({
            user_id,
            product_key: 'ai',
            source: 'subscription_invoice',
            access_starts_at: new Date(period_start * 1000).toISOString(),
            access_ends_at: new Date(period_end * 1000).toISOString(),
            grant_reason: 'Active subscription period',
            status: 'active',
          })
        } catch (e) {
          console.error('Failed to insert subscription period/access grant', e)
        }
      }
    }
  } catch (e) {
    console.error('Webhook handler error:', e)
    return NextResponse.json({ error: 'handler error' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
