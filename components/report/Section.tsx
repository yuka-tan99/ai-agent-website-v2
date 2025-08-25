// components/Section.tsx
'use client'

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  PropsWithChildren,
} from 'react'

type Props = {
  id?: string
  title: string
  /** open by default? */
  defaultOpen?: boolean
  /** optional right-aligned action area (e.g., copy button) */
  action?: React.ReactNode
}

export default function Section({
  id,
  title,
  defaultOpen = false,
  action,
  children,
}: PropsWithChildren<Props>) {
  const [open, setOpen] = useState(defaultOpen)

  // animation refs/state
  const panelRef = useRef<HTMLDivElement | null>(null)
  const roRef = useRef<ResizeObserver | null>(null)
  const [maxH, setMaxH] = useState<number>(defaultOpen ? 999999 : 0)
  const [opacity, setOpacity] = useState<number>(defaultOpen ? 1 : 0)
  const [isTransitioning, setIsTransitioning] = useState(false)

  const reduceMotion = useMemo(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
    []
  )

  // compose transition (respect reduced motion)
  const transition = reduceMotion
    ? 'none'
    : 'max-height 380ms cubic-bezier(.22,1,.36,1), opacity 260ms ease'

  // measure helper
  const measure = () => {
    const el = panelRef.current
    if (!el) return 0
    const prev = el.style.maxHeight
    el.style.maxHeight = 'none'
    const h = el.scrollHeight
    el.style.maxHeight = prev
    return h
  }

  // animate open/close
  useEffect(() => {
    const h = measure()
    setIsTransitioning(true)

    if (open) {
      // start collapsed then grow to measured height
      setMaxH(0)
      setOpacity(0)
      requestAnimationFrame(() => {
        setMaxH(h)
        setOpacity(1)
      })
    } else {
      // fade out then collapse
      setOpacity(0)
      requestAnimationFrame(() => setMaxH(0))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // grow to fit when children change while open
  useLayoutEffect(() => {
    if (!panelRef.current) return

    // ResizeObserver so dynamic content is handled smoothly
    if (!roRef.current && typeof ResizeObserver !== 'undefined') {
      roRef.current = new ResizeObserver(() => {
        if (open) {
          const h = measure()
          if (h > 0) setMaxH(h)
        }
      })
    }
    roRef.current?.observe(panelRef.current)

    return () => {
      roRef.current?.disconnect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, children])

  const onTransitionEnd = (e: React.TransitionEvent<HTMLDivElement>) => {
    if (e.propertyName !== 'max-height') return
    setIsTransitioning(false)
    if (open) {
      // allow natural growth after opening
      setMaxH(999999)
    }
  }

  const panelId = id ? `${id}__panel` : undefined

  return (
    <section
      id={id}
      className="rounded-3xl dashboard-card bg-white transition-all duration-300 hover:shadow-lg"
    >
    <button
      onClick={() => setOpen(v => !v)}
      className="sect-btn w-full flex items-center justify-between text-left"
      aria-expanded={open}
        aria-controls={panelId}
      >
        <span className="font-semibold">{title}</span>
        <div className="flex items-center gap-3">
          {action}
          {/* chevron/plus hybrid caret */}
          <span
            className={`transition-transform duration-200 ${open ? 'rotate-90' : ''}`}
            aria-hidden
          >
            ▶
          </span>
        </div>
      </button>

      {/* Keep mounted so close animation can play */}
      <div
        id={panelId}
        ref={panelRef}
        onTransitionEnd={onTransitionEnd}
        style={{
          maxHeight: `${maxH}px`,
          opacity,
          overflow: 'hidden',
          transition,
          willChange: reduceMotion ? undefined : ('max-height, opacity' as any),
        }}
        className="px-6 pb-6"
        aria-hidden={!open && !isTransitioning}
      >
        {children}
      </div>
    </section>
  )
}