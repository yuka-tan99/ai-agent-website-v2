"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

export default function PreparingPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const phrases = [
    'preparing your personalized report…',
    'your growth plan is almost here…',
    'synthesizing behavioral insights…',
    'optimizing for algorithm + audience…',
    'ready to unlock your path to fame',
  ]
  const [idx, setIdx] = useState(0)
  const [fade, setFade] = useState(false)

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
        if (!cancelled) router.replace('/dashboard', { scroll: true })
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to prepare your report')
      }
    })()
    return () => { cancelled = true }
  }, [router])

  // Rotate status phrases with a soft fade every 2s
  useEffect(() => {
    let mounted = true
    // Rotate roughly every ~2.4s (slightly slower than 2s)
    const id = setInterval(() => {
      if (!mounted) return
      setFade(true)
      // swap text after fade-out
      setTimeout(() => {
        if (!mounted) return
        setIdx((i) => (i + 1) % phrases.length)
        setFade(false)
      }, 260)
    }, 2400)
    return () => { mounted = false; clearInterval(id) }
  }, [])

  return (
    <main className="container min-h-screen flex items-start justify-center pt-[18vh] md:pt-[20vh]">
      <div className="text-center will-change-transform">
        <div
          className="loader mx-auto"
          role="status"
          aria-label="Preparing your report"
          style={{ width: 112 }}
        />
        <div className={["mt-5 text-gray-700 text-2xl md:text-3xl font-medium transition-opacity duration-300", fade ? "opacity-0" : "opacity-100"].join(' ')}>
          {phrases[idx]}
        </div>
        {error && (
          <div className="mt-4 text-red-600 text-sm">{error}</div>
        )}
      </div>
    </main>
  )
}
