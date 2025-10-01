"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { supabaseBrowser } from "@/lib/supabaseClient"
import Markdown from "@/components/Markdown"
import { ThumbsDown, ThumbsUp, Copy as CopyIcon, CopyCheck } from "lucide-react";

type Msg = { role: "user" | "assistant" | "system"; content: string; id?: number }

const dot = "w-2 h-2 rounded-full bg-gray-400 animate-pulse"

export default function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [online, setOnline] = useState(true)
  const [typing, setTyping] = useState(false)
  const [input, setInput] = useState("")
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [locked, setLocked] = useState(false)
  const [lockMsg, setLockMsg] = useState<string | null>(null)
  const [lockDiag, setLockDiag] = useState<any | null>(null)
  const [showDiag, setShowDiag] = useState(false)
  const [payUrl, setPayUrl] = useState<string>("/paywall/ai")
  const [feedbackSel, setFeedbackSel] = useState<Record<number, 'up' | 'down' | null>>({})
  const listRef = useRef<HTMLDivElement>(null)
  const taRef = useRef<HTMLTextAreaElement>(null)
  const [displayName, setDisplayName] = useState<string>("")

  // On mount: seed a single greeting and warm presence; also cache display name
  useEffect(() => {
    // Use cached name immediately for a friendly greeting
    let cachedName = ""
    try { cachedName = (localStorage.getItem('profile_name') || '').toString() } catch {}
    const nick = (cachedName || '').trim()
    const hello = `hey there${nick ? ` ${nick}` : ''} how can I help you today?`
    setMsgs([{ role: "assistant", content: hello }])

    // Best-effort fetch of latest profile name for later usage
    const sb = supabaseBrowser()
    sb.auth.getUser().then(({ data }) => {
      const u = data?.user
      const meta: any = u?.user_metadata || {}
      const mname = (meta.name || meta.full_name || '').toString().trim()
      let derived = mname
      if (!derived && u?.email) {
        const alias = (u.email.split('@')[0] || '').replace(/[._-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
        derived = alias
      }
      if (derived) {
        setDisplayName(derived)
        try { localStorage.setItem('profile_name', derived) } catch {}
      }
    }).catch(() => {})

    const id = setInterval(() => setOnline(true), 15000) // faux presence ping
    return () => clearInterval(id)
  }, [])

  // auto scroll
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" })
  }, [msgs, typing])

  // lightweight RAG: persona + plan
  const ragPayload = useMemo(() => {
    let persona: any = {}
    let plan: any = null
    try { persona = JSON.parse(localStorage.getItem("onboarding") || "{}") } catch {}
    try { plan = JSON.parse(localStorage.getItem("last_plan") || "null") } catch {}
    return { persona, plan }
  }, [])

  // try to fetch plan once so we can cache for RAG
  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch("/api/report", { cache: "no-store" })
        if (!res.ok) return
        const json = await res.json()
        if (json?.plan) localStorage.setItem("last_plan", JSON.stringify(json.plan))
      } catch {}
    })()
  }, [])

  async function send() {
    const text = input.trim()
    if (!text) return
    setInput("")
    setMsgs((m) => [...m, { role: "user", content: text }])
    setTyping(true)

    // analytics (fire-and-forget)
    try {
      fetch("/api/chat/analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event: "user_message", text }),
        keepalive: true,
      })
    } catch {}

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: msgs.concat({ role: "user", content: text }), rag: ragPayload }),
      })
      const data = await res.json()
      if (data?.reason === 'expired_access') {
        setLocked(true)
        if (typeof data?.paywall === 'string') setPayUrl(data.paywall)
        setLockMsg((data?.text || "Looks like you don’t have access to your Marketing Mentor yet. Pay only $6/month to continue.").toString())
        setLockDiag(data?.diag || null)
        // Add a short assistant notice instead of the full message
        setMsgs((m) => [...m, { role: "assistant", content: "Looks like you don’t have access to your Marketing Mentor yet." }])
      } else {
        const reply = (data?.text || data?.reply || "").toString()
        const msgId = typeof data?.message_id === 'number' ? data.message_id : undefined
        setMsgs((m) => [...m, { role: "assistant", content: reply || fallback(text), id: msgId }])
      }
    } catch {
      setMsgs((m) => [...m, { role: "assistant", content: fallback(text) }])
    } finally {
      setTyping(false)
    }
  }

  function fallback(_text: string) {
    return "Sorry — I didn’t quite catch that. Try asking about content strategy, growth, or KPIs. If you need a human handoff, head to Account → Support."
  }

  function onKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      void send()
    }
  }

  function Feedback({ index, text, messageId }: { index: number; text: string; messageId?: number }) {
    if (index === 0) return null // hide on greeting only
    const selected = feedbackSel[index] || null
    const setSel = (v: 'up' | 'down') => {
      setFeedbackSel(prev => {
        const cur = prev[index] || null
        const next: 'up' | 'down' | null = cur === v ? null : v
        // fire-and-forget analytics; include cleared state
        try {
          fetch("/api/chat/analytics", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ event: "feedback", value: next ?? 'cleared', index, text, message_id: messageId ?? null }),
            keepalive: true,
          })
        } catch {}
        return { ...prev, [index]: next }
      })
    }
    return (
      <div className="flex items-center gap-3 text-xs text-white/90 mt-2">
        <span className="text-white/90">Was this helpful?</span>
        <button
          onClick={() => setSel('up')}
          aria-pressed={selected === 'up'}
          className={["rounded-md border border-white/60 text-white px-2 py-1",
            selected === 'up' ? 'bg-white/20' : 'hover:bg-white/10'
          ].join(' ')}
          aria-label="Thumbs up"
        >
          <ThumbsUp className="w-4 h-4" />
        </button>
        <button
          onClick={() => setSel('down')}
          aria-pressed={selected === 'down'}
          className={["rounded-md border border-white/60 text-white px-2 py-1",
            selected === 'down' ? 'bg-white/20' : 'hover:bg-white/10'
          ].join(' ')}
          aria-label="Thumbs down"
        >
          <ThumbsDown className="w-4 h-4" />
        </button>
      </div>
    )
  }

  function logFeedback(value: "up" | "down") {
    try {
      fetch("/api/chat/analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event: "feedback", value }),
        keepalive: true,
      })
    } catch {}
  }

  return (
    <>
      {/* floating round button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed z-40 right-6 rounded-full w-[80px] h-[80px] bg-[var(--accent-grape)] text-white shadow-lg transition transform hover:scale-[1.05] pulse-gentle flex items-center justify-center"
        style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)' }}
        aria-label={open ? "Close chat" : "Chat with your marketing mentor"}
        title={open ? "Close chat" : "Chat with your marketing mentor"}
      >
        {!open ? (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-16 h-16 md:w-[68px] md:h-[68px] text-white">
            <path fillRule="evenodd" d="M4.848 2.771A49.144 49.144 0 0 1 12 2.25c2.43 0 4.817.178 7.152.52 1.978.292 3.348 2.024 3.348 3.97v6.02c0 1.946-1.37 3.678-3.348 3.97a48.901 48.901 0 0 1-3.476.383.39.39 0 0 0-.297.17l-2.755 4.133a.75.75 0 0 1-1.248 0l-2.755-4.133a.39.39 0 0 0-.297.17 48.9 48.9 0 0 1-3.476-.384c-1.978-.29-3.348-2.024-3.348-3.97V6.741c0-1.946 1.37-3.68 3.348-3.97Z" clipRule="evenodd" />
          </svg>
        ) : (
          <span className="text-2xl md:text-3xl leading-none">×</span>
        )}
      </button>

      {/* chat panel */}
      {open && (
        <div className="mm-wrap">
          {/* header */}
          <div className="mm-head">
            <div className="mm-avatar" aria-hidden>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0f172a" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9" fill="#F2E7E1" />
                <circle cx="9" cy="10" r="1.2" fill="#0f172a" stroke="none" />
                <circle cx="15" cy="10" r="1.2" fill="#0f172a" stroke="none" />
                <path d="M8.5 14.2c1.2 1 2.3 1.5 3.5 1.5s2.3-.5 3.5-1.5" />
              </svg>
            </div>
            <div>
              <div className="mm-title">Your Marketing Mentor</div>
              <div className="mm-sub">Always here to help</div>
            </div>
            <button className="mm-close" onClick={() => setOpen(false)} aria-label="Close">×</button>
          </div>

          {/* messages */}
          <div ref={listRef} className="mm-body">
            {msgs.map((m, i) => (
              <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                <ChatBubble role={m.role} text={m.content}>
                  {m.role === "assistant" && (m.content?.length || 0) > 250 ? (
                    <Feedback index={i} text={m.content} messageId={m.id} />
                  ) : null}
                </ChatBubble>
              </div>
            ))}

            {/* locked overlay card */}
            {locked && (
              <div className="flex justify-center my-3">
                <div className="w-full max-w-sm rounded-2xl border bg-white shadow p-4 text-center">
              <div className="text-base font-semibold mb-1">Unlock your Marketing Mentor</div>
                  <div className="text-sm text-gray-600 mb-4">{lockMsg || 'Looks like you don’t have access to your Marketing Mentor yet. Pay only $6/month to continue.'}</div>
                  <a
                    href={payUrl}
                    className="inline-flex items-center justify-center rounded-xl bg-[var(--accent-grape)] text-white px-4 py-2 hover:bg-[#874E95]"
                  >
                    Unlock Now
                  </a>
                  {lockDiag ? (
                    <div className="mt-3 text-left">
                      <button
                        className="text-xs text-gray-500 underline"
                        onClick={() => setShowDiag(v => !v)}
                      >
                        {showDiag ? 'Hide diagnostics' : 'Show diagnostics'}
                      </button>
                      {showDiag && (
                        <pre className="mt-2 text-[10px] text-gray-500 bg-gray-50 rounded p-2 overflow-auto max-h-40">
{JSON.stringify(lockDiag, null, 2)}
                        </pre>
                      )}
                    </div>
                  ) : null}
                </div>
              </div>
            )}

            {/* typing indicator */}
            {typing && (
              <div className="flex justify-start">
                <div className="flex items-center gap-1 rounded-2xl px-4 py-2 bg-[#E2E8F0]">
                  <span className={`${dot}`} />
                  <span className={`${dot} [animation-delay:120ms]`} />
                  <span className={`${dot} [animation-delay:240ms]`} />
                </div>
              </div>
            )}
          </div>

          {/* input row */}
          <form
            className="mm-input"
            onSubmit={(e) => {
              e.preventDefault()
              void send()
            }}
          >
            <textarea
              ref={taRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value)
                const el = taRef.current
                if (el) {
                  el.style.height = 'auto'
                  el.style.height = Math.min(el.scrollHeight, 160) + 'px'
                }
              }}
              onKeyDown={onKey}
              placeholder="Type your message..."
              className="mm-input-field"
              rows={1}
              disabled={locked}
            />
            <button
              type="submit"
              className="mm-send"
              disabled={locked}
              aria-label="Send"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                <path d="M2 3l20 9-20 9 6-9-6-9z" />
              </svg>
              <span className="sr-only">Send</span>
            </button>
          </form>
          <style jsx>{`
            .mm-wrap{ position: fixed; z-index: 40; right: 24px; width: min(420px, calc(100vw - 2rem)); border-radius: 24px; box-shadow: 0 15px 40px rgba(0,0,0,.18); overflow: hidden; background: #fff; bottom: calc(env(safe-area-inset-bottom, 0px) + 24px); }
            /* Lavender header */
            .mm-head{ display:flex; align-items:center; gap:12px; padding:14px 16px; background:#D9B8E3; color:#1E1340; border-bottom:1px solid rgba(98,55,160,.20); }
            .mm-avatar{ width:38px; height:38px; border-radius:50%; display:flex; align-items:center; justify-content:center; background: rgba(255,255,255,.7); font-size:18px; }
            .mm-title{ font-weight:700; }
            .mm-sub{ font-size:.85rem; color:#3E2B6E; margin-top:2px; }
            .mm-close{ margin-left:auto; background:transparent; border:0; font-size:22px; color:#3E2B6E; transition: transform .18s ease, color .18s ease; }
            .mm-close:hover{ transform: scale(1.15); color:#874E95; font-weight:700; }
            /* Gentle lavender canvas */
            .mm-body{ max-height:50vh; overflow:auto; padding:22px 18px; background:#FCF7FF; }
            .mm-input{ display:flex; align-items:flex-end; gap:10px; padding:14px; background:#F4E9F7; border-top:1px solid rgba(98,55,160,.18); }
            .mm-input-field{ flex:1; resize:none; border:0; outline:none; background:#ffffff; padding:12px 14px; border-radius:14px; line-height:1.4; max-height:160px; overflow:auto; }
            .mm-send{ width:42px; height:42px; border-radius:50%; background:#9E5DAB; color:#fff; display:flex; align-items:center; justify-content:center; box-shadow: 0 6px 18px rgba(158,93,171,.35); border:0; transition: background .18s ease, transform .18s ease; }
            .mm-send:hover{ background:#874E95; transform: translateY(-1px); }
          `}</style>
        </div>
      )}
    </>
  )
}

