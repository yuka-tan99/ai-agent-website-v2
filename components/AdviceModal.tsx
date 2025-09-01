// components/AdviceModal.tsx
'use client'
import React from 'react'

type Props = {
  open: boolean
  onClose: () => void
  title: string
  text: string
  // 'idea' (yellow bulb) or 'focus' (pink target)
  variant?: 'idea' | 'focus'
  buttonLabel?: string
}

export default function AdviceModal({
  open, onClose, title, text, variant = 'idea', buttonLabel = 'Got it'
}: Props) {
  if (!open) return null

  const isIdea = variant === 'idea'
  const badgeClasses = isIdea
    ? 'bg-yellow-50 text-yellow-600'
    : 'bg-rose-50 text-rose-600'

  const icon = isIdea ? '💡' : '🎯'

  return (
  <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4" onClick={onClose}>
      <div className="max-w-md w-full rounded-3xl bg-white p-8 shadow-2xl text-center" onClick={(e)=>e.stopPropagation()}>
        <div className={`mx-auto h-12 w-12 rounded-full grid place-items-center text-xl ${badgeClasses}`}>
          {icon}
        </div>
        <h3 className="mt-4 text-2xl font-semibold text-gray-900">{title}</h3>
        <p className="mt-3 text-gray-600 leading-relaxed whitespace-pre-line">{text}</p>
        <button
          className="mt-6 inline-flex items-center justify-center rounded-full border px-5 py-2 text-sm hover:bg-gray-50"
          onClick={onClose}
        >
          {buttonLabel}
        </button>
      </div>
    </div>
  )
}
