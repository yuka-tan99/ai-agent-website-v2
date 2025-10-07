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
  const gateReady = (() => {
    const n = Number(search.get('min_ready') || 1)
    if (Number.isFinite(n) && n >= 1 && n <= 5) return n
    return 1
  })()

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const forceFlag = (search.get('force') || '').toLowerCase() === 'true'
        if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_DEBUG_LOG === 'true') {
          console.log('[preparing] starting generation', { forceFlag, source: search.get('source') || null })
        }
        if (!forceFlag) {
          try {
            const existingRes = await fetch('/api/report', { cache: 'no-store', credentials: 'include' })
            if (!cancelled && existingRes.ok) {
              const existingJson = await existingRes.json().catch(() => ({}))
              if (existingJson?.plan) {
                router.replace('/dashboard')
                return
              }
            }
          } catch {}
        }
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
          if (!cancelled) setError('Failed to start generation. Refresh to retry.')
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to start generation')
      }
    })()
    return () => { cancelled = true }
  }, [router, search])

  useEffect(() => {
    try { router.prefetch?.('/dashboard') } catch {}
  }, [router])

  useEffect(() => {
    let mounted = true
    const id = setInterval(() => {
      if (!mounted) return
      setFade(true)
      setTimeout(() => {
        if (!mounted) return
        setIdx((i) => (i + 1) % phrases.length)
        setFade(false)
      }, 260)
    }, 2400)
    return () => { mounted = false; clearInterval(id) }
  }, [])

  useEffect(() => {
    let active = true
    const tick = async () => {
      try {
        const r = await fetch('/api/report/progress', { cache: 'no-store' })
        const j = await r.json().catch(()=>({}))
        if (!active) return
        const pctNum = Number(j?.pct)
        if (Number.isFinite(pctNum)) {
          const capped = (j?.sections && Object.values(j.sections).filter(Boolean).length < gateReady)
            ? Math.min(94, pctNum)
            : pctNum
          setPct((p) => Math.max(p, Math.min(100, capped)))
        }

        const readyCount = j?.sections ? Object.values(j.sections as Record<string, boolean>).filter(Boolean).length : 0
        const gateMet = readyCount >= gateReady
        if (gateMet || j?.done || j?.phase === 'done') {
          setPct(100)
          setTimeout(() => router.replace('/dashboard'), 250)
          return
        }
      } catch {}
      if (active) setTimeout(tick, 700)
    }
    tick()
    return () => { active = false }
  }, [gateReady, router])

  useEffect(() => {
    let mounted = true
    const id = setInterval(() => {
      if (!mounted) return
      const elapsed = (Date.now() - startedRef) / 1000
      const target = Math.min(85, Math.round((elapsed / 45) * 85))
      setSimPct((prev) => Math.max(prev, Math.min(85, target)))
    }, 1000)
    return () => { mounted = false; clearInterval(id) }
  }, [startedRef])

  useEffect(() => {
    if (typeof window === 'undefined' || !('EventSource' in window)) return
    const es = new EventSource('/api/report/stream')
    sseRef.current = es
    let navigated = false
    const maybeNavigate = async () => {
      if (navigated) return
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
  }, [router, gateReady])

  const percent = Math.max(pct, simPct)

  return (
    <main className="container min-h-screen flex items-start justify-center pt-[18vh] md:pt-[20vh]">
      <div className="text-center will-change-transform">
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
