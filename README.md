# AI Fame Coach — Starter (Auth + Paid Gating + AI + RAG + Upsells)

This build includes:
- Supabase Auth (email OTP)
- Stripe: $39 **Plan Unlock** (one-time), $9/mo **AI Advisor** (subscription), $150 **1:1 Expert Session** (one-time)
- Upsells only appear **after** the $39 plan is purchased
- OpenAI plan generator + pgvector RAG
- Apple-style UX skeleton: onboarding → blurred paywall preview → dashboard (charts/cards)

## Env
Copy `.env.example` → `.env.local` and fill:
```
OPENAI_API_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
PRICE_ID_PLAN=
PRICE_ID_ADVISOR=
PRICE_ID_EXPERT=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Commands
```bash
npm i
npm run dev
# seed KB (dev)
curl -X POST http://localhost:3000/api/kb/seed
# webhook
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Flow: /signin → /onboarding → /checkout?product=plan → /dashboard → Upsell cards → /advisor after subscription.
