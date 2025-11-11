import fs from "fs";
import path from "path";
import { jsonrepair } from "jsonrepair";

import { supabaseAdmin } from "@/lib/supabase/server";
import { callClaudeJson, isClaudeAvailable } from "../ai/claude";
import { isGeminiAvailable } from "../ai/gemini";
import { computeFameMetrics, type FameMetrics } from "./fameScore";
import {
  CORE_PROMPT,
  RAG_RULES,
  USER_SEGMENTATION_RULES,
  COMMUNICATION_STYLE_RULES,
  THREE_LEVEL_ARCHITECTURE_PROMPT,
  REPORT_CONTEXT,
} from "../reports/prompts";

/* ---------------------------------------------
   SECTION TITLES
--------------------------------------------- */
export const SECTION_TITLES = [
  "Main Problem | First Advice",
  "Imperfectionism | Execution",
  "Niche | Focus Discovery",
  "Personal Brand Development",
  "Marketing Strategy",
  "Platform Organization & Systems",
  "Mental Health & Sustainability",
  "Advanced Marketing Types & Case Studies",
  "Monetization Strategies",
] as const;

type SectionTitle = (typeof SECTION_TITLES)[number];

const REPORT_LEVEL_CARD_COUNT = 5;
const LEARN_MORE_LEVEL_CARD_COUNT = 6;
const UNLOCK_MASTERY_LEVEL_CARD_COUNT = 6;

const CARD_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["ai_generated_title", "content"],
  properties: {
    ai_generated_title: { type: "string" },
    content: { type: "string" },
  },
} as const;

const REPORT_SECTION_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["section_title", "report_level", "learn_more_level", "unlock_mastery_level"],
  properties: {
    section_title: { type: "string" },
    report_level: {
      type: "object",
      additionalProperties: false,
      required: ["title", "cards", "action_tips"],
      properties: {
        title: { type: "string" },
        cards: {
          type: "array",
          minItems: REPORT_LEVEL_CARD_COUNT,
          maxItems: REPORT_LEVEL_CARD_COUNT,
          items: CARD_SCHEMA,
        },
        action_tips: {
          type: "array",
          minItems: 5,
          maxItems: 5,
          items: { type: "string" },
        },
      },
    },
    learn_more_level: {
      type: "object",
      additionalProperties: false,
      required: ["title", "cards"],
      properties: {
        title: { type: "string" },
        cards: {
          type: "array",
          minItems: LEARN_MORE_LEVEL_CARD_COUNT,
          maxItems: LEARN_MORE_LEVEL_CARD_COUNT,
          items: CARD_SCHEMA,
        },
      },
    },
    unlock_mastery_level: {
      type: "object",
      additionalProperties: false,
      required: ["title", "cards"],
      properties: {
        title: { type: "string" },
        cards: {
          type: "array",
          minItems: UNLOCK_MASTERY_LEVEL_CARD_COUNT,
          maxItems: UNLOCK_MASTERY_LEVEL_CARD_COUNT,
          items: CARD_SCHEMA,
        },
      },
    },
  },
} as const;

/* ---------------------------------------------
   DATA STRUCTURES
--------------------------------------------- */
type ReportCard = {
  ai_generated_title: string;
  content: string;
};

type ReportLevel = {
  title: string;
  cards: ReportCard[];
  action_tips: string[];
};

type LearningLevel = {
  title: string;
  cards: ReportCard[];
};

export type ReportSection = {
  section_title: string;
  report_level: ReportLevel;
  learn_more_level: LearningLevel;
  unlock_mastery_level: LearningLevel;
};

export type ReportPlan = FameMetrics & {
  sections: ReportSection[];
};

const PLACEHOLDER_TEXT = "Content is generating...";
const NORMALIZED_PLACEHOLDER = PLACEHOLDER_TEXT.toLowerCase();

function isPlaceholderContent(value: string | undefined | null): boolean {
  if (typeof value !== "string") return true;
  const trimmed = value.trim();
  if (!trimmed) return true;
  return trimmed.toLowerCase() === NORMALIZED_PLACEHOLDER;
}

function enforceCardCount(
  cards: ReportCard[] | undefined,
  count: number,
): ReportCard[] {
  const safeCards = Array.isArray(cards) ? cards : [];
  return Array.from({ length: count }, (_, index) => {
    const candidate = safeCards[index];
    const title =
      typeof candidate?.ai_generated_title === "string" && candidate.ai_generated_title.trim().length
        ? candidate.ai_generated_title.trim()
        : `Insight ${index + 1}`;
    const content =
      typeof candidate?.content === "string" && candidate.content.trim().length
        ? candidate.content.trim()
        : PLACEHOLDER_TEXT;
    return {
      ai_generated_title: title,
      content,
    };
  });
}

function enforceActionTips(tips: string[] | undefined): string[] {
  if (!Array.isArray(tips)) {
    return Array(5).fill(PLACEHOLDER_TEXT);
  }
  const cleaned = tips
    .map((tip) => (typeof tip === "string" ? tip.trim() : ""))
    .filter((tip) => tip.length);
  while (cleaned.length < 5) {
    cleaned.push(PLACEHOLDER_TEXT);
  }
  return cleaned.slice(0, 5);
}

