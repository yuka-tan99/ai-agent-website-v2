// lib/onboardingSession.ts

export const ONBOARDING_SESSION_KEY = 'onboarding_session_id'

/** Create or return a stable per-browser session id for onboarding */
export function getOrCreateOnboardingSessionId(): string {
  if (typeof window === 'undefined') return '' // SSR guard
  let id = localStorage.getItem(ONBOARDING_SESSION_KEY)
  if (!id) {
    // lightweight UUID
    const hasCrypto = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    id = hasCrypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2) + Date.now().toString(36)
    localStorage.setItem(ONBOARDING_SESSION_KEY, id)
  }
  return id
}

/** Clear the local onboarding session id (rarely needed) */
export function clearOnboardingSessionId() {
  if (typeof window === 'undefined') return
  localStorage.removeItem(ONBOARDING_SESSION_KEY)
}

/**
 * Save partial onboarding progress to the server (idempotent upsert).
 * Pass whatever you currently have; the server merges shallowly.
 */
export async function saveOnboardingProgress({
  sessionId,
  answers,
  links,
}: {
  sessionId: string
  answers?: Record<string, any>
  links?: string[]
}) {
  if (!sessionId) return
  try {
    await fetch('/api/onboarding/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      body: JSON.stringify({ sessionId, answers, links }),
    })
  } catch {
    // non-blocking; ignore network errors for UX smoothness
  }
}

/**
 * Optional helper: call after sign-in to attach the current browser
 * session to the authenticated user immediately (even if no new answers).
 */
export async function attachSessionToUser(sessionId: string) {
  if (!sessionId) return
  try {
    await fetch('/api/onboarding/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      body: JSON.stringify({ sessionId }),
    })
  } catch {
    // ignore
  }
}