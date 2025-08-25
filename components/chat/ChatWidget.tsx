// components/chat/ChatWidget.tsx
"use client"

import { useEffect, useMemo, useRef, useState } from "react"

type Msg = { role: "user" | "assistant" | "system"; content: string }

const dot = "w-2 h-2 rounded-full bg-gray-400 animate-pulse"

export default function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [online, setOnline] = useState(true)
  const [typing, setTyping] = useState(false)
  const [input, setInput] = useState("")
  const [msgs, setMsgs] = useState<Msg[]>([])
  const listRef = useRef<HTMLDivElement>(null)

  // welcome message on mount
  useEffect(() => {
    setMsgs([{ role: "assistant", content: "Hello! I'm your marketing mentor. How can I help you today?" }])
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
      const reply = (data?.text || data?.reply || "").toString()
      setMsgs((m) => [...m, { role: "assistant", content: reply || fallback(text) }])
    } catch {
      setMsgs((m) => [...m, { role: "assistant", content: fallback(text) }])
    } finally {
      setTyping(false)
    }
  }

  function fallback(_text: string) {
    return "Sorry — I didn’t quite catch that. Try asking about content strategy, growth, or KPIs. If you need a human handoff, head to Account → Support."
  }

  function onKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      void send()
    }
  }

  function Feedback({ index }: { index: number }) {
    if (index === 0) return null // hide on greeting only
    return (
      <div className="flex items-center gap-3 text-xs text-gray-500 mt-2">
        <span>Was this helpful?</span>
        <button
          onClick={() => logFeedback("up")}
          className="rounded-md border px-2 py-1 hover:bg-gray-50"
        >
          👍
        </button>
        <button
          onClick={() => logFeedback("down")}
          className="rounded-md border px-2 py-1 hover:bg-gray-50"
        >
          👎
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
      {/* floating elliptical button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed z-40 bottom-6 right-6 rounded-full px-5 py-3 bg-black text-white shadow-lg transition transform hover:scale-[1.03] pulse-gentle"
        aria-label={open ? "Close chat" : "Chat with your marketing mentor"}
      >
        {!open ? "Chat with your marketing mentor" : "Close"}
      </button>

      {/* chat panel */}
      {open && (
        <div className="fixed z-40 bottom-24 right-6 w-[min(380px,calc(100vw-2rem))] rounded-3xl dashboard-card shadow-xl overflow-hidden">
          {/* header */}
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${online ? "bg-green-500" : "bg-gray-400"}`} />
              <span className="text-sm font-medium">{online ? "Online" : "Ready"}</span>
            </div>
            <button
              className="text-sm text-gray-500 hover:text-black"
              onClick={() => setOpen(false)}
            >
              ✕
            </button>
          </div>

          {/* messages */}
          <div ref={listRef} className="max-h-[50vh] overflow-y-auto px-4 py-3 space-y-3">
            {msgs.map((m, i) => (
              <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                <div
                  className={
                    m.role === "user"
                      ? "max-w-[85%] rounded-2xl px-4 py-2 bg-gray-900 text-white"
                      : "max-w-[85%] rounded-2xl px-4 py-2 bg-[rgba(155,126,222,.15)] text-gray-900"
                  }
                >
                  {m.content}
                  {m.role === "assistant" ? <Feedback index={i} /> : null}
                </div>
              </div>
            ))}

            {/* typing indicator */}
            {typing && (
              <div className="flex justify-start">
                <div className="flex items-center gap-1 rounded-2xl px-4 py-2 bg-[rgba(155,126,222,.15)]">
                  <span className={`${dot}`} />
                  <span className={`${dot} [animation-delay:120ms]`} />
                  <span className={`${dot} [animation-delay:240ms]`} />
                </div>
              </div>
            )}
          </div>

          {/* input row */}
          <form
            className="flex items-center gap-2 p-3 border-t"
            onSubmit={(e) => {
              e.preventDefault()
              void send()
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKey}
              placeholder="Ask me anything..."
              className="flex-1 rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/20"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-1 rounded-xl bg-black text-white px-3 py-2 hover:bg-gray-800"
              aria-label="Send"
            >
              {/* inline paper-plane icon */}
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                <path d="M2 3l20 9-20 9 5-9-5-9z" />
              </svg>
              <span className="sr-only">Send</span>
            </button>
          </form>
        </div>
      )}
    </>
  )
}