function normalizeReportSection(section: ReportSection): ReportSection {
  return {
    ...section,
    report_level: {
      title: section.report_level?.title ?? "Report Level",
      cards: enforceCardCount(section.report_level?.cards, REPORT_LEVEL_CARD_COUNT),
      action_tips: enforceActionTips(section.report_level?.action_tips),
    },
    learn_more_level: {
      title: section.learn_more_level?.title ?? "Learn More",
      cards: enforceCardCount(section.learn_more_level?.cards, LEARN_MORE_LEVEL_CARD_COUNT),
    },
    unlock_mastery_level: {
      title: section.unlock_mastery_level?.title ?? "Unlock Mastery",
      cards: enforceCardCount(section.unlock_mastery_level?.cards, UNLOCK_MASTERY_LEVEL_CARD_COUNT),
    },
  };
}

type SectionValidationResult = { valid: true } | { valid: false; reason: string };

function normalizeRawCard(
  card: unknown,
  fallbackPrefix: string,
  index: number,
): ReportCard | null {
  if (typeof card === "string") {
    const content = card.trim();
    if (!content) return null;
    return {
      ai_generated_title: `${fallbackPrefix} Insight ${index + 1}`,
      content,
    };
  }
  if (typeof card === "object" && card !== null) {
    const rawTitle = (card as { ai_generated_title?: string; title?: string }).ai_generated_title
      ?? (card as { ai_generated_title?: string; title?: string }).title
      ?? "";
    const rawContent = (card as { content?: string; body?: string }).content
      ?? (card as { content?: string; body?: string }).body
      ?? "";
    const content = typeof rawContent === "string" ? rawContent.trim() : "";
    if (!content) return null;
    const title = typeof rawTitle === "string" && rawTitle.trim().length
      ? rawTitle.trim()
      : `${fallbackPrefix} Insight ${index + 1}`;
    return { ai_generated_title: title, content };
  }
  return null;
}

function normalizeRawCardArray(
  input: unknown,
  fallbackPrefix: string,
): ReportCard[] {
  if (!Array.isArray(input)) return [];
  const normalized: ReportCard[] = [];
  input.forEach((entry, idx) => {
    const card = normalizeRawCard(entry, fallbackPrefix, idx);
    if (card) normalized.push(card);
  });
  return normalized;
}

function validateRawSectionContent(section: Partial<ReportSection>): SectionValidationResult {
  const reportLevel = section.report_level;
  if (!reportLevel) return { valid: false, reason: "missing report_level" };
  const learnLevel = section.learn_more_level;
  if (!learnLevel) return { valid: false, reason: "missing learn_more_level" };
  const masteryLevel = section.unlock_mastery_level;
  if (!masteryLevel) return { valid: false, reason: "missing unlock_mastery_level" };

  const reportCards = Array.isArray(reportLevel.cards) ? reportLevel.cards : [];
  if (reportCards.length < REPORT_LEVEL_CARD_COUNT) {
    return { valid: false, reason: `report_level cards < ${REPORT_LEVEL_CARD_COUNT}` };
  }
  if (reportCards.some((card) => !card?.content || isPlaceholderContent(card.content))) {
    return { valid: false, reason: "report_level card missing content" };
  }

  const learnCards = Array.isArray(learnLevel.cards) ? learnLevel.cards : [];
  if (learnCards.length < LEARN_MORE_LEVEL_CARD_COUNT) {
    return { valid: false, reason: `learn_more_level cards < ${LEARN_MORE_LEVEL_CARD_COUNT}` };
  }
  if (learnCards.some((card) => !card?.content || isPlaceholderContent(card.content))) {
    return { valid: false, reason: "learn_more_level card missing content" };
  }

  const masteryCards = Array.isArray(masteryLevel.cards) ? masteryLevel.cards : [];
  if (masteryCards.length < UNLOCK_MASTERY_LEVEL_CARD_COUNT) {
    return { valid: false, reason: `unlock_mastery_level cards < ${UNLOCK_MASTERY_LEVEL_CARD_COUNT}` };
  }
  if (masteryCards.some((card) => !card?.content || isPlaceholderContent(card.content))) {
    return { valid: false, reason: "unlock_mastery_level card missing content" };
  }

  const actionTips = Array.isArray(reportLevel.action_tips) ? reportLevel.action_tips : [];
  if (actionTips.length < 5) {
    return { valid: false, reason: "action_tips < 5" };
  }
  if (actionTips.some((tip) => !tip || isPlaceholderContent(tip))) {
    return { valid: false, reason: "action_tips missing content" };
  }

  return { valid: true };
}

/* ---------------------------------------------
   BOOK INTEGRATION PROMPT (RAG REFERENCE)
--------------------------------------------- */
const SECTION_FOCUS_PROMPTS: Record<SectionTitle, string> = {
  "Main Problem | First Advice": `Diagnose the loudest blocker using the user’s own language. Blend imperfectionism coaching, StoryBrand clarity, hook psychology, and worst-case planning to deliver an immediate mindset unlock.`,
  "Imperfectionism | Execution": `Teach mini-habit systems, binary shipped/not-shipped scoring, 70% quality thresholds, permission slips, and mistake quotas so consistency feels doable.`,
  "Niche | Focus Discovery": `Clarify what they are uniquely good at, map problems they solve, outline value ladders, and translate ideas into platform-native formats while preserving authenticity.`,
  "Personal Brand Development": `Engineer visual + verbal identity, content pillars, brand story arcs, distinctive assets, and guide positioning (empathy + authority) for consistent experiences across touchpoints.`,
  "Marketing Strategy": `Design omnichannel narratives, hook ladders, funnel stages, value-first sequencing, and measurement cadences that prioritize leverage.`,
  "Platform Organization & Systems": `Detail batching, editing workflows, content calendars, atomization flows, engagement rituals, tooling, and analytics habits that keep publishing effortless.`,
  "Mental Health & Sustainability": `Address comparison spirals, burnout cycles, criticism hygiene, boundary drift, energy management, relapse planning, and support systems.`,
  "Advanced Marketing Types & Case Studies": `Break down celebrity consistency (Cardi B), corporate omnipresence (McDonald’s), luxury scarcity (SKIMS), viral triggers, community plays, influencer collaborations, UGC, and cross-platform orchestration.`,
  "Monetization Strategies": `Pinpoint current revenue leaks, reframe the creator’s money mindset, and architect 5-7 income streams (digital products, affiliates, memberships, courses, consulting, retainers). Map recommendations to their monetization stage, capacity, and platform strengths while suggesting concrete offers, pricing experiments, and tracking habits.`,
};

