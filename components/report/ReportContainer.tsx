// components/report/ReportContainer.tsx
"use client"

import { useEffect, useState } from "react"
import ReportSummary from "./ReportSummary"

export default function ReportContainer() {
  const [plan, setPlan] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancel = false

    const fetchReport = async () => {
      try {
        // 1. Try to fetch existing report
        const res = await fetch("/api/report", { cache: "no-store" })
        const data = await res.json()

        if (!cancel && data?.plan) {
          setPlan(data.plan)
          setLoading(false)
          return
        }

        // 2. If none, generate new one
        const gen = await fetch("/api/report", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ force: true }),
        })
        const made = await gen.json()
        if (!cancel) setPlan(made.plan || null)
      } catch (e) {
        console.error("Failed to load report", e)
        if (!cancel) setPlan(null)
      } finally {
        if (!cancel) setLoading(false)
      }
    }

    fetchReport()
    return () => { cancel = true }
  }, [])

  if (loading) {
    return <div className="text-sm text-gray-500">Generating your report…</div>
  }

  if (!plan) {
    return <div className="text-sm text-red-600">Couldn’t load your report.</div>
  }

  // Right now ReportSummary fetches its own plan internally.
  // If you want to pass `plan` directly, modify ReportSummary to accept props.
  return <ReportSummary />
}