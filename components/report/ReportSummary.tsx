// components/report/ReportSummary.tsx
"use client"

import React from "react"
import Link from "next/link"

type Section = {
  summary: string
  bullets: string[]
  charts?: { platform_focus?: { name: string; value: number }[] }
}

function normalizeSection(s?: Partial<Section> | null): Section {
  return {
    summary: (s?.summary ?? '').toString(),
    bullets: Array.isArray(s?.bullets) ? s!.bullets : [],
    charts: s?.charts ?? {},
  }
}

function normalizeAllSections(sections: any): {
  ai_marketing_psychology: Section
  foundational_psychology: Section
  platform_specific_strategies: Section
  content_strategy: Section
  posting_frequency: Section
  metrics_mindset: Section
  mental_health: Section
} {
  return {
    ai_marketing_psychology: normalizeSection(sections?.ai_marketing_psychology),
    foundational_psychology: normalizeSection(sections?.foundational_psychology),
    platform_specific_strategies: normalizeSection(sections?.platform_specific_strategies),
    content_strategy: normalizeSection(sections?.content_strategy),
    posting_frequency: normalizeSection(sections?.posting_frequency),
    metrics_mindset: normalizeSection(sections?.metrics_mindset),
    mental_health: normalizeSection(sections?.mental_health),
  }
}

type Plan = {
  fame_score: number
  fame_breakdown?: { key: string; label: string; percent: number }[]
  main_problem: string
  main_problem_detail?: string
  sections: {
    ai_marketing_psychology: Section
    foundational_psychology: Section
    platform_specific_strategies: Section
    content_strategy: Section
    posting_frequency: Section
    metrics_mindset: Section
    mental_health: Section
  }
}

type Props = {
  /** When provided from SSR (/dashboard), we render instantly without fetching */
  plan?: Plan | null
}

export default function ReportSummary({ plan: planProp }: Props) {
  const [plan, setPlan] = React.useState<Plan | null>(planProp ?? null)
  const [loading, setLoading] = React.useState(!planProp)
  const [open, setOpen] = React.useState<null | string>(null) // <-- accordion state
  const [openFame, setOpenFame] = React.useState(false)
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => { setMounted(true) }, [])

  React.useEffect(() => {
    if (planProp) return
    let cancel = false
    ;(async () => {
      try {
        const res = await fetch("/api/report", { cache: "no-store" })
        const json = await res.json()
        if (!cancel) setPlan(json.plan || null)
      } finally {
        if (!cancel) setLoading(false)
      }
    })()
    return () => {
      cancel = true
    }
  }, [planProp])

  if (loading) return <div className="text-sm text-gray-500">Loading…</div>