const SECTION_OUTPUT_TEMPLATE = `Example JSON (structure must match exactly):
{
  "section_title": "Section Name",
  "report_level": {
    "title": "Why This Matters",
    "cards": [
      { "ai_generated_title": "Insight 1", "content": "80-120 word paragraph." },
      { "ai_generated_title": "Insight 2", "content": "..." },
      { "ai_generated_title": "Insight 3", "content": "..." },
      { "ai_generated_title": "Insight 4", "content": "..." },
      { "ai_generated_title": "Insight 5", "content": "..." }
    ],
    "action_tips": [
      "Tip 1",
      "Tip 2",
      "Tip 3",
      "Tip 4",
      "Tip 5"
    ]
  },
  "learn_more_level": {
    "title": "How To Practice",
    "cards": [
      { "ai_generated_title": "Deep Dive 1", "content": "..." },
      { "ai_generated_title": "Deep Dive 2", "content": "..." },
      { "ai_generated_title": "Deep Dive 3", "content": "..." },
      { "ai_generated_title": "Deep Dive 4", "content": "..." },
      { "ai_generated_title": "Deep Dive 5", "content": "..." },
      { "ai_generated_title": "Deep Dive 6", "content": "..." }
    ]
  },
  "unlock_mastery_level": {
    "title": "Strategy",
    "cards": [
      { "ai_generated_title": "Mastery 1", "content": "..." },
      { "ai_generated_title": "Mastery 2", "content": "..." },
      { "ai_generated_title": "Mastery 3", "content": "..." },
      { "ai_generated_title": "Mastery 4", "content": "..." },
      { "ai_generated_title": "Mastery 5", "content": "..." },
      { "ai_generated_title": "Mastery 6", "content": "..." }
    ]
  }
}`;



/* ---------------------------------------------
   SMART SYSTEM PROMPT BUILDER
--------------------------------------------- */

const CACHE_PATH = path.resolve(process.cwd(), "promptCache.json");
const PROMPT_CACHE: Record<string, string> = fs.existsSync(CACHE_PATH)
  ? JSON.parse(fs.readFileSync(CACHE_PATH, "utf-8"))
  : {};

function getCachedPrompt(key: string, fallback: string): string {
  if (typeof PROMPT_CACHE[key] === "string") {
    return PROMPT_CACHE[key];
  }
  return fallback.slice(0, 1200);
}

function buildSystemPrompt(): string {
  return `
You are a world-class marketing strategist who builds 3-level learning reports.

──────────────────────────────
REFERENCE MATERIALS
──────────────────────────────
[CORE_PROMPT]
${getCachedPrompt("CORE_PROMPT", CORE_PROMPT)}

[RAG_RULES]
${getCachedPrompt("RAG_RULES", RAG_RULES)}

[USER_SEGMENTATION_RULES]
${getCachedPrompt("USER_SEGMENTATION_RULES", USER_SEGMENTATION_RULES)}

[COMMUNICATION_STYLE_RULES]
${getCachedPrompt("COMMUNICATION_STYLE_RULES", COMMUNICATION_STYLE_RULES)}

[THREE_LEVEL_ARCHITECTURE_PROMPT]
${getCachedPrompt("THREE_LEVEL_ARCHITECTURE_PROMPT", THREE_LEVEL_ARCHITECTURE_PROMPT)}

[REPORT_CONTEXT]
${getCachedPrompt("REPORT_CONTEXT", REPORT_CONTEXT)}

──────────────────────────────
OUTPUT SPEC
──────────────────────────────
Return ONLY valid JSON matching schema { section_title, report_level, learn_more_level, unlock_mastery_level }.
Tone: smart friend, empathetic, strategic.
400–600 words total.
Report = WHY, Learn More = HOW, Mastery = STRATEGY.
No markdown, no commentary.
`;
}

export const SYSTEM_PROMPT = buildSystemPrompt();
console.info(`[report] SYSTEM_PROMPT length: ${SYSTEM_PROMPT.length}`);

/* ---------------------------------------------
   SANITIZATION HELPERS
--------------------------------------------- */
function buildBaseReport(metrics: FameMetrics): ReportPlan {
  return { ...metrics, sections: [] };
}

const CANDIDATE_STRING_KEYS = ["text", "content", "value", "body", "summary", "description", "tip", "message"];

