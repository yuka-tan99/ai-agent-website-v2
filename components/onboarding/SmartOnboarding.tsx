// components/onboarding/SmartOnboarding.tsx
"use client"

import React, { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getOrCreateOnboardingSessionId } from '@/lib/onboardingSession'
import { supabaseBrowser } from '@/lib/supabaseClient'
import {
  decisionTree,
  FlowState,
  getNextNode,
  onAnswerPersist,
  Node,
  shouldAskNode as shouldAsk,
  MIN_Q, MAX_Q,
  countAnswered,
  nextPadNode
} from '@/lib/onboardingFlow'
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
  const [guarding, setGuarding] = useState(true)

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

  // Redirect guard: if onboarding already completed, send to paywall (or preparing if paid)
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        // Check completion by session id (works for anon + authed)
        const r1 = await fetch(`/api/onboarding/status?sessionId=${encodeURIComponent(sessionId)}`, { cache: 'no-store', credentials: 'include' })
        const j1 = await r1.json().catch(() => ({}))
        if (cancelled) return
        if (j1?.complete) {
          // If already paid, skip paywall
          try {
            const r2 = await fetch('/api/me/purchase-status', { cache: 'no-store', credentials: 'include' })
            const j2 = await r2.json().catch(() => ({}))
            if (cancelled) return
            if (j2?.purchase_status === 'paid') { router.replace('/dashboard/preparing'); return }
          } catch {}
          router.replace('/paywall');
          return
        }
      } finally {
        if (!cancelled) setGuarding(false)
      }
    })()
    return () => { cancelled = true }
  }, [router, sessionId])

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

  // === Progress calculation (dynamic, respects branching) =====================
  const askedCount = useMemo(() => countAnswered(state), [state])
  const isCurrentAnswered = useMemo(() => {
    if (!node) return false
    const sel = state.answers[nodeId]
    if (node.type === 'single') return !!sel
    if (node.type === 'multi') return Array.isArray(sel) && sel.length > 0
    if (node.type === 'text') return Array.isArray(sel) && sel.length > 0
    return false
  }, [node, nodeId, state.answers])

  // Predict next natural node (without padding), then we’ll enforce min/max
  const predictedNextId = useMemo(() => {
    if (!node) return ''
    const tmp: FlowState = { vars: { ...state.vars }, answers: { ...state.answers }, lastNodeId: nodeId }
    // Apply the current selection (if any) to route properly
    const sel = state.answers[nodeId]
    onAnswerPersist(tmp, nodeId, sel ?? (node.type === 'text' ? [] : (node.type === 'multi' ? [] : '')), decisionTree)
    return getNextNode(nodeId, tmp, decisionTree)
  }, [node, nodeId, state.vars, state.answers])

  // Show progress as % of target path (cap at MAX_Q)
  const pct = Math.min(100, Math.round((Math.min(askedCount + (isCurrentAnswered ? 1 : 0), MAX_Q) / MAX_Q) * 100))
  const nearingFinish = (askedCount >= MIN_Q - 1) // after answering current, could finish
  const primaryCta = (nearingFinish && (predictedNextId === decisionTree.exit || askedCount >= MAX_Q - 1)) ? 'finish & generate report' : 'continue'

  // === Navigation core: apply pad/cap guarantees =================================
  function chooseNextId(afterCurrentId: string, nextNaturalId: string, snapshot: FlowState): string {
    const answered = countAnswered(snapshot)
    // Cap: if we already hit MAX_Q, force exit
    if (answered >= MAX_Q) return decisionTree.exit
    // Natural path says exit but we need to hit MIN_Q → pad
    if (nextNaturalId === decisionTree.exit && answered < MIN_Q) {
      const pad = nextPadNode(snapshot, decisionTree)
      return pad || decisionTree.exit
    }
    // Natural path continues; but if we’re one from MAX_Q, force exit next
    if (nextNaturalId !== decisionTree.exit && answered + 1 >= MAX_Q) {
      return decisionTree.exit
    }
    return nextNaturalId
  }

  // === UI Interaction handlers ===================================================
  const selectSingle = (val: string) => {
    setState((s)=> ({ ...s, answers: { ...s.answers, [nodeId]: val } }))
  }

  const toggleMulti = (val: string) => {
    const cur = state.answers[nodeId]
    const next = Array.isArray(cur) ? (cur.includes(val) ? cur.filter((x:string)=>x!==val) : [...cur, val]) : [val]
    setState((s)=> ({ ...s, answers: { ...s.answers, [nodeId]: next } }))
  }

  const commitAndAdvance = async () => {
    if (!node) return
    setTransitioning(true)
    await new Promise((r)=> setTimeout(r, 140))

    // 1) Build the post-answer snapshot (mutates derived vars)
    const nextState: FlowState = { vars: { ...state.vars }, answers: { ...state.answers } }
    const sel = nextState.answers[nodeId] ?? (node.type === 'text' ? [] : (node.type === 'multi' ? [] : ''))
    onAnswerPersist(nextState, nodeId, sel, decisionTree)

    // 2) Decide the natural next id
    const naturalNext = getNextNode(nodeId, nextState, decisionTree)

    // 3) Enforce MIN/MAX via padding/cap
    let nextId = chooseNextId(nodeId, naturalNext, nextState)

    // 4) Persist answers + vars snapshot
    const merged = { ...nextState.answers, __vars: nextState.vars }
    await persist(merged)

    // 5) Apply and maybe finish
    setState(nextState)
    setHistory((h)=> [...h, nodeId])
    setNodeId(nextId)
    setTextDraft('')

    if (nextId === decisionTree.exit) { await finalizeSubmit(nextState); return }
    setTimeout(()=> setTransitioning(false), 20)
  }

  // Text add-as-chips input
  const addTextChip = () => {
    const token = textDraft.trim()
    if (!token) return
    const arr = Array.isArray(state.answers[nodeId]) ? (state.answers[nodeId] as string[]) : []
    const limit = node?.maxSelect || 5
    if (arr.length >= limit) return
    setState(s=> ({ ...s, answers: { ...s.answers, [nodeId]: [...arr, token] } }))
    setTextDraft('')
  }

  const goBack = () => {
    const last = history[history.length - 1]
    if (!last) return
    setHistory(h => h.slice(0, -1))
    setNodeId(last)
  }

  // === Finalization → build onboarding.v2 payload for Claude =====================
  async function finalizeSubmit(nextState: FlowState) {
    // Build normalized onboarding.v2 payload per spec
    const a = nextState.answers || {}
    const arr = (v: any): string[] => Array.isArray(v) ? v : (v ? [String(v)] : [])

    // Identity
    const identity: string | undefined = (() => {
      const q1 = a.Q1
      if (q1 === 'personal_brand') return 'personal_brand'
      if (q1 === 'business_brand') return 'business'
      if (q1 === 'artist_creator') return 'artist'
      if (q1 === 'monetize_existing') return 'monetize_existing'
      if (q1 === 'stuck') return 'stuck'
      if (q1 === 'exploring') return 'exploring'
      return undefined
    })()
    const business_type = a.Q1B_BUSINESS_TYPE || undefined // 'digital' | 'service' | 'physical'
    const art_medium = a.Q1C_ART_MEDIUM || undefined        // 'music' | 'visual' | 'writing' | 'other'
    const exploring_excite = (arr(a.Q1E_EXCITES).join(', ')) || undefined

    // Stage
    const stage: string | undefined = (() => {
      const v = a.Q2
      if (v === 'lt_100') return 'starting'
      if (v === '100_1k') return 'early_momentum'
      if (v === '1k_10k') return 'growing'
      if (v === '10k_50k') return 'plateauing'
      if (v === '50k_plus') return 'large_optimizing'
      if (v === 'restart') return 'restart'
      return undefined
    })()
    const plateau_causes = arr(a.Q2A_PLATEAU_CAUSE).map((v) => ({
      repetitive: 'repetitive',
      algo: 'algorithm_changes',
      audience: 'audience_shift',
      inconsistent: 'inconsistent_posting',
      format_gap: 'lack_new_formats',
    } as Record<string,string>)[v] || v)

    // Challenges
    const biggest_challenges = arr(a.Q3).map(v => ({
      no_niche: 'what_to_post',
      inconsistent: 'inconsistent',
      low_engagement: 'no_engagement',
      fear_judgment: 'fear_judgment',
      low_time: 'no_time',
      inauthentic: 'inauthentic',
      overwhelm: 'overwhelmed_advice',
      technical: 'tech_confusion',
      comparison: 'comparison',
      stalled: 'stalled',
    } as Record<string,string>)[v] || v)

    // Vision
    const six_month_success = arr(a.Q4).map(v => ({
      consistency_relief: 'consistent_no_anxiety',
      brand_clarity: 'brand_identity',
      steady_engagement: 'regular_engagement',
      first_clients: 'first_clients',
      brand_deals: 'brand_deals',
      sell_own: 'sell_products',
      confidence: 'confident_authentic',
    } as Record<string,string>)[v] || v)
    const drivers = arr(a.Q5).map(v => ({
      money: 'financial_freedom', creative: 'creative_expression', helping: 'help_others', legacy: 'legacy',
      escape: 'escape_9to5', community: 'community', prove: 'prove_myself', fun: 'fun_experiment',
    } as Record<string,string>)[v] || v)
    const audience_feelings = arr(a.Q6).map(v => (v === 'action' ? 'action_oriented' : v))

    // Content & comfort
    const content_natural = ({ teaching:'teach_explain', lifestyle:'share_life', entertaining:'entertain_funny', visual:'visual_aesthetic', conversations:'deep_conversations', document:'document_journey', react:'react_trends', building:'build_make' } as Record<string,string>)[a.Q7] || undefined
    const visibility_comfort = ({ cam_comfort:'love_camera', edited:'ok_prepared_video', voiceover:'prefer_voiceover', faceless:'behind_scenes', depends:'depends_mood', work_up:'work_up_to_face' } as Record<string,string>)[a.Q8] || undefined
    const time_capacity = ({ batch_weekends:'batch_weekends', micro_daily:'daily_15_30', hours_daily:'daily_hours', chaotic:'unpredictable', team:'team_support', motivation:'time_ok_motivation_low' } as Record<string,string>)[a.Q9] || undefined
    const endless_topics = (Array.isArray(a.Q10) ? a.Q10.join(', ') : undefined)

    // Platform & audience
    const natural_platforms = arr(a.Q11).map(v => ({ twitter:'twitter_x', multi:'multi_equal' } as Record<string,string>)[v] || v)
    const who_needs_you = (() => {
      const v = a.Q12
      if (!v) return undefined
      const norm = ({ past_self:'people_starting_where_i_was', industry:'professionals_in_industry', hobbies:'similar_interests', local:'local', age_group:'specific_age_group', broad:'anyone_resonates', unknown:'dont_know' } as Record<string,string>)[v] || v
      return norm
    })()
    const who_needs_help_with = (arr(a.Q12A_HELP_WITH).join(', ')) || undefined
    const metrics_relationship = ({ obsessive:'obsessive', casual:'casual', anxious:'anxious', ignore:'ignore', learn:'want_to_learn', qualitative:'prefer_qualitative' } as Record<string,string>)[a.Q13] || undefined

    // Barriers & history
    const fears = arr(a.Q14).map(v => ({ cringe:'cringe', friends_judging:'family_judging', mean_comments:'mean_comments', not_good_enough:'not_good_enough', copying:'not_original', tech_mistakes:'tech_mistakes', cancel:'cancel_culture', success_change:'success_changes_me', no_fear:'no_fears' } as Record<string,string>)[v] || v)
    const already_tried = arr(a.Q15).map(v => ({ post_consistent:'posting_consistent', trend_follow:'follow_trends', courses:'expensive_courses', style_mix:'style_experiments', paid_ads:'paid_ads', nothing:'nothing_yet', exhausted:'everything_exhausted' } as Record<string,string>)[v] || v)
    const handle_criticism = a.Q16 || undefined

    // Monetization & growth
    const monetization_approach = ({ asap:'income_asap', long_term:'building_long_term', multiple:'multiple_streams', break_even:'cover_costs', not_main:'not_main_goal', scale:'already_monetizing_scale' } as Record<string,string>)[a.Q17] || undefined
    const monetization_interests = arr(a.Q17A_REVENUE_PREF).map(v => ({ coaching:'coaching', ugc_brand:'ugc_brand', digital_products:'digital_products', services:'services', affiliate:'affiliate', membership:'membership' } as Record<string,string>)[v] || v)
    const monetization_current = arr(a.Q17B_WHAT_WORKS).map(v => ({ brand_deals:'brand_deals', services:'services', digital_products:'digital_products', coaching:'coaching', affiliate:'affiliate', other:'other' } as Record<string,string>)[v] || v)
    const dream_weight = a.Q18 || undefined

    // Derived
    const vis = visibility_comfort || ''
    const plat = natural_platforms || []
    const platform_confidence: 'low'|'medium'|'high' = ((plat.filter(p => p !== 'lurker').length >= 2) && (vis === 'love_camera' || vis === 'ok_prepared_video')) ? 'high'
      : (((plat.includes('lurker')) || vis === 'behind_scenes' || vis === 'work_up_to_face') ? 'low' : 'medium')
    const should_show_q14 = Array.isArray(biggest_challenges) && (biggest_challenges.includes('fear_judgment') || biggest_challenges.includes('inauthentic') || biggest_challenges.includes('comparison') || (six_month_success || []).includes('confident_authentic'))
    const should_show_q15 = (stage === 'plateauing' || (biggest_challenges || []).includes('stalled'))

    const payload = {
      version: 'onboarding.v2',
      identity,
      business_type,
      art_medium,
      exploring_excite,

      stage,
      plateau_causes: plateau_causes?.length ? plateau_causes : undefined,

      biggest_challenges,
      six_month_success,
      drivers,
      audience_feelings,

      content_natural,
      visibility_comfort,
      time_capacity,
      endless_topics,

      natural_platforms,
      who_needs_you,
      who_needs_help_with,
      metrics_relationship,

      fears: fears?.length ? fears : undefined,
      already_tried: already_tried?.length ? already_tried : undefined,
      handle_criticism,

      monetization_approach,
      monetization_interests: monetization_interests?.length ? monetization_interests : undefined,
      monetization_current: monetization_current?.length ? monetization_current : undefined,

      dream_weight,

      platform_confidence,
      should_show_q14,
      should_show_q15,
    }

    try { localStorage.setItem('onboarding_v2', JSON.stringify(payload)) } catch {}
    try {
      await fetch('/api/onboarding/complete', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, cache: 'no-store',
        body: JSON.stringify({ sessionId, answers: payload })
      })
    } catch {}
    if (!authed) {
      const next = encodeURIComponent('/paywall')
      router.push(`/signin?next=${next}`)
    } else {
      router.push('/paywall')
    }
    setTransitioning(false)
  }

  if (!node) return null

  // === Render ==================================================================
  const sel = state.answers[nodeId]
  const isMulti = node.type === 'multi'
  const maxSel = node.maxSelect || 99

  if (guarding) return null

  return (
    <div data-mentor-ui>
      <DesignStyles />
      <main className="container py-10">
        {/* Back + progress */}
        <div className={["mb-4 flex items-center justify-end onb-wrap", transitioning ? "is-fading" : ""].join(' ')}>
          <div className="fixed top-6 left-6 z-50">
            <button
              onClick={goBack}
              className="bg-white rounded-full p-3 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 inline-flex items-center justify-center text-gray-900 border border-gray-100"
              aria-label="Back"
            >
              <span className="text-xl">←</span>
            </button>
          </div>
          <div className="w-[280px]">
            <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
              <span>Progress</span>
              <span className="font-semibold text-gray-800">{pct}%</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-[var(--accent-grape)]" style={{ width: `${pct}%` }} /></div>
          </div>
        </div>

        <div className={["max-w-3xl mx-auto text-center onb-wrap", transitioning ? "is-fading" : ""].join(' ')}>
          <div className="mb-2 text-center">
            <h1 className="text-2xl font-semibold text-gray-900">{node.question}</h1>
            <span className="mt-1 block text-xs text-gray-500">{Math.min(askedCount, MAX_Q)} / {MAX_Q}</span>
          </div>
          {node.helperText && <p className="text-sm text-gray-600 mb-4">{node.helperText}</p>}

          {/* single */}
          {node.type === 'single' && (
            <>
              <div className="grid sm:grid-cols-2 gap-3 mt-4 justify-center">
                {node.options?.map((opt) => (
                  <Button key={opt.value} label={opt.label} active={sel === opt.value} onClick={() => selectSingle(opt.value)} />
                ))}
              </div>
              <div className="mt-6 flex items-center justify-center">
                <button
                  onClick={commitAndAdvance}
                  disabled={!sel}
                  className={["continue-btn px-12 py-4 rounded-full text-xl bg-[var(--accent-grape)] text-white hover:bg-[#874E95]", !sel ? "opacity-60 cursor-not-allowed" : "", "pulse-gentle"].join(' ')}
                >
                  {primaryCta}
                </button>
              </div>
            </>
          )}

          {/* multi */}
          {node.type === 'multi' && (
            <div className="mt-4">
              <div className="grid sm:grid-cols-2 gap-3">
                {node.options?.map((opt) => {
                  const active = Array.isArray(sel) && sel.includes(opt.value)
                  const disabled = !active && Array.isArray(sel) && sel.length >= maxSel
                  return (
                    <button key={opt.value} onClick={() => !disabled && toggleMulti(opt.value)}
                      className={`px-6 py-3.5 rounded-full min-w-[240px] text-base font-medium transition text-center border ${active ? 'bg-[#D9B8E3] text-black border-transparent' : disabled ? 'opacity-60 cursor-not-allowed bg-white text-gray-400 border-gray-200' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'}`}
                    >{opt.label}</button>
                  )
                })}
              </div>
              <div className="mt-6 flex items-center justify-center gap-3">
                <button onClick={commitAndAdvance} className={["continue-btn px-12 py-4 rounded-full text-xl bg-[var(--accent-grape)] text-white hover:bg-[#874E95]", transitioning ? "is-pressed" : "", "pulse-gentle"].join(' ')}>{primaryCta}</button>
                <span className="text-sm text-gray-500">{Array.isArray(sel) ? sel.length : 0}/{maxSel} selected</span>
              </div>
            </div>
          )}

          {/* text (chips) */}
          {node.type === 'text' && (
            <div className="mt-4">
              <p className="text-sm text-gray-600 mb-2">Type a word or short phrase and press Enter. Each becomes a tag. Click × to remove; click next to the tags to add more.</p>
              <div
                className="flex flex-wrap items-center gap-2 border rounded-2xl px-3 py-2 bg-white max-w-2xl mx-auto"
                onClick={()=>{ document.getElementById('chip-input')?.focus() }}
              >
                {(Array.isArray(sel) ? sel : []).map((t:string, i:number)=> (
                  <span key={i} className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm bg-[#EAD7F0] text-[#4B1F57]">
                    {t}
                    <button aria-label="Remove" className="text-[#4B1F57]/70 hover:text-[#4B1F57]" onClick={()=>{
                      const next = (sel as string[]).filter((_:string, idx:number)=> idx!==i)
                      setState(s=> ({ ...s, answers: { ...s.answers, [nodeId]: next } }))
                    }}>×</button>
                  </span>
                ))}
                <input
                  id="chip-input"
                  value={textDraft}
                  onChange={(e)=> setTextDraft(e.target.value)}
                  onKeyDown={(e)=>{
                    if (e.key === 'Enter') { e.preventDefault(); addTextChip(); }
                  }}
                  placeholder={node.placeholder || 'add a word or phrase and press Enter'}
                  className="flex-1 min-w-[160px] py-2 outline-none text-base bg-transparent"
                />
              </div>
              <div className="mt-2 text-xs text-gray-500">{(Array.isArray(sel) ? sel.length : 0)}/{node.maxSelect || 5} tags</div>
              <div className="mt-6 flex items-center justify-center">
                <button onClick={commitAndAdvance} className={["continue-btn px-12 py-4 rounded-full text-xl bg-[var(--accent-grape)] text-white hover:bg-[#874E95]", transitioning ? "is-pressed" : "", "pulse-gentle"].join(' ')}>{primaryCta}</button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
