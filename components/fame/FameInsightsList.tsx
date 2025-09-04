"use client"

import React from "react"

type Section = { id: string; title: string; desc: string; icon?: string }

export default function FameInsightsList({
  sections,
  percentages,
}: {
  sections: Section[]
  percentages: Record<string, number>
}) {
  const [explain, setExplain] = React.useState<Record<string, string>>({})
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/fame-insights/explain', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ percentages }),
          cache: 'no-store',
        })
        const json = res.ok ? await res.json() : {}
        if (!cancelled && json && typeof json === 'object') setExplain(json)
      } catch {}
      finally { if (!cancelled) setLoading(false) }
    })()
    return () => { cancelled = true }
  }, [JSON.stringify(percentages)])

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {sections.map((s) => (
        <details key={s.id} className="dashboard-card p-4">
          <summary className="cursor-pointer list-none flex items-center justify-between">
            <span className="font-semibold text-gray-900 flex items-center gap-3">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-purple-400" aria-hidden />
              {s.title}
            </span>
            <span className="text-xl">+</span>
          </summary>
          <div className="mt-3 text-gray-800 leading-relaxed space-y-3">
            <p>{s.desc}</p>
            {loading ? (
              <p className="text-gray-500">Analyzing your answers…</p>
            ) : (
              explain[s.id] && <p className="text-gray-700">{explain[s.id]}</p>
            )}
          </div>
        </details>
      ))}
    </div>
  )
}

