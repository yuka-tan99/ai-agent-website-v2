export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { supabaseServer } from '@/lib/supabaseServer';
import ReportSummary from '@/components/report/ReportSummary';
// No generation here; server redirects to /dashboard/preparing when needed

const DEV_BYPASS = process.env.NEXT_PUBLIC_DEV_BYPASS_PLAN === 'true';

function isComplete(ob: any): boolean {
  if (!ob) return false;
  if (ob.claimed_at) return true;
  try {
    const a = ob.answers || {};
    return Object.keys(a).length >= 3; // “good enough” completion heuristic
  } catch {
    return false;
  }
}

async function hasPlanAccess(userId: string) {
  if (DEV_BYPASS) return true;
  const supa = await supabaseServer();
  const { data } = await supa
    .from('onboarding_sessions')
    .select('purchase_status')
    .eq('user_id', userId)
    .maybeSingle();
  return data?.purchase_status === 'paid';
}

export default async function DashboardPage() {
  const supa = await supabaseServer();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) redirect('/signin');
  // If a report already exists -> render instantly (show report even if paywall flag is stale)
  const { data: rep } = await supa
    .from('reports')
    .select('plan')
    .eq('user_id', user.id)
    .maybeSingle();
  if (process.env.DEBUG_LOG === 'true') {
    console.log('[dashboard] user:', user.id, 'hasPlan:', !!rep?.plan);
  }

  if (rep?.plan) {
      return (
        <main className="container py-10">
          <div className="sticky top-0 left-0 z-20 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/50">
            <div className="max-w-5xl mx-auto px-4 py-3">
              <Link href="/account" className="inline-flex items-center h-11 px-2 rounded-md gap-2 text-base text-gray-700 hover:text-[var(--accent-grape)] hover:font-semibold transition-colors" aria-label="Back">
                <span className="-ml-1">←</span>
                back
              </Link>
            </div>
          </div>
          {DEV_BYPASS 
          // && (
          //   <div className="mb-6 rounded-xl border p-3 text-xs text-gray-600">
          //     Dev bypass is ON — skipping paywall.
          //   </div>
          // )
          }
          <ReportSummary plan={rep.plan} />
          
        </main>
      );
    }

  // No report yet — require completed onboarding (per your schema)
  const { data: ob } = await supa
    .from('onboarding_sessions')
    .select('answers, claimed_at')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!isComplete(ob)) {
    if (process.env.DEBUG_LOG === 'true') console.log('[dashboard] onboarding incomplete → redirect /onboarding');
    redirect('/onboarding');
  }

  // Enforce paywall only if no report yet
  if (!(await hasPlanAccess(user.id))) redirect('/paywall');

  // Onboarding complete, no report yet -> redirect to preparing screen
  if (process.env.DEBUG_LOG === 'true') console.log('[dashboard] no report → redirect /dashboard/preparing');
  redirect('/dashboard/preparing');
}

// function EnsurePlanAndShow() {
//   const React = require('react');
//   const [hydrated, setHydrated] = React.useState(false);
//   React.useEffect(() => { setHydrated(true); }, []);

//   if (!hydrated) {
//     return <div className="text-sm text-gray-500">Preparing…</div>;
//   }
//   return <ClientEnsurePlan />;
// }

// // @ts-expect-error inline client component in a server file
// function ClientEnsurePlan() {
//   const React = require('react');
//   const [plan, setPlan] = React.useState<any | null>(null);
//   const [error, setError] = React.useState<string | null>(null);

//   async function fetchWithTimeout(url: string, init: RequestInit, ms = 60000) {
//     const ctl = new AbortController();
//     const id = setTimeout(() => ctl.abort(), ms);
//     try {
//       const res = await fetch(url, { ...init, signal: ctl.signal, cache: "no-store" });
//       const text = await res.text();
//       let json: any = null;i
//       try { json = text ? JSON.parse(text) : null; } catch {}
//       return { ok: res.ok, status: res.status, json, text };
//     } finally {
//       clearTimeout(id);
//     }
//   }

//   React.useEffect(() => {
//     let cancelled = false;
//     (async () => {
//       try {
//         // one call is enough: POST returns { plan }
//         const r = await fetchWithTimeout("/api/report", {
//           method: "POST",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify({ force: true }),
//         }, 65000);

//         if (cancelled) return;
//         if (!r.ok) {
//           const msg = r.json?.error || r.text || `HTTP ${r.status}`;
//           throw new Error(msg);
//         }

//         if (!r.json?.plan) {
//           throw new Error("No plan returned from /api/report");
//         }

//         setPlan(r.json.plan);
//       } catch (e: any) {
//         if (!cancelled) setError(e?.message || "Failed to generate report");
//         console.error("ClientEnsurePlan error:", e);
//       }
//     })();
//     return () => { cancelled = true; };
//   }, []);

//   if (error) return <div className="text-sm text-red-600">Error: {error}</div>;
//   if (!plan) return <div className="text-sm text-gray-500">Generating your report…</div>;

//   const ReportSummary = require('@/components/report/ReportSummary').default;
//   return <ReportSummary plan={plan} />;
// }
