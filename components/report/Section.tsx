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

  // refs + animation state
  const panelRef = useRef<HTMLDivElement | null>(null)
  const [maxH, setMaxH] = useState<number>(defaultOpen ? 999999 : 0)
  const [opacity, setOpacity] = useState<number>(defaultOpen ? 1 : 0)
  const [isTransitioning, setIsTransitioning] = useState(false)

  // respect reduced motion
  const reduceMotion = useMemo(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
    []
  )

  const transition = reduceMotion ? 'none' : 'max-height 280ms ease, opacity 220ms ease'

  // measure full content height
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
      // ensure we start from collapsed height on re-open
      // then expand to content height on next frame
      setMaxH(0)
      setOpacity(0)
      requestAnimationFrame(() => {
        setMaxH(h)
        setOpacity(1)
      })
    } else {
      // fade then collapse
      setOpacity(0)
      // let the opacity start first, but still collapse height within the same frame
      requestAnimationFrame(() => setMaxH(0))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // if children change while open, grow to fit smoothly
  useLayoutEffect(() => {
    if (open) {
      const h = measure()
      if (h > 0) setMaxH(h)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [children])

  const onTransitionEnd = (e: React.TransitionEvent<HTMLDivElement>) => {
    // ignore unrelated transitions
    if (e.propertyName !== 'max-height') return
    setIsTransitioning(false)
    if (open) {
      // allow internal elements to expand naturally after opening
      setMaxH(999999)
    }
  }

  return (
    <section
      id={id}
      className="rounded-3xl dashboard-card bg-white transition-all duration-300 hover:shadow-lg"
    >
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-6 py-4 text-left"
        aria-expanded={open}
        aria-controls={id ? `${id}__panel` : undefined}
      >
        <span className="font-semibold">{title}</span>
        <div className="flex items-center gap-3">
          {action}
          <span
            className={`transition-transform duration-200 ${open ? 'rotate-90' : ''}`}
            aria-hidden
          >
            ▶
          </span>
        </div>
      </button>

      {/* Keep panel mounted so close animation can play */}
      <div
        id={id ? `${id}__panel` : undefined}
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