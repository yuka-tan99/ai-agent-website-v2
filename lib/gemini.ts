// lib/gemini.ts
import { GoogleGenerativeAI } from '@google/generative-ai'

const apiKey = process.env.GOOGLE_API_KEY
if (!apiKey) {
  throw new Error('Missing GOOGLE_API_KEY')
}

export const genAI = new GoogleGenerativeAI(apiKey)

// Text models
export const geminiText = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' })
// or for faster/cheaper: 'gemini-1.5-flash'

// Embeddings model
export const geminiEmbeddings = genAI.getGenerativeModel({ model: 'text-embedding-004' })