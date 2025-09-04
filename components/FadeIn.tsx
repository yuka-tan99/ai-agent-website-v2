"use client"

import React from 'react'

export default function FadeIn({ children, className = '', delay = 0 }: { children: React.ReactNode, className?: string, delay?: number }) {
  const [isIn, setIn] = React.useState(false)
  React.useEffect(() => {
    const t = setTimeout(() => setIn(true), delay)
    return () => clearTimeout(t)
  }, [delay])
  return (
    <div className={["report-fade", isIn ? "is-in" : "", className].join(" ")}>{children}</div>
  )
}

