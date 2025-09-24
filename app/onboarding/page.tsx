'use client'

import React, { useMemo, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getOrCreateOnboardingSessionId } from '@/lib/onboardingSession'
import { supabaseBrowser } from '@/lib/supabaseClient'
import AdviceModal from '@/components/AdviceModal'
import DesignStyles from '@/components/DesignStyles'

/** ---------- Types ---------- */
type BaseQ = {
  id: string
  text: string
  options: string[]
  multiple?: boolean
  allowOther?: boolean
}
type Question = BaseQ & {
  sub?: BaseQ | Record<string, BaseQ>
  sub2?: BaseQ
  when?: (answers: Record<string, any>) => boolean
}

/** ---------- UI Bits ---------- */
const Button = ({ label, active, onClick }: any) => (
  <button
    onClick={onClick}
    className={`px-6 py-3.5 rounded-full min-w-[240px] text-lg font-medium transition text-center
      ${active ? 'bg-[#D9B8E3] text-black border border-transparent' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'}`}
  >
    {label}
  </button>
)

const OtherInput = ({
  value,
  onChange,
  placeholder = 'type your answer…',
}: { value: string; onChange: (v: string) => void; placeholder?: string }) => (
  <input
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
    className="mt-3 w-full max-w-lg rounded-2xl border px-5 py-3 text-base outline-none focus:ring-2 focus:ring-black/20"
  />
)

