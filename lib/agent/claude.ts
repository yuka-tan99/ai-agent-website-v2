import { callClaudeJSONWithRetry } from '@/lib/claude'

export async function claudeJson(system: string, user: string, opts?: { timeoutMs?: number; maxTokens?: number; model?: string }) {
  const prompt = `${system}\n\n${user}`
  const res = await callClaudeJSONWithRetry<any>({
    prompt,
    timeoutMs: opts?.timeoutMs ?? 60000,
    maxTokens: opts?.maxTokens ?? 1400,
    model: opts?.model,
  }, 1)
  return res
}

