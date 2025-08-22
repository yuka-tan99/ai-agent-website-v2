// lib/claude.ts
import Anthropic from '@anthropic-ai/sdk';

export function claudeClient() {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('Missing ANTHROPIC_API_KEY');
  return new Anthropic({ apiKey: key });
}

/** Generate raw JSON text from Claude (no markdown, no preface). */
export async function claudeJSON(client: Anthropic, prompt: string) {
  const msg = await client.messages.create({
    model: 'claude-sonnet-4-20250514', // claude-sonnet-4-20250514
    max_tokens: 2000,
    temperature: 0.2,
    messages: [
      {
        role: 'user',
        content:
`You are an API that returns ONLY valid JSON. Do not add code fences or commentary.

${prompt}

Return JSON only.`,
      },
    ],
  });

  // Claude returns an array of content blocks; concatenate any text blocks.
  const text = (msg.content || [])
    .map((c: any) => (c.type === 'text' ? c.text : ''))
    .join('')
    .trim();

  return text;
}