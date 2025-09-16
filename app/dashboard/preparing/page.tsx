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
  const [pct, setPct] = useState(5)

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
          try { console.warn('[preparing] /api/report failed', res.status, await res.text()) } catch {}
          const msg = (await res.text()).slice(0, 200)
          if (res.status === 401) return router.replace('/signin?next=' + encodeURIComponent('/dashboard'))
          if (res.status === 400) return router.replace('/onboarding')
          throw new Error(msg || `HTTP ${res.status}`)
        }
        if (!cancelled) {
          try { setPct(100) } catch {}
          router.replace('/dashboard', { scroll: true })
        }
      } catch (e: any) {
        console.error('[preparing] error generating report', e)
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

  // Simulated progress while waiting for server (cap at 90%)
  // Replace simulation with real backend progress polling
  useEffect(() => {
    let active = true
    const tick = async () => {
      try {
        const r = await fetch('/api/report/progress', { cache: 'no-store' })
        const j = await r.json().catch(()=>({}))
        if (!active) return
        if (j?.pct != null) setPct(Math.max(0, Math.min(100, Number(j.pct))))
        if (j?.done) return // will redirect from POST completion
      } catch {}
      if (active) setTimeout(tick, 700)
    }
    tick()
    return () => { active = false }
  }, [])

  return (
    <main className="container min-h-screen flex items-start justify-center pt-[18vh] md:pt-[20vh]">
      <div className="text-center will-change-transform">
        {/* progress */}
        <div className="mb-3 w-[280px] mx-auto">
          <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
            <span>Generating report</span>
            <span className="font-semibold text-gray-800">{pct}%</span>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${pct}%` }} />
          </div>
        </div>
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
