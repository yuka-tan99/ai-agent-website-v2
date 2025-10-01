"use client"

import React, { useEffect, useRef, useState } from "react"
import Link from "next/link"

export default function AIPsychologyPage() {
  const [mounted, setMounted] = useState(false)
  const [typed, setTyped] = useState("")
  const heroRef = useRef<HTMLDivElement | null>(null)
  const bodyRef = useRef<HTMLDivElement | null>(null)
  const endRef = useRef<HTMLDivElement | null>(null)
  const [activeDot, setActiveDot] = useState(0)

  useEffect(() => {
    setMounted(true)
    // Simple typewriter effect for the headline
    const full = "Understanding AI Psychology"
    let i = 0
    const startDelay = setTimeout(() => {
      const id = setInterval(() => {
        i += 1
        setTyped(full.slice(0, i))
        if (i >= full.length) clearInterval(id)
      }, 60)
    }, 200)
    return () => { clearTimeout(startDelay) }
  }, [])

  useEffect(() => {
    const onScroll = () => {
      const anchors = [heroRef.current, bodyRef.current, endRef.current]
      const idx = anchors.findIndex((el) => {
        if (!el) return false
        const r = el.getBoundingClientRect()
        return r.top <= window.innerHeight * 0.35 && r.bottom >= window.innerHeight * 0.35
      })
      if (idx >= 0) setActiveDot(idx)
    }
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className={["report-fade", mounted ? "is-in" : ""].join(" ")}> 
      {/* Fixed Back button (top-left) */}
      <div className="fixed top-[calc(var(--navH,56px)+8px)] left-6 z-50">
        <Link href="/account/report-board" className="bg-white rounded-full p-3 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 inline-flex items-center justify-center text-gray-900 border border-gray-100">
          <span className="text-xl leading-none">←</span>
        </Link>
      </div>
      {/* Back link */}
      <div className="pt-8">
        <div className="max-w-5xl mx-auto px-4 md:px-6">
        {/* Hero */}
        <div ref={heroRef} className="relative overflow-hidden rounded-2xl h-[260px] md:h-[320px]"
             style={{
               // Softer, muted gradient (lavender -> muted green/gray), matching the mock
               background:
                 "linear-gradient(135deg, rgba(155,126,222,0.92), rgba(122,132,113,0.85)), radial-gradient(1200px 320px at -10% -20%, rgba(255,255,255,0.18), rgba(255,255,255,0) 60%)",
             }}>
          {/* soft blob */}
          <div className="absolute -right-10 -top-10 w-64 h-64 rounded-full"
               style={{
                 background:
                   "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.35), rgba(255,255,255,0) 60%)",
                 filter: "blur(2px)",
               }}
          />

          <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center text-white">
            <h1 className="text-3xl md:text-5xl font-light tracking-tight">
              <span>{typed}</span>
              <span className="caret" aria-hidden>|</span>
            </h1>
            <p className="mt-3 text-white/80 text-sm md:text-base">
              How algorithms think and what makes content irresistible
            </p>
          </div>
        </div>
        </div>
      </div>

      {/* Body */}
      <div className="mt-8 mb-16">
        <div className="max-w-5xl mx-auto px-4 md:px-6">
        <section ref={bodyRef} className="dashboard-card p-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">The Algorithm's Mind</h2>
          <p className="text-gray-700 leading-7">
            Every major platform uses sophisticated AI to decide what gets seen. These systems model user psychology—
            they learn patterns of attention, curiosity, and satisfaction—to predict what will keep people engaged.
          </p>

          <div className="mt-6 rounded-2xl border bg-gray-50 p-4">
            <div className="flex items-start gap-3">
              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-200 text-purple-800">★</span>
              <div>
                <div className="font-medium text-gray-900">Key Insight</div>
                <p className="text-gray-700 text-sm mt-1">
                  Algorithms don’t just measure engagement—they predict it. Micro-signals like hover time, scroll speed,
                  and even the pause before a tap influence distribution.
                </p>
              </div>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
            <div className="p-4 rounded-xl border bg-white">
              <div className="text-purple-700 font-medium">Pattern Detection</div>
              <p className="text-sm text-gray-700 mt-1">A/B-like exploration identifies formats and hooks that keep attention.</p>
            </div>
            <div className="p-4 rounded-xl border bg-white">
              <div className="text-purple-700 font-medium">User Modeling</div>
              <p className="text-sm text-gray-700 mt-1">Feeds adapt to a person’s micro-preferences across sessions.</p>
            </div>
            <div className="p-4 rounded-xl border bg-white">
              <div className="text-purple-700 font-medium">Reward Loops</div>
              <p className="text-sm text-gray-700 mt-1">Retention and shares are reinforced when curiosity is resolved fast.</p>
            </div>
          </div>
        </section>
        {/* Bottom anchor for dot nav */}
        <div ref={endRef} className="h-24" />
        </div>
      </div>

      {/* Right-side dot navigation */}
      <div className="fixed right-6 top-1/2 -translate-y-1/2 hidden md:flex flex-col items-center gap-3" aria-label="Page navigation">
        {[0,1,2].map((i) => (
          <button
            key={i}
            className={`w-3 h-3 rounded-full transition-transform duration-200 ${activeDot===i ? 'bg-[var(--accent-grape)] scale-125' : 'bg-purple-300 hover:scale-125'}`}
            onClick={() => {
              const targets = [heroRef.current, bodyRef.current, endRef.current]
              const el = targets[i]; if (el) el.scrollIntoView({ behavior: 'smooth' })
            }}
            aria-label={`Go to section ${i+1}`}
          />
        ))}
      </div>

      <style jsx>{`
        .caret { margin-left: 2px; display: inline-block; opacity: 1; animation: blink 1s steps(2, start) infinite; }
        @keyframes blink { to { visibility: hidden; } }
      `}</style>
    </div>
  )
}
