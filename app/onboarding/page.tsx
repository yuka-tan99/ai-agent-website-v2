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
    className={`px-6 py-3.5 rounded-full min-w-[240px] text-base font-medium transition text-center
      ${active ? 'bg-[#C9B8F9] text-black border border-transparent' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'}`}
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
  {
    id: 'creatingAs',
    text: 'are you creating as?',
    multiple: false,
    options: [
      'a personal brand (influencer, artist, creator)',
      'a business or product brand',
      'a public figure (musician, coach, expert)',
      'a hobbyist sharing for fun',
      'not sure yet',
    ],
    sub: {
      'not sure yet': {
        id: 'creatingAs_explore',
        text: 'what best describes your situation?',
        multiple: true,
        options: ['exploring options', 'need help defining'],
      },
    },
  },
  {
    id: 'identity',
    text: 'who are you now..?',
    multiple: false,
    options: [
      'starting from basically zero',
      'have a small but engaged following',
      'have a following but feel stuck',
      'have a large following but want more engagement',
      'looking to pivot or redefine my brand',
    ],
    sub: {
      id: 'stuckReason',
      text: 'what does "stuck" feel like?',
      multiple: true,
      options: ['my growth has plateaued', 'not sure what content to make next', 'my engagement is dropping', 'feeling uninspired'],
    },
  },
  {
    id: 'goal',
    text: 'what are your main goals?',
    multiple: true,
    options: [
      'build community and express creativity',
      'monetize with brand deals',
      'promote music or art',
      'sell a service | product',
      'become a recognized expert | authority',
      'share my journey | life authentically',
      'drive traffic to my website | business',
    ],
  },
  {
    id: 'monetizationMethods',
    text: 'how do you ideally want to make money from your content?',
    multiple: true,
    options: [
      'brand deals | sponsorships',
      'selling my own physical products',
      'selling my own digital products (e.g., ebooks, courses)',
      'selling my own services (e.g., coaching, consulting)',
      'affiliate marketing',
      'ad revenue (views, clicks)',
      'crowdfunding (patreon, ko-fi)',
      'live stream donations | tips',
      "i'm open to any monetization method",
    ],
    when: (a) => Array.isArray(a.goal) && a.goal.some((g: string) => /monetize|sell|brand deals|service|product|revenue/i.test(g)),
  },
  {
    id: 'face',
    text: 'do you want to show your face in your content?',
    multiple: false,
    options: ['yes, I’m cool with that', 'no, I’d rather stay behind the scenes', 'maybe / I’m not sure yet'],
    sub: { id: 'howOften', text: 'how often?', multiple: false, options: ['in all my videos', 'occasionally', 'in photos but not video', 'for live streams'] },
  },
  {
    id: 'camera',
    text: 'how do you feel about being on camera?',
    multiple: false,
    options: [
      'love it - comfortable talking | performing',
      'It’s okay - depends on the day | content',
      'kinda awkward - prefer voiceovers | edits',
      'no thanks - rather stay off-camera',
    ],
    sub: {
      id: 'comfortable',
      text: 'what makes you comfortable?',
      multiple: true,
      options: ['I’m a natural entertainer', 'I enjoy public speaking', 'I feel confident', 'I love connecting directly'],
    },
  },
  {
    id: 'topics',
    text: 'what topics do you love talking about most?',
    multiple: true,
    options: [
      'my passion | hobby',
      'my expertise | job',
      'my daily life',
      'current events | trends',
      'a specific product | service',
      'art | music | creativity',
      'education | giving tips',
      'personal stories | experiences',
      'comedy | entertainment',
      'something else...',
    ],
    sub: {
      id: 'trends',
      text: 'what kind of trends?',
      multiple: true,
      options: ['pop culture commentary', 'news & politics', 'industry trends', 'viral challenges'],
    },
    sub2: {
      id: 'creativity',
      text: 'how do you share your creativity?',
      multiple: true,
      options: ['my creative process', 'tutorials & how-tos', 'critiques & reviews', 'artist showcases'],
    },
  },
  {
    id: 'reach',
    text: 'who are you trying to reach?',
    multiple: true,
    options: [
      'people with similar interests | hobbies',
      'potential customers for my business',
      'other creators | industry peers',
      'a broad general audience',
      'a specific age group',
      'people in a specific location',
      'I haven’t thought about this yet',
    ],
  },
  {
    id: 'platforms',
    text: 'what platforms do you use or want to grow on?',
    multiple: true,
    allowOther: true,
    options: ['instagram', 'tiktok', 'youtube', 'twitter/x', 'facebook', 'pinterest', 'linkedin', 'twitch', 'other'],
  },
  {
    id: 'contentEnjoyMaking',
    text: 'what kind of content do you enjoy making (or think you’d enjoy)?',
    multiple: true,
    options: [
      'talking to the camera (vlogs, direct address)',
      'writing (captions, tweets, posts)',
      'visuals (design, aesthetics, photos, graphics)',
      'funny or entertaining content (skits, memes)',
      'teaching, giving tips or value',
      'music or audio-based content',
      'behind-the-scenes or casual vibes',
      'live streaming | interactive q&as',
      'storytelling | sharing personal journeys',
    ],
  },
  {
    id: 'vibe',
    text: 'how would your friends describe your vibe?',
    multiple: true,
    options: [
      'loud | high energy',
      'chill and calm',
      'funny | witty',
      'deep | thoughtful',
      'inspiring | motivational',
      'creative | artsy',
      'professional | serious',
      'unique | edgy',
      'approachable | friendly',
    ],
  },
  {
    id: 'planVsWing',
    text: 'do you like planning things ahead or just winging it?',
    multiple: false,
    options: ['i like to plan content in advance', 'i prefer posting in the moment', 'a mix of both'],
  },
  {
    id: 'contentLoveWatching',
    text: 'what kind of content do you love watching?',
    multiple: true,
    allowOther: true,
    options: [
      'vlogs or day-in-the-life videos',
      'quick tips or how-tos',
      'entertaining | funny skits or memes',
      'aesthetic visuals (design, fashion, photography)',
      'deep or emotional content',
      'music or performance content',
      'storytime or personal shares',
      'live content (streams, q&as)',
      'raw, uncut, or honest moments',
      'advice or motivational talk',
      'reviews or unboxings',
      'educational or thought-provoking content',
      'trending or challenge content',
      'niche-specific content related to my interests',
      'other',
    ],
  },
  {
    id: 'holdingBack',
    text: "what's holding you back right now?",
    multiple: true,
    allowOther: true,
    options: [
      "i don't know what to post",
      'i feel stuck or not confident',
      "i can't stay consistent",
      "my content isn't getting attention",
      "i don't have much time",
      "i'm not sure how to monetize effectively",
      "i'm afraid of judgment or negative feedback",
      'something else',
    ],
  },
  {
    id: 'triedButDidntWork',
    text: "what have you tried for growth that didn't work well?",
    multiple: true,
    options: [
      'posting more often',
      'engaging with others in my niche',
      'following viral trends',
      'using specific hashtags | keywords',
      'running paid ads',
      'collaborating with others',
      'changing my content format or style',
      'posting at specific times',
      "i haven't tried anything specific yet",
    ],
  },
  {
    id: 'timeAvailable',
    text: 'how much time can you realistically spend on content creation and engagement each week?',
    multiple: false,
    options: ['less than 2 hours', '2-5 hours', '5-10 hours', '10+ hours'],
  },
  {
    id: 'techComfort',
    text: 'how comfortable are you with the technical side (editing, analytics)?',
    multiple: false,
    options: ['very comfortable', 'willing to learn', 'i can manage the basics but find it challenging', 'i prefer to delegate or avoid it'],
    sub: {
      id: 'techGaps',
      text: 'which areas do you want help with?',
      multiple: true,
      options: ['video editing', 'photo editing | design', 'using analytics', 'posting | scheduling'],
    },
  },
  {
    id: 'feedbackApproach',
    text: 'which statement best describes your approach to feedback or criticism?',
    multiple: false,
    options: [
      'i welcome constructive criticism to improve',
      "i take feedback personally, it's hard to hear",
      "i don't often receive feedback",
      'i mostly ignore feedback unless it\'s consistent',
      'i prefer data | analytics over personal feedback',
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
      // Finalize onboarding and generate report
      try { localStorage.setItem('onboarding', JSON.stringify(answers)) } catch {}
      await persistDraft({ answers })

      if (!authed) {
        const next = encodeURIComponent('/paywall')
        return router.push(`/signin?next=${next}`)
      }
      try {
        await fetch('/api/onboarding/complete', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, answers }), cache: 'no-store'
        })
      } catch {}
      return router.push('/paywall')
    }

    if (willShowStuck) {
      void maybeShowStuckTip(answers)
    } else if (willShowHold) {
      void maybeShowHoldingTip(answers)
    }
  }

  return (
    <div data-mentor-ui>
      <DesignStyles />

      {/* Top progress bar */}
      <div className="fixed top-0 left-0 w-full h-[6px] bg-gray-200 z-50">
        <div className="h-full bg-[var(--soft-purple)] transition-all duration-500" style={{ width: `${percent}%` }} />
      </div>

      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f9fafb] px-4 text-center fade-in pb-24 md:pb-28">
        <div className="w-full max-w-2xl">
          {/* Back to previous */}
          <div className="flex items-center justify-start mb-4 -ml-1 md:-ml-3">
            {step > 0 && (
              <button onClick={handleBack} className="text-left text-sm md:text-base text-gray-600 hover:text-gray-800 transition">
                &lt; back to previous
              </button>
            )}
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-7 text-gray-900 slide-up">{(current as any).text}</h2>

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
                  <p className="text-gray-500 text-xl mt-8 mb-4 slide-up">{subQuestion.text}</p>
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
            className="mt-7 mb-14 px-10 py-3 rounded-full text-lg bg-[var(--accent-grape)] text-white hover:bg-[#874E95] transition pulse-gentle"
          >
            {/* Button text: use final label on last question */}
            {(() => {
              // Determine if there are more applicable questions ahead
              let nextIdx = step + 1
              while (nextIdx < questions.length && questions[nextIdx].when && !questions[nextIdx].when!(answers)) nextIdx++
              const hasMore = nextIdx < questions.length
              if (!hasMore) return 'finish & generate report'
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
