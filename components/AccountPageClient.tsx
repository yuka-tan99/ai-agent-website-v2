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
 * Single account shell (Fliki-like). Soft-purple accents via DesignStyles.
 * IMPORTANT: Do NOT also render a route layout for /account; this shell should be the only one.
 */
export default function AccountPageClient({ section = 'usage' }: Props) {
  const sb = supabaseBrowser()
  const router = useRouter()
  const pathname = usePathname()

  const [email, setEmail] = useState('')

  // Profile local UI state (no backend writes)
  const [displayName, setDisplayName] = useState('')
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
    })()

    const sub = sb.auth.onAuthStateChange((_e, s) => {
      if (!active) return
      if (!s?.user) router.replace('/signin?mode=signin')
      else setEmail(s.user.email || '')
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

              <div className="my-2 h-px bg-[rgba(0,0,0,.08)]" />

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
          <div className="mt-2">
            <div className="acc-card p-4">
              <div className="text-gray-600 text-sm">Usage metrics coming soon.</div>
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
                <button className="btn-primary" onClick={() => alert('Saved locally.')}>
                  Save
                </button>
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
          <input
            type="password"
            className="pw-input"
            placeholder="Enter new password"
            value={pwd}
            onChange={(e)=> setPwd(e.target.value)}
            disabled={pwdBusy}
          />
          {pwdMsg && <div className="pw-msg" role="alert">{pwdMsg}</div>}
        </div>
        <div className="pw-foot">
          <button
            className="pw-btn"
            disabled={pwdBusy || !pwd || pwd.length < 8}
            onClick={async () => {
              setPwdMsg(null)
              if (!pwd || pwd.length < 8) { setPwdMsg('Password must be at least 8 characters.'); return }
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
