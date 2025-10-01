"use client"

import React, { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ReportCard, ReportSectionId, LessonPack } from '@/types/report'

export default function ReportBoard() {
  const router = useRouter()
  const [cards, setCards] = useState<ReportCard[]>(() => {
    if (typeof window === 'undefined') return []
    try {
      const raw = localStorage.getItem('board_cards_v1')
      const cached = raw ? JSON.parse(raw) : []
      return Array.isArray(cached) ? cached : []
    } catch { return [] }
  })
  const [open, setOpen] = useState<ReportSectionId | null>(null)
  const [lesson, setLesson] = useState<LessonPack | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [openMap, setOpenMap] = useState<Record<string, boolean>>({})
  const triesRef = useRef(0)
  const fetchingRef = useRef(false)
  const lessonsCacheRef = useRef<Record<string, LessonPack>>({})
  const [hasCache, setHasCache] = useState(() => (typeof window !== 'undefined' ? !!(localStorage.getItem('board_cards_v1') || '').length : false))
  const [fadeIn, setFadeIn] = useState(() => (typeof window !== 'undefined' && !!(localStorage.getItem('board_cards_v1') || '').length))
  const [hydrated, setHydrated] = useState(false)

  const fetchCards = async () => {
    if (fetchingRef.current) return
    fetchingRef.current = true
    setLoading(true)
    try {
      const res = await fetch('/api/report/board', { cache: 'no-store', credentials: 'include' })
      if (!res.ok) {
        if (res.status === 402) { router.replace('/paywall'); return }
        const t = await res.text().catch(()=> '')
        throw new Error(t || `HTTP ${res.status}`)
      }
      const j = await res.json()
      if (Array.isArray(j.cards)) {
        setCards(j.cards)
        try { localStorage.setItem('board_cards_v1', JSON.stringify(j.cards)) } catch {}
        setFadeIn(true)
        setTimeout(() => setFadeIn(false), 250)
      }
    } catch (e:any) {
      setError(e?.message || 'Failed to load report')
    } finally {
      setLoading(false)
      fetchingRef.current = false
    }
  }

  useEffect(() => {
    let mounted = true
    // Mark as hydrated to avoid SSR/CSR mismatch
    setHydrated(true)
    // Always try instant paint from local cache
    try {
      const raw = localStorage.getItem('board_cards_v1')
      if (raw) {
        const cached = JSON.parse(raw)
        if (Array.isArray(cached) && cached.length) {
          setCards(cached)
          setHasCache(true)
        }
      }
    } catch {}
    // Always fetch fresh once
    fetchCards()

    // Smooth progressive fill: poll quickly for a short time until cards are present
    const id = setInterval(() => {
      if (!mounted) return
      if (cards.length >= 2 || error) { clearInterval(id); return }
      if (triesRef.current >= 25) { clearInterval(id); return }
      triesRef.current += 1
      fetchCards()
    }, 1200)

    return () => { mounted = false; clearInterval(id) }
  }, [])

  const openLearn = async (sectionId: ReportSectionId) => {
    setOpen(sectionId)
    const cache = lessonsCacheRef.current
    if (cache[sectionId]) {
      setLesson(cache[sectionId])
      return
    }
    setLesson(null)
    setLoading(true)
    try {
      const res = await fetch(`/api/lesson?section=${encodeURIComponent(sectionId)}`, { cache: 'no-store', credentials: 'include' })
      if (!res.ok && res.status === 402) { router.replace('/paywall'); return }
      const j = await res.json()
      if (j?.lesson) {
        cache[sectionId] = j.lesson as LessonPack
        setLesson(j.lesson)
      }
    } catch {}
    setLoading(false)
  }

  function IconBadge({ id }: { id: string }) {
    const size = 48
    const circleStyle: React.CSSProperties = {
      width: size, height: size, borderRadius: 9999,
      background: 'radial-gradient(circle at 30% 30%, var(--accent-grape), #8b5cf6)',
      boxShadow: '0 0 0 2px rgba(255,255,255,0.6)'
    }
    const svg = (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        {id === 'strategic_foundation' ? (
          <>
            <path d="M3 20h18"/>
            <rect x="6" y="10" width="3" height="7" />
            <rect x="11" y="6" width="3" height="11" />
            <rect x="16" y="13" width="3" height="4" />
          </>
        ) : (
          <>
            <circle cx="12" cy="12" r="9"/>
            <path d="M12 7v6l4 2"/>
          </>
        )}
      </svg>
    )
    return <div className="flex items-center justify-center" style={circleStyle}>{svg}</div>
  }

  return (
    <div className="max-w-5xl mx-auto">
      {error && (
        <div className="dashboard-card p-4 mb-4 text-sm text-red-600">{error}</div>
      )}
      {/* No placeholder: keep UI clean; content will fade in when available */}
      {hydrated && (
        <div className={["grid grid-cols-1 gap-8 transition-opacity duration-300", fadeIn ? "opacity-0" : "opacity-100"].join(' ')}>
          {cards.map((c) => {
            const isOpen = openMap[c.sectionId] ?? true
            return (
              <section key={c.sectionId} className="dashboard-card p-5">
                {/* Header: icon + title, plus/minus at right */}
                <button
                  className="w-full flex items-center justify-between text-left"
                  onClick={() => setOpenMap(m => ({ ...m, [c.sectionId]: !(m[c.sectionId] ?? true) }))}
                  aria-expanded={isOpen}
                >
                  <div className="flex items-center gap-3">
                    <IconBadge id={c.sectionId} />
                    <span className="text-lg font-semibold text-gray-900">{c.title}</span>
                  </div>
                  <span className="text-xl text-gray-800" aria-hidden>{isOpen ? '–' : '+'}</span>
                </button>

                {/* Body */}
                {isOpen && (
                  <div className="mt-3">
                    <ul className="list-disc pl-6 text-base text-gray-800 space-y-2 mb-4">
                      {c.insights.slice(0,5).map((s,i)=> (
                        <li key={i} className="reveal-item" style={{animationDelay: `${i*80}ms`}}>{s}</li>
                      ))}
                    </ul>
                    <div className="text-sm uppercase tracking-wide text-gray-500 mb-2">quick wins</div>
                    <ul className="list-disc pl-6 text-base text-gray-800 space-y-2 mb-5">
                      {c.quickWins.slice(0,4).map((s,i)=> (
                        <li key={i} className="reveal-item" style={{animationDelay: `${200 + i*80}ms`}}>{s}</li>
                      ))}
                    </ul>
                    <div className="mt-4 flex items-center justify-center text-base text-gray-800">
                      <Link
                        href={`/dashboard/report-board/${encodeURIComponent(c.sectionId)}`}
                        className="rounded-full bg-[var(--accent-grape)] text-white px-6 md:px-8 py-3 text-lg md:text-xl hover:bg-[#874E95] transition transform hover:scale-[1.03] active:scale-[0.98]"
                      >
                        learn more
                      </Link>
                    </div>
                  </div>
                )}
              </section>
            )
          })}
        </div>
      )}

      {/* Full-page learn is now a route; side panel removed */}
      {/* spacer so floating chat button doesn’t overlap last card */}
      <div className="h-28" aria-hidden />
      <style jsx>{`
        .reveal-item { opacity: 0; transform: translateY(4px); animation: fadeUp .38s ease forwards; }
        @keyframes fadeUp { to { opacity: 1; transform: none; } }
      `}</style>
    </div>
  )
}
