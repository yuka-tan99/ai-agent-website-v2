'use client'
import { ReactNode } from 'react'

export default function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24">
      <div className="mb-3">
        <h2 className="text-xl font-semibold">{title}</h2>
      </div>
      <div className="card p-5">{children}</div>
    </section>
  )
}