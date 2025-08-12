'use client'
import React, { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

/** ---------- Types ---------- */
type BaseQ = {
  id: string
  text: string
  options: string[]
  multiple?: boolean
  allowOther?: boolean
}

type Question = BaseQ & {
  // sub can be: a single follow-up OR an object mapping from chosen option -> follow-up
  sub?: BaseQ | Record<string, BaseQ>
  sub2?: BaseQ
  // show this question only if some condition on previously chosen answers
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

/** ---------- Questions ---------- */
/** NOTE:
 *  – Single-select questions: omit `multiple`
 *  – Multi-select questions: set `multiple: true`
 *  – allowOther shows a free-text box when "other" is picked
 */
const questions: Question[] = [
  // 1) Role
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

  // 2) Stage
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

  // 3) Goals
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

  // 3b) Monetization (shown only if monetization goal)
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

  // 4) Face / Camera
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

  // 5) Topics (+ branches)
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

  // 6) Audience
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

  // 7) Platforms
  {
    id: 'platforms',
    text: 'what platforms do you use or want to grow on?',
    multiple: true,
    allowOther: true,
    options: ['instagram', 'tiktok', 'youtube', 'twitter/x', 'facebook', 'pinterest', 'linkedin', 'twitch', 'other'],
  },

  // 8) Content you enjoy making
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

  // 9) Vibe (personality)
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

  // 10) Planning style
  {
    id: 'planVsWing',
    text: 'do you like planning things ahead or just winging it?',
    multiple: false,
    options: ['i like to plan content in advance', 'i prefer posting in the moment', 'a mix of both'],
  },

  // 11) Content you love watching
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

  // 12) Roadblocks
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
      'i\'m afraid of judgment or negative feedback',
      'something else',
    ],
  },

  // 13) Tried but didn’t work
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

  // 14) Time
  {
    id: 'timeAvailable',
    text: 'how much time can you realistically spend on content creation and engagement each week?',
    multiple: false,
    options: ['less than 2 hours', '2-5 hours', '5-10 hours', '10+ hours'],
  },

  // 15) Tech comfort (+ branch: gaps)
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

  // 16) Feedback approach
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

/** ---------- Component ---------- */
export default function Onboarding() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [showSub, setShowSub] = useState(false)
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({})
  const [otherDrafts, setOtherDrafts] = useState<Record<string, string>>({}) // id -> text

  const current = useMemo(() => {
    // Skip conditional questions that shouldn’t be shown yet
    let idx = step
    while (idx < questions.length && questions[idx].when && !questions[idx].when!(answers)) {
      idx++
    }
    if (idx !== step) setStep(idx)
    return questions[idx]
  }, [step, answers])

  const mainSelected = answers[current.id]

  const isDynamicSub = current.sub && typeof current.sub === 'object' && !('id' in current.sub)
  const dynamicSub = isDynamicSub ? (current.sub as Record<string, BaseQ>)[String(mainSelected)] : null
  const staticSub = !isDynamicSub && current.sub ? (current.sub as BaseQ) : null
  const subQuestion: BaseQ | null = dynamicSub || staticSub || null
  const subSelected = subQuestion ? answers[subQuestion.id] : null

  const toggleSelect = (existing: string | string[] | undefined, value: string): string | string[] => {
    if (!Array.isArray(existing)) return [value]
    return existing.includes(value) ? existing.filter((v) => v !== value) : [...existing, value]
  }

  const handleSelect = (key: string, value: string, multi?: boolean) => {
    setAnswers((prev) => {
      const cur = prev[key]
      if (multi) return { ...prev, [key]: toggleSelect(cur, value) }
      return { ...prev, [key]: value }
    })
  }

  const isActive = (q: BaseQ, val: string) =>
    q.multiple ? Array.isArray(answers[q.id]) && (answers[q.id] as string[]).includes(val) : answers[q.id] === val

  const hasAnswer = (q: BaseQ, val: string | string[] | undefined) =>
    q.multiple ? Array.isArray(val) && val.length > 0 : typeof val === 'string' && val.length > 0

  // Merge "other" typed value into selection array on continue
  const mergeOtherIfNeeded = (q: BaseQ) => {
    if (!q.allowOther) return
    const sel = answers[q.id]
    const otherPicked = Array.isArray(sel) && sel.includes('other')
    const draft = otherDrafts[q.id]?.trim()
    if (otherPicked && draft) {
      const merged = [...(sel as string[]).filter((x) => x !== 'other'), draft]
      setAnswers((prev) => ({ ...prev, [q.id]: merged }))
    }
  }

  const handleContinue = async () => {
    mergeOtherIfNeeded(current)
    if (subQuestion) mergeOtherIfNeeded(subQuestion)

    if (!hasAnswer(current, mainSelected)) return
    if (subQuestion && !showSub) {
      setShowSub(true)
      return
    }
    if (subQuestion && !hasAnswer(subQuestion, subSelected || undefined)) return

    // next step or finish
    const nextIdx = step + 1
    if (nextIdx < questions.length) {
      setStep(nextIdx)
      setShowSub(false)
    } else {
      localStorage.setItem('onboarding', JSON.stringify(answers))
      // router.push('/paywall')
      router.push('/dashboard')
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white px-4 text-center">
      <div className="w-full max-w-2xl">
        <h2 className="text-2xl font-bold mb-6 text-gray-900">{current.text}</h2>

        <div className="flex flex-wrap justify-center gap-3 mb-6">
          {current.options.map((opt) => (
            <Button
              key={opt}
              label={opt}
              active={isActive(current, opt)}
              onClick={() => handleSelect(current.id, opt, !!current.multiple)}
            />
          ))}
        </div>

        {current.allowOther && Array.isArray(answers[current.id]) && (answers[current.id] as string[]).includes('other') && (
          <OtherInput
            value={otherDrafts[current.id] || ''}
            onChange={(v) => setOtherDrafts((p) => ({ ...p, [current.id]: v }))}
            placeholder="add your platform or content type…"
          />
        )}

        {showSub && subQuestion && (
          <>
            <p className="text-gray-500 text-lg mt-8 mb-4">{subQuestion.text}</p>
            <div className="flex flex-wrap justify-center gap-3 mb-6">
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

        <button
          onClick={handleContinue}
          className="mt-6 px-8 py-2 rounded-full bg-black text-white hover:bg-gray-800 transition"
        >
          continue
        </button>
      </div>
    </div>
  )
}