/** -------------------- QUESTIONS -------------------- */
const questions: Question[] = [
  // 1. Identity & Starting Point
  {
    id: 'whyHere',
    text: 'what brings you here today?',
    multiple: false,
    options: [
      'I want to grow my personal brand',
      'I need to market my business/product',
      "I'm an artist/creator seeking visibility",
      'I want to monetize my existing following',
      "I'm stuck and need a breakthrough",
      "Just exploring what's possible",
    ],
  },
  {
    id: 'journeyStage',
    text: 'where are you on your journey?',
    multiple: false,
    options: [
      'Starting from scratch (< 100 followers)',
      'Building momentum (100-1K followers)',
      'Growing steadily (1K-10K followers)',
      'Established but plateauing (10K-50K followers)',
      'Large following seeking optimization (50K+ followers)',
      'Had success before, starting fresh',
    ],
  },
  {
    id: 'biggestChallenges',
    text: "what's your biggest challenge right now? (select up to 3)",
    multiple: true,
    options: [
      "I don't know what to post about",
      "I can't stay consistent",
      'My content gets no engagement',
      'I\'m afraid of being judged',
      "I don't have enough time",
      'I feel inauthentic/fake',
      "I'm overwhelmed by all the advice",
      'Technical stuff confuses me',
      'I compare myself to others constantly',
      'My growth has completely stalled',
    ],
  },

  // 2. Vision & Goals
  {
    id: 'success6mo',
    text: 'what does success look like for you in 6 months?',
    multiple: true,
    allowOther: true,
    options: [
      'Consistent posting without anxiety',
      'A clear brand identity people recognize',
      'Regular engagement from my community',
      'First paying clients/customers',
      'Brand deals and sponsorships',
      'Selling my own products/services',
      'Just feeling confident and authentic',
      'other',
    ],
  },
  {
    id: 'drivingForces',
    text: "what's driving you? (select all that resonate)",
    multiple: true,
    options: [
      'Financial freedom',
      'Creative expression',
      'Helping others with my knowledge',
      'Building a legacy',
      'Escaping traditional employment',
      'Connecting with like-minded people',
      'Proving something to myself/others',
      'Having fun and experimenting',
    ],
  },
  {
    id: 'desiredFeeling',
    text: 'how do you want people to feel after consuming your content?',
    multiple: true,
    options: [
      'Inspired and motivated',
      'Educated and informed',
      'Entertained and amused',
      'Comforted and understood',
      'Challenged to think differently',
      'Aesthetically pleased',
      'Part of a community',
      'Excited to take action',
    ],
  },

  // 3. Content & Comfort Zone
  {
    id: 'contentNatural',
    text: 'what type of content feels most natural to you?',
    multiple: true,
    options: [
      'Teaching/explaining things I know',
      'Sharing my daily life and experiences',
      'Creating entertaining/funny content',
      'Showcasing visual aesthetics',
      'Having deep conversations',
      'Documenting my process/journey',
      'Reacting to trends/current events',
      'Building/making things',
    ],
  },
  {
    id: 'visibilityComfort',
    text: 'how do you feel about being visible?',
    multiple: false,
    options: [
      'Love being on camera, very comfortable',
      'OK with video but prefer edited/prepared content',
      'Prefer voiceovers with visuals',
      'Want to stay completely behind the scenes',
      'Depends on my mood/topic',
      'Want to work up to showing my face',
    ],
  },
  {
    id: 'creationReality',
    text: "what's your content creation reality?",
    multiple: false,
    options: [
      'I can batch create on weekends',
      'I have 15-30 minutes daily',
      'I can dedicate several hours daily',
      'My schedule is unpredictable',
      'I have help/team support',
      "Time isn't an issue, motivation is",
    ],
  },
  {
    id: 'deepTopics',
    text: 'what topics could you talk about for hours? (select or add your own)',
    multiple: true,
    allowOther: true,
    options: [
      'professional expertise', 'life experiences', 'creative processes', 'industry insights', 'specific hobbies', 'other'
    ],
  },

  // 4. Platform & Audience
  {
    id: 'naturalPlatforms',
    text: 'where do you naturally spend time online?',
    multiple: true,
    options: [
      'TikTok (I love short videos)',
      'Instagram (Visual storytelling is my thing)',
      'YouTube (Long-form content consumer)',
      'Twitter/X (Quick thoughts and conversations)',
      'LinkedIn (Professional networking)',
      'Multiple platforms equally',
      'Mostly lurking, not participating yet',
    ],
  },
  {
    id: 'whoNeeds',
    text: 'who needs what you have to offer?',
    multiple: true,
    options: [
      'People starting where I once was',
      'Professionals in my industry',
      'People with similar interests/hobbies',
      'Local community/geography specific',
      'Specific age group',
      'Anyone who resonates with my message',
      "I honestly don't know yet",
    ],
    sub: {
      'Specific age group': {
        id: 'ageGroup',
        text: 'which age group?',
        multiple: false,
        options: ['Gen Z', 'Millennials', 'Gen X', 'Boomers'],
      },
    },
  },
  {
    id: 'metricsAttitude',
    text: "what's your relationship with data and metrics?",
    multiple: false,
    options: [
      'I obsessively check stats',
      "I look occasionally but don't stress",
      'Numbers make me anxious',
      'I ignore them completely',
      'I want to learn to use them better',
      'I prefer qualitative feedback',
    ],
  },

  // 5. Barriers & History
  {
    id: 'fears',
    text: 'what specific fears hold you back? (select all)',
    multiple: true,
    options: [
      'Being cringy or embarrassing', 'Family/friends judging me', 'Strangers leaving mean comments', 'Not being good enough', 'Copying others/not being original', 'Technical mistakes', 'Cancel culture/saying wrong thing', 'Success changing me', 'No fears, just need direction'
    ],
  },
  {
    id: 'triedAlready',
    text: 'what have you already tried?',
    multiple: true,
    options: [
      'Posting consistently for a while', 'Following trends religiously', 'Expensive courses/coaching', 'Different content styles', 'Paid advertising', 'Nothing substantial yet', "Everything, I'm exhausted"
    ],
  },
  {
    id: 'handleCriticism',
    text: 'how do you handle criticism?',
    multiple: false,
    options: [
      'I use it to improve', 'It crushes me for days', 'I get defensive', 'I ignore it mostly', 'Depends who it\'s from', "Haven't faced much yet"
    ],
  },

  // 6. Monetization & Growth
  {
    id: 'monetization',
    text: 'when it comes to making money from this...',
    multiple: false,
    options: [
      'I need income ASAP',
      "I'm building long-term, no rush",
      'I want multiple revenue streams',
      'I just want to cover my costs',
      "Money isn't the main goal",
      "I'm already monetizing but want to scale",
    ],
  },
  {
    id: 'dreamPercent',
    text: 'what percentage of your dream life requires social media success?',
    multiple: false,
    options: [
      '100% - This IS my dream', '75% - It\'s a major component', '50% - It\'s important but not everything', '25% - It\'s just one piece', 'Just exploring possibilities'
    ],
  },
]

// ---- Progress helpers (count only applicable questions, incl. subs) ----
type QLite = { id: string; multiple?: boolean }

