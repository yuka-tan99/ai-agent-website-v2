"use client"
import { useEffect, useRef, useState } from "react"

export default function InsightCard({
  title,
  desc,
  extra,
}: {
  title: string
  desc: string
  extra?: string | null
}) {
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const [maxH, setMaxH] = useState<number>(0)

  // Measure panel height for smooth max-height animation
  useEffect(() => {
    const el = panelRef.current
    if (!el) return
    const measure = () => setMaxH(el.scrollHeight)
    measure()
    const onResize = () => measure()
    window.addEventListener('resize', onResize)
    const RO = (window as any).ResizeObserver
    let ro: any
    if (RO) {
      ro = new RO(() => measure())
      ro.observe(el)
    }
    return () => { window.removeEventListener('resize', onResize); if (ro) ro.disconnect() }
  }, [open, desc, extra])

  return (
    <div className="dashboard-card p-4 mb-4 break-inside-avoid">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full cursor-pointer list-none flex items-center justify-between"
        aria-expanded={open}
      >
        <span className="font-semibold text-gray-900 flex items-center gap-3 text-left">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-purple-400" aria-hidden />
          {title}
        </span>
        <span className={`text-xl transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${open ? 'rotate-45' : ''}`}>+</span>
      </button>
      <div
        ref={panelRef}
        className="overflow-hidden mt-3 text-gray-800 leading-relaxed will-change-[max-height,opacity]"
        style={{
          maxHeight: open ? (maxH || 400) : 0,
          opacity: open ? 1 : 0,
          transition: 'max-height 360ms cubic-bezier(0.22, 1, 0.36, 1), opacity 260ms ease'
        }}
        aria-hidden={!open}
      >
        <p>{desc}</p>
        {extra ? <p className="text-gray-700 mt-3">{extra}</p> : null}
      </div>
    </div>
  )
}

