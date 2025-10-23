
  # BECOMEFAMOUS.AI

  This is a code bundle for becomefamous AI website. 

  ## Running the code

Run `npm i` to install the dependencies.

Run `npm run dev` to start the development server.

## Supabase integration

1. Install the client library with `npm install @supabase/supabase-js`.
2. Copy your Supabase project URL and anon key into `.env.local` as:
   ```
   VITE_SUPABASE_URL=...
   VITE_SUPABASE_ANON_KEY=...
   ```
   (Keep `SUPABASE_SERVICE_ROLE_KEY` server-side only; do not expose it to the browser.)
3. The shared client lives in `src/lib/supabaseClient.ts`. Import it anywhere you need to read or write data:
   ```ts
   import { supabase } from "@/lib/supabaseClient";

   export async function upsertProfile(
     userId: string,
     profile: { city?: string; state?: string; country?: string }
   ) {
     const { error } = await supabase
       .from("profiles")
       .upsert({ user_id: userId, ...profile }, { onConflict: "user_id" });

     if (error) throw error;
   }
   ```
4. Align your API calls with the provided schema—use `.from("<table>").select()`, `.insert()`, `.upsert()`, or `.update()` to sync onboarding answers, chat transcripts, payments, or usage events.
5. Enable Row Level Security policies in Supabase so authenticated users can only read/write their own rows (e.g., `user_id = auth.uid()`).
6. For privileged jobs (writing to `payments`, `subscription_periods`, etc.) create a lightweight backend (Next.js API route, Supabase Edge Function, or serverless worker) that uses `SUPABASE_SERVICE_ROLE_KEY`; call those endpoints from the client instead of using the service role key directly in the browser.
  
This build includes:

Supabase Auth (email OTP)
Stripe: $39 Plan Unlock (one-time), $6/mo AI Advisor (subscription), $150 1:1 Expert Session (one-time)
Upsells only appear after the $39 plan is purchased
ClaudeAI plan generator + pgvector RAG
Cute UX skeleton: onboarding → blurred paywall preview → dashboard (charts/cards)

Fill Env:
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

Commands:
npm i
npm run dev
# seed KB (dev)
curl -X POST http://localhost:3000/api/kb/seed
# webhook
stripe listen --forward-to localhost:3000/api/stripe/webhook