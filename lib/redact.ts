// lib/redact.ts
// Best-effort PII redaction for chat logs. Not perfect, but removes common identifiers.

const EMAIL = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi
// Phone numbers: sequences of 10-15 digits with optional punctuation, spaces, country code
const PHONE = /(?:(?:\+?\d{1,3}[\s.-]?)?(?:\(\d{2,4}\)|\d{2,4})[\s.-]?)?\d{3,4}[\s.-]?\d{4,6}/g
// US SSN pattern
const SSN = /\b\d{3}-\d{2}-\d{4}\b/g
// Dates (common formats): YYYY-MM-DD, MM/DD/YYYY, DD/MM/YYYY
const DATE = /\b(?:\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/]\d{1,2}[-/]\d{2,4})\b/g
// Street addresses: number + street name + suffix (very heuristic)
const ADDRESS = /\b\d{1,6}\s+[A-Za-z0-9'\.\-\s]+\s+(?:St|Street|Ave|Avenue|Rd|Road|Blvd|Lane|Ln|Dr|Drive|Court|Ct|Way|Terrace|Ter|Place|Pl|Pkwy|Parkway)\b/gi
// URLs
const URL = /https?:\/\/[^\s)\]}]+/gi
// Handles like @username
const HANDLE = /(^|\s)@[a-z0-9._-]{2,}/gi

// Full names are very hard to detect reliably; avoid over-redacting.
// We only catch "my name is <...>" style to mask the name.
const NAME_CLAUSE = /(my\s+name\s+is\s+)([a-z][a-z'\-]+(?:\s+[a-z'\-]+){0,3})/gi

export function redactPII(input: string): string {
  if (!input) return input
  let out = input
  out = out.replace(EMAIL, '[email]')
  // Replace phone if likely 10+ digits overall
  out = out.replace(PHONE, (m) => {
    const digits = (m.match(/\d/g) || []).length
    return digits >= 10 ? '[phone]' : m
  })
  out = out.replace(SSN, '[ssn]')
  out = out.replace(DATE, '[date]')
  out = out.replace(ADDRESS, '[address]')
  out = out.replace(URL, '[url]')
  out = out.replace(HANDLE, (m) => m.replace(/@([a-z0-9._-]{2,})/i, '[handle]'))
  out = out.replace(NAME_CLAUSE, (_m, p1) => `${p1}[name]`)
  return out
}
