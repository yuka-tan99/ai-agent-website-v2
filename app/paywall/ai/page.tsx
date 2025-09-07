"use client"
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AiPaywall() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [autoRenew, setAutoRenew] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const startCheckout = async () => {
    setError(null)
    setLoading(true)
    try {
      const mode = autoRenew ? 'subscription' : 'payment'
      const res = await fetch(`/api/stripe/checkout?product=ai&mode=${mode}`, { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (res.status === 401) {
        router.push('/signin')
        return
      }
      if (res.ok && data?.url) { window.location.href = data.url; return }
      setError(data?.error || 'Unable to start checkout. Check Stripe env vars.')
    } catch (e: any) {
      setError(e.message || 'Unexpected error starting checkout.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="container max-w-lg mx-auto py-12 px-4">
      <h1 className="text-2xl font-semibold mb-2">AI chat access</h1>
      <p className="text-gray-600 mb-6">Get unlimited access to your AI mentor chat.</p>

      <div className="rounded-2xl border p-5 shadow-sm bg-white">
        <div className="flex items-baseline justify-between">
          <div>
            <div className="text-xl font-semibold">$6/month</div>
            <div className="text-sm text-gray-600">Cancel anytime</div>
          </div>
        </div>

        <label className="mt-5 flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            checked={autoRenew}
            onChange={(e) => setAutoRenew(e.target.checked)}
            className="mt-1"
          />
          <span>
            Automatically renew every month
            <div className="text-xs text-gray-500">Uncheck to purchase a one-month pass (no auto-renew).</div>
          </span>
        </label>

        <button
          onClick={startCheckout}
          disabled={loading}
          className="mt-6 w-full rounded-xl bg-[var(--accent-grape)] text-white py-3 disabled:opacity-60 hover:bg-[#874E95]"
        >
          {loading ? 'Redirecting…' : autoRenew ? 'Subscribe for $6/month' : 'Buy 1‑month pass for $6'}
        </button>

        {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
      </div>
    </main>
  )
}
