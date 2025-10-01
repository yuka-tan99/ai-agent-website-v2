import { ReportCard, LessonPack, ReportSectionId, UserProfile } from '@/types/report'
import { retrieveSectionChunks } from '@/lib/rag/retrieve'
import { booksFor } from '@/lib/rag/router'
import { claudeJson } from './claude'

const SYSTEM_PROMPT = `You are an expert AI marketing consultant. Use ONLY the provided SourceChunks for factual frameworks (book names and sections).
Blend ~70% sourced synthesis + ~30% personalization from the provided UserProfile and onboarding answers.
Be radically actionable, concise, and platform-native.
Prioritize the user's biggest blocker first when relevant.
Output STRICT JSON only, matching the schema. Do not include extra commentary.`.trim()

function userPromptReport(sectionId: ReportSectionId, profile: UserProfile, chunks: any[]) {
  const books = booksFor(sectionId, profile)
  const chunksStr = JSON.stringify(chunks, null, 2)
  const profileStr = JSON.stringify(profile)
  return `
Task: Create a ReportCard for section "${sectionId}".

Sources (authoritative; restrict frameworks to these books ONLY): ${JSON.stringify(books)}
SourceChunks: ${chunksStr}

UserProfile: ${profileStr}

Constraints:
- 3–5 insights tailored to stage and platforms.
- 2–4 quick wins doable in <30 minutes.
- 1 metric with name, howToMeasure, weeklyTarget.
- <= 180 words total across insights + quick wins + metric text.
- Strict JSON for the ReportCard schema.

Return JSON:
{
  "sectionId": "${sectionId}",
  "title": string,
  "insights": string[],
  "quickWins": string[],
  "metric": { "name": string, "howToMeasure": string, "weeklyTarget": string },
  "learnMorePayload": {
    "profileSnapshot": <UserProfile>,
    "retrievalHints": string[],
    "personalizationNotes": string[]
  }
}`.trim()
}

function userPromptLesson(sectionId: ReportSectionId, profile: UserProfile, chunks: any[]) {
  const books = booksFor(sectionId, profile)
  const chunksStr = JSON.stringify(chunks, null, 2)
  const profileStr = JSON.stringify(profile)
  return `
Task: Create a LessonPack (depthLevel=2) for section "${sectionId}".

Sources (authoritative; restrict frameworks to these books ONLY): ${JSON.stringify(books)}
SourceChunks: ${chunksStr}

UserProfile: ${profileStr}

Constraints:
- ~70% frameworks (from sources), ~30% personalization (from profile).
- Overview (2–4 sentences).
- Frameworks: list names & brief explanations (from sources).
- StepByStep: 7–12 concrete steps with small time hints like "(~5m)".
- Templates: 2–4 assets with ready-to-copy content.
- Troubleshooting: 5–8 items.
- Examples: platform-specific (TikTok, Instagram, YouTube, etc.).
- Checkpoints: 3–5 measurable gates with clear targets.
- Include "references" listing books and sections used.
- Strict JSON for LessonPack schema.

Return JSON:
{
  "sectionId": "${sectionId}",
  "depthLevel": 2,
  "overview": string,
  "frameworks": string[],
  "stepByStep": string[],
  "templates": [{"title": string, "content": string}],
  "troubleshooting": string[],
  "examples": string[],
  "checkpoints": string[],
  "references": [{"book": string, "sections": string[]}]
}`.trim()
}

export async function generateReport(profile: UserProfile): Promise<ReportCard[]> {
  // Only two cards as requested
  const sections: ReportSectionId[] = [
    'primary_obstacle_resolution',
    'strategic_foundation',
  ]
  const out: ReportCard[] = []
  for (const sectionId of sections) {
    const chunks = await retrieveSectionChunks(sectionId, profile)
    const user = userPromptReport(sectionId, profile, chunks)
    const card = (await claudeJson(SYSTEM_PROMPT, user, { maxTokens: 900, timeoutMs: 60000 })) as ReportCard
    out.push(card)
  }

  // Post-process titles so they are clear, non-repetitive, and complementary.
  const clean = (s?: string) => (s || '').replace(/\s+/g, ' ').trim()
  const stripPrefixes = (s: string) => {
    let t = s
    // remove any leading prefix + colon like "Something: subtitle"
    t = t.replace(/^[^:]+:\s*/, '')
    // strip known prefixes if they leaked into subtitle
    t = t.replace(/^(primary obstacle|strategic foundation|resolving obstacle|strateg(y|ies))\b[:\-\s]*/i, '')
    return clean(t)
  }
  const setTitle = (card: ReportCard, prefix: string, fallback: string) => {
    const raw = clean(card.title)
    const sub = stripPrefixes(raw)
    card.title = `${prefix}: ${sub || fallback}`
  }

  // Apply per-card
  for (const card of out) {
    if (card.sectionId === 'primary_obstacle_resolution') {
      setTitle(card, 'Resolving Obstacle', 'What’s blocking you')
    } else if (card.sectionId === 'strategic_foundation') {
      setTitle(card, 'Strategies', 'Core leverage plan')
    }
  }

  // Ensure the two subtitles aren't identical; if so, adjust the Strategies one.
  const a = out.find(c => c.sectionId === 'primary_obstacle_resolution')
  const b = out.find(c => c.sectionId === 'strategic_foundation')
  if (a && b) {
    const subA = stripPrefixes(clean(a.title))
    const subB = stripPrefixes(clean(b.title))
    if (subA && subB && subA.toLowerCase() === subB.toLowerCase()) {
      b.title = 'Strategies: Core leverage plan'
    }
  }

  return out
}

