export function chunkText(s: string, size = 1800, overlap = 250) {
  const out: string[] = [];
  let i = 0;
  while (i < s.length) {
    const end = Math.min(i + size, s.length);
    out.push(s.slice(i, end));
    i = end - overlap;
    if (i < 0) i = 0;
  }
  return out.map(t => t.trim()).filter(Boolean);
}