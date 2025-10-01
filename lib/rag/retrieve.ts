import { createClient } from '@supabase/supabase-js'
import { SourceChunk, ReportSectionId, UserProfile } from '@/types/report'
import { booksFor } from './router'
import { searchKBServer } from '@/lib/rag'

function buildQuery(section: ReportSectionId, profile: UserProfile): string {
  const parts: string[] = []
  parts.push(section.replace(/_/g, ' '))
  parts.push(profile.stage)
  parts.push(profile.platforms.join(','))
  parts.push((profile.blockers || []).join(','))
  parts.push(profile.goals.join(','))
  return parts.filter(Boolean).join(' | ')
}

export async function retrieveSectionChunks(section: ReportSectionId, profile: UserProfile, k = 16): Promise<SourceChunk[]> {
  const allowedBooks = new Set(booksFor(section, profile))
  const query = buildQuery(section, profile)

  // 1) semantic search (broad), then filter by allowed books
  const raw = await searchKBServer(query, 50)

  // 2) Map doc ids to titles to restrict to exact books
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY) as string
  const supa = createClient(url, key)
  const docIds = Array.from(new Set(raw.map((r: any) => r.document_id)))
  const { data: docs } = await supa.from('kb_documents').select('id,title').in('id', docIds)
  const titleById = new Map<string, string>((docs || []).map((d: any) => [d.id, d.title]))

  const filtered = raw
    .map((r: any) => ({ ...r, book: titleById.get(r.document_id) || '' }))
    .filter((r: any) => r.book && allowedBooks.has(r.book))

  // 3) Simple diversity: round-robin by book after sorting by similarity
  filtered.sort((a: any, b: any) => (b.similarity || 0) - (a.similarity || 0))
  const byBook = new Map<string, any[]>()
  for (const item of filtered) {
    const list = byBook.get(item.book) || []
    list.push(item)
    byBook.set(item.book, list)
  }
  const order: any[] = []
  const books = Array.from(byBook.keys())
  let idx = 0
  while (order.length < k && books.length > 0) {
    const b = books[idx % books.length]
    const list = byBook.get(b) || []
    if (list.length) order.push(list.shift())
    if (!list.length) {
      byBook.delete(b)
      books.splice(idx % Math.max(1, books.length), 1)
      idx = 0
    } else {
      byBook.set(b, list)
      idx++
    }
  }

  return order.map((r: any, i: number) => ({
    id: r.id || `${r.document_id}:${i}`,
    book: r.book,
    section: '',
    passage: r.content,
    weight: r.similarity || 0,
    metadata: { document_id: r.document_id },
  }))
}

