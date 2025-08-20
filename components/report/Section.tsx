// components/Section.tsx
'use client'
import { useState, PropsWithChildren } from 'react'

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

  return (
    <section id={id} className="rounded-xl border bg-white">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
        aria-expanded={open}
      >
        <span className="font-semibold">{title}</span>
        <div className="flex items-center gap-3">
          {action}
          <span
            className={`transition-transform ${open ? 'rotate-90' : ''}`}
            aria-hidden
          >
            ▶
          </span>
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4">
          {children}
        </div>
      )}
    </section>
  )
}