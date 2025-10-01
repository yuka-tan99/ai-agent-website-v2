"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"

export default function PreparingPage() {
  const router = useRouter()
  const search = useSearchParams()
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
  const [simPct, setSimPct] = useState(5)
  const startedRef = useState<number>(() => Date.now())[0]
  const sseRef = useRef<EventSource | null>(null)
  // Configurable gate: require N sections ready before navigating
  const gateReady = (() => {
    const n = Number(search.get('min_ready') || 1)
    if (Number.isFinite(n) && n >= 1 && n <= 5) return n
    // Default: navigate when at least one section is ready
    return 1
  })()

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      // Kick off generation and handle common redirects (no onboarding / unpaid)
      try {
        const forceFlag = (search.get('force') || '').toLowerCase() === 'true'
        const res = await fetch('/api/report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          cache: 'no-store',
          body: JSON.stringify({ force: forceFlag }),
          keepalive: true,
        })
        if (!res.ok) {
          if (res.status === 400) { router.replace('/onboarding'); return }
          if (res.status === 402) { router.replace('/paywall'); return }
        }
      } catch {}
    })()
    return () => { cancelled = true }
  }, [])

  // Prefetch target route for a snappier transition
  useEffect(() => {
    try {
      // @ts-ignore app router may expose prefetch
      router.prefetch?.('/dashboard')
    } catch {}
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

  // Simulated progress while waiting for server (cap at 85%)
  // Combine real backend polling with a gentle time-based simulation
  useEffect(() => {
    let active = true
    const tick = async () => {
      try {
        const r = await fetch('/api/report/progress', { cache: 'no-store' })
        const j = await r.json().catch(()=>({}))
        if (!active) return
        const pctNum = Number(j?.pct)
        if (Number.isFinite(pctNum)) {
          // While we haven't met the gate, avoid hitting 100% to prevent a stuck look
          const capped = (j?.sections && Object.values(j.sections).filter(Boolean).length < gateReady)
            ? Math.min(94, pctNum)
            : pctNum
          setPct((p) => Math.max(p, Math.min(100, capped)))
        }

        // Navigate when gate met (or when fully done as fallback)
        const readyCount = j?.sections ? Object.values(j.sections as Record<string, boolean>).filter(Boolean).length : 0
        const gateMet = readyCount >= gateReady
        if (gateMet || j?.done || j?.phase === 'done') {
          try {
            const r2 = await fetch('/api/report/board', { cache: 'no-store', credentials: 'include' })
            const j2: any = await r2.json().catch(() => null)
            if (j2 && Array.isArray(j2.cards) && j2.cards.length > 0) {
              try { localStorage.setItem('board_cards_v1', JSON.stringify(j2.cards)) } catch {}
            }
          } catch {}
          setPct(100)
          setTimeout(() => router.replace('/dashboard'), 250)
          return
        }
      } catch {}
      if (active) setTimeout(tick, 700)
    }
    tick()
    return () => { active = false }
  }, [])

  // Time-based smoothing: drift towards 85% over ~45s if server is quiet
  useEffect(() => {
    let mounted = true
    const id = setInterval(() => {
      if (!mounted) return
      const elapsed = (Date.now() - startedRef) / 1000 // seconds
      const target = Math.min(85, Math.round((elapsed / 45) * 85))
      setSimPct((prev) => Math.max(prev, Math.min(85, target)))
    }, 1000)
    return () => { mounted = false; clearInterval(id) }
  }, [startedRef])

  // Prefer SSE for progress + readiness; fallback to existing polling block below
  useEffect(() => {
    if (typeof window === 'undefined' || !('EventSource' in window)) return
    const es = new EventSource('/api/report/stream')
    sseRef.current = es
    let navigated = false
    const maybeNavigate = async () => {
      if (navigated) return
      // Navigate to report board as soon as gate is met
      navigated = true
      router.replace('/dashboard')
    }
    es.addEventListener('progress', (evt: any) => {
      try {
        const j = JSON.parse(evt.data || '{}')
        if (typeof j.pct === 'number') setPct((p) => Math.max(p, j.pct))
      } catch {}
    })
    es.addEventListener('sections', (evt: any) => {
      try {
        const ready = JSON.parse(evt.data || '{}') as Record<string, boolean>
        const readyCount = Object.values(ready).filter(Boolean).length
        if (readyCount >= gateReady) void maybeNavigate()
      } catch {}
    })
    es.addEventListener('done', () => {
      setPct(100)
      setTimeout(() => router.replace('/dashboard'), 250)
      try { es.close() } catch {}
      sseRef.current = null
    })
    es.onerror = () => {
      try { es.close() } catch {}
      sseRef.current = null
    }
    return () => {
      try { es.close() } catch {}
      sseRef.current = null
    }
  }, [router])

  const percent = Math.max(pct, simPct)
  return (
    <main className="container min-h-screen flex items-start justify-center pt-[18vh] md:pt-[20vh]">
      <div className="text-center will-change-transform">
        {/* Rotating circle loader with percentage inside (larger, centered) */}
        <div className="relative mx-auto h-40 w-40 mb-4" role="status" aria-label="Generating your report">
          <div className="absolute inset-0 rounded-full border-[6px] border-[rgba(155,126,222,.22)] border-t-[#9B7EDE] animate-spin shadow-[inset_0_0_0_6px_rgba(155,126,222,.08)]" />
          <div className="absolute inset-0 flex items-center justify-center text-2xl md:text-3xl font-semibold text-gray-800">
            {percent}%
          </div>
        </div>
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
