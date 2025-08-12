// lib/llmJson.ts
// Loose JSON parser for LLM output
export function parseModelJsonLoose(text: string) {
  if (!text) return null
  let s = text.trim()

  // strip ```/```json fences
  s = s.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '')

  // normalize smart quotes
  s = s.replace(/[\u201C\u201D]/g, '"').replace(/[\u2018\u2019]/g, "'")

  // if extra prose surrounds the object, slice the largest {...}
  if (!(s.startsWith('{') && s.endsWith('}'))) {
    const first = s.indexOf('{')
    const last = s.lastIndexOf('}')
    if (first !== -1 && last !== -1 && last > first) s = s.slice(first, last + 1)
  }

  try {
    return JSON.parse(s)
  } catch {
    // remove trailing commas before } or ]
    const cleaned = s.replace(/,\s*([}\]])/g, '$1').replace(/\r/g, '')
    try { return JSON.parse(cleaned) } catch { return null }
  }
}