/* --------------------------- */
/* Bubble with Copy + Markdown */
/* --------------------------- */

function ChatBubble({
  role,
  text,
  children,
}: {
  role: "user" | "assistant" | "system"
  text: string
  children?: React.ReactNode
}) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
    } catch {}
  }

  const isUser = role === "user"

  const copyButton = (
    <button
      onClick={copy}
      className="mm-copy-side"
      aria-label="Copy message"
      title={copied ? "Copied" : "Copy"}
    >
      {copied ? <CopyCheck className="w-4 h-4" /> : <CopyIcon className="w-4 h-4" />}
    </button>
  )

  return (
    <div className={["mm-bwrap", isUser ? "justify-end" : "justify-start"].join(" ")}> 
      {isUser ? copyButton : null}
      <div className={isUser ? "mm-bubble-user" : "mm-bubble-ai"}>
        {/* Markdown rendering for assistant; plain text for user is fine too */}
        {isUser ? (
          <div className="whitespace-pre-wrap break-words">{text}</div>
        ) : (
          <div className="prose prose-sm max-w-none">
            <Markdown>{text}</Markdown>
          </div>
        )}
        {children}
      </div>
      {!isUser ? copyButton : null}
      <style jsx>{`
        .mm-bwrap{ display:flex; align-items:flex-start; gap:8px; margin: 6px 0; }
        .mm-bubble-ai{ position:relative; max-width:85%; padding:14px 16px; border-radius:22px; background:var(--accent-grape); color:#fff; box-shadow: 0 8px 18px rgba(0,0,0,.12); margin: 10px 0; }
        .mm-bubble-user{ position:relative; max-width:85%; padding:14px 16px; border-radius:22px; background:#CBD5E1; color:#0f172a; box-shadow: 0 8px 18px rgba(0,0,0,.08); margin: 10px 0; }
        .mm-copy-side{ width:28px; height:28px; display:flex; align-items:center; justify-content:center; border-radius:8px; border:1px solid rgba(0,0,0,.08); background:#fff; color:#334155; box-shadow: 0 4px 10px rgba(0,0,0,.06); opacity:0; transition: opacity .2s ease; align-self:flex-start; margin-top:6px; }
        .mm-copy-side:hover{ background:#f1f5f9; }
        .mm-bwrap:hover .mm-copy-side, .mm-copy-side:focus { opacity:1; }
      `}</style>
    </div>
  )
}
