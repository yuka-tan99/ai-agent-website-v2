import type { SupabaseClient } from '@supabase/supabase-js'

type AccessGrantRow = {
  id: string | null
  product_key: string
  source: string | null
  access_starts_at: string
  access_ends_at: string
  status: string | null
  payment_id: string | null
  grant_reason: string | null
  created_at: string | null
  updated_at: string | null
}

export type AccessInfo = {
  active: boolean
  activeWindow: AccessGrantRow | null
  windows: AccessGrantRow[]
}

function isActiveWindow(window: AccessGrantRow, nowIso: string): boolean {
  if (!window) return false
  if ((window.status || '').toLowerCase() !== 'active') return false
  if (!window.access_starts_at || !window.access_ends_at) return false
  return window.access_starts_at <= nowIso && nowIso <= window.access_ends_at
}

export async function getAccessInfo(
  supa: SupabaseClient<any, string, any>,
  userId: string,
  product: string,
  now: Date = new Date(),
): Promise<AccessInfo> {
  const nowIso = now.toISOString()
  const { data: windowsRaw } = await supa
    .from('access_grants')
    .select('id, product_key, source, access_starts_at, access_ends_at, status, payment_id, grant_reason, created_at, updated_at')
    .eq('user_id', userId)
    .eq('product_key', product)
    .order('access_starts_at', { ascending: false })

  const windows: AccessGrantRow[] = Array.isArray(windowsRaw)
    ? windowsRaw.map((w) => ({
        id: (w as any).id ?? null,
        product_key: (w as any).product_key ?? product,
        source: (w as any).source ?? null,
        access_starts_at: (w as any).access_starts_at ?? nowIso,
        access_ends_at: (w as any).access_ends_at ?? nowIso,
        status: (w as any).status ?? null,
        payment_id: (w as any).payment_id ?? null,
        grant_reason: (w as any).grant_reason ?? null,
        created_at: (w as any).created_at ?? null,
        updated_at: (w as any).updated_at ?? null,
      }))
    : []

  let activeWindow = windows.find((w) => isActiveWindow(w, nowIso)) || null

  if (!activeWindow) {
    if (product === 'report') {
      const { data: ob } = await supa
        .from('onboarding_sessions')
        .select('purchase_status, claimed_at, updated_at')
        .eq('user_id', userId)
        .maybeSingle()
      const status = ob?.purchase_status
      const base = (ob?.claimed_at as string | null) || (ob?.updated_at as string | null)
      if (status === 'paid' && base) {
        const start = new Date(base)
        const end = new Date(start)
        end.setMonth(end.getMonth() + 3)
        if (now <= end) {
          activeWindow = {
            id: null,
            product_key: product,
            source: 'derived_from_purchase_status',
            access_starts_at: start.toISOString(),
            access_ends_at: end.toISOString(),
            status: 'active',
            payment_id: null,
            grant_reason: 'Derived: Report purchase (3 month access)',
            created_at: null,
            updated_at: null,
          }
        }
      }
      if (!activeWindow) {
        const { data: rep } = await supa
          .from('reports')
          .select('user_id, created_at')
          .eq('user_id', userId)
          .maybeSingle()
        if (rep) {
          const start = rep.created_at ? new Date(rep.created_at) : now
          const end = new Date(start)
          end.setFullYear(end.getFullYear() + 5)
          activeWindow = {
            id: null,
            product_key: product,
            source: 'derived_from_existing_report',
            access_starts_at: start.toISOString(),
            access_ends_at: end.toISOString(),
            status: 'active',
            payment_id: null,
            grant_reason: 'Derived: Existing report access',
            created_at: null,
            updated_at: null,
          }
        }
      }
    } else if (product === 'ai') {
      const { data: ob } = await supa
        .from('onboarding_sessions')
        .select('purchase_status, claimed_at, updated_at')
        .eq('user_id', userId)
        .maybeSingle()
      const status = ob?.purchase_status
      const base = (ob?.claimed_at as string | null) || (ob?.updated_at as string | null)
      if (status === 'paid' && base) {
        const start = new Date(base)
        const end = new Date(start)
        end.setMonth(end.getMonth() + 3)
        if (now <= end) {
          activeWindow = {
            id: null,
            product_key: product,
            source: 'derived_from_purchase_status',
            access_starts_at: start.toISOString(),
            access_ends_at: end.toISOString(),
            status: 'active',
            payment_id: null,
            grant_reason: 'Derived: AI access from plan purchase',
            created_at: null,
            updated_at: null,
          }
        }
      }
    }
  }

  const active = !!(activeWindow && isActiveWindow(activeWindow, nowIso))
  return { active, activeWindow: active ? activeWindow : null, windows }
}
