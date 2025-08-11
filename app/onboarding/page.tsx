'use client'
import React, { useState } from 'react'
import { useRouter } from 'next/navigation'

type BaseQ = {
  id: string
  text: string
  options: string[]
  multiple?: boolean
}
type Question = BaseQ & {
  // sub can be: a single follow-up OR an object mapping from chosen option -> follow-up
  sub?: BaseQ | Record<string, BaseQ>
  sub2?: BaseQ
}

const questions: Question[] = [
  {
    id: 'creatingAs',
    text: 'Are you creating as?',
    options: [
      'a personal brand (influencer, artist, creator)',
      'a business or product brand',
      'a public figure (musician, coach, expert)',
      'a hobbyist sharing for fun',
      'not sure yet',
    ],
    multiple: true,
    sub: {
      'a personal brand (influencer, artist, creator)': {
        id: 'focusPersonal',
        text: 'what’s your focus as a personal brand?',
        options: [
          'building my influence',
          'showcasing my art/work',
          'connecting with a niche community',
          'sharing my unique perspective',
        ],
        multiple: true
      },
      'a business or product brand': {
        id: 'focusBusiness',
        text: 'what’s your focus as a business or product brand?',
        options: [
          'selling products or services',
          'building brand awareness',
          'generating leads',
          'showing thought leadership',
        ],
        multiple: true
      },
      'a public figure (musician, coach, expert)': {
        id: 'focusPublic',
        text: 'what’s your focus as a public figure?',
        options: [
          'growing a fanbase',
          'sharing expertise',
          'driving event attendance',
          'securing partnerships',
        ],
        multiple: true
      },
      'a hobbyist sharing for fun': {
        id: 'focusHobbyist',
        text: 'what’s your focus as a hobbyist?',
        options: [
          'showcasing my art/work',
          'sharing expertise',
          'connecting with a niche community',
          'sharing my unique expertise',
        ],
        multiple: true
      },
    },
  },
  {
    id: 'identity',
    text: 'who are you now..?',
    options: [
      'starting from basically zero',
      'have a small but engaged following',
      'have a following but feel stuck',
      'have a large following but want more engagement',
      'looking to pivot or redefine my brand',
    ],
    multiple: true,
    sub: {
      id: 'stuckReason',
      text: 'what does "stuck" feel like?',
      options: [
        'my growth has plateaued',
        'not sure what content to make next',
        'my engagement is dropping',
        'feeling uninspired',
      ],
      multiple: true
    },
  },
  {
    id: 'goal',
    text: 'what are your main goals?',
    options: [
      'build community and express creativity',
      'monetize with brand deals',
      'promote music or art',
      'sell a service | product',
      'become a recognized expert | authority',
      'share my journey | life authentically',
      'drive traffic to my website | business',
    ],
    multiple: true,
    sub: {
      id: 'brandFocus',
      text: 'what’s your focus with brand deals?',
      options: [
        'finding paid sponsorships',
        'getting free products',
        'building long-term partnerships',
        'creating user-generated content',
      ],
      multiple: true
    },
  },
  {
    id: 'face',
    text: 'do you want to show your face in your content?',
    options: [
      'yes, I’m cool with that',
      'no, I’d rather stay behind the scenes',
      'maybe / I’m not sure yet',
    ],
    multiple: true,
    sub: {
      id: 'howOften',
      text: 'how often?',
      options: ['in all my videos', 'occasionally', 'in photos but not video', 'for live streams'],
      multiple: true
    },
  },
  {
    id: 'camera',
    text: 'how do you feel about being on camera?',
    options: [
      'love it - comfortable talking | performing',
      'It’s okay - depends on the day | content',
      'kinda awkward - prefer voiceovers | edits',
      'no thanks - rather stay off-camera',
    ],
    multiple: true,
    sub: {
      id: 'comfortable',
      text: 'what makes you comfortable?',
      options: ['I’m a natural entertainer', 'I enjoy public speaking', 'I feel confident', 'I love connecting directly'],
      multiple: true
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
      'current event | trends',
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
]

const Button = ({ label, active, onClick }: any) => (
  <button
    onClick={onClick}
    className={`px-5 py-3 rounded-xl min-w-[240px] text-sm font-medium transition text-center
      ${active ? 'bg-[#C9B8F9] text-black border border-transparent' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'}`}
  >
    {label}
  </button>
)

export default function Onboarding() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [showSub, setShowSub] = useState(false)
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({})

  const current = questions[step]
  const mainSelected = answers[current.id]

  const isDynamicSub = current.sub && typeof current.sub === 'object' && !('id' in current.sub)
  const dynamicSub = isDynamicSub ? (current.sub as Record<string, any>)[String(mainSelected)] : null
  const staticSub = !isDynamicSub && current.sub ? (current.sub as any) : null
  const subQuestion: BaseQ | null = dynamicSub || staticSub || null

  const subSelected = subQuestion ? answers[subQuestion.id] : null

  const toggleSelect = (existing: string | string[] | undefined, value: string): string | string[] => {
    if (!Array.isArray(existing)) return [value]
    return existing.includes(value) ? existing.filter(v => v !== value) : [...existing, value]
  }

  const handleSelect = (key: string, value: string, multi?: boolean) => {
    setAnswers(prev => {
      const cur = prev[key]
      if (multi) return { ...prev, [key]: toggleSelect(cur, value) }
      return { ...prev, [key]: value }
    })
  }

  const hasAnswer = (q: BaseQ, val: string | string[] | undefined) =>
    q.multiple ? Array.isArray(val) && val.length > 0 : typeof val === 'string' && val.length > 0

  const isActive = (q: BaseQ, val: string) =>
    q.multiple ? Array.isArray(answers[q.id]) && (answers[q.id] as string[]).includes(val) : answers[q.id] === val

  const handleContinue = async () => {
    if (!hasAnswer(current, mainSelected)) return

    if (subQuestion && !showSub) {
      setShowSub(true)
      return
    }

    if (subQuestion && !hasAnswer(subQuestion, subSelected || undefined)) return

    if (step + 1 < questions.length) {
      setStep(step + 1)
      setShowSub(false)
    } else {
      localStorage.setItem('onboarding', JSON.stringify(answers))
      router.push('/paywall')
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white px-4 text-center">
      <div className="w-full max-w-2xl">
        <h2 className="text-2xl font-bold mb-6 text-gray-900">{current.text}</h2>

        <div className="flex flex-wrap justify-center gap-3 mb-10">
          {current.options.map(opt => (
            <Button
              key={opt}
              label={opt}
              active={isActive(current, opt)}
              onClick={() => handleSelect(current.id, opt, !!current.multiple)}
            />
          ))}
        </div>

        {showSub && subQuestion && (
          <>
            <p className="text-gray-500 text-lg mb-4">{subQuestion.text}</p>
            <div className="flex flex-wrap justify-center gap-3 mb-10">
              {subQuestion.options.map((opt: string) => (
                <Button
                  key={opt}
                  label={opt}
                  active={isActive(subQuestion, opt)}
                  onClick={() => handleSelect(subQuestion.id, opt, !!subQuestion.multiple)}
                />
              ))}
            </div>
          </>
        )}

        <button
          onClick={handleContinue}
          className="mt-4 px-8 py-2 rounded-full bg-black text-white hover:bg-gray-800 transition"
        >
          continue
        </button>
      </div>
    </div>
  )
}