"use client";

import { useEffect, useRef, useState } from "react";
import ReportSummary from "@/components/report/ReportSummary";

type Plan = any;

function isValidPlan(p: any): boolean {
  try {
    if (!p || typeof p !== 'object') return false;
    // Accept either new shape (sections) or legacy fame_score
    const hasSections = p.sections && typeof p.sections === 'object';
    const hasScore = typeof p.fame_score === 'number' || typeof p.fameScore === 'number';
    return !!(hasSections || hasScore);
  } catch { return false; }
}

async function fetchWithTimeout(url: string, init: RequestInit = {}, ms = 30000) {
  const ctl = new AbortController();
  const id = setTimeout(() => ctl.abort(), ms);
  try {
    const res = await fetch(url, {
      ...init,
      signal: ctl.signal,
      cache: "no-store",
      credentials: "include",   // ← add this
    });
    const text = await res.text();
    let json: any = null;
    try { json = text ? JSON.parse(text) : null; } catch {}
    return { ok: res.ok, status: res.status, json, text };
  } finally {
    clearTimeout(id);
  }
}

/**
 * When mounted:
 * - GET /api/report → if null, POST /api/report
 * - Shows loading / error states
 * - Renders ReportSummary once plan is ready
 */
export default function EnsureReport() {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const cancelled = useRef(false);

  async function run() {
    setErr(null);
    setBusy(true);
    try {
      // Single call strategy: POST with force=false
      // - If a plan exists, server returns it
      // - If not, server generates it once
      let persona: any = {};
      try { persona = JSON.parse(localStorage.getItem("onboarding") || "{}"); } catch {}
      const model = (typeof window !== "undefined" && (window as any).__REPORT_MODEL) || undefined;

      const r = await fetchWithTimeout("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ persona, model, force: false }),
      }, 65000);

      if (!r.ok) {
        const msg = r.json?.error || r.text || `HTTP ${r.status}`;
        throw new Error(`POST /api/report failed: ${msg.slice(0, 400)}`);
      }
      const out = r.json?.plan ?? null;
      if (!isValidPlan(out)) throw new Error('Server returned no valid plan');
      setPlan(out);
      try { localStorage.setItem('last_plan', JSON.stringify(out)); } catch {}
    } catch (e: any) {
      if (!cancelled.current) setErr(e?.message || "Something went wrong");
    } finally {
      if (!cancelled.current) setBusy(false);
    }
  }

  useEffect(() => { run(); return () => { cancelled.current = true; }; }, []);

  if (busy && !plan) {
    return <div className="w-full py-10 text-center text-gray-600">Preparing your personalized report…</div>;
  }
  if (err) {
    return (
      <div className="w-full py-10 text-center">
        <div className="text-red-600 mb-3">{err}</div>
        <button className="px-4 py-2 rounded-xl border" onClick={() => run()}>Retry</button>
      </div>
    );
  }
  if (plan) {
    return <ReportSummary plan={plan} />;
  }
  return null;
}
