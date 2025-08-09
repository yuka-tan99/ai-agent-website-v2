import { supabaseServer } from '@/lib/supabaseServer'
import ActionPlanBoard from '@/components/ActionPlanBoard'
import { PlatformPie, CadenceBar } from '@/components/Charts'
import Link from 'next/link'

async function getPurchases(userId: string) {
  const supa = await supabaseServer()
  const { data } = await supa.from('purchases').select('product_key,status').eq('user_id', userId)
  return data || []
}

export default async function Dashboard() {
  const supa = await supabaseServer()
  const { data: { user } } = await supa.auth.getUser()

  if (!user) {
    return (
      <main className="container py-16">
        <h1 className="text-2xl font-bold mb-4">Please sign in</h1>
        <Link href="/signin" className="underline">Go to sign in</Link>
      </main>
    )
  }

  const purchases = await getPurchases(user.id)
  const hasPlan = purchases.some(p => p.product_key==='plan' && p.status==='paid')
  const hasAdvisor = purchases.some(p => p.product_key==='advisor' && p.status==='paid')
  const hasExpert = purchases.some(p => p.product_key==='expert' && p.status==='paid')

  if (!hasPlan) {
    return (
      <main className="container py-16">
        <h1 className="text-2xl font-bold mb-4">Access requires purchase</h1>
        <Link className="px-6 py-3 rounded-xl bg-black text-white" href="/paywall">Buy $39</Link>
      </main>
    )
  }

  const sampleBlocks = [
    { type: 'metric', title: 'Target KPI', value: '+500 followers / 30d' },
    { type: 'task', title: 'Daily Reps', items: ['2x Shorts','1x Story','10 comments'] },
    { type: 'prompt', title: 'Hook Formulas', items: ['I tried X so you don\'t have to','3 mistakes you\'re making in Y'] },
    { type: 'example', title: 'Post Ideas', items: ['BTS of A','My 30-day transformation'] },
    { type: 'timebox', title: 'Time Budget', value: '45 min/day' },
  ] as any

  const platformData = [
    { name: 'TikTok', value: 40 },
    { name: 'Instagram', value: 30 },
    { name: 'YouTube', value: 20 },
    { name: 'Pinterest', value: 10 },
  ]
  const cadence = [
    { name: 'Mon', posts: 2 },
    { name: 'Tue', posts: 2 },
    { name: 'Wed', posts: 2 },
    { name: 'Thu', posts: 2 },
    { name: 'Fri', posts: 3 },
    { name: 'Sat', posts: 1 },
    { name: 'Sun', posts: 1 },
  ]

  return (
    <main className="container py-10 space-y-8">
      <section>
        <h2 className="text-xl font-bold mb-4">Your Action Plan</h2>
        <ActionPlanBoard stepTitle="01 Persona & Pillars" blocks={sampleBlocks} stepCount={7} />
      </section>

      <section>
        <h2 className="text-xl font-bold mb-4">Analytics Overview</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <PlatformPie data={platformData} />
          <CadenceBar data={cadence} />
        </div>
      </section>

      {hasPlan && (
        <section className="grid sm:grid-cols-2 gap-4">
          {!hasAdvisor && (
            <div className="card p-6">
              <h3 className="text-lg font-semibold mb-2">$9/mo — Ongoing AI Advisor</h3>
              <p className="text-sm text-gray-600 mb-4">Personalized check‑ins, iteration, and accountability.</p>
              <form action="/api/stripe/checkout?product=advisor" method="post">
                <button className="px-6 py-3 rounded-xl bg-black text-white">Continue</button>
              </form>
            </div>
          )}
          {!hasExpert && (
            <div className="card p-6">
              <h3 className="text-lg font-semibold mb-2">$150 — 1:1 Expert Session</h3>
              <p className="text-sm text-gray-600 mb-4">Live strategy session with an expert. Clear next steps.</p>
              <form action="/api/stripe/checkout?product=expert" method="post">
                <button className="px-6 py-3 rounded-xl bg-black text-white">Book Session</button>
              </form>
            </div>
          )}
        </section>
      )}
    </main>
  )
}
