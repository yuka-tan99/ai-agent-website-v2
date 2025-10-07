export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { supabaseServer } from '@/lib/supabaseServer';
import ReportShellClient from '@/components/report/ReportShellClient';
// No generation here; server redirects to report loader when needed

const DEV_BYPASS = process.env.NEXT_PUBLIC_DEV_BYPASS_PLAN === 'true';

function isComplete(ob: any): boolean {
  // Consider onboarding complete if explicitly finalized OR if the user
  // answered core decision-tree fields (SmartOnboarding) sufficiently.
  const claimed = !!(ob && ob.claimed_at)
  try {
    const a = ob?.answers || {}
    if (a?.__vars?.stage) return true
    if (typeof a?.stage === 'string' && a.stage.trim().length > 0) return true
    const q2 = a?.Q2
    if ((Array.isArray(q2) && q2.length > 0) || (typeof q2 === 'string' && q2)) return true
    if (typeof a?.identity === 'string' && a.identity.trim().length > 0 && Array.isArray(a?.biggest_challenges) && a.biggest_challenges.length > 0) return true
    const qCount = Object.keys(a).filter(k => /^Q\d/.test(k)).filter(k => {
      const v: any = (a as any)[k]
      return Array.isArray(v) ? v.length > 0 : (v != null && String(v).length > 0)
    }).length
    if (qCount >= 4) return true
    const q18 = a?.Q18
    const hasQ18 = q18 !== undefined && q18 !== null && (Array.isArray(q18) ? q18.length > 0 : String(q18).length > 0)
    return claimed || hasQ18
  } catch {
    return claimed
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
      if (process.env.DEBUG_LOG === 'true') {
        try {
          const p: any = rep.plan
          const ai = p._ai_sections || 0
          const fb = p._fallback_sections || 0
          const meta = p._section_meta || {}
          const gen = p._gen || {}
          console.log('[dashboard] render plan: aiSections=', ai, 'fallbackSections=', fb, 'gen=', gen)
          Object.keys(meta).forEach((k) => {
            const m = meta[k]
            console.log(`[dashboard] section ${k}: origin=${m?.origin} summaryLen=${m?.summaryLen} bullets=${m?.bullets}`)
          })
        } catch {}
      }
      return (
        <main className="container py-10 relative">
          {/* Fixed Back button */}
          <div className="fixed top-[calc(var(--navH,56px)+8px)] left-6 z-40">
            <Link href="/account" className="bg-white rounded-full p-3 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 inline-flex items-center justify-center text-gray-900 border border-gray-100" aria-label="Back to account">
              <span className="text-xl leading-none">←</span>
            </Link>
          </div>
          {DEV_BYPASS 
          // && (
          //   <div className="mb-6 rounded-xl border p-3 text-xs text-gray-600">
          //     Dev bypass is ON — skipping paywall.
          //   </div>
          // )
          }
          <ReportShellClient />
          
        </main>
      );
    }

  // No report yet — get onboarding session
  const { data: ob } = await supa
    .from('onboarding_sessions')
    .select('answers, claimed_at')
    .eq('user_id', user.id)
    .maybeSingle();

  const paid = await hasPlanAccess(user.id);
  const completed = isComplete(ob);
  if (process.env.DEBUG_LOG === 'true') {
    console.log('[dashboard] onboarding session status', {
      hasSession: !!ob,
      completed,
      claimed_at: ob?.claimed_at || null,
    });
  }

  // Routing rules when no report:
  // - If no onboarding session yet → go to onboarding
  // - If session exists but not paid → paywall
  // - If paid but onboarding not finalized → onboarding to complete
  // - If paid and onboarding complete → preparing (generation)
  if (!paid) {
    if (process.env.DEBUG_LOG === 'true') console.log('[dashboard] has onboarding session but unpaid → redirect /paywall');
    redirect('/paywall');
  }
  if (!completed) {
    if (process.env.DEBUG_LOG === 'true') console.log('[dashboard] onboarding incomplete but paid → redirect /onboarding');
    redirect('/onboarding');
  }
  if (process.env.DEBUG_LOG === 'true') console.log('[dashboard] no report but ready → redirect /dashboard/preparing');
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
