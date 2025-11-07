import { GoogleGenerativeAI } from "@google/generative-ai";

const geminiApiKey = process.env.GOOGLE_API_KEY ?? process.env.GEMINI_API_KEY ?? "";
const geminiModel =
  process.env.REPORT_GEMINI_MODEL ?? "gemini-1.5-flash";

const MAX_TOKENS = 3000;
const TIMEOUT_MS = 60_000;
const RETRIES = 3;

const geminiClient = geminiApiKey
  ? new GoogleGenerativeAI(geminiApiKey).getGenerativeModel({
      model: geminiModel,
    })
  : null;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const isGeminiAvailable = Boolean(geminiClient);

type GeminiRequest = {
  prompt: string;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
  retries?: number;
};

export async function callGeminiJson({
  prompt,
  temperature = 0.6,
  maxTokens,
  timeoutMs = TIMEOUT_MS,
  retries = RETRIES,
}: GeminiRequest): Promise<string> {
  if (!geminiClient) {
    throw new Error("Gemini client not configured");
  }

  let attempt = 0;
  let lastError: unknown;
  let backoff = 500;

  while (attempt < retries) {
    attempt += 1;
    try {
      const result = (await Promise.race([
        geminiClient.generateContent({
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature,
            maxOutputTokens: Math.min(maxTokens ?? MAX_TOKENS, MAX_TOKENS),
          },
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Gemini request timeout")), timeoutMs),
        ),
      ])) as Awaited<ReturnType<typeof geminiClient.generateContent>>;

      const text = result.response?.text?.();
      if (!text) {
        throw new Error("Gemini response missing text content");
      }

      return text.trim();
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
    : new Error("Gemini request failed");
}