function listApplicableQuestions(answers: Record<string, any>) {
  const out: QLite[] = []
  for (const q of questions) {
    if (q.when && !q.when(answers)) continue
    out.push({ id: q.id, multiple: q.multiple })
    if (q.sub) {
      if ('id' in q.sub) {
        const s = q.sub as any
        out.push({ id: s.id, multiple: s.multiple })
      } else {
        const selected = answers[q.id]
        const dyn = (q.sub as Record<string, any>)[String(selected)]
        if (dyn && dyn.id) out.push({ id: dyn.id, multiple: dyn.multiple })
      }
    }
    if (q.sub2) out.push({ id: q.sub2.id, multiple: q.sub2.multiple })
  }
  return out
}

function isAnswered(q: QLite, answers: Record<string, any>) {
  const v = answers[q.id]
  return q.multiple ? Array.isArray(v) && v.length > 0 : typeof v === 'string' && v.length > 0
}

function computeProgress(answers: Record<string, any>) {
  const all = listApplicableQuestions(answers)
  const total = all.length
  const done = all.reduce((n, q) => n + (isAnswered(q, answers) ? 1 : 0), 0)
  const percent = total > 0 ? Math.round((done / total) * 100) : 0
  return { done, total, percent }
}

/** ------------------- Onboarding flow ------------------- */

export default function Onboarding() {
  // New smart-branching flow (keeps UX style)
  const Smart = require('@/components/onboarding/SmartOnboarding').default
  return <Smart />
}