function extractStringValue(
  source: unknown,
  extraKeys: string[] = [],
): string {
  if (typeof source === "string") return source.trim();
  if (Array.isArray(source)) {
    for (const entry of source) {
      const value = extractStringValue(entry, extraKeys);
      if (value) return value;
    }
    return "";
  }
  if (typeof source === "object" && source !== null) {
    const keysToCheck = [...extraKeys, ...CANDIDATE_STRING_KEYS];
    for (const key of keysToCheck) {
      const value = extractStringValue((source as Record<string, unknown>)[key], extraKeys);
      if (value) return value;
    }
  }
  return "";
}

function sanitizeContent(content: unknown): string {
  const extracted = extractStringValue(content);
  if (!extracted) return PLACEHOLDER_TEXT;
  const words = extracted.split(/\s+/);
  return words.length > 600 ? words.slice(0, 600).join(" ") : extracted;
}

function stripLeadingIndex(text: string): string {
  const trimmed = text.trimStart();
  const punct = trimmed.match(/^(\d+)([.)\-:])\s*/);
  if (punct) return trimmed.slice(punct[0].length);
  const space = trimmed.match(/^(\d+)\s+/);
  return space ? trimmed.slice(space[0].length) : trimmed;
}

function sanitizeList(input: unknown, max: number): string[] {
  if (!Array.isArray(input)) return [];
  const cleaned: string[] = [];
  for (const value of input) {
    const raw = extractStringValue(value);
    if (!raw) continue;
    const stripped = stripLeadingIndex(raw).trim();
    if (stripped) cleaned.push(stripped);
    if (cleaned.length >= max) break;
  }
  return cleaned;
}

function sanitizeActionTips(input: unknown): string[] {
  const tips = sanitizeList(input, 5);
  while (tips.length < 5) {
    tips.push(PLACEHOLDER_TEXT);
  }
  return tips;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function sanitizeCardSet(
  input: unknown,
  expectedCount: number,
): ReportCard[] {
  const rawCards = Array.isArray(input) ? input : [];
  return Array.from({ length: expectedCount }, (_, index) => {
    const candidate = rawCards[index];
    const candidateRecord = isRecord(candidate) ? candidate : undefined;
    const titleKeys = [
      "ai_generated_title",
      "aiGeneratedTitle",
      "ai_title",
      "card_title",
      "aiTitle",
      "title",
      "heading",
      "name",
    ];
    const contentKeys = [
      "content",
      "body",
      "text",
      "summary",
      "explanation",
      "details",
    ];
    const aiTitleValue = extractStringValue(candidateRecord, titleKeys);
    const sanitizedTitle = aiTitleValue.length ? aiTitleValue : `Insight ${index + 1}`;
    const contentSource = candidateRecord ?? candidate;
    const sanitizedContent = sanitizeContent(isRecord(contentSource) ? extractStringValue(contentSource, contentKeys) : contentSource);
    return {
      ai_generated_title: sanitizedTitle,
      content: sanitizedContent,
    };
  });
}

function sanitizeReportLevel(input: unknown, fallbackTitle = "Report Level"): ReportLevel {
  const raw = isRecord(input) ? input : {};
  const title = typeof raw.title === "string" && raw.title.trim().length
    ? raw.title.trim()
    : fallbackTitle;
  const cards = sanitizeCardSet(raw.cards, REPORT_LEVEL_CARD_COUNT);
  const actionTips = sanitizeActionTips(raw.action_tips);
  return { title, cards, action_tips: actionTips };
}

function sanitizeLearningLevel(
  input: unknown,
  fallbackTitle: string,
  expectedCount: number,
): LearningLevel {
  const raw = isRecord(input) ? input : {};
  const title = typeof raw.title === "string" && raw.title.trim().length
    ? raw.title.trim()
    : fallbackTitle;
  const cards = sanitizeCardSet(raw.cards, expectedCount);
  return { title, cards };
}

function createPlaceholderCards(count: number): ReportCard[] {
  return Array.from({ length: count }, (_, index) => ({
    ai_generated_title: `Insight ${index + 1}`,
    content: PLACEHOLDER_TEXT,
  }));
}

function createEmptySectionPayload(sectionTitle: SectionTitle | string): ReportSection {
  const normalizedTitle = typeof sectionTitle === "string" ? sectionTitle : sectionTitle;
  return {
    section_title: normalizedTitle,
    report_level: {
      title: "Report Level",
      cards: createPlaceholderCards(REPORT_LEVEL_CARD_COUNT),
      action_tips: Array(5).fill("Content is generating..."),
    },
    learn_more_level: {
      title: "Learn More",
      cards: createPlaceholderCards(LEARN_MORE_LEVEL_CARD_COUNT),
    },
    unlock_mastery_level: {
      title: "Unlock Mastery",
      cards: createPlaceholderCards(UNLOCK_MASTERY_LEVEL_CARD_COUNT),
    },
  };
}

/* ---------------------------------------------
   REPORT GENERATION FLOW
--------------------------------------------- */
function extractJsonBlock(text: string): string | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  return start === -1 || end === -1 || end <= start ? null : text.slice(start, end + 1);
}

function sanitizeJsonString(payload: string): string {
  return payload
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
}

function normalizeSmartQuotes(input: string): string {
  return input.replace(/[\u201C\u201D]/g, '"').replace(/[\u2018\u2019]/g, "'");
}

function stripTrailingCommas(input: string): string {
  return input.replace(/,\s*(\}|\])/g, "$1");
}

