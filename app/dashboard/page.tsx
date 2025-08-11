import { supabaseServer } from '@/lib/supabaseServer'
import CreatorReport from '@/components/report/CreatorReport'
import Link from 'next/link'

const DEV_BYPASS = process.env.NEXT_PUBLIC_DEV_BYPASS_PLAN === 'true'

async function hasPlan(userId: string) {
  const supa = await supabaseServer()
  const { data } = await supa
    .from('purchases')
    .select('id')
    .eq('user_id', userId)
    .eq('product_key', 'plan')
    .eq('status', 'paid')
    .maybeSingle()
  return !!data
}

export default async function Dashboard() {
  // DEV BYPASS — skip auth and paywall in development
  if (DEV_BYPASS) {
    return (
      <main className="container py-10">
        <div className="mb-6 rounded-xl border p-3 text-xs text-gray-600">
          Dev bypass is ON — rendering full report without payment.
        </div>
        <CreatorReport />
      </main>
    )
  }

  // Normal auth flow
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

  if (!(await hasPlan(user.id))) {
    return (
      <main className="container py-16">
        <h1 className="text-2xl font-bold mb-4">Unlock your plan</h1>
        <p className="mb-6 text-gray-600">You’ll get the full, interactive report.</p>
        <Link
          className="px-6 py-3 rounded-xl bg-black text-white"
          href="/paywall"
        >
          Go to paywall
        </Link>
      </main>
    )
  }

  return (
    <main className="container py-10">
      <CreatorReport />
    </main>
  )
}