export async function generateLesson(sectionId: ReportSectionId, profile: UserProfile): Promise<LessonPack> {
  const chunks = await retrieveSectionChunks(sectionId, profile)
  const user = userPromptLesson(sectionId, profile, chunks)
  // Increase token budget to reduce retries from max_tokens stops
  const raw = await claudeJson(SYSTEM_PROMPT, user, { maxTokens: 1600, timeoutMs: 90000 })
  return normalizeLessonPack(raw, 2, sectionId)
}

// ---------- Depth 3 (Elaborate / Mastery) ----------
function userPromptElaborateLesson(sectionId: ReportSectionId, profile: UserProfile, chunks: any[]) {
  const books = booksFor(sectionId, profile)
  const chunksStr = JSON.stringify(chunks, null, 2)
  const profileStr = JSON.stringify(profile)
  return `
Task: Create a LessonPack (depthLevel=3) for section "${sectionId}" (Elaborate / Mastery).

Sources (authoritative; restrict frameworks to these books ONLY): ${JSON.stringify(books)}
SourceChunks: ${chunksStr}

UserProfile: ${profileStr}

Requirements (3–5× the detail of level 2, keep outputs tightly bounded):
- Overview: 2 sentences maximum.
- Frameworks: 4–6 bullets (≤18 words each); append (Source: Book Name) when relevant.
- StepByStep: 8–10 bullets (≤18 words each) with decision criteria/checkpoints inline.
- Templates: 2 advanced templates (≤80 words each) with variables in [brackets].
- Troubleshooting: 5 bullets with simple if/then guidance (≤18 words each).
- Examples: 2 concise case examples (≤40 words each) with outcome.
- References: list {book, sections[]} only from provided sources.

NEW Mastery fields (must include, keep concise ≤18 words each unless noted):
- advancedTechniques: exactly 4 items.
- edgeCases: exactly 4 items.
- failureModes: exactly 5 items with corrective action.
- longTermStrategy: exactly 5 items.
- sourceContextNotes: up to 5 bullets (≤22 words each) citing which book/section was used.

CONTENT REQUIREMENTS (domain-specific meaning for each fixed UI title):
- If section is "primary_obstacle_resolution":
  - Advanced Techniques → deeper interventions, novel exercises, reframing tactics tailored to the profile.
  - Edge Cases → high-stakes launches, creative slumps, external criticism, and other special contexts.
  - Failure Modes → common relapse points, diagnostic cues, corrective nudges.
  - Long-Term Strategy → build imperfectionism habits into quarterly reviews and long horizon career arcs.
  - Source Insights → annotated references & key passages (e.g., "(BookName §Chapter:KeyIdea) point…").
- If section is "strategic_foundation":
  - Advanced Techniques → expert strategies for scaling hooks & brands.
  - Edge Cases → niche markets, oversaturation, creative burnout, and other unusual scenarios.
  - Failure Modes → perfectionism traps, identity crisis, brand confusion; how to escape.
  - Long-Term Strategy → sustainable brand compounding, authentic positioning, growth ladders.
  - Source Insights → distilled notes directly from reference books, include parenthetical brief citation.

STYLE RULES:
- 3–5× more detailed than depth=2; prefer concise bullets over paragraphs.
- ~70% sourced synthesis (tie back to sources in-line), ~30% profile personalization.
- No freeform headings in text; UI provides section titles.
- Each bullet must be self-contained and implementable (diagnostics, when-to-use, steps, metrics).
- Always return VALID JSON. If a field would be empty, synthesize from nearest relevant SourceChunk.

Constraints:
- ~70% sourced synthesis (from books/chunks), ~30% personalization (from profile).
- Output STRICT JSON conforming to the LessonPack schema.
- Set "depthLevel": 3.
`.trim()
}