function convertSingleQuotedKeys(input: string): string {
  return input.replace(/([{,]\s*)'([^'"\r\n]+?)'\s*:/g, (match, prefix, key) => {
    const escapedKey = key.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    return `${prefix}"${escapedKey}":`;
  });
}

function escapeBareNewlines(input: string): string {
  let result = "";
  let inString = false;
  let escape = false;
  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    if (char === '"' && !escape) {
      inString = !inString;
    }
    if (inString && (char === "\n" || char === "\r")) {
      if (char === "\r" && input[i + 1] === "\n") {
        i += 1;
      }
      result += "\\n";
      escape = false;
      continue;
    }
    if (char !== "\r") {
      result += char;
    }
    escape = char === "\\" && !escape;
  }
  return result;
}

function escapeDanglingQuotes(input: string): string {
  let result = "";
  let inString = false;
  let escape = false;
  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    if (char === '"' && !escape) {
      if (!inString) {
        inString = true;
        result += char;
      } else {
        let j = i + 1;
        while (j < input.length && /\s/.test(input[j])) j += 1;
        const next = j < input.length ? input[j] : undefined;
        if (next === "," || next === "}" || next === "]" || next === ":" || next === undefined) {
          inString = false;
          result += char;
        } else {
          result += '\\"';
          continue;
        }
      }
      escape = false;
      continue;
    }
    result += char;
    escape = !escape && char === "\\";
  }
  return result;
}

function quotePropertyAtPosition(input: string, position: number): string | null {
  if (Number.isNaN(position) || position < 0 || position >= input.length) {
    return null;
  }
  let start = position;
  while (start < input.length && /\s/.test(input[start])) start += 1;
  if (start >= input.length) return null;
  if (input[start] === '"') return null;
  let end = start;
  while (end < input.length && !/[\s:]/.test(input[end])) end += 1;
  if (end <= start) return null;
  let colonIndex = end;
  while (colonIndex < input.length && /\s/.test(input[colonIndex])) colonIndex += 1;
  if (colonIndex >= input.length || input[colonIndex] !== ":") return null;
  const key = input.slice(start, end);
  if (!/^[\w\-]+$/.test(key)) return null;
  const escaped = key.replace(/"/g, '\\"');
  return `${input.slice(0, start)}"${escaped}"${input.slice(colonIndex)}`;
}

function normalizeBracketPairs(input: string): string {
  const stack: string[] = [];
  let result = "";
  let inString = false;
  let escape = false;

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    result += char;

    if (char === '"' && !escape) {
      inString = !inString;
    }
    escape = !escape && char === "\\";
    if (inString) continue;

    if (char === "{" || char === "[") {
      stack.push(char);
      continue;
    }

    if (char === "}" || char === "]") {
      const expected = char === "}" ? "{" : "[";
      if (stack.length === 0) {
        result = result.slice(0, -1);
        continue;
      }
      while (stack.length && stack[stack.length - 1] !== expected) {
        const missing = stack.pop();
        if (!missing) break;
        result += missing === "{" ? "}" : "]";
      }
      if (!stack.length) {
        result = result.slice(0, -1);
        continue;
      }
      stack.pop();
    }
  }

  while (stack.length) {
    const missing = stack.pop();
    result += missing === "{" ? "}" : "]";
  }

  return result;
}

function reduceDuplicateCommas(input: string): string {
  return input.replace(/,,+/g, ",");
}

function quoteUnquotedKeys(input: string): string {
  return input.replace(/([{,]\s*)([A-Za-z0-9_\-]+)\s*:/g, (match, prefix, key) => {
    if (key.startsWith('"')) return match;
    return `${prefix}"${key}":`;
  });
}

function insertMissingCommas(input: string): string {
  let result = "";
  let inString = false;

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    const prev = input[i - 1];

    result += char;

    if (char === '"' && prev !== "\\") {
      inString = !inString;
      if (!inString) {
        let j = i + 1;
        while (j < input.length && /\s/.test(input[j])) j += 1;
        if (j < input.length && input[j] === '"') {
          result += ",";
        }
      }
      continue;
    }

    if (inString) continue;

    if (char === "}") {
      let j = i + 1;
      while (j < input.length && /\s/.test(input[j])) j += 1;
      if (j < input.length && input[j] === "{") {
        result += ",";
      }
    }
  }

  return result;
}

function parseErrorPosition(message: string | undefined): number | null {
  if (!message) return null;
  const match = message.match(/position\s+(\d+)/i);
  if (!match) return null;
  const value = Number.parseInt(match[1], 10);
  return Number.isFinite(value) ? value : null;
}

function repairJsonFromError(attempt: string, error: unknown): string | null {
  if (!(error instanceof SyntaxError)) return null;
  const position = parseErrorPosition(error.message);
  if (position == null || position <= 0 || position >= attempt.length) {
    return null;
  }
  const message = error.message ?? "";
  if (
    /Expected\s+','\s+or\s+'\]/i.test(message) ||
    /Expected\s+','\s+or\s+'\}/i.test(message) ||
    /Unexpected string/i.test(message)
  ) {
    return `${attempt.slice(0, position)},${attempt.slice(position)}`;
  }
  if (/double-quoted property name/i.test(message)) {
    return quotePropertyAtPosition(attempt, position);
  }
  return null;
}

