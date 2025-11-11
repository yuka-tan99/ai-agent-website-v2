import Anthropic from "@anthropic-ai/sdk";

const anthropicApiKey = process.env.ANTHROPIC_API_KEY ?? "";
const anthropicModel =
  process.env.REPORT_CLAUDE_MODEL ??
  process.env.ANTHROPIC_MODEL ??
  "claude-3-7-sonnet-20250219";

const MAX_TOKENS = 6000;
const TIMEOUT_MS = 600_000;
const RETRIES = 3;

const anthropicClient = anthropicApiKey
  ? new Anthropic({ apiKey: anthropicApiKey })
  : null;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const isClaudeAvailable = Boolean(anthropicClient);

type ClaudeResponseFormat =
  | { type: "json_schema"; json_schema: { name: string; schema: Record<string, unknown> } }
  | { type: "json_object" }
  | undefined;

type ClaudeRequest = {
  system?: string;
  prompt: string;
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
  retries?: number;
  responseFormat?: ClaudeResponseFormat;
};

export async function callClaudeJson({
  system,
  prompt,
  maxTokens,
  temperature = 0.6,
  timeoutMs = TIMEOUT_MS,
  retries = RETRIES,
  responseFormat,
}: ClaudeRequest): Promise<string> {
  if (!anthropicClient) {
    throw new Error("Claude client not configured");
  }

  let attempt = 0;
  let lastError: unknown;
  let backoff = 500;

  while (attempt < retries) {
    attempt += 1;
    try {
      const response = (await Promise.race([
        anthropicClient.messages.create({
          model: anthropicModel,
          max_tokens: Math.min(maxTokens ?? MAX_TOKENS, MAX_TOKENS),
          temperature,
          ...(responseFormat ? { response_format: responseFormat } : {}),
          system,
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Claude request timeout")), timeoutMs),
        ),
      ])) as Awaited<ReturnType<typeof anthropicClient.messages.create>>;

      if (!response || typeof response !== "object" || !("content" in response)) {
        throw new Error("Claude response missing content field");
      }

      const blocks = Array.isArray((response as { content?: unknown }).content)
        ? ((response as { content?: unknown }).content as Array<{
            type: string;
            text?: string;
          }>)
        : [];

      const content = blocks.find(
        (block) => block.type === "text" && typeof block.text === "string",
      );
      if (!content || !content.text) {
        throw new Error("Claude response missing text content");
      }

      return content.text.trim();
    } catch (error) {
      lastError = error;
      if (attempt >= retries) {
        break;
      }
      await sleep(backoff);
      backoff *= 2;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Claude request failed");
}
