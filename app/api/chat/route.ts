// app/api/chat/route.ts
import { NextRequest, NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"

const MODEL = "gemini-1.5-flash" // fast & inexpensive

export async function POST(req: NextRequest) {
  try {
    const { messages = [], rag = {} } = await req.json()

    const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ text: "Server missing Google API key." }, { status: 200 })
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: MODEL })

    // simple system prompt with optional RAG context
    const system = [
      "You are 'Marketing Mentor', a concise, curious, friendly social media/content creation growth coach.",
      "When you can't help, offer a simple next step or a polite handoff.",
      "Keep answers clear, no fluff but friendly and sweet. Use short paragraphs and lists when helpful.",
      "If metrics or plan context is provided, ground advice in it.",
      "Formatting rules: - Prefer short paragraphs with bolded keywords (1–3 sentences each). - Use bullets only when helpful; max 5 bullets. - Avoid heavy formatting. At most one short **bold label** in the whole reply. - No big headings; no emojis unless user uses them. -Keep links as plain URLs or short labels."
    ].join(" ")

    const persona = rag?.persona ? JSON.stringify(rag.persona) : ""
    const plan = rag?.plan ? JSON.stringify(rag.plan) : ""

    const context = [
      persona && `User persona (from onboarding): ${persona}`,
      plan && `Current plan (if any): ${plan}`,
    ]
      .filter(Boolean)
      .join("\n")

    const userTurn = messages[messages.length - 1]?.content || ""

    const prompt = [
      system,
      context ? `\nContext:\n${context}\n` : "",
      `User: ${userTurn}\nAssistant:`,
    ].join("\n")

    const result = await model.generateContent(prompt)
    const text = result.response.text() || "Let’s try that again with a bit more detail."

    return NextResponse.json({ text })
  } catch (err) {
    console.error("chat error", err)
    return NextResponse.json(
      { text: "Sorry I ran into an issue. Please try again." },
      { status: 200 },
    )
  }
}