'use client'

import React, { useMemo, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getOrCreateOnboardingSessionId } from '@/lib/onboardingSession'
import { supabaseBrowser } from '@/lib/supabaseClient'
import AdviceModal from '@/components/AdviceModal'
import DesignStyles from '@/components/DesignStyles' // [ADD]

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
    className={`px-5 py-3 rounded-xl min-w-[220px] text-sm font-medium transition text-center
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
    className="mt-3 w-full max-w-md rounded-xl border px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-black/20"
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
    // respect conditional "when"
    if (q.when && !q.when(answers)) continue

    // main
    out.push({ id: q.id, multiple: q.multiple })

    // sub (could be static or dynamic map)
    if (q.sub) {
      if ('id' in q.sub) {
        // static
        const s = q.sub as any
        out.push({ id: s.id, multiple: s.multiple })
      } else {
        // dynamic: only the active one for the current main selection
        const selected = answers[q.id]
        const dyn = (q.sub as Record<string, any>)[String(selected)]
        if (dyn && dyn.id) out.push({ id: dyn.id, multiple: dyn.multiple })
      }
    }

    // sub2 (optional)
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

/** ------------------- Links step (appended) ------------------- */
const LINKS_STEP_ID = '___links___'

export default function Onboarding() {
  const router = useRouter()
  const sb = supabaseBrowser()

  // session id per browser
  const [sessionId] = useState(() => getOrCreateOnboardingSessionId())


  const [step, setStep] = useState(0)
  const [showSub, setShowSub] = useState(false)
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({})
  const [otherDrafts, setOtherDrafts] = useState<Record<string, string>>({})
  const [linksDraft, setLinksDraft] = useState({
    instagram: '', tiktok: '', youtube: '', twitter: '',
    facebook: '', pinterest: '', linkedin: '', twitch: '', other: ''
  })
  const [authed, setAuthed] = useState<boolean | null>(null)

  // NEW — mini advice modal state
  const [adviceOpen, setAdviceOpen] = useState(false)
  const [adviceText, setAdviceText] = useState<string>("")
  const [adviceLoading, setAdviceLoading] = useState(false)

  // 👇 ADD just after your last useState (e.g., after linksDraft)
  const [tipOpen, setTipOpen] = useState(false);
  const [tipText, setTipText] = useState('');

  // NEW: "holding back" modal state
  const [holdOpen, setHoldOpen] = useState(false);
  const [holdTitle, setHoldTitle] = useState('clarity is kindness');
  const [holdText, setHoldText] = useState('');

  // Reset the "shown" flag for each fresh visit to the page
  useEffect(() => {
    try { sessionStorage.removeItem('stuck_tip_shown'); } catch {}
    try { sessionStorage.removeItem('holding_tip_shown'); } catch {}
  }, []);
  // NEW — show once per session
  const ADVICE_FLAG_KEY = 'advice_stuck_seen'

  // NEW — fetch advice from API
  const triggerAdvice = async (topic: string | string[], currentAnswers: Record<string, any>) => {
    try {
      // Don’t spam: show only once per session
      if (localStorage.getItem(ADVICE_FLAG_KEY) === '1') return
      setAdviceLoading(true)
      const res = await fetch('/api/advice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, answers: currentAnswers }),
        cache: 'no-store',
      })
      const json = await res.json().catch(() => ({}))
      const tip = (json?.advice || '').toString().trim()
      if (tip) {
        setAdviceText(tip)
        setAdviceOpen(true)
        localStorage.setItem(ADVICE_FLAG_KEY, '1')
      }
    } catch {}
    finally { setAdviceLoading(false) }
  }

  // 🔐 track auth state
  useEffect(() => {
    let unsub: (() => void) | undefined
    sb.auth.getUser().then(({ data }) => setAuthed(!!data.user))
    const sub = sb.auth.onAuthStateChange((_e, s) => setAuthed(!!s?.user))
    unsub = () => sub?.data?.subscription?.unsubscribe?.()
    return () => { try { unsub?.() } catch {} }
  }, [sb])

  // 🆕 ensure a shell row exists immediately so the table isn't empty
  useEffect(() => {
    (async () => {
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

  // 🔸 helper: persist partial changes incrementally to your session row
  const persistDraft = async (patch: { answers?: any; links?: string[] }) => {
    try {
      await fetch('/api/onboarding/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, ...patch }),
        cache: 'no-store',
      })
    } catch { /* ignore */ }
  }

  // 👇 ADD below persistDraft, above the restore useEffect
  const maybeShowStuckTip = async (nextAnswers: Record<string, any>) => {
    const FLAG = 'stuck_tip_shown';
    try {
      if (sessionStorage.getItem(FLAG)) return;

      const stuck = Array.isArray(nextAnswers.stuckReason) ? nextAnswers.stuckReason : [];
      if (!stuck.length) return;

      const payload = {
        identity: nextAnswers.identity,
        stuckReason: stuck,
        goal: nextAnswers.goal,
        reach: nextAnswers.reach,
        techComfort: nextAnswers.techComfort,
        techGaps: nextAnswers.techGaps,
      };

      let tip = '';
      try {
        const res = await fetch('/api/onboarding/mini-advice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          cache: 'no-store',
        });
        if (res.ok) {
          const json = await res.json().catch(() => ({}));
          tip = (json?.tip || '').toString().trim();
        }
      } catch {}

      if (!tip) {
        const choice = (stuck[0] || '').toLowerCase();
        if (choice.includes('plateau')) {
          tip = "You’re not broken — your format just needs a tune-up. This week, audit your last 10 posts, keep the top 2 hook patterns, and remix them 3 ways. Small repeats beat big resets.";
        } else if (choice.includes('not sure what content')) {
          tip = "Pick 3 topics you could talk about for a month. Save 10 example posts you like, then make 1 fast remix of each. Momentum > perfection.";
        } else if (choice.includes('engagement')) {
          tip = "Make comments a content source: ask one specific prompt per post, reply with a short video to the best answer, and pin it. It compounds fast.";
        } else if (choice.includes('confidence') || choice.includes('stuck')) {
          tip = "Shrink the task: record 3 x 20-second drafts today. No publishing yet. Tomorrow, trim one to 12 seconds and ship it. Done is data.";
        } else {
          tip = "Run tiny loops: 1 idea → 1 draft → publish → note the first 2 seconds’ retention. Repeat tomorrow. The path out of stuck is short cycles.";
        }
      }

      setTipText(tip);
      setTipOpen(true);
      sessionStorage.setItem(FLAG, '1');
    } catch {}
  };

  const maybeShowHoldingTip = async (nextAnswers: Record<string, any>) => {
    const FLAG = 'holding_tip_shown';
    try {
      if (sessionStorage.getItem(FLAG)) return;

      const hb = Array.isArray(nextAnswers.holdingBack) ? nextAnswers.holdingBack : [];
      if (!hb.length) return;

      const payload = {
        kind: 'holding',
        identity: nextAnswers.identity,
        holdingBack: hb,
        goal: nextAnswers.goal,
        reach: nextAnswers.reach,
        techComfort: nextAnswers.techComfort,
        techGaps: nextAnswers.techGaps,
      };

      let title = 'clarity is kindness';
      let tip = '';

      try {
        const res = await fetch('/api/onboarding/mini-advice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          cache: 'no-store',
        });
        if (res.ok) {
          const json = await res.json().catch(() => ({}));
          title = (json?.title || title).toString();
          tip = (json?.tip || '').toString().trim();
        }
      } catch {}

      // Fallback if API gave nothing
      if (!tip) {
        const choice = (hb[0] || '').toLowerCase();
        if (choice.includes('time')) {
          title = 'start smaller, win sooner';
          tip = "short on time? record 3 quick 15-second drafts this week.\nship one. save the rest for remixing tomorrow.";
        } else if (choice.includes('judgment') || choice.includes('feedback')) {
          title = 'post for one person';
          tip = "pick a single friend who’d love your post and make it for them.\none audience member > the whole internet.";
        } else if (choice.includes('monetize')) {
          title = 'one path, two weeks';
          tip = "choose one offer (brand deal / product / service).\ncreate 4 posts that all point to it.\nclarity converts better than variety.";
        } else {
          title = 'focus beats friction';
          tip = "circle one priority for the next 7 days.\nship tiny posts that serve only that.\nprogress > perfection.";
        }
      }

      setHoldTitle(title);
      setHoldText(tip);
      setHoldOpen(true);
      sessionStorage.setItem(FLAG, '1');
    } catch {}
  };
  // restore any previous progress for this session (answers + links)
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/onboarding/save?sessionId=${encodeURIComponent(sessionId)}`, { cache: 'no-store' })
        if (!res.ok) return
        const json = await res.json()
        if (json?.answers && typeof json.answers === 'object') setAnswers(json.answers)
        if (Array.isArray(json?.links)) {
          const toMap: any = { instagram:'', tiktok:'', youtube:'', twitter:'', facebook:'', pinterest:'', linkedin:'', twitch:'', other:'' }
          for (const url of json.links) {
            const u = String(url).toLowerCase()
            if (u.includes('instagram.com')) toMap.instagram = url
            else if (u.includes('tiktok.com')) toMap.tiktok = url
            else if (u.includes('youtube.com') || u.includes('youtu.be')) toMap.youtube = url
            else if (u.includes('x.com') || u.includes('twitter.com')) toMap.twitter = url
            else if (u.includes('facebook.com')) toMap.facebook = url
            else if (u.includes('pinterest.com')) toMap.pinterest = url
            else if (u.includes('linkedin.com')) toMap.linkedin = url
            else if (u.includes('twitch.tv')) toMap.twitch = url
            else toMap.other = url
          }
          setLinksDraft(toMap)
        }
      } catch {}
    })()
  }, [sessionId])

  // Inject a virtual final step for links
  const totalSteps = questions.length + 1
  const isLinksStep = step === questions.length

  const { done, total, percent } = useMemo(() => computeProgress(answers), [answers])

  const current = useMemo(() => {
    if (isLinksStep) return { id: LINKS_STEP_ID, text: 'drop links to your public profiles (optional)' } as any
    // Skip conditional questions
    let idx = step
    while (idx < questions.length && questions[idx].when && !questions[idx].when!(answers)) {
      idx++
    }
    if (idx !== step) setStep(idx)
    return questions[idx]
  }, [step, answers, isLinksStep])

  const mainSelected = !isLinksStep ? answers[(current as any).id] : null
  const isDynamicSub = !isLinksStep && (current as any).sub && typeof (current as any).sub === 'object' && !('id' in (current as any).sub)
  const dynamicSub = isDynamicSub ? ((current as any).sub as Record<string, BaseQ>)[String(mainSelected)] : null
  const staticSub = !isLinksStep && !isDynamicSub && (current as any).sub ? ((current as any).sub as BaseQ) : null
  const subQuestion: BaseQ | null = isLinksStep ? null : (dynamicSub || staticSub || null)
  const subSelected = subQuestion ? answers[subQuestion.id] : null

  const toggleSelect = (existing: string | string[] | undefined, value: string): string | string[] => {
    if (!Array.isArray(existing)) return [value]
    return existing.includes(value) ? existing.filter((v) => v !== value) : [...existing, value]
  }

  // Save after each selection
  const handleSelect = (key: string, value: string, multi?: boolean) => {
    setAnswers((prev) => {
      const cur = prev[key];
      const next = multi
        ? (Array.isArray(cur) ? (cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value]) : [value])
        : value;

      const merged = { ...prev, [key]: next };

      // persist incrementally (your existing saver)
      persistDraft({ answers: merged });

      // 🎯 only trigger mini-advice when answering the "stuckReason" sub-question
      // if (key === 'stuckReason') {
      //   void maybeShowStuckTip(merged);
      // }

      // if (key === 'holdingBack') {
      //   void maybeShowHoldingTip(merged);
      // }

      return merged;
    });
  };

  const isActive = (q: BaseQ, val: string) =>
    q.multiple ? Array.isArray(answers[q.id]) && (answers[q.id] as string[]).includes(val) : answers[q.id] === val

  const hasAnswer = (q: BaseQ, val: string | string[] | undefined) =>
    q.multiple ? Array.isArray(val) && val.length > 0 : typeof val === 'string' && val.length > 0

  // Merge "other" typed value into selection array on continue (and save)
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
    // --- Decide which advice (if any) to show for THIS Continue press ---
    const stuckShown = !!sessionStorage.getItem('stuck_tip_shown')
    const holdShown  = !!sessionStorage.getItem('holding_tip_shown')

    // Make sure we’re checking the actual visible prompt:
    // - stuckReason is a SUB question under `identity`
    const willShowStuck =
      !isLinksStep &&
      !stuckShown &&
      subQuestion?.id === 'stuckReason' &&
      hasAnswer(subQuestion, subSelected || undefined)

    // holdingBack is a MAIN question
    const willShowHold =
      !isLinksStep &&
      !holdShown &&
      (current as any)?.id === 'holdingBack' &&
      hasAnswer(current as BaseQ, mainSelected || undefined)

    // --- Links step (unchanged) ---
    if (isLinksStep) {
      const links = Object.values(linksDraft).map(s => s.trim()).filter(Boolean)
      localStorage.setItem('social_links', JSON.stringify(links))
      localStorage.setItem('onboarding', JSON.stringify(answers))
      await persistDraft({ links })

      if (authed) {
        try {
          await fetch('/api/onboarding/attach', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId }),
            cache: 'no-store',
          })
        } catch {}
        return router.push('/account')
      }
      return router.push('/signin')
    }

    // --- Normal steps: validate & merge "other" if needed ---
    mergeOtherIfNeeded(current as BaseQ)
    if (subQuestion) mergeOtherIfNeeded(subQuestion)

    if (!hasAnswer(current as BaseQ, mainSelected || undefined)) return
    if (subQuestion && !showSub) { setShowSub(true); return }
    if (subQuestion && !hasAnswer(subQuestion, subSelected || undefined)) return

    // --- Advance FIRST so the next question is already on screen ---
    const nextIdx = step + 1
    if (nextIdx < totalSteps) {
      setStep(nextIdx)
      setShowSub(false)
    }

    // --- Then open the advice modal WITHOUT await (no blocking, no “cleared answers” feel) ---
    if (willShowStuck) {
      void maybeShowStuckTip(answers)
    } else if (willShowHold) {
      void maybeShowHoldingTip(answers)
    }
  }
  return (
    <div data-mentor-ui>
      <DesignStyles /> {/* styling injector (visual only) */}

      {/* Top progress bar (purely visual; uses your existing `percent`) */}
      <div className="fixed top-0 left-0 w-full h-1 bg-gray-200 z-50">
        <div className="h-full bg-[var(--soft-purple)] transition-all duration-500" style={{ width: `${percent}%` }} />
      </div>

      {/* original container, unchanged text */}
      <div className="min-h-screen flex flex-col items-center justify-center bg-white px-4 text-center fade-in">
        <div className="w-full max-w-2xl">

      <h2 className="text-2xl font-bold mb-6 text-gray-900 slide-up">{(current as any).text}</h2>

        {!isLinksStep ? (
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
                <p className="text-gray-500 text-lg mt-8 mb-4 slide-up">{subQuestion.text}</p>
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
        ) : (
          // LINKS STEP UI
          <div className="grid gap-3 text-left">
            {[
              ["instagram", "https://instagram.com/username"],
              ["tiktok", "https://www.tiktok.com/@handle"],
              ["youtube", "https://www.youtube.com/@handle or channel URL"],
              ["twitter", "https://x.com/handle or https://twitter.com/handle"],
              ["linkedin", "https://www.linkedin.com/in/handle or /company/..."],
              ["twitch", "https://www.twitch.tv/handle"],
              ["facebook", "https://www.facebook.com/handle"],
              ["pinterest", "https://www.pinterest.com/handle"],
              ["other", "any other public link…"],
            ].map(([k, ph]) => (
              <div key={k}>
                <label className="block text-sm mb-1 capitalize">{k}</label>
                <input
                  value={(linksDraft as any)[k]}
                  onChange={(e) => setLinksDraft(prev => ({ ...prev, [k]: e.target.value }))}
                  placeholder={ph}
                  className="w-full rounded-xl border px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-black/20"
                />
              </div>
            ))}
            <p className="text-xs text-gray-500 mt-1">optional — we’ll analyze public info to tailor your plan</p>
          </div>
        )}

        <button
          onClick={handleContinue}
          className="mt-6 px-8 py-2 rounded-full bg-black text-white hover:bg-gray-800 transition pulse-gentle"
        >
          {isLinksStep ? (authed ? 'finish & go to my account' : 'sign in to see my plan') : 'continue'}
        </button>

        {/* Mini advice: STUCK (yellow bulb) */}
        <AdviceModal
          open={tipOpen}
          onClose={() => setTipOpen(false)}
          title="the authenticity advantage"
          text={tipText}
          variant="idea"
        />

        {/* Mini advice: HOLDING BACK (pink target) */}
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