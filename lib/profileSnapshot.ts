// lib/profileSnapshot.ts
import * as cheerio from 'cheerio'

export type PublicProfileSummary = {
  platform: string
  url: string
  raw: string          // compacted text snapshot
  bullets: string[]    // short “observations” we can inject into the prompt
}

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

/**
 * Fetch raw HTML with a browsery UA. Important: use HeadersInit (= Record<string,string>).
 */
export async function fetchPublicHtml(url: string): Promise<string> {
  const headers: Record<string, string> = {
    'user-agent': UA,
    accept:
      'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'accept-language': 'en-US,en;q=0.9',
    'upgrade-insecure-requests': '1',
  }

  const res = await fetch(url, { headers })
  if (!res.ok) throw new Error(`fetch ${url} failed: ${res.status}`)
  return await res.text()
}

/**
 * Very light extractor that works for most public profile pages.
 * We avoid heavy, brittle selectors and just take the obvious signals.
 */
export function extractSnapshot(html: string): { raw: string; bullets: string[] } {
  const $ = cheerio.load(html)

  const textBits: string[] = []

  // prefer og/meta first
  const ogTitle = $('meta[property="og:title"]').attr('content') || ''
  const ogDesc = $('meta[property="og:description"]').attr('content') || ''
  const title = $('title').first().text() || ''
  const h1 = $('h1').first().text() || ''

  if (ogTitle) textBits.push(ogTitle)
  if (ogDesc) textBits.push(ogDesc)
  if (title && title !== ogTitle) textBits.push(title)
  if (h1 && h1 !== ogTitle && h1 !== title) textBits.push(h1)

  // grab a few visible text chunks (first N paragraphs/headings)
  $('h2, h3, p, li')
    .slice(0, 60)
    .each((_, el) => {
      const t = $(el).text().trim().replace(/\s+/g, ' ')
      if (t.length >= 40 && t.length <= 280) textBits.push(t)
    })

  // compact
  const raw = textBits
    .map((t) => t.trim())
    .filter(Boolean)
    .join('\n')

  // derive some simple bullets we can hand to the LLM
  const bullets: string[] = []
  const followerMatch = raw.match(/([\d.,]+)\s*(followers?|subs|subscribers)/i)
  if (followerMatch) bullets.push(`mentions audience size: ${followerMatch[0]}`)

  if (/linktree|link in bio|all my links/i.test(raw)) bullets.push('has link hub (linktree/bio links)')
  if (/shorts|reels|clips/i.test(raw)) bullets.push('short-form emphasis present')
  if (/stream|live/i.test(raw)) bullets.push('live/streaming referenced')

  return { raw, bullets }
}

/**
 * High-level helper: fetch → parse → summarize.
 * Pass platform for labeling only (does not change parsing).
 */
export async function getPublicProfileSnapshot(
  url: string,
  platform: string
): Promise<PublicProfileSummary> {
  const html = await fetchPublicHtml(url)
  const { raw, bullets } = extractSnapshot(html)

  return {
    platform,
    url,
    raw,
    bullets,
  }
}