function parseSectionJson(text: string): Partial<ReportSection> {
  const seen = new Set<string>();
  const queue: string[] = [];
  const addAttempt = (value: string | null | undefined) => {
    if (!value) return;
    const trimmed = value.trim();
    if (!trimmed.length) return;
    if (seen.has(trimmed)) return;
    seen.add(trimmed);
    queue.push(trimmed);
  };

  const sanitized = sanitizeJsonString(text);
  addAttempt(sanitized);

  const normalizedQuotes = normalizeSmartQuotes(sanitized);
  addAttempt(normalizedQuotes);

  const singleQuotedKeys = convertSingleQuotedKeys(normalizedQuotes);
  addAttempt(singleQuotedKeys);

  const noTrailingCommas = stripTrailingCommas(singleQuotedKeys);
  addAttempt(noTrailingCommas);

  const dedupedCommas = reduceDuplicateCommas(noTrailingCommas);
  addAttempt(dedupedCommas);

  const quotedKeys = quoteUnquotedKeys(dedupedCommas);
  addAttempt(quotedKeys);

  const insertedCommas = insertMissingCommas(quotedKeys);
  addAttempt(insertedCommas);

  const escapedNewlines = escapeBareNewlines(insertedCommas);
  addAttempt(escapedNewlines);

  const escapedQuotes = escapeDanglingQuotes(escapedNewlines);
  addAttempt(escapedQuotes);

  const normalizedBrackets = normalizeBracketPairs(escapedQuotes);
  addAttempt(normalizedBrackets);

  let lastError: unknown;
  while (queue.length) {
    const attempt = queue.shift()!;
    try {
      return JSON.parse(attempt) as Partial<ReportSection>;
    } catch (error) {
      lastError = error;
      const repaired = repairJsonFromError(attempt, error);
      if (repaired) {
        addAttempt(repaired);
        continue;
      }
      try {
        const repairedJson = jsonrepair(attempt);
        return JSON.parse(repairedJson) as Partial<ReportSection>;
      } catch (repairError) {
        lastError = repairError;
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Failed to parse section JSON");
}

function hasMeaningfulContent(cards: ReportCard[]): boolean {
  return cards.some((card) => card.content.trim().toLowerCase() !== "content is generating...");
}

function isSectionComplete(section: ReportSection | undefined | null): boolean {
  if (!section) return false;
  const { report_level: reportLevel, learn_more_level: learnMoreLevel, unlock_mastery_level: masteryLevel } = section;
  if (!reportLevel || !learnMoreLevel || !masteryLevel) return false;
  if (reportLevel.cards.length !== REPORT_LEVEL_CARD_COUNT) return false;
  if (learnMoreLevel.cards.length !== LEARN_MORE_LEVEL_CARD_COUNT) return false;
  if (masteryLevel.cards.length !== UNLOCK_MASTERY_LEVEL_CARD_COUNT) return false;
  if (!Array.isArray(reportLevel.action_tips) || reportLevel.action_tips.length < 5) return false;
  return (
    hasMeaningfulContent(reportLevel.cards) &&
    hasMeaningfulContent(learnMoreLevel.cards) &&
    hasMeaningfulContent(masteryLevel.cards)
  );
}

type SupabaseAdminClient = ReturnType<typeof supabaseAdmin>;

async function logReportEvent(admin: SupabaseAdminClient, userId: string, eventType: string, details?: Record<string, unknown> | string) {
  try {
    const payload: Record<string, unknown> = { user_id: userId, event_type: eventType, created_at: new Date().toISOString() };
    if (typeof details === "string") payload.details = details;
    else if (details) payload.details = JSON.stringify(details);
    await admin.from("report_generation_events").insert(payload);
  } catch (error) {
    console.warn("Failed to log report event", eventType, error);
  }
}

async function saveReport(admin: SupabaseAdminClient, userId: string, plan: ReportPlan): Promise<void> {
  const payload = { user_id: userId, plan, fame_score: plan.fame_score, updated_at: new Date().toISOString() };
  const { error } = await admin.from("reports").upsert(payload, { onConflict: "user_id" });
  if (error) throw error;
}

async function fetchExistingPlan(admin: SupabaseAdminClient, userId: string): Promise<ReportPlan | null> {
  const { data, error } = await admin.from("reports").select("plan").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  if (!data?.plan) return null;
  const plan = data.plan as ReportPlan;
  if (!Array.isArray(plan.sections)) {
    plan.sections = [];
  } else {
    plan.sections = plan.sections.map((section) => normalizeReportSection(section));
  }
  return plan;
}

/* ---------------------------------------------
   SECTION GENERATION
--------------------------------------------- */
function buildSectionPrompt(title: SectionTitle, answers: Record<string, unknown>, metrics: FameMetrics): string {
  const serializedAnswers = JSON.stringify(answers, null, 2);
  const serializedMetrics = JSON.stringify(metrics, null, 2);
  const sectionFocus = SECTION_FOCUS_PROMPTS[title] ?? "";
  const monetizationDirective =
    title === "Monetization Strategies"
      ? `
Specific requirements for this section:
- Translate the onboarding answers (niche, audience size, growth stage, constraints, revenue goals) into monetization paths.
- Mirror the UX structure: cards such as "Revenue Roadblocks", "The Money Mindset", "Multiple Revenue Streams", plus two cards that deliver platform-specific offer ideas and validation loops.
- Report-level action tips must cover: launch a $7–$27 digital product, activate 5 affiliate partnerships, test a membership or Patreon tier, pre-sell a signature workshop/course, and build a monetization tracking spreadsheet.
- Learn-more content should include a paragraph on why monetization serves the audience, five action steps (audit current income, survey demand, research affiliates, outline a product, set up tracking), and three mindset tips (1,000 engaged fans is enough; selling = serving; passive income = stability).
- Unlock-mastery cards need to introduce the Revenue Diversification Matrix, Value Ladder strategy, pricing psychology, evergreen funnels, premium positioning, troubleshooting for low sales/mindset issues, and long-term planning (multiple revenue engines, product ecosystems, exit optionality).
- Every recommendation should reference the user’s monetization stage (Foundation, Testing, Optimization, Expansion) and the platforms/offers they already use.
`
      : "";
  return `Generate the section titled "${title}".
Section-specific focus:
${sectionFocus}

User onboarding responses:
${serializedAnswers}

Current metrics:
${serializedMetrics}

${monetizationDirective}

STRICT COMPLETENESS RULES
- Report Level MUST include exactly 5 cards AND 5 detailed action_tips.
- Learn More Level MUST include exactly 6 cards.
- Unlock Mastery Level MUST include exactly 6 cards.
- Every card must be 80-120 words of complete prose (no placeholders, no fragments). Each card MUST be a JSON object with "ai_generated_title" and "content" keys—never raw strings.
- Every action tip must be a concrete, single-sentence directive (no placeholders).
- No card or action tip may restate the same recommendation as another; every insight must be uniquely worded and cover a distinct angle.
- Never omit cards or tips; infer specifics when needed rather than leaving blanks.

${SECTION_OUTPUT_TEMPLATE}

Return JSON only using the structure defined in SYSTEM_PROMPT.`;
}

async function generateSection(admin: SupabaseAdminClient, userId: string, title: SectionTitle, answers: Record<string, unknown>, metrics: FameMetrics): Promise<ReportSection> {
  const basePrompt = buildSectionPrompt(title, answers, metrics);
  const sectionStart = Date.now();

  if (!isClaudeAvailable && !isGeminiAvailable) {
    await logReportEvent(admin, userId, "llm_unavailable", { section: title });
    return createEmptySectionPayload(title);
  }

  type ProviderExecutor = (overridePrompt?: string) => Promise<{ text: string; provider: "claude" }>;

  const tryClaude = async (): Promise<ProviderExecutor | null> => {
    if (!isClaudeAvailable) return null;
    const execute: ProviderExecutor = async (overridePrompt) => {
      const text = await callClaudeJson({
        system: SYSTEM_PROMPT,
        prompt: overridePrompt ?? basePrompt,
        maxTokens: 5800,
        temperature: 0.3,
      });
      return { text, provider: "claude" as const };
    };
    return execute;
  };

  const tryGemini = async (): Promise<ProviderExecutor | null> => {
    if (!isGeminiAvailable) return null;
    return null;
  };

  const providers = [tryClaude, tryGemini];
  const errors: unknown[] = [];
  const MAX_PROVIDER_ATTEMPTS = 5;

  for (const provider of providers) {
    const executor = await provider();
    if (!executor) continue;
    const providerName = provider === tryClaude ? "claude" : "gemini";
    let attemptPrompt = basePrompt;
    for (let attempt = 1; attempt <= MAX_PROVIDER_ATTEMPTS; attempt += 1) {
      let rawText: string | null = null;
      try {
        console.info(`[report] section "${title}" attempt ${attempt} requesting ${providerName}`);
        const result = await executor(attempt === 1 ? basePrompt : attemptPrompt);
        rawText = result.text;
        const json = extractJsonBlock(rawText) ?? rawText;
        const parsed = parseSectionJson(json);
        const sectionTitle = typeof parsed.section_title === "string" && parsed.section_title.trim().length
          ? parsed.section_title.trim()
          : title;
        const normalizedReportCards = normalizeRawCardArray(
          (parsed.report_level as { cards?: unknown })?.cards,
          `${sectionTitle} Report`,
        );
        const normalizedLearnCards = normalizeRawCardArray(
          (parsed.learn_more_level as { cards?: unknown })?.cards,
          `${sectionTitle} Learn More`,
        );
        const normalizedMasteryCards = normalizeRawCardArray(
          (parsed.unlock_mastery_level as { cards?: unknown })?.cards,
          `${sectionTitle} Mastery`,
        );
        if (parsed.report_level) {
          (parsed.report_level as ReportLevel).cards = normalizedReportCards;
        }
        if (parsed.learn_more_level) {
          (parsed.learn_more_level as LearningLevel).cards = normalizedLearnCards;
        }
        if (parsed.unlock_mastery_level) {
          (parsed.unlock_mastery_level as LearningLevel).cards = normalizedMasteryCards;
        }
        const rawValidation = validateRawSectionContent({
          section_title: sectionTitle,
          report_level: parsed.report_level as ReportLevel,
          learn_more_level: parsed.learn_more_level as LearningLevel,
          unlock_mastery_level: parsed.unlock_mastery_level as LearningLevel,
        });
        if (!rawValidation.valid) {
          console.warn(
            `[report] section "${title}" via ${result.provider} attempt ${attempt} incomplete (${rawValidation.reason}); retrying`,
          );
          const invalidSnippet = json.slice(0, 1500);
          attemptPrompt = `${basePrompt}

IMPORTANT: Your previous response was incomplete (${rawValidation.reason}).
- Report Level must include 5 cards and 5 fully written action tips.
- Learn More Level must include 6 cards.
- Unlock Mastery Level must include 6 cards.
- Every card needs unique content (no placeholders) and complete sentences (80-120 words).
- Rewrite the entire JSON object from scratch, following the schema exactly.

--- Invalid JSON snippet ---
${invalidSnippet}
--- End snippet ---
`;
          continue;
        }
        const reportLevel = sanitizeReportLevel(parsed.report_level, "Report Level");
        const learnMoreLevel = sanitizeLearningLevel(
          parsed.learn_more_level,
          "Learn More",
          LEARN_MORE_LEVEL_CARD_COUNT,
        );
        const unlockMasteryLevel = sanitizeLearningLevel(
          parsed.unlock_mastery_level,
          "Unlock Mastery",
          UNLOCK_MASTERY_LEVEL_CARD_COUNT,
        );
        const payload = normalizeReportSection({
          section_title: sectionTitle,
          report_level: reportLevel,
          learn_more_level: learnMoreLevel,
          unlock_mastery_level: unlockMasteryLevel,
        });
        const sectionDuration = ((Date.now() - sectionStart) / 1000).toFixed(1);
        console.info(
          `[report] section "${title}" generated via ${result.provider} (attempt ${attempt}) in ${sectionDuration}s`,
        );
        return payload;
      } catch (error) {
        errors.push(error);
        await logReportEvent(admin, userId, "section_generation_error", {
          section: title,
          message: String(error),
        });
        if (error instanceof SyntaxError) {
          const sanitized = sanitizeJsonString(extractJsonBlock(rawText ?? "") ?? rawText ?? "");
          const snippet = sanitized.slice(0, 1500);
          console.warn(`[report] failed to parse section "${title}" attempt ${attempt}`, {
            provider: providerName,
            message: error.message,
            snippet,
          });
          attemptPrompt = `${basePrompt}

IMPORTANT: Your previous response was INVALID JSON (${error.message}).
- Output ONLY valid JSON matching the schema example.
- Arrays must have exact card counts (Report 5, Learn More 6, Unlock Mastery 6).
- Use double quotes around every key/value. No trailing commas.
- Each "ai_generated_title" must be unique and should feel like a real headline (never reuse placeholder phrases).
- Rewrite from scratch; do not copy the malformed structure below.

--- Invalid payload snippet ---
${snippet}
--- End snippet ---
`;
        }
        continue;
      }
    }
  }

  const failedDuration = ((Date.now() - sectionStart) / 1000).toFixed(1);
  console.warn(
    `[report] section "${title}" fell back to placeholder after errors in ${failedDuration}s`,
    errors,
  );
  await logReportEvent(admin, userId, "section_generation_failed", { section: title, errors });
  return createEmptySectionPayload(title);
}

/* ---------------------------------------------
   REPORT FLOW
--------------------------------------------- */
function ensureSectionOrder(sections: ReportSection[]): ReportSection[] {
  const map = new Map<string, ReportSection>();
  for (const section of sections) {
    if (section?.section_title) {
      map.set(section.section_title, section);
    }
  }
  return SECTION_TITLES.map((title) => map.get(title) ?? createEmptySectionPayload(title));
}

function countCompletedSections(sections: ReportSection[]): number {
  return sections.filter(isSectionComplete).length;
}

export async function generateReportForUser(userId: string): Promise<ReportPlan> {
  if (!userId) throw new Error("User ID is required to generate report");
  const reportStart = Date.now();

  const admin = supabaseAdmin();
  const { data: onboarding, error: onboardingError } = await admin.from("onboarding_sessions").select("answers").eq("user_id", userId).maybeSingle();
  if (onboardingError) throw onboardingError;
  if (!onboarding?.answers) throw new Error("Onboarding answers not found for user");

  const answers = onboarding.answers as Record<string, unknown>;
  const metrics = computeFameMetrics(answers);

  let report = (await fetchExistingPlan(admin, userId)) ?? buildBaseReport(metrics);
  report.sections = ensureSectionOrder(report.sections);

  await logReportEvent(admin, userId, "report_generation_started", { sections_ready: countCompletedSections(report.sections) });
  await saveReport(admin, userId, report);

  const MAX_GENERATION_ROUNDS = 3;
  for (let round = 1; round <= MAX_GENERATION_ROUNDS; round += 1) {
    for (const title of SECTION_TITLES) {
      const existing = report.sections.find((s) => s.section_title === title);
      if (isSectionComplete(existing)) continue;

      await logReportEvent(admin, userId, "section_generation_started", { section: title, round });
      const generated = await generateSection(admin, userId, title, answers, metrics);
      report.sections = ensureSectionOrder(report.sections.map((s) => (s.section_title === title ? generated : s)));
      await saveReport(admin, userId, report);
      await logReportEvent(admin, userId, "section_generation_completed", {
        section: title,
        round,
        completed_sections: countCompletedSections(report.sections),
      });
    }

    if (report.sections.every(isSectionComplete)) {
      break;
    }
  }

  const completed = countCompletedSections(report.sections);
  if (completed === SECTION_TITLES.length) {
    await logReportEvent(admin, userId, "report_generation_completed", { sections_ready: completed });
  } else {
    await logReportEvent(admin, userId, "report_generation_incomplete", {
      sections_ready: completed,
      missing: SECTION_TITLES.length - completed,
    });
  }
  const totalDuration = ((Date.now() - reportStart) / 1000).toFixed(1);
  console.info(
    `[report] generation finished in ${totalDuration}s (${completed}/${SECTION_TITLES.length} sections ready)`,
  );
  return report;
}
