"use client"

import React, { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getOrCreateOnboardingSessionId } from '@/lib/onboardingSession'
import { supabaseBrowser } from '@/lib/supabaseClient'
import { decisionTree, FlowState, getNextNode, onAnswerPersist, Node } from '@/lib/onboardingFlow'
import DesignStyles from '@/components/DesignStyles'

const Button = ({ label, active, onClick }: any) => (
  <button
    onClick={onClick}
    className={`px-6 py-3.5 rounded-full min-w-[240px] text-base font-medium transition text-center
      ${active ? 'bg-[#D9B8E3] text-black border border-transparent' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'}`}
  >
    {label}
  </button>
)

const OtherInput = ({ value, onChange, placeholder = 'type your answer…' }: { value: string; onChange: (v: string) => void; placeholder?: string }) => (
  <input
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
    className="mt-3 w-full max-w-lg rounded-2xl border px-5 py-3 text-base outline-none focus:ring-2 focus:ring-black/20"
  />
)

export default function SmartOnboarding() {
  const router = useRouter()
  const sessionId = getOrCreateOnboardingSessionId()
  const sb = supabaseBrowser()
  const [authed, setAuthed] = useState<boolean | null>(null)

  const [state, setState] = useState<FlowState>({ vars: {}, answers: {} })
  const [nodeId, setNodeId] = useState<string>(decisionTree.start)
  const [history, setHistory] = useState<string[]>([])
  const [textDraft, setTextDraft] = useState('')
  const [transitioning, setTransitioning] = useState(false)

  useEffect(() => {
    let unsub: (() => void) | undefined
    sb.auth.getUser().then(({ data }) => setAuthed(!!data.user))
    const sub = sb.auth.onAuthStateChange((_e, s) => setAuthed(!!s?.user))
    unsub = () => sub?.data?.subscription?.unsubscribe?.()
    return () => { try { unsub?.() } catch {} }
  }, [sb])

  // Ensure row exists
  useEffect(() => {
    ;(async () => {
      try {
        await fetch('/api/onboarding/save', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, cache: 'no-store',
          body: JSON.stringify({ sessionId, answers: {} }),
        })
      } catch {}
    })()
  }, [sessionId])

  const persist = async (answersObj: any) => {
    try {
      await fetch('/api/onboarding/save', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, cache: 'no-store',
        body: JSON.stringify({ sessionId, answers: answersObj }),
      })
    } catch {}
  }

  const node: Node | undefined = decisionTree.nodes[nodeId]
  const totalQ = useMemo(() => Object.keys(decisionTree.nodes).filter(k => /^Q\d/.test(k)).length, [])
  const visited = useMemo(() => Object.keys(state.answers).filter(k => /^Q\d/.test(k)).length, [state.answers])
  const pct = Math.min(99, Math.round((visited / Math.max(1, totalQ)) * 100))

  // Predict next to choose button label (Continue vs Finish & generate)
  const selected = state.answers[nodeId]
  const predictedNextId = useMemo(() => {
    if (!node) return ''
    const tmp: FlowState = { vars: { ...state.vars }, answers: { ...state.answers }, lastNodeId: nodeId }
    if (node.type === 'single') {
      // use currently selected value
      if (!selected) return ''
      onAnswerPersist(tmp, nodeId, selected, decisionTree)
    } else if (node.type === 'multi') {
      onAnswerPersist(tmp, nodeId, selected || [], decisionTree)
    } else if (node.type === 'text') {
      onAnswerPersist(tmp, nodeId, selected || [], decisionTree)
    }
    return getNextNode(nodeId, tmp, decisionTree)
  }, [node, nodeId, selected, state.vars, state.answers])
  const isFinalNext = predictedNextId === decisionTree.exit
  const primaryCta = isFinalNext ? 'finish & generate report' : 'continue'

  const selectSingle = (val: string) => {
    setState((s)=> ({ ...s, answers: { ...s.answers, [nodeId]: val } }))
  }

  const handleToggle = (val: string) => {
    const cur = state.answers[nodeId]
    const next = Array.isArray(cur) ? (cur.includes(val) ? cur.filter((x:string)=>x!==val) : [...cur, val]) : [val]
    setState((s)=> ({ ...s, answers: { ...s.answers, [nodeId]: next } }))
  }

  const submitMulti = async () => {
    setTransitioning(true)
    await new Promise((r)=> setTimeout(r, 180))
    const ans = state.answers[nodeId] || []
    const nextState: FlowState = { ...state }
    onAnswerPersist(nextState, nodeId, ans, decisionTree)
    const nextId = getNextNode(nodeId, nextState, decisionTree)
    const merged = { ...nextState.answers, __vars: nextState.vars }
    await persist(merged)
    setState(nextState)
    setHistory((h)=> [...h, nodeId])
    setNodeId(nextId)
    setTextDraft('')
    if (nextId === decisionTree.exit) {
      // finalize like legacy: sign in -> paywall -> generate
      try { localStorage.setItem('onboarding', JSON.stringify(nextState.answers)) } catch {}
      if (!authed) {
        const next = encodeURIComponent('/auth/signed-up?next=/paywall')
        router.push(`/signin?next=${next}`)
      } else {
        router.push('/paywall')
      }
      setTransitioning(false)
      return
    }
    setTimeout(()=> setTransitioning(false), 40)
  }

  const submitText = async () => {
    if (!textDraft.trim()) return
    setTransitioning(true)
    await new Promise((r)=> setTimeout(r, 180))
    const nextState: FlowState = { ...state, answers: { ...state.answers, [nodeId]: textDraft.trim() } }
    onAnswerPersist(nextState, nodeId, textDraft.trim(), decisionTree)
    const nextId = getNextNode(nodeId, nextState, decisionTree)
    const merged = { ...nextState.answers, __vars: nextState.vars }
    await persist(merged)
    setState(nextState)
    setHistory((h)=> [...h, nodeId])
    setNodeId(nextId)
    setTextDraft('')
    if (nextId === decisionTree.exit) {
      try { localStorage.setItem('onboarding', JSON.stringify(nextState.answers)) } catch {}
      if (!authed) {
        const next = encodeURIComponent('/auth/signed-up?next=/paywall')
        router.push(`/signin?next=${next}`)
      } else {
        router.push('/paywall')
      }
      setTransitioning(false)
      return
    }
    setTimeout(()=> setTransitioning(false), 40)
  }

  const goBack = () => {
    const last = history[history.length - 1]
    if (!last) return
    setHistory(h => h.slice(0, -1))
    setNodeId(last)
  }

  if (!node) return null

  const isMulti = node.type === 'multi'
  const maxSel = node.maxSelect || 99

  return (
    <div data-mentor-ui>
      <DesignStyles />
      <main className="container py-10">
      {/* top back + progress */}
      <div className={["mb-4 flex items-center justify-between onb-wrap", transitioning ? "is-fading" : ""].join(' ')}>
        <button onClick={goBack} className="inline-flex items-center h-11 px-2 rounded-md gap-2 text-base text-gray-700 hover:text-[var(--accent-grape)] hover:font-semibold transition-colors">← back</button>
        <div className="w-[280px]">
          <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
            <span>Progress</span>
            <span className="font-semibold text-gray-800">{pct}%</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-[var(--accent-grape)]" style={{ width: `${pct}%` }} /></div>
        </div>
      </div>

      <div className={["max-w-3xl mx-auto text-center onb-wrap", transitioning ? "is-fading" : ""].join(' ')}>
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">{node.question}</h1>
        {node.helperText && <p className="text-sm text-gray-600 mb-4">{node.helperText}</p>}

        {/* single */}
        {node.type === 'single' && (
          <div className="grid sm:grid-cols-2 gap-3 mt-4 justify-center">
            {node.options?.map((opt) => (
              <Button key={opt.value} label={opt.label} active={selected === opt.value} onClick={() => selectSingle(opt.value)} />
            ))}
          </div>
        )}

        {/* multi */}
        {node.type === 'multi' && (
          <div className="mt-4">
            <div className="grid sm:grid-cols-2 gap-3">
              {node.options?.map((opt) => {
                const active = Array.isArray(selected) && selected.includes(opt.value)
                const disabled = !active && Array.isArray(selected) && selected.length >= maxSel
                return (
                  <button key={opt.value} onClick={() => !disabled && handleToggle(opt.value)}
                    className={`px-6 py-3.5 rounded-full min-w-[240px] text-base font-medium transition text-center border ${active ? 'bg-[#D9B8E3] text-black border-transparent' : disabled ? 'opacity-60 cursor-not-allowed bg-white text-gray-400 border-gray-200' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'}`}
                  >{opt.label}</button>
                )
              })}
            </div>
            <div className="mt-6 flex items-center justify-center gap-3">
              <button onClick={submitMulti} className={["continue-btn px-12 py-4 rounded-full text-xl bg-[var(--accent-grape)] text-white hover:bg-[#874E95]", transitioning ? "is-pressed" : "", "pulse-gentle"].join(' ')}>Continue</button>
              <span className="text-sm text-gray-500">{Array.isArray(selected) ? selected.length : 0}/{maxSel} selected</span>
            </div>
          </div>
        )}

        {/* text (chips) */}
        {node.type === 'text' && (
          <div className="mt-4">
            <p className="text-sm text-gray-600 mb-2">Type a word or short phrase and press Enter. Each will become a tag. Click × to remove. Click next to the tags to add more.</p>
            <div
              className="flex flex-wrap items-center gap-2 border rounded-2xl px-3 py-2 bg-white max-w-2xl mx-auto"
              onClick={(e)=>{ const el = document.getElementById('chip-input'); el?.focus(); }}
            >
              {(Array.isArray(selected) ? selected : []).map((t:string, i:number)=> (
                <span key={i} className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm bg-[#EAD7F0] text-[#4B1F57]">
                  {t}
                  <button aria-label="Remove" className="text-[#4B1F57]/70 hover:text-[#4B1F57]" onClick={()=>{
                    const next = (selected as string[]).filter((x:string, idx:number)=> idx!==i)
                    setState(s=> ({ ...s, answers: { ...s.answers, [nodeId]: next } }))
                  }}>×</button>
                </span>
              ))}
              <input
                id="chip-input"
                value={textDraft}
                onChange={(e)=> setTextDraft(e.target.value)}
                onKeyDown={(e)=>{
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    const token = textDraft.trim()
                    if (!token) return
                    const arr = Array.isArray(selected) ? (selected as string[]) : []
                    setState(s=> ({ ...s, answers: { ...s.answers, [nodeId]: [...arr, token] } }))
                    setTextDraft('')
                  }
                }}
                placeholder={node.placeholder || 'add a word or phrase and press Enter'}
                className="flex-1 min-w-[160px] py-2 outline-none text-base bg-transparent"
              />
            </div>
            <div className="mt-6 flex items-center justify-center"><button onClick={submitText} className={["continue-btn px-12 py-4 rounded-full text-xl bg-[var(--accent-grape)] text-white hover:bg-[#874E95]", transitioning ? "is-pressed" : "", "pulse-gentle"].join(' ')}>{primaryCta}</button></div>
          </div>
        )}

        {/* unified continue for single type */}
        {node.type === 'single' && (
          <div className="mt-8 flex items-center justify-center">
            <button
              onClick={submitMulti}
              disabled={!selected}
              className={["continue-btn px-12 py-4 rounded-full text-xl bg-[var(--accent-grape)] text-white hover:bg-[#874E95]", transitioning ? "is-pressed" : "", !selected ? "opacity-60 cursor-not-allowed" : "", "pulse-gentle"].join(' ')}
            >
              {primaryCta}
            </button>
          </div>
        )}
      </div>
    </main>
    </div>
  )
}
