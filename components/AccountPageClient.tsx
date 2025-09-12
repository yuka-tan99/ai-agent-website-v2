// components/AccountPageClient.tsx
'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabaseClient'
import DesignStyles from '@/components/DesignStyles'
import { LayoutDashboard, Gift, Users, User, DollarSign, LogOut, ChartColumnIncreasing, Contact } from "lucide-react";

export type SectionKey = 'usage' | 'rewards' | 'referrals' | 'profile' | 'reset'

type Props = {
  /** Which section to show; defaults to 'usage' */
  section?: SectionKey
}

/**
 * Single account shell. Soft-purple accents via DesignStyles.
 * IMPORTANT: Do NOT also render a route layout for /account; this shell should be the only one.
 */
export default function AccountPageClient({ section = 'usage' }: Props) {
  const sb = supabaseBrowser()
  const router = useRouter()
  const pathname = usePathname()

  const [email, setEmail] = useState('')
  const [access, setAccess] = useState<any | null>(null)
  const [accessLoading, setAccessLoading] = useState<boolean>(false)

  // Profile local UI state (no backend writes)
  const [displayName, setDisplayName] = useState('')
  const [savingName, setSavingName] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)
  const [pwdOpen, setPwdOpen] = useState(false)
  const [pwd, setPwd] = useState('')
  const [pwdBusy, setPwdBusy] = useState(false)
  const [pwdMsg, setPwdMsg] = useState<string | null>(null)

  // Smooth section fade (no keyframes = no flicker)
  const [sectionVisible, setSectionVisible] = useState(true)
  useEffect(() => {
    // hide then show next frame → CSS transition handles the fade/slide
    setSectionVisible(false)
    const id = requestAnimationFrame(() => setSectionVisible(true))
    return () => cancelAnimationFrame(id)
  }, [section])

  // Auth guard (silent redirect, no blocking loaders)
  useEffect(() => {
    const sb = supabaseBrowser()
    let active = true

    ;(async () => {
      const { data } = await sb.auth.getUser()
      if (!active) return
      if (!data.user) {
        router.replace('/signin?mode=signin')
        return
      }
      setEmail(data.user.email || '')
      try {
        const meta: any = data.user.user_metadata || {}
        const initialName = (meta.name || meta.full_name || '') as string
        if (initialName) {
          setDisplayName(initialName)
          try { localStorage.setItem('profile_name', initialName) } catch {}
        } else {
          const cached = localStorage.getItem('profile_name')
          if (cached) setDisplayName(cached)
        }
      } catch {}
    })()

    const sub = sb.auth.onAuthStateChange((_e, s) => {
      if (!active) return
      if (!s?.user) router.replace('/signin?mode=signin')
      else {
        setEmail(s.user.email || '')
        try {
          const meta: any = s.user.user_metadata || {}
          const initialName = (meta.name || meta.full_name || '') as string
          if (initialName) {
            setDisplayName(initialName)
            try { localStorage.setItem('profile_name', initialName) } catch {}
          }
        } catch {}
      }
    })

    return () => {
      active = false
      sub.data.subscription.unsubscribe()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const title = useMemo(() => {
    switch (section) {
      case 'rewards': return 'Rewards'
      case 'referrals': return 'Referrals'
      case 'profile': return 'Profile'
      case 'reset': return 'Reset Password'
      default: return 'Usage'
    }
  }, [section])

  const isActive = (href: string) => pathname === href

  // Load AI access window for usage view
  useEffect(() => {
    if (section !== 'usage') return
    let cancelled = false
    setAccessLoading(true)
    fetch('/api/me/access', { cache: 'no-store' })
      .then(r => r.json())
      .then((j) => { if (!cancelled) setAccess(j) })
      .catch(() => { if (!cancelled) setAccess(null) })
      .finally(() => { if (!cancelled) setAccessLoading(false) })
    return () => { cancelled = true }
  }, [section])

  // Compute percent remaining and labels
  const usage = useMemo(() => {
    if (!access?.active_window) return null
    try {
      const start = new Date(access.active_window.access_starts_at)
      const end = new Date(access.active_window.access_ends_at)
      const now = new Date()
      const totalMs = Math.max(0, end.getTime() - start.getTime())
      const remMs = Math.max(0, end.getTime() - now.getTime())
      const pct = totalMs > 0 ? Math.min(100, Math.max(0, (remMs / totalMs) * 100)) : 0
      const totalDays = Math.max(1, Math.round(totalMs / (1000*60*60*24)))
      const remDays = Math.max(0, Math.ceil(remMs / (1000*60*60*24)))
      return { pct, totalDays, remDays, start, end }
    } catch { return null }
  }, [access])

  async function downloadMyData() {
    try {
      const res = await fetch('/api/me/chat/export', { cache: 'no-store' })
      if (!res.ok) return
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'chat_export.json'
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch {}
  }

  return (
    <div data-mentor-ui className="acc-shell">
      <DesignStyles />

{/* === CONTENT WRAPPER (unchanged container) === */}
    {/* FIXED frame below TopNav + title; only inner panes can scroll */}
    <div className="acc-frame">
      <div className="max-w-6xl mx-auto h-full px-4">
        <div className="grid md:grid-cols-[240px_1fr] gap-8 h-full pt-4">
          {/* LEFT RAIL — pinned; own scrollbar if needed */}
          <aside className="acc-rail hidden md:block rounded-lg p-3 h-full pr-1">
            <nav className="mt-2 space-y-1">
              <Link href="/dashboard" className={`acc-link ${isActive('/dashboard') ? 'active' : ''}`}><LayoutDashboard className="w-5 h-5" /> My Report</Link>
              <Link href="/account" className={`acc-link ${isActive('/account') ? 'active' : ''}`}><ChartColumnIncreasing /> Usage</Link>
              <Link href="/account/rewards" className={`acc-link ${isActive('/account/rewards') ? 'active' : ''}`}><Gift className="w-5 h-5" /> Rewards</Link>
              <Link href="/account/referrals" className={`acc-link ${isActive('/account/referrals') ? 'active' : ''}`}><Users className="w-5 h-5" />Referrals</Link>
              <Link href="/account/profile" className={`acc-link ${isActive('/account/profile') ? 'active' : ''}`}><User />   Profile</Link>

              {/* separator removed for cleaner left rail */}

              {/* <button
                className="acc-link w-full text-left"
                onClick={async () => {
                  if (!email) return
                  await sb.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset` })
                  alert('Password reset email sent.')
                }}
              >
                🔒 Reset Password
              </button> */}

              <button
                className="acc-link w-full text-left"
                onClick={async () => { await sb.auth.signOut(); router.replace('/') }}
              >
                <LogOut /> Log Out
              </button>
            </nav>
          </aside>

          {/* RIGHT PANE — the ONLY scroller */}
          <section
            className={[
              'acc-scroll h-full overflow-y-auto pr-2',
              'transition-opacity duration-200 motion-reduce:transition-none',
              'will-change-[opacity,transform]',
              sectionVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-[2px]',
            ].join(' ')}
          >
        {/* Sticky section header pill under TopNav */}
        <div className="sticky top-0 z-10 pt-2 pb-2 bg-transparent">
          <div className="usage-pill">
            <div className="text-lg font-semibold text-gray-700">{title}</div>
          </div>
        </div>

        {/* your existing section renders … unchanged */}
        {section === 'usage' && (
          <div className="mt-2 space-y-4">
            <div className="acc-card p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="text-lg font-semibold text-gray-800">{access?.active && usage ? 'AI chat access' : 'Unlock your personal marketing coach'}</div>
              </div>

              {!accessLoading && (
                <div className="fade-in">
                  {access?.active && usage ? (
                    <div>
                  <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                    <span>Time remaining</span>
                    <span>{usage.remDays} of {usage.totalDays} days</span>
                  </div>
                  <div className="w-full h-3 rounded-full bg-[rgba(98,55,160,.15)] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[var(--accent-grape)] transition-[width] duration-500"
                      style={{ width: `${usage.pct}%` }}
                    />
                  </div>
                  <div className="mt-2 text-xs text-gray-500">
                    Access ends on {usage.end.toLocaleDateString()}
                  </div>
                  {usage.remDays <= 7 && (
                    <div className="mt-3 flex items-center gap-3">
                      <a href="/paywall/ai" className="btn-primary rounded-full inline-block px-5 py-3 text-base">Renew now</a>
                      <span className="text-xs text-gray-500">Keep access without interruption.</span>
                    </div>
                  )}
                </div>
                  ) : (
                    <div>
                      <div className="text-sm text-gray-600">Get instant, personalized advice for your growth journey, available 24/7</div>
                      <a href="/paywall/ai" className="inline-block mt-3 btn-primary rounded-full px-5 py-3 text-base">Get instant access</a>
                    </div>
                  )}
                  <div className="mt-4">
                    <button onClick={downloadMyData} className="btn-secondary rounded-full px-5 py-3 text-base">Download my data</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        {section === 'rewards' && (
          <div className="mt-2 acc-card p-4">
            <div className="text-gray-600 text-sm">Rewards coming soon.</div>
          </div>
        )}
        {section === 'referrals' && (
          <div className="mt-2 acc-card p-4">
            <div className="text-gray-600 text-sm">Referrals coming soon.</div>
          </div>
        )}
        {section === 'profile' && (
          <div className="space-y-6">
            <div className="acc-card p-6">
              <div className="text-lg font-semibold mb-4 text-gray-800">Basic details</div>

              <label className="acc-label">Email</label>
              <input className="acc-input" value={email} readOnly aria-readonly />

              <label className="acc-label mt-4">Name</label>
              <input
                className="acc-input"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
              />

              <div className="mt-5 flex items-center gap-3">
                <button
                  className="btn-secondary"
                  onClick={() => { setPwdOpen(true); setPwd(''); setPwdMsg(null); }}
                >
                  Change password
                </button>
                <button
                  className="btn-primary"
                  disabled={savingName}
                  onClick={async () => {
                    setSaveMsg(null)
                    try {
                      setSavingName(true)
                      const { error } = await sb.auth.updateUser({ data: { name: displayName } })
                      if (error) throw error
                      setSaveMsg('Saved')
                      try { localStorage.setItem('profile_name', displayName) } catch {}
                      setTimeout(() => setSaveMsg(null), 1200)
                    } catch (e:any) {
                      setSaveMsg(e?.message || 'Failed to save')
                    } finally {
                      setSavingName(false)
                    }
                  }}
                >
                  {savingName ? 'Saving…' : 'Save'}
                </button>
                {saveMsg && <span className="text-sm text-gray-600">{saveMsg}</span>}
              </div>
            </div>
          </div>
        )}

        {section === 'reset' && (
          <div className="mt-2 acc-card p-6 space-y-3">
            <div className="text-sm text-gray-700">We’ll send a reset link to:</div>
            <div className="text-sm font-medium">{email || '—'}</div>
            <button
              className="btn-primary"
              onClick={async () => {
                if (!email) return
                await sb.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset` })
                alert('Password reset email sent.')
              }}
            >
              Send reset link
            </button>
          </div>
        )}
      </section>
    </div>
  </div>
</div>
  {/* Change Password Modal */}
  {pwdOpen && (
    <div className="pw-modal" role="dialog" aria-modal="true" aria-labelledby="pw-title">
      <div className="pw-backdrop" onClick={() => !pwdBusy && setPwdOpen(false)} />
      <div className="pw-dialog">
        <div className="pw-head">
          <h3 id="pw-title">Change password</h3>
          <button className="pw-x" onClick={() => !pwdBusy && setPwdOpen(false)} aria-label="Close">×</button>
        </div>
        <div className="pw-body">
          <label className="acc-label">New password</label>
          <div className="relative">
            <input
              type="password"
              className="pw-input pr-10"
              placeholder="Enter new password"
              value={pwd}
              onChange={(e)=> setPwd(e.target.value)}
              disabled={pwdBusy}
            />
            {pwd.length > 0 && pwd.length >= 8 && /[^A-Za-z0-9]/.test(pwd) && (
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-green-600" aria-hidden>✔</span>
            )}
          </div>
          {/* Password strength indicator */}
          <PasswordStrength value={pwd} />
          {pwdMsg && <div className="pw-msg" role="alert">{pwdMsg}</div>}
        </div>
        <div className="pw-foot">
          <button
            className="pw-btn"
            disabled={pwdBusy || !pwd || pwd.length < 8 || !/[^A-Za-z0-9]/.test(pwd)}
            onClick={async () => {
              setPwdMsg(null)
              if (!pwd || pwd.length < 8) { setPwdMsg('Password must be at least 8 characters.'); return }
              if (!/[^A-Za-z0-9]/.test(pwd)) { setPwdMsg('Include at least 1 special character.'); return }
              try {
                setPwdBusy(true)
                const { error } = await sb.auth.updateUser({ password: pwd })
                if (error) throw error
                setPwdMsg('Password updated successfully.')
                setTimeout(() => setPwdOpen(false), 1000)
              } catch (e:any) {
                setPwdMsg(e?.message || 'Failed to update password')
              } finally {
                setPwdBusy(false)
              }
            }}
          >
            {pwdBusy ? 'Updating…' : 'Update'}
          </button>
        </div>
      </div>
    </div>
  )}
</div>
  )
}

function PasswordStrength({ value }: { value: string }) {
  const v = value || ''
  if (!v) return null
  const hasLower = /[a-z]/.test(v)
  const hasUpper = /[A-Z]/.test(v)
  const hasDigit = /\d/.test(v)
  const hasSpecial = /[^A-Za-z0-9]/.test(v)
  let score = 0
  if (v.length >= 8) score++
  if (v.length >= 12) score++
  if (hasLower) score++
  if (hasUpper) score++
  if (hasDigit) score++
  if (hasSpecial) score++
  const label = score <= 2 ? 'weak' : score <= 4 ? 'medium' : 'strong'
  const color = label === 'weak' ? '#DC2626' : label === 'medium' ? '#F59E0B' : '#16A34A'
  const pct = Math.min(100, (score / 6) * 100)
  return (
    <div className="mt-2" aria-live="polite">
      <div className="h-1.5 w-full bg-[#E5E7EB] rounded">
        <div className="h-1.5 rounded" style={{ width: `${pct}%`, background: color }} />
      </div>
      <div className="mt-1 text-xs text-gray-600 flex items-center gap-2">
        <span>Strength:</span>
        <span style={{ color }}>{label}</span>
        <span className="text-gray-400">· Use 8+ chars and 1 special</span>
      </div>
    </div>
  )
}
