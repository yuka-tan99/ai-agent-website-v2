export const dynamic = 'force-dynamic'
export const revalidate = 0
import { supabaseServer } from '@/lib/supabaseServer'
import Link from 'next/link'

export default async function Advisor(){
  const supa = await supabaseServer()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return <main className="container py-16"><Link href="/signin" className="underline">Sign in</Link></main>

  const { data } = await supa.from('purchases').select('product_key,status').eq('user_id', user.id)
  const hasAdvisor = (data||[]).some(p=>p.product_key==='advisor' && p.status==='paid')
  if (!hasAdvisor) return <main className="container py-16">Subscribe to access the AI Advisor. <Link className="underline" href="/dashboard">Go back</Link></main>

  return (
    <main className="container py-16">
      <h1 className="text-2xl font-semibold mb-2">AI Advisor</h1>
      <p className="text-gray-600 mb-6">Coming soon: persistent chat + progress feedback.</p>
    </main>
  )
}