export async function generateElaborateLesson(sectionId: ReportSectionId, profile: UserProfile): Promise<LessonPack> {
  const chunks = await retrieveSectionChunks(sectionId, profile)
  const user = userPromptElaborateLesson(sectionId, profile, chunks)
  // Keep output bounded to avoid token overruns; prompt enforces concise bullets
  const raw = await claudeJson(SYSTEM_PROMPT, user, { maxTokens: 1800, timeoutMs: 100000 })
  return normalizeLessonPack(raw, 3, sectionId)
}

// -------- Normalize model outputs to LessonPack schema --------
function asStringArray(v: any): string[] {
  if (!v) return []
  if (Array.isArray(v)) return v.map(x => typeof x === 'string' ? x : JSON.stringify(x)).filter(Boolean)
  if (typeof v === 'string') return v.split('\n').map(s=>s.trim()).filter(Boolean)
  return []
}

function normalizeTemplates(v: any): { title: string; content: string }[] {
  if (!Array.isArray(v)) return []
  const out: { title: string; content: string }[] = []
  for (const t of v) {
    if (!t) continue
    if (typeof t === 'string') {
      out.push({ title: 'Template', content: t })
    } else if (typeof t === 'object') {
      const title = (t.title || t.name || 'Template').toString()
      const content = (t.content || t.body || t.text || '').toString()
      out.push({ title, content })
    }
  }
  return out
}

function normalizeFrameworks(v: any): string[] {
  if (!Array.isArray(v)) return []
  return v.map((it: any) => {
    if (typeof it === 'string') return it
    if (it && typeof it === 'object') {
      const name = (it.name || it.title || '').toString().trim()
      const desc = (it.description || it.note || it.explainer || '').toString().trim()
      return [name, desc].filter(Boolean).join(' — ')
    }
    return ''
  }).filter(Boolean)
}

function normalizeReferences(v: any): { book: string; sections: string[] }[] {
  if (!Array.isArray(v)) return []
  const out: { book: string; sections: string[] }[] = []
  for (const it of v) {
    if (!it) continue
    if (typeof it === 'string') {
      const m = it.split(':')
      const book = (m.shift() || '').trim()
      const rest = m.join(':').split(/[;,]/).map(s=>s.trim()).filter(Boolean)
      if (book) out.push({ book, sections: rest })
    } else if (typeof it === 'object') {
      const book = (it.book || it.source || it.title || '').toString()
      const sections = asStringArray(it.sections || it.chapters || it.topics)
      if (book) out.push({ book, sections })
    }
  }
  return out
}

export function normalizeLessonPack(data: any, depth: 2 | 3, sectionId: ReportSectionId): LessonPack {
  // Unwrap common wrappers (lessonPack/result/response)
  let p: any = data
  if (p && typeof p === 'object' && 'lessonPack' in p) p = p.lessonPack
  if (p && typeof p === 'object' && 'lesson' in p && !p.sectionId) p = p.lesson
  if (!p || typeof p !== 'object') p = {}

  const pack: LessonPack = {
    sectionId: (p.sectionId || p.section || sectionId) as ReportSectionId,
    depthLevel: (p.depthLevel === 3 ? 3 : depth) as 2 | 3,
    overview: (p.overview || '').toString(),
    frameworks: normalizeFrameworks(p.frameworks || p.framework || []),
    stepByStep: asStringArray(p.stepByStep || p.steps || p.execution),
    templates: normalizeTemplates(p.templates || p.assets || []),
    troubleshooting: asStringArray(p.troubleshooting || p.keyInsight || p.troubleshoots),
    examples: asStringArray(p.examples || p.cases || p.caseStudies),
    checkpoints: asStringArray(p.checkpoints || p.milestones || p.gates),
    references: normalizeReferences(p.references || p.sources || []),
    advancedTechniques: asStringArray(p.advancedTechniques || p.advanced || p.techniques),
    edgeCases: asStringArray(p.edgeCases || p.edges || p.rareCases),
    failureModes: asStringArray(p.failureModes || p.pitfalls || p.failures),
    longTermStrategy: asStringArray(p.longTermStrategy || p.longTerm || p.habits),
    sourceContextNotes: asStringArray(p.sourceContextNotes || p.sourceInsights || p.notes),
  }

  return pack
}