if (!plan) {
  return (
    <div className="dashboard-card p-6 text-center">
      <h2 className="text-lg font-semibold text-gray-900 mb-2">no report yet</h2>
      <p className="text-sm text-gray-600 mb-4">
        You haven’t completed onboarding. Answer a few quick questions to generate your personalized report.
      </p>
      <Link
        href="/onboarding"
        className="inline-flex items-center justify-center rounded-full bg-black text-white px-5 py-2 hover:bg-gray-800 transition"
      >
        get started
      </Link>
    </div>
  )
}
const S = normalizeAllSections(plan.sections || {})

  return (
    <div className={["report-page", "report-fade", mounted ? "is-in" : ""].join(" ")}> 
      {/* Title */}
      <div className="text-center mb-6">
        <h1 className="report-title">your personalized report</h1>
        <div className="report-subtitle">your path to social media fame</div>
      </div>

      {/* Top row cards */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <section className="dashboard-card">
          <button className="w-full flex items-center justify-between mb-2" onClick={() => setOpenFame(v => !v)} aria-expanded={openFame}>
            <div className="font-medium text-gray-800">fame potential score</div>
            <span>{openFame ? '–' : '+'}</span>
          </button>
          <div className="flex items-center justify-center py-4">
            <Donut percent={Math.round(plan.fame_score ?? 0)} />
          </div>
          {openFame && (
            <>
              <div className="mt-3">
                <Breakdown items={Array.isArray(plan.fame_breakdown) ? plan.fame_breakdown : []} />
              </div>
              <div className="mt-5 flex justify-center">
                <a href="/dashboard/fame-insights" className="px-5 py-2 rounded-full bg-[#6237A0] text-white hover:bg-[#4F2D82] transition-colors">learn more</a>
              </div>
            </>
          )}
        </section>

        <section className="dashboard-card">
          <div className="flex items-center justify-between mb-2">
            <div className="font-medium text-gray-800">your main problem</div>
          </div>
          <div className="py-4">
            <div className="text-gray-900 text-lg mb-2 text-center">{plan.main_problem || "—"}</div>
            {plan.main_problem_detail && (
              <p className="text-gray-700 text-sm leading-6">{plan.main_problem_detail}</p>
            )}
          </div>
        </section>
      </div>

      {/* Accordions */}
      <Accordion
        title="ai & marketing psychology"
        open={open === "ai"}
        onToggle={() => setOpen(open === "ai" ? null : "ai")}
        section={S.ai_marketing_psychology}
        icon="ai"
        extra={
          <div className="mt-5 flex justify-center">
            <a href="/dashboard/ai-psych" className="px-5 py-2 rounded-full bg-[#6237A0] text-white hover:bg-[#4F2D82] transition-colors">learn more</a>
          </div>
        }
      />
      <Accordion
        title="foundational psychology"
        open={open === "fp"}
        onToggle={() => setOpen(open === "fp" ? null : "fp")}
        section={S.foundational_psychology}
        icon="foundation"
      />
      <Accordion
        title="platform-specific strategies"
        open={open === "pss"}
        onToggle={() => setOpen(open === "pss" ? null : "pss")}
        section={S.platform_specific_strategies}
        icon="platforms"
        extra={
          <div className="mt-4">
            <MiniDonut data={S.platform_specific_strategies?.charts?.platform_focus || []} />
          </div>
        }
      />
      <Accordion
        title="content strategy"
        open={open === "cs"}
        onToggle={() => setOpen(open === "cs" ? null : "cs")}
        section={S.content_strategy}
        icon="content"
      />
      <Accordion
        title="posting frequency"
        open={open === "pf"}
        onToggle={() => setOpen(open === "pf" ? null : "pf")}
        section={S.posting_frequency}
        icon="posting"
      />
      <Accordion
        title="metrics & mindset"
        open={open === "mm"}
        onToggle={() => setOpen(open === "mm" ? null : "mm")}
        section={S.metrics_mindset}
        icon="metrics"
      />
      <Accordion
        title="mental health"
        open={open === "mh"}
        onToggle={() => setOpen(open === "mh" ? null : "mh")}
        section={S.mental_health}
        icon="mental"
      />

      <div className="flex justify-center mt-10">
        <button className="rounded-full px-8 py-4 bg-[#6237A0] text-white">download full report</button>
      </div>
    </div>
  )
}

/* ---------- UI bits ---------- */

