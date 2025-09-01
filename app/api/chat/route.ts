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
      { text: "Sorry, I ran into an issue. Please try again." },
      { status: 200 },
    )
  }
}