import fs from "fs";
import path from "path";

import { callClaudeJson, isClaudeAvailable } from "./claude";

const CACHE_FILE = path.resolve(process.cwd(), "promptCache.json");

function loadCache(): Record<string, string> {
  if (!fs.existsSync(CACHE_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(CACHE_FILE, "utf-8"));
  } catch {
    return {};
  }
}

function saveCache(data: Record<string, string>) {
  fs.writeFileSync(CACHE_FILE, JSON.stringify(data, null, 2), "utf-8");
}

export async function summarizeBlockSmart(
  key: string,
  fullText: string,
  targetWords = 600,
): Promise<string> {
  const cache = loadCache();
  if (cache[key]) return cache[key];

  if (!isClaudeAvailable) {
    const fallback = fullText
      .replace(/\s+/g, " ")
      .split(" ")
      .slice(0, targetWords)
      .join(" ");
    cache[key] = fallback;
    saveCache(cache);
    return fallback;
  }

  const system =
    "You are an expert technical summarizer. Compress the text but preserve all key ideas, book names, and tone rules.";
  const prompt = `
Summarize this instruction text in ~${targetWords} words.
Keep key ideas, lists, and important directives. 
Do NOT remove examples defining tone or schema rules.

--- BEGIN TEXT ---
${fullText}
--- END TEXT ---
`;

  const summary = await callClaudeJson({
    system,
    prompt,
    maxTokens: 1200,
    temperature: 0.2,
  });

  const trimmed = summary.trim();
  cache[key] = trimmed;
  saveCache(cache);
  return trimmed;
}

export async function buildAllPromptSummaries(
  blocks: Record<string, string>,
) {
  const results: Record<string, string> = {};
  for (const [key, text] of Object.entries(blocks)) {
    results[key] = await summarizeBlockSmart(key, text);
  }
  return results;
}
