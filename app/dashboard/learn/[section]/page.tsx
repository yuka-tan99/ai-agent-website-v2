"use client"

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { LessonPack } from '@/types/report'

export default function DashboardLearnPage() {
  const { section } = useParams() as { section: string }
  const router = useRouter()
  const [lesson, setLesson] = useState<LessonPack | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [curIdx, setCurIdx] = useState(0)
  const sectionsRef = useRef<Array<HTMLElement | null>>([])
  const [depth, setDepth] = useState<2|3>(2)

  const titles = useMemo(() => {
    if (section === 'strategic_foundation') {
      return ['Hook Creation','Brand Building','Perfectionism']
    }
    return [
      "Diagnosis: What’s Really Blocking You",
      'Interventions: Imperfectionist Toolkit',
      'Execution: Tiny Wins & Streak Plan',
    ]
  }, [section])

  useEffect(() => {
    let cancel = false
    ;(async () => {
      try {
        const res = await fetch(`/api/lesson?section=${encodeURIComponent(section)}&depth=${depth}`, { cache: 'no-store', credentials: 'include' })
        if (!res.ok) {
          if (res.status === 402) return router.replace('/paywall')
          const txt = await res.text().catch(()=> '')
          throw new Error(txt || `HTTP ${res.status}`)
        }
        const j = await res.json()
        if (!cancel) setLesson(j.lesson || null)
      } catch (e: any) {
        if (!cancel) setError(e?.message || 'Failed to load')
      } finally {
        if (!cancel) setLoading(false)
      }
    })()
    return () => { cancel = true }
  }, [section, router, depth])

  useEffect(() => {
    const getTargets = (): HTMLElement[] => {
      if (depth === 2) {
        return sectionsRef.current.filter(Boolean) as HTMLElement[]
      }
      const ids = ['adv','edge','fail','long','src']
      return ids.map(id => document.getElementById(id)).filter(Boolean) as HTMLElement[]
    }
    const onScroll = () => {
      const els = getTargets()
      const idx = els.findIndex((el) => {
        const r = el.getBoundingClientRect()
        return r.top <= 160 && r.bottom >= 200
      })
      if (idx >= 0) setCurIdx(idx)
    }
    window.addEventListener('scroll', onScroll)
    try { onScroll() } catch {}
    return () => window.removeEventListener('scroll', onScroll)
  }, [depth])

  function next() {
    const nextIdx = Math.min(titles.length - 1, curIdx + 1)
    const el = sectionsRef.current[nextIdx]
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  }

  function goElaborate() {
    try { window.scrollTo({ top: 0, behavior: 'smooth' }) } catch {}
    setLesson(null)
    setLoading(true)
    setDepth(3)
  }

  function complete() {
    const overlay = document.createElement('div')
    overlay.className = 'fixed inset-0 bg-black/50 z-50 flex items-center justify-center'
    overlay.innerHTML = `
      <div class="bg-white rounded-3xl p-8 text-center max-w-md mx-auto">
        <div class="w-20 h-20 mx-auto mb-6 rounded-full bg-green-500 flex items-center justify-center">
          <span class="text-3xl">✅</span>
        </div>
        <h3 class="text-2xl font-medium mb-4">Lesson complete!</h3>
        <p class="text-gray-600 mb-6">Great work — keep the momentum going.</p>
        <a href="/dashboard" class="rounded-full px-6 py-3 inline-block text-white" style="background:#9E5DAB">Back to dashboard</a>
      </div>`
    document.body.appendChild(overlay)
  }

  return (
    <main className="py-8">
      {/* Back to dashboard */}
      <div className="fixed top-[calc(var(--navH,56px)+8px)] left-6 z-50">
        <Link href="/dashboard" className="bg-white rounded-full p-3 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 inline-flex items-center justify-center text-gray-900 border border-gray-100" aria-label="Back to dashboard">
          <span className="text-xl leading-none">←</span>
        </Link>
      </div>
      <div className="max-w-5xl mx-auto px-4 md:px-6">
        {loading && (
          <div className="py-24 flex flex-col items-center justify-center">
            <div className="h-40 w-40 rounded-full border-[6px] border-[rgba(155,126,222,.22)] border-t-[#9B7EDE] animate-spin shadow-[inset_0_0_0_6px_rgba(155,126,222,.08)]" aria-label="Loading" />
            <div className="mt-3 text-gray-600">Preparing lesson…</div>
          </div>
        )}
        {error && <div className="text-sm text-red-600">{error}</div>}

        {lesson && depth === 2 && (
          <div className="space-y-16">
            <article ref={(el) => { sectionsRef.current[0] = el }} className="dashboard-card p-0 overflow-hidden">
              <header className="text-white p-10 md:p-12" style={{background:'linear-gradient(135deg, #9B7EDE 0%, #7A8471 100%)'}}>
                <div className="max-w-4xl mx-auto text-center">
                  <div className="w-16 h-16 rounded-full bg-white/20 mx-auto mb-4" />
                  <h2 className="text-3xl md:text-5xl font-light">{titles[0]}</h2>
                  <p className="mt-2 text-white/85">A quick, honest snapshot so we can fix the right problem first</p>
                </div>
              </header>
              <div className="p-6 md:p-10">
                <div className="max-w-4xl mx-auto">
                  <div className="pl-4 border-l-4 border-[var(--accent-grape)]">
                    <h3 className="text-2xl font-semibold text-gray-900 mb-2">What’s going on</h3>
                    <p className="text-gray-700 leading-relaxed">{lesson.overview}</p>
                  </div>
                  <div className="mt-6 rounded-2xl bg-gradient-to-b from-purple-50 to-white border border-purple-100 p-5">
                    <div className="flex items-start gap-3">
                      <span className="w-8 h-8 rounded-full bg-yellow-200 text-yellow-900 inline-flex items-center justify-center">💡</span>
                      <div>
                        <div className="font-medium text-gray-900 mb-1">Key Insight</div>
                        <p className="text-gray-700 text-sm">{(lesson.troubleshooting?.[0] || 'Focus on one small, repeatable change that removes the biggest friction this week.')}</p>
                      </div>
                    </div>
                  </div>
                  <div className="grid md:grid-cols-3 gap-4 mt-8">
                    {['engagement velocity','attention retention','behavioral patterns'].map((label,i)=> (
                      <div key={i} className="rounded-2xl border border-gray-100 p-5 bg-white shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="w-9 h-9 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 inline-flex items-center justify-center text-white">{['⚡','👁️','🔄'][i]}</span>
                          <div className="font-medium text-gray-900 capitalize">{label}</div>
                        </div>
                        <p className="text-sm text-gray-600">{['The first hour determines reach.','Watch time is the strongest ranking signal.','AI predicts what your audience wants next.'][i]}</p>
                        <div className="mt-3 text-3xl font-light text-[var(--accent-grape)]">{['3.2x','85%','92%'][i]}</div>
                        <div className="text-xs text-gray-500">{['boost with fast engagement','of weight on watch time','prediction accuracy'][i]}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mt-8 text-center">
                  <button onClick={next} className="rounded-full px-6 py-3 text-white" style={{background:'#9E5DAB'}}>Next section →</button>
                </div>
              </div>
            </article>

            <article ref={(el)=> { sectionsRef.current[1] = el }} className="dashboard-card p-6 md:p-10">
              <h3 className="text-2xl font-semibold text-gray-900 mb-2">How to fix it</h3>
              <ol className="mt-2 list-decimal space-y-2 pl-5 text-gray-700">
                {(lesson.stepByStep || []).map((s, i) => <li key={i}>{s}</li>)}
              </ol>
              <div className="mt-8 text-center">
                <button onClick={next} className="rounded-full px-6 py-3 text-white" style={{background:'#9E5DAB'}}>Next section →</button>
              </div>
            </article>

            <article ref={(el)=> { sectionsRef.current[2] = el }} className="dashboard-card p-6 md:p-10">
              <h3 className="text-2xl font-semibold text-gray-900 mb-2">Templates</h3>
              <div className="grid md:grid-cols-2 gap-4">
                {(lesson.templates || []).map((t,i)=> (
                  <div key={i} className="rounded-2xl border p-4">
                    <div className="font-medium text-gray-900 mb-2">{t.title}</div>
                    <p className="text-sm text-gray-700 whitespace-pre-line">{t.content}</p>
                  </div>
                ))}
              </div>
              <div className="mt-8 text-center">
                <button onClick={goElaborate} className="rounded-full px-6 py-3 text-white" style={{background:'#9E5DAB'}}>Go deeper (Elaborate) →</button>
              </div>
            </article>
          </div>
        )}

        {lesson && depth === 3 && (
          <div className="space-y-10">
            <article id="adv" className="dashboard-card p-6 md:p-10">
              <h3 className="text-2xl font-semibold text-gray-900 mb-2">Advanced techniques</h3>
              <ul className="list-disc pl-5 text-gray-700">
                {(lesson.advancedTechniques || []).map((s,i)=> <li key={i}>{s}</li>)}
              </ul>
            </article>
            <article id="edge" className="dashboard-card p-6 md:p-10">
              <h3 className="text-2xl font-semibold text-gray-900 mb-2">Edge cases</h3>
              <ul className="list-disc pl-5 text-gray-700">
                {(lesson.edgeCases || []).map((s,i)=> <li key={i}>{s}</li>)}
              </ul>
            </article>
            <article id="fail" className="dashboard-card p-6 md:p-10">
              <h3 className="text-2xl font-semibold text-gray-900 mb-2">Common failure modes</h3>
              <ul className="list-disc pl-5 text-gray-700">
                {(lesson.failureModes || []).map((s,i)=> <li key={i}>{s}</li>)}
              </ul>
            </article>
            <article id="long" className="dashboard-card p-6 md:p-10">
              <h3 className="text-2xl font-semibold text-gray-900 mb-2">Long‑term strategy</h3>
              <ul className="list-disc pl-5 text-gray-700">
                {(lesson.longTermStrategy || []).map((s,i)=> <li key={i}>{s}</li>)}
              </ul>
            </article>
            <article id="src" className="dashboard-card p-6 md:p-10">
              <h3 className="text-2xl font-semibold text-gray-900 mb-2">Source context notes</h3>
              <ul className="list-disc pl-5 text-gray-700">
                {(lesson.sourceContextNotes || []).map((s,i)=> <li key={i}>{s}</li>)}
              </ul>
            </article>
            {/* Action row at end */}
            <div className="text-center">
              <button onClick={() => { setDepth(2); setLoading(true); try { window.scrollTo({ top:0, behavior:'smooth' }) } catch {} }} className="bg-white border px-6 py-3 rounded-full text-gray-800 hover:bg-gray-50 transition transform hover:scale-[1.03] active:scale-[0.98]">Back to Overview</button>
              <button onClick={complete} className="ml-3 px-8 py-3 rounded-full text-white transition transform hover:scale-[1.03] active:scale-[0.98]" style={{background:'#9E5DAB'}}>Complete Lesson ✓</button>
            </div>
          </div>
        )}
      </div>

      {/* Right-side dot navigation (center-right) */}
      <div className="fixed right-6 top-1/2 -translate-y-1/2 hidden md:flex flex-col items-center gap-3" aria-label="Lesson navigation">
        {depth === 2 ? (
          titles.map((t, i) => (
            <button
              key={i}
              className={`w-3 h-3 rounded-full p-0 transition-transform duration-200 ${curIdx===i ? 'bg-[var(--accent-grape)] scale-125' : 'bg-purple-300 hover:scale-125'}`}
              onClick={() => { const el = sectionsRef.current[i]; if (el) el.scrollIntoView({ behavior: 'smooth' }) }}
              aria-label={`Go to ${t}`}
              title={t}
            />
          ))
        ) : (
          ['adv','edge','fail','long','src'].map((id, i) => (
            <button
              key={id}
              className={`w-3 h-3 rounded-full p-0 transition-transform duration-200 ${curIdx===i ? 'bg-[var(--accent-grape)] scale-125' : 'bg-purple-300 hover:scale-125'}`}
              onClick={() => { const el = document.getElementById(id); if (el) el.scrollIntoView({ behavior: 'smooth' }) }}
              aria-label={`Go to ${id}`}
              title={id}
            />
          ))
        )}
      </div>
    </main>
  )
}
