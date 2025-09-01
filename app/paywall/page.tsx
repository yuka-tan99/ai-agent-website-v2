'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { redirect, useRouter } from 'next/navigation'
import { PlatformPie, CadenceBar } from '@/components/Charts'

const DEV_BYPASS = process.env.NEXT_PUBLIC_DEV_BYPASS_PLAN === "true";
if (DEV_BYPASS) {
  redirect("/dashboard"); // 👈 skip paywall entirely in dev/preview
}

export default function Paywall(){
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [planPreview, setPlanPreview] = useState<any>(null)

  useEffect(() => {
    // Kick off plan generation for preview (best-effort)
    ;(async () => {
      try {
        const persona = JSON.parse(localStorage.getItem('onboarding') || '{}')
        const res = await fetch('/api/plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ persona })
        })
        const data = await res.json()
        setPlanPreview(data)
      } catch {
        // ignore preview errors
      }
    })()
  }, [])

  const checkout = async () => {
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/stripe/checkout?product=plan', { method: 'POST' })
      const data = await res.json().catch(() => ({}))

      if (res.status === 401) {
        setError('Please sign in to continue.')
        router.push('/signin')
        return
      }
      if (res.ok && data?.url) {
        window.location.href = data.url
        return
      }
      setError(data?.error || 'Unable to start checkout. Check your Stripe env vars.')
    } catch (e: any) {
      setError(e.message || 'Unexpected error starting checkout.')
    } finally {
      setLoading(false)
    }
  }

  // demo chart data if preview doesn't include numbers yet
  const platformData = [
    { name: 'TikTok', value: 40 },
    { name: 'Instagram', value: 30 },
    { name: 'YouTube', value: 20 },
    { name: 'Pinterest', value: 10 },
  ]
  const cadence = [
    { name: 'Mon', posts: 2 },{ name: 'Tue', posts: 2 },{ name: 'Wed', posts: 2 },
    { name: 'Thu', posts: 2 },{ name: 'Fri', posts: 3 },{ name: 'Sat', posts: 1 },{ name: 'Sun', posts: 1 },
  ]

  return (
    <main className="container py-12">
      <h1 className="text-3xl font-semibold mb-2">Your plan is ready</h1>
      <p className="mb-6 text-gray-600">Unlock the full strategy for a one-time $39.</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 card p-4 blur-lock">
          <div className="flex items-center justify-between mb-3">
            <div className="font-semibold">Strategy Overview</div>
            <div className="text-sm text-gray-500">Preview</div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <div className="font-medium mb-1">Profile Summary</div>
              <div className="h-24 rounded-xl border bg-white/60" />
            </div>
            <div>
              <div className="font-medium mb-1">Top Roadblocks</div>
              <div className="h-24 rounded-xl border bg-white/60" />
            </div>
          </div>

          <div className="mt-4 grid sm:grid-cols-2 gap-4">
            <div className="h-72 rounded-xl overflow-hidden">
              <PlatformPie data={platformData} />
            </div>
            <div className="h-72 rounded-xl overflow-hidden">
              <CadenceBar data={cadence} />
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="text-xl font-semibold mb-2">$39 — Unlock Full Plan</div>
          <p className="text-sm text-gray-600 mb-4">One-time payment. Instant access.</p>
          <button
            onClick={checkout}
            className="w-full px-6 py-3 rounded-xl bg-[#8B6F63] text-white disabled:opacity-60"
            disabled={loading}
          >
            {loading ? 'Redirecting…' : 'Unlock Now'}
          </button>
          {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
          <p className="text-xs text-gray-500 mt-3">You’ll see everything unblurred right after payment.</p>
        </div>
      </div>

      <div className="mt-8 text-sm text-gray-500">
        Already purchased? <Link className="underline" href="/dashboard">Go to dashboard</Link>
      </div>
    </main>
  )
}
