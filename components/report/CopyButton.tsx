'use client'
import { useState } from 'react'

export default function CopyButton({ text }: { text: string }) {
  const [ok, setOk] = useState(false)
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setOk(true); setTimeout(()=>setOk(false), 1200) }}
      className="px-3 py-1 rounded-lg border text-xs"
    >
      {ok ? 'Copied' : 'Copy'}
    </button>
  )
}