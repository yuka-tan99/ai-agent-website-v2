// app/api/chat/route.ts
import { NextRequest, NextResponse } from "next/server"
import { supabaseRoute } from "@/lib/supabaseServer"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { redactPII } from "@/lib/redact"

// Allow overriding via env if some versions are not available to the project
const DEFAULT_MODEL = process.env.LLM_CHAT_MODEL || "gemini-2.0-flash"

export async function POST(req: NextRequest) {
  try {
    const DEBUG = process.env.DEBUG_LOG === 'true'
    const t0 = Date.now()
    const { messages = [], rag = {} } = await req.json()

    // Gate access to AI chat based on active grants
    const supa = supabaseRoute()
    const { data: { user } } = await supa.auth.getUser()
    if (!user) {
      if (DEBUG) console.log('[chat] unauthenticated access')
      return NextResponse.json({ text: "Please sign in to chat." }, { status: 200 })
    }
    const now = new Date()
    const nowIso = now.toISOString()
    // Pull windows and compute active in code (align with /api/me/access)
    const { data: windows, error: winErr } = await supa
      .from('access_grants')
      .select('id, access_starts_at, access_ends_at, status')
      .eq('user_id', user.id)
      .eq('product_key', 'ai')
      .order('access_starts_at', { ascending: false })
    if (winErr) console.warn('grant lookup failed', winErr)
    const arr = windows || []
    const grant = arr.find(w => (
      (w.status || 'active') === 'active' &&
      w.access_starts_at && w.access_ends_at &&
      w.access_starts_at <= nowIso && nowIso <= w.access_ends_at
    )) || null
    // Fallback: if report purchased within last 3 months but no access row, allow access
    if (!grant) {
      const diag: any = {
        windows_count: arr.length,
        now: nowIso,
      }
      if (arr.length) {
        const future = arr
          .filter(w => (w.status || 'active') === 'active' && w.access_starts_at && w.access_starts_at > nowIso)
          .sort((a:any,b:any) => a.access_starts_at.localeCompare(b.access_starts_at))[0]
        const past = arr
          .filter(w => (w.status || 'active') === 'active' && w.access_ends_at && w.access_ends_at < nowIso)
          .sort((a:any,b:any) => b.access_ends_at.localeCompare(a.access_ends_at))[0]
        if (future) diag.future_window_starts_at = future.access_starts_at
        if (past)   diag.latest_past_window_ended_at = past.access_ends_at
      }

      const { data: ob } = await supa
        .from('onboarding_sessions')
        .select('purchase_status, claimed_at, updated_at')
        .eq('user_id', user.id)
        .maybeSingle()
      const status = ob?.purchase_status
      const claimedAtStr = ob?.claimed_at || ob?.updated_at || null
      if (status === 'paid' && claimedAtStr) {
        const claimedAt = new Date(claimedAtStr as string)
        const ends = new Date(claimedAt)
        ends.setMonth(ends.getMonth() + 3)
        if (new Date() <= ends) {
          // Allow access without writing (RLS-safe). Proceed to model call.
          diag.fallback = 'paid_within_3m'
          if (DEBUG) console.log('[chat] access via fallback paid_within_3m', diag)
        } else {
          const payUrl = '/paywall/ai'
          const msg = `Looks like you don’t have access to your Marketing Mentor right now. Pay only $6/month to continue access.`
          diag.fallback = 'paid_expired'; diag.fallback_ended_at = ends.toISOString()
          if (DEBUG) console.log('[chat] access expired', diag)
          return NextResponse.json({ text: msg, reason: 'expired_access', paywall: payUrl, diag }, { status: 200 })
        }
      } else {
        const payUrl = '/paywall/ai'
        const msg = `Looks like you don’t have access to your Marketing Mentor yet. Pay only $6/month to continue access.`
        diag.fallback = status === 'paid' ? 'paid_no_claimed_at' : 'not_paid'
        if (DEBUG) console.log('[chat] access denied', diag)
        return NextResponse.json({ text: msg, reason: 'expired_access', paywall: payUrl, diag }, { status: 200 })
      }
    }

    const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY
    if (!apiKey) {
      if (DEBUG) console.warn('[chat] missing GOOGLE_API_KEY/GEMINI_API_KEY')
      return NextResponse.json({ text: "Server missing Google API key." }, { status: 200 })
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    // Some orgs/projects don't have access to specific point releases.
    // Try a short list until one works.
    const candidateModels = [
      DEFAULT_MODEL,
      'gemini-2.0-flash',
      'gemini-1.5-flash',
      'gemini-pro',
    ]
    let selectedModelName = candidateModels[0]
    let model = genAI.getGenerativeModel({ model: selectedModelName })

    // ✨ System prompt (conversational, readable, actionable) with optional RAG context
const system = [
  `You are "Marketing Mentor", a curious, friendly coach who helps people grow on social media and with content creation.`,
  `Tone & style: write like you’re speaking to a smart 15-year-old — clear, simple, conversational. Be concise but warm.`,
  `Formatting rules: 
   - Write in short paragraphs (1–3 sentences each). 
   - Use bullet points when listing steps, ideas, or options (max 5 items per list). 
   - Use **bold** only to highlight key words or important actions. 
   - Do not use headings (#, ##, etc.). 
   - Do not overuse bold; one or two highlights per answer is enough.
   - No emojis unless the user uses them first.
   - Keep links plain (https://example.com or [label](url)).`,
  `Behavior & priorities:`,
  `- Follow the user's instructions literally. Do not invent their needs, goals, or preferences.`,
  `- On the first turn, greet briefly and ask how you can help. Do not propose a plan unless the user asks for one.`,
  `- Ask a clarifying question only when it is required to fulfill the request; otherwise do the thing.`,
  `- Never ask multiple back-to-back questions. Prefer action + (optional) one focused question.`,
  `- Avoid info dumps. Keep outputs short and practical; expand only if the user asks.`,
  `Compassionate mode (mental health):`,
  `- If the user expresses distress (e.g., sad, overwhelmed, burnout, bullied, anxious), lead with empathy and validate feelings.`,
  `- Offer 1–3 gentle, concrete steps (e.g., quick grounding, boundaries online, reporting/blocks, short reset). Keep it brief.`,
  `- Ask at most one gentle question only if it helps you support them better.`,
  `- Do not suggest creating or posting content, productivity pushes, or growth tasks in these moments unless the user explicitly asks. Prioritize safety, rest, and mental health resources.
`,
  `- If there are signs of crisis or self-harm, respond supportively and advise contacting local emergency services or a crisis hotline; avoid clinical diagnoses.`,
  `- Do not divert the topic away from their feelings; reflect back what you heard and stay with them. Avoid platitudes or minimizing.`,
  `- Use short, caring sentences (1–2) and, when helpful, one empathetic question (e.g., "Want to share what felt hardest about that?").`,
  `- If/when the user signals they want tactics again, gently transition back to practical steps.`,
  `When possible, end with one clear **actionable takeaway** for the user.`,
  `If metrics or plan context is provided, ground your advice in that.`,
  `If you can’t solve something directly, offer a simple next step or a polite handoff.`,
].join("\n")

    // Optional RAG context — pass along but keep it lightweight
    const persona = rag?.persona ? JSON.stringify(rag.persona) : ""
    const plan = rag?.plan ? JSON.stringify(rag.plan) : ""

    const context = [
      persona && `User persona (from onboarding): ${persona}`,
      plan && `Current plan (if any): ${plan}`,
    ].filter(Boolean).join("\n")

    const userTurn = messages[messages.length - 1]?.content || ""
    const userTurnsCount = Array.isArray(messages) ? messages.filter((m:any) => m?.role === 'user').length : 1

    const prompt = [
      system,
      context ? `\nContext:\n${context}\n` : "",
      `Conversation meta: user_turn_index=${userTurnsCount}`,
      `Guidance: If user_turn_index > 1, do not add extra greetings. Respond directly to the user's latest message. If it's a greeting, a brief hello back is enough; if it's an instruction, execute it. If user text shows emotional distress, switch to compassionate mode.`,
      `User: ${userTurn}\nAssistant:`,
    ].join("\n")

    let text = ''
    const promptChars = prompt.length
    if (DEBUG) console.log('[chat] calling model', { model: selectedModelName, promptChars })
    try {
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: 240,
          temperature: 0.4,
        },
      })
      text = (result?.response?.text?.() || '').toString()
    } catch (e: any) {
      // If 404 (model name not found), try alternative model names quickly
      const msg = String(e?.message || '')
      let triedFallback = false
      if (/404|not found|was not found/i.test(msg)) {
        for (let i = 1; i < candidateModels.length; i++) {
          try {
            selectedModelName = candidateModels[i]
            model = genAI.getGenerativeModel({ model: selectedModelName })
            if (DEBUG) console.warn('[chat] retrying with model', selectedModelName)
            const resAlt = await model.generateContent({
              contents: [{ role: 'user', parts: [{ text: prompt }] }],
              generationConfig: { maxOutputTokens: 240, temperature: 0.4 },
            })
            text = (resAlt?.response?.text?.() || '').toString()
            triedFallback = true
            break
          } catch (eAlt: any) {
            if (DEBUG) console.warn('[chat] fallback model failed', selectedModelName, eAlt?.message || eAlt)
          }
        }
      }
      if (!triedFallback && !text) {
        // Fall back to simple string call (SDK compatibility) and keep it short
        try {
          const result2: any = await (model as any).generateContent(prompt)
          text = (result2?.response?.text?.() || '').toString()
        } catch (e2: any) {
          console.warn('[chat] model call failed twice', e2?.message || e2)
          text = "I hit a hiccup generating that. Could you rephrase or ask a smaller question?"
        }
      }
    }
    if (!text) text = "Let’s try that again with a bit more detail."
    if (DEBUG) console.log('[chat] model ok', { model: selectedModelName, ms: Date.now() - t0, outChars: text.length })

    // Persist sanitized chat logs (best-effort; ignore failures) and capture assistant message id
    let assistantMessageId: number | null = null
    try {
      const redUser = redactPII(userTurn)
      const redAsst = redactPII(text)
      const { data: inserted } = await supa
        .from('chat_messages')
        .insert([
          { user_id: user.id, role: 'user', content: redUser, meta: { turns: userTurnsCount } },
          { user_id: user.id, role: 'assistant', content: redAsst, meta: { model: selectedModelName } },
        ])
        .select('id, role')
      const asst = (inserted || []).find((r: any) => r.role === 'assistant')
      if (asst?.id) assistantMessageId = asst.id as number
    } catch (e) {
      if (DEBUG) console.warn('[chat] log persist failed (safe to ignore)', (e as any)?.message || e)
    }

    // Log usage estimates (tokens and optional cost)
    try {
      // naive token estimate ~ 4 chars/token
      const tokens_input = Math.max(1, Math.round((userTurn.length || 0) / 4))
      const tokens_output = Math.max(1, Math.round((text.length || 0) / 4))
      const inRate = parseFloat(process.env.LLM_COST_PER_KTOK_INPUT_USD || '0') // USD per 1k tokens
      const outRate = parseFloat(process.env.LLM_COST_PER_KTOK_OUTPUT_USD || '0')
      const costUsd = (inRate * tokens_input + outRate * tokens_output) / 1000
      const costMicros = Math.round(costUsd * 1_000_000)
      await supa.from('chat_usage_events').insert({
        user_id: user.id,
        session_id: null,
        prompt_count: 1,
        tokens_input,
        tokens_output,
        cost_usd_micros: (inRate || outRate) ? costMicros : null,
        meta: { model: selectedModelName },
      })
    } catch (e) {
      if (DEBUG) console.warn('chat usage log failed (safe to ignore)', (e as any)?.message || e)
    }

    return NextResponse.json({ text, message_id: assistantMessageId })
  } catch (err) {
    console.error("[chat] fatal error", (err as any)?.message || err)
    return NextResponse.json(
      { text: "Sorry, I ran into an issue. Please try again." },
      { status: 200 },
    )
  }
}