function Accordion({
  title,
  open,
  onToggle,
  section,
  extra,
  icon,
}: {
  title: string
  open: boolean
  onToggle: () => void
  section: Section
  extra?: React.ReactNode
  icon?: string
}) {
  const hasBullets = Array.isArray(section?.bullets) && section.bullets.length > 0
  const hasSummary = !!section?.summary

  return (
    <section className="dashboard-card mb-4">
      <button className="w-full flex items-center justify-between text-left" onClick={onToggle} aria-expanded={open}>
        <div className="flex items-center gap-3">
          <IconBadge kind={icon} />
          <span className="text-lg font-medium">{title}</span>
        </div>
        <span className="text-xl">{open ? "–" : "+"}</span>
      </button>

      <div className="sect-panel mt-3" style={{ maxHeight: open ? 1200 : 0 }} data-open={open ? "true" : "false"}>
        {hasSummary && <p className="text-gray-700 mb-3">{section.summary}</p>}
        {hasBullets && (
          <ul className="list-disc pl-5 space-y-1 text-gray-800">
            {section.bullets.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        )}
        {extra}
      </div>
    </section>
  )
}

function Donut({ percent }: { percent: number }) {
  const r = 54
  const c = 2 * Math.PI * r
  const val = Math.max(0, Math.min(100, Math.round(percent)))
  const dash = (c * val) / 100
  return (
    <svg width="140" height="140" viewBox="0 0 140 140" aria-label={`Fame potential ${val}%`}>
      <circle cx="70" cy="70" r={r} stroke="#E5E7EB" strokeWidth="12" fill="none" />
      <circle
        cx="70"
        cy="70"
        r={r}
        stroke="#9B7EDE"
        strokeWidth="12"
        fill="none"
        strokeDasharray={`${dash} ${c - dash}`}
        strokeLinecap="round"
        transform="rotate(-90 70 70)"
      />
      <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fontSize="22" fill="#111827">
        {val}%
      </text>
    </svg>
  )
}

function MiniDonut({ data }: { data: { name: string; value: number }[] }) {
  // simple stacked legend; keep your existing chart if you prefer
  const total = Math.max(1, data.reduce((s, d) => s + d.value, 0))
  return (
    <div className="flex flex-wrap gap-3">
      {data.map((d, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded-full" style={{ background: "#9B7EDE", opacity: 0.65 + i * 0.08 }} />
          <span className="text-sm text-gray-700">
            {d.name} · {Math.round((d.value / total) * 100)}%
          </span>
        </div>
      ))}
    </div>
  )
}

// Simple inline SVG badges so we don't need external assets.
function IconBadge({ kind }: { kind?: string }) {
  const size = 40
  const circle = (fill: string, child?: React.ReactNode) => (
    <div
      aria-hidden
      className="flex items-center justify-center rounded-full"
      style={{ width: size, height: size, background: fill }}
    >
      {child}
    </div>
  )

  const svg = (path: React.ReactNode) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {path}
    </svg>
  )

  switch (kind) {
    case 'ai':
      return circle('radial-gradient( circle at 30% 30%, #f0abfc, #8b5cf6 )', svg(<>
        <path d="M12 3v3"/><path d="M12 18v3"/><path d="M3 12h3"/><path d="M18 12h3"/>
        <circle cx="12" cy="12" r="4" stroke="white" />
      </>))
    case 'foundation':
      return circle('#6b7280', svg(<>
        <path d="M3 20h18"/><path d="M6 16h12"/><path d="M9 8h6"/>
        <path d="M12 4l9 6v2H3v-2l9-6z"/>
      </>))
    case 'platforms':
      return circle('#8b5cf6', svg(<>
        <rect x="4" y="4" width="6" height="6" rx="1"/>
        <rect x="14" y="4" width="6" height="6" rx="1"/>
        <rect x="4" y="14" width="6" height="6" rx="1"/>
        <rect x="14" y="14" width="6" height="6" rx="1"/>
      </>))
    case 'content':
      return circle('#64748b', svg(<>
        <path d="M4 4h16v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4z"/>
        <path d="M8 10h8"/><path d="M8 14h5"/>
      </>))
    case 'posting':
      return circle('#7c3aed', svg(<>
        <circle cx="12" cy="12" r="9"/>
        <path d="M12 7v6l4 2"/>
      </>))
    case 'metrics':
      return circle('#6b7280', svg(<>
        <path d="M3 20h18"/>
        <rect x="6" y="10" width="3" height="7" />
        <rect x="11" y="6" width="3" height="11" />
        <rect x="16" y="13" width="3" height="4" />
      </>))
    case 'mental':
      return circle('linear-gradient(135deg,#f87171,#fb7185)', svg(<>
        <path d="M12 21s-6-4.35-6-9a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 4.65-6 9-6 9z" fill="none" />
      </>))
    default:
      return circle('#e5e7eb')
  }
}

function Breakdown({ items, showRaw = true }: { items: { label: string; percent: number; factor?: number }[]; showRaw?: boolean }) {
  if (!Array.isArray(items) || items.length === 0) return (
    <div className="text-sm text-gray-500">No breakdown available.</div>
  )
  return (
    <div className="space-y-2">
      {items.map((it, i) => (
        <div key={i} className="grid grid-cols-[140px_1fr_48px] items-center gap-3">
          <div className="text-sm text-gray-700">{it.label}</div>
          <div className="h-2 rounded bg-gray-100 overflow-hidden">
            {(() => {
              const raw = typeof (it as any).factor === 'number' ? Math.round(((it as any).factor as number) * 100) : undefined
              const pct = showRaw && typeof raw === 'number' ? raw : Math.round(it.percent)
              return <div className="h-full bg-[#9B7EDE]" style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
            })()}
          </div>
          <div className="text-sm text-gray-800 text-right">
            {(() => {
              const raw = typeof (it as any).factor === 'number' ? Math.round(((it as any).factor as number) * 100) : undefined
              const pct = showRaw && typeof raw === 'number' ? raw : Math.round(it.percent)
              return <>{pct}%</>
            })()}
          </div>
        </div>
      ))}
    </div>
  )
}