// Legacy flow kept below (unused)
export function LegacyOnboarding() {
  const router = useRouter()
  const sb = supabaseBrowser()

  // Session id per browser
  const [sessionId] = useState(() => getOrCreateOnboardingSessionId())

  const [step, setStep] = useState(0)
  const [showSub, setShowSub] = useState(false)
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({})
  const [otherDrafts, setOtherDrafts] = useState<Record<string, string>>({})
  // Links step removed — no social link collection
  const [authed, setAuthed] = useState<boolean | null>(null)

  // Mini advice modal state
  const [tipOpen, setTipOpen] = useState(false)
  const [tipText, setTipText] = useState('')
  const [holdOpen, setHoldOpen] = useState(false)
  const [holdTitle, setHoldTitle] = useState('clarity is kindness')
  const [holdText, setHoldText] = useState('')
  const [transitioning, setTransitioning] = useState(false)

  // Reset “shown once” flags each visit
  useEffect(() => {
    try { sessionStorage.removeItem('stuck_tip_shown') } catch {}
    try { sessionStorage.removeItem('holding_tip_shown') } catch {}
  }, [])

  // Track auth state
  useEffect(() => {
    let unsub: (() => void) | undefined
    sb.auth.getUser().then(({ data }) => setAuthed(!!data.user))
    const sub = sb.auth.onAuthStateChange((_e, s) => setAuthed(!!s?.user))
    unsub = () => sub?.data?.subscription?.unsubscribe?.()
    return () => { try { unsub?.() } catch {} }
  }, [sb])

  // Ensure a shell session row exists immediately
  useEffect(() => {
    ;(async () => {
      try {
        await fetch('/api/onboarding/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, answers: {} }),
          cache: 'no-store',
        })
      } catch {}
    })()
  }, [sessionId])

  // Persist partial changes incrementally
  const persistDraft = async (patch: { answers?: any }) => {
    try {
      await fetch('/api/onboarding/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, ...patch }),
        cache: 'no-store',
      })
    } catch {}
  }

  // Show one-off tips
  const maybeShowStuckTip = async (nextAnswers: Record<string, any>) => {
    const FLAG = 'stuck_tip_shown'
    try {
      if (sessionStorage.getItem(FLAG)) return
      const stuck = Array.isArray(nextAnswers.stuckReason) ? nextAnswers.stuckReason : []
      if (!stuck.length) return

      let tip = ''
      try {
        const res = await fetch('/api/onboarding/mini-advice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            identity: nextAnswers.identity,
            stuckReason: stuck,
            goal: nextAnswers.goal,
            reach: nextAnswers.reach,
            techComfort: nextAnswers.techComfort,
            techGaps: nextAnswers.techGaps,
          }),
          cache: 'no-store',
        })
        const json = res.ok ? await res.json().catch(()=> ({})) : {}
        tip = (json?.tip || '').toString().trim()
      } catch {}

      if (!tip) {
        const choice = (stuck[0] || '').toLowerCase()
        if (choice.includes('plateau')) {
          tip = "You’re not broken — your format just needs a tune-up. Audit your last 10 posts, keep the top 2 hook patterns, and remix them 3 ways."
        } else if (choice.includes('not sure what content')) {
          tip = "Pick 3 topics you could talk about for a month. Save 10 example posts you like, then make 1 fast remix of each. Momentum > perfection."
        } else if (choice.includes('engagement')) {
          tip = "Make comments a content source: ask one specific prompt per post, reply with a short video to the best answer, and pin it."
        } else if (choice.includes('confidence') || choice.includes('stuck')) {
          tip = "Shrink the task: record 3 x 20-second drafts today. Tomorrow, trim one to 12 seconds and ship it. Done is data."
        } else {
          tip = "Run tiny loops: 1 idea → 1 draft → publish → check the first 2 seconds’ retention. Repeat tomorrow."
        }
      }

      setTipText(tip)
      setTipOpen(true)
      sessionStorage.setItem(FLAG, '1')
    } catch {}
  }

  const maybeShowHoldingTip = async (nextAnswers: Record<string, any>) => {
    const FLAG = 'holding_tip_shown'
    try {
      if (sessionStorage.getItem(FLAG)) return
      const hb = Array.isArray(nextAnswers.holdingBack) ? nextAnswers.holdingBack : []
      if (!hb.length) return

      let title = 'clarity is kindness'
      let tip = ''
      try {
        const res = await fetch('/api/onboarding/mini-advice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            kind: 'holding',
            identity: nextAnswers.identity,
            holdingBack: hb,
            goal: nextAnswers.goal,
            reach: nextAnswers.reach,
            techComfort: nextAnswers.techComfort,
            techGaps: nextAnswers.techGaps,
          }),
          cache: 'no-store',
        })
        const json = res.ok ? await res.json().catch(()=> ({})) : {}
        title = (json?.title || title).toString()
        tip = (json?.tip || '').toString().trim()
      } catch {}

      if (!tip) {
        const choice = (hb[0] || '').toLowerCase()
        if (choice.includes('time')) {
          title = 'start smaller, win sooner'
          tip = "Short on time? Record 3 quick 15-second drafts this week. Ship one. Save the rest for remixing tomorrow."
        } else if (choice.includes('judgment') || choice.includes('feedback')) {
          title = 'post for one person'
          tip = "Pick a single friend who’d love your post and make it for them. One audience member > the whole internet."
        } else if (choice.includes('monetize')) {
          title = 'one path, two weeks'
          tip = "Choose one offer (brand deal / product / service). Make 4 posts that all point to it."
        } else {
          title = 'focus beats friction'
          tip = "Circle one priority for the next 7 days. Ship tiny posts that serve only that. Progress > perfection."
        }
      }

      setHoldTitle(title)
      setHoldText(tip)
      setHoldOpen(true)
      sessionStorage.setItem(FLAG, '1')
    } catch {}
  }

  // Restore any previous progress for this session (answers only)
  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch(`/api/onboarding/save?sessionId=${encodeURIComponent(sessionId)}`, { cache: 'no-store' })
        if (!res.ok) return
        const json = await res.json()
        if (json?.answers && typeof json.answers === 'object') setAnswers(json.answers)
      } catch {}
    })()
  }, [sessionId])

  // Inject a virtual final step for links
  const totalSteps = questions.length

  const { percent } = useMemo(() => computeProgress(answers), [answers])

  const current = useMemo(() => {
    // Skip conditional questions
    let idx = step
    while (idx < questions.length && questions[idx].when && !questions[idx].when!(answers)) {
      idx++
    }
    if (idx !== step) setStep(idx)
    return questions[idx]
  }, [step, answers])

  const mainSelected = answers[(current as any).id]
  const isDynamicSub = (current as any).sub && typeof (current as any).sub === 'object' && !('id' in (current as any).sub)
  const dynamicSub = isDynamicSub ? ((current as any).sub as Record<string, BaseQ>)[String(mainSelected)] : null
  const staticSub = !isDynamicSub && (current as any).sub ? ((current as any).sub as BaseQ) : null
  const subQuestion: BaseQ | null = (dynamicSub || staticSub || null)
  const subSelected = subQuestion ? answers[subQuestion.id] : null

  // Save after each selection (and auto-reveal sub for single-choice)
  const handleSelect = (key: string, value: string, multi?: boolean) => {
    setAnswers((prev) => {
      const cur = prev[key]
      const next = multi
        ? (Array.isArray(cur) ? (cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value]) : [value])
        : value

      let merged = { ...prev, [key]: next }

      // If selecting the MAIN question and it has a sub, auto-show sub
      try {
        const curr: any = current as any
        const isMain = key === curr?.id
        const isSingle = !!isMain && !curr?.multiple
        const hasSub = !!curr?.sub
        if (isMain && isSingle && hasSub) {
          if (curr.sub && typeof curr.sub === 'object' && !('id' in curr.sub)) {
            Object.values(curr.sub as Record<string, any>).forEach((s: any) => {
              if (s?.id && merged[s.id] !== undefined) delete (merged as any)[s.id]
            })
          } else if (curr.sub && 'id' in curr.sub) {
            const sid = (curr.sub as any).id
            if (sid && merged[sid] !== undefined) delete (merged as any)[sid]
          }
          setShowSub(true)
        }
      } catch {}

      // Persist
      persistDraft({ answers: merged })
      return merged
    })
  }

  const isActive = (q: BaseQ, val: string) =>
    q.multiple ? Array.isArray(answers[q.id]) && (answers[q.id] as string[]).includes(val) : answers[q.id] === val

  const hasAnswer = (q: BaseQ, val: string | string[] | undefined) =>
    q.multiple ? Array.isArray(val) && val.length > 0 : typeof val === 'string' && val.length > 0

  // Go to previous logical step or collapse sub if visible
  const handleBack = () => {
    if (showSub) { setShowSub(false); return }
    let prevIdx = step - 1
    while (prevIdx >= 0 && questions[prevIdx].when && !questions[prevIdx].when!(answers)) {
      prevIdx--
    }
    if (prevIdx >= 0) setStep(prevIdx)
  }

  const mergeOtherIfNeeded = (q: BaseQ) => {
    if (!q.allowOther) return
    const sel = answers[q.id]
    const otherPicked = Array.isArray(sel) && sel.includes('other')
    const draft = otherDrafts[q.id]?.trim()
    if (otherPicked && draft) {
      const merged = [...(sel as string[]).filter((x) => x !== 'other'), draft]
      setAnswers((prev) => {
        const next = { ...prev, [q.id]: merged }
        persistDraft({ answers: next })
        return next
      })
      setOtherDrafts((p) => ({ ...p, [q.id]: '' }))
    }
  }

  const handleContinue = async () => {
    // Animate: grow button + fade content slightly before advancing
    setTransitioning(true)
    await new Promise((r)=> setTimeout(r, 220))
    const mainQ = current as BaseQ
    const subQ = subQuestion as BaseQ | null

    const stuckShown = !!sessionStorage.getItem('stuck_tip_shown')
    const holdShown  = !!sessionStorage.getItem('holding_tip_shown')

    const willShowStuck = !stuckShown && subQ?.id === 'stuckReason' && hasAnswer(subQ, subSelected || undefined)
    const willShowHold  = !holdShown && mainQ?.id === 'holdingBack' && hasAnswer(mainQ, mainSelected || undefined)

    // ---- Normal steps
    mergeOtherIfNeeded(mainQ)
    if (subQ) mergeOtherIfNeeded(subQ)

    if (!hasAnswer(mainQ, mainSelected || undefined)) return
    if (subQ && !showSub) { setShowSub(true); return }
    if (subQ && !hasAnswer(subQ, subSelected || undefined)) return

    // Find next applicable question index skipping conditionals
    let nextIdx = step + 1
    while (nextIdx < questions.length && questions[nextIdx].when && !questions[nextIdx].when!(answers)) {
      nextIdx++
    }
    const hasMore = nextIdx < questions.length
    if (hasMore) {
      setStep(nextIdx)
      setShowSub(false)
    } else {
      // Finalize onboarding and route to next steps (signin → paywall → generate)
      try { localStorage.setItem('onboarding', JSON.stringify(answers)) } catch {}
      await persistDraft({ answers })

      if (!authed) {
        const next = encodeURIComponent('/auth/signed-up?next=/paywall')
        return router.push(`/signin?next=${next}`)
      }
      try {
        await fetch('/api/onboarding/complete', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, answers }), cache: 'no-store'
        })
      } catch {}
      setTransitioning(false)
      return router.push('/paywall')
    }

    if (willShowStuck) {
      void maybeShowStuckTip(answers)
    } else if (willShowHold) {
      void maybeShowHoldingTip(answers)
    }
    // Reset transition state after moving to next question
    setTimeout(()=> setTransitioning(false), 40)
  }

  return (
    <div data-mentor-ui>
      <DesignStyles />

      {/* Top progress bar */}
      <div className="fixed top-0 left-0 w-full h-[6px] bg-gray-200 z-50">
        <div className="h-full bg-[var(--soft-purple)] transition-all duration-500" style={{ width: `${percent}%` }} />
      </div>

      <div className={["min-h-screen flex flex-col items-center justify-center bg-[#f9fafb] px-4 text-center fade-in pb-24 md:pb-28 onb-wrap", transitioning ? "is-fading" : ""].join(' ')}>
        <div className="w-full max-w-2xl">
          {/* Back to previous (fixed, aligned with title Y, left-aligned) */}
          {step > 0 && (
            <div className="fixed left-6 z-40" style={{ top: 'calc(var(--navH) + 12px)' }}>
              <button
                onClick={handleBack}
                className="inline-flex items-center h-11 px-2 rounded-md text-left text-sm md:text-base text-gray-700 hover:text-[var(--accent-grape)] hover:font-semibold transition-colors"
                aria-label="Back to previous"
              >
                &lt;- back
              </button>
            </div>
          )}
          <h2 className="text-4xl md:text-5xl font-bold mb-7 text-gray-900 slide-up">{(current as any).text}</h2>

          {(
            <>
              <div className="flex flex-wrap justify-center gap-3 mb-6 slide-up">
                {(current as any).options?.map((opt: string) => (
                  <Button
                    key={opt}
                    label={opt}
                    active={isActive(current as any, opt)}
                    onClick={() => handleSelect((current as any).id, opt, !!(current as any).multiple)}
                  />
                ))}
              </div>

              {(current as any).allowOther &&
                Array.isArray(answers[(current as any).id]) &&
                (answers[(current as any).id] as string[]).includes('other') && (
                  <OtherInput
                    value={otherDrafts[(current as any).id] || ''}
                    onChange={(v) => setOtherDrafts((p) => ({ ...p, [(current as any).id]: v }))}
                    placeholder="add your platform or content type…"
                  />
                )}

              {showSub && subQuestion && (
                <>
                  <p className="text-gray-600 text-2xl mt-8 mb-4 slide-up">{subQuestion.text}</p>
                  <div className="flex flex-wrap justify-center gap-3 mb-6 slide-up">
                    {subQuestion.options.map((opt: string) => (
                      <Button
                        key={opt}
                        label={opt}
                        active={isActive(subQuestion, opt)}
                        onClick={() => handleSelect(subQuestion.id, opt, !!subQuestion.multiple)}
                      />
                    ))}
                  </div>
                  {subQuestion.allowOther &&
                    Array.isArray(answers[subQuestion.id]) &&
                    (answers[subQuestion.id] as string[]).includes('other') && (
                      <OtherInput
                        value={otherDrafts[subQuestion.id] || ''}
                        onChange={(v) => setOtherDrafts((p) => ({ ...p, [subQuestion.id]: v }))}
                      />
                    )}
                </>
              )}
            </>
          )}

          <button
            onClick={handleContinue}
            className={["continue-btn mt-8 mb-16 px-12 py-4 rounded-full text-xl bg-[var(--accent-grape)] text-white hover:bg-[#874E95]", transitioning ? "is-pressed" : "", "pulse-gentle"].join(' ')}
          >
            {/* Button text: keep flow (no auto-generate), match prior UX */}
            {(() => {
              // Determine if there are more applicable questions ahead
              let nextIdx = step + 1
              while (nextIdx < questions.length && questions[nextIdx].when && !questions[nextIdx].when!(answers)) nextIdx++
              const hasMore = nextIdx < questions.length
              if (!hasMore) return 'finish'
              return 'continue'
            })()}
          </button>

          {/* Mini advice: STUCK */}
          <AdviceModal
            open={tipOpen}
            onClose={() => setTipOpen(false)}
            title="the authenticity advantage"
            text={tipText}
            variant="idea"
          />

          {/* Mini advice: HOLDING BACK */}
          <AdviceModal
            open={holdOpen}
            onClose={() => setHoldOpen(false)}
            title={holdTitle}
            text={holdText}
            variant="focus"
            buttonLabel="Got it"
          />
        </div>
      </div>
    </div>
  )
}
