"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

export default function PreparingPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        // POST once; server returns existing plan if present, or generates then returns
        const res = await fetch('/api/report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          cache: 'no-store',
          body: JSON.stringify({ force: false }),
        })

        if (!res.ok) {
          const msg = (await res.text()).slice(0, 200)
          if (res.status === 401) return router.replace('/signin?next=' + encodeURIComponent('/dashboard'))
          if (res.status === 400) return router.replace('/onboarding')
          throw new Error(msg || `HTTP ${res.status}`)
        }
        if (!cancelled) router.replace('/dashboard')
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to prepare your report')
      }
    })()
    return () => { cancelled = true }
  }, [router])

  return (
    <main className="container min-h-[60vh] flex items-center justify-center">
      <div className="text-center">
        <div className="loader mx-auto" role="status" aria-label="Preparing your report" />
        <div className="mt-4 text-gray-700">preparing your report…</div>
        {error && (
          <div className="mt-4 text-red-600 text-sm">{error}</div>
        )}
      </div>
    </main>
  )
}

