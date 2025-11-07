import { SECTION_TITLES, type ReportPlan, type ReportSection } from "./generate";

type LegacyCard = { title?: string; content?: string };

export type LegacySection = {
  title: ReportSection["section_title"];
  summary: string;
  personalizedSummary?: string;
  personalizedTips?: string[];
  keyInsights?: string[];
  cards?: LegacyCard[];
  learnMoreContent?: {
    description?: string;
    actionSteps?: string[];
    tips?: string[];
  };
  elaborateContent?: {
    overview: string;
    advancedTechniques: {
      title: string;
      items: string[];
    };
    troubleshooting: {
      title: string;
      items: string[];
    };
    longTermStrategy: {
      title: string;
      items: string[];
    };
    expertResources?: string[];
  };
  accentColor?: string;
};

export type LegacyPlan = LegacySection[];

const PLACEHOLDER_SUMMARY = "Content is generating...";

function getActionTips(section?: ReportSection | null): string[] | undefined {
  const tips = section?.report_level?.action_tips;
  if (!tips?.length) return undefined;
  return [...tips];
}

function combineCardContent(cards?: Array<{ content: string }>): string {
  if (!cards?.length) return PLACEHOLDER_SUMMARY;
  const joined = cards
    .map((card) => card.content?.trim())
    .filter((entry): entry is string => Boolean(entry?.length))
    .join(" ")
    .trim();
  return joined || PLACEHOLDER_SUMMARY;
}

function formatSummary(section?: ReportSection | null): string {
  if (!section?.report_level) return PLACEHOLDER_SUMMARY;
  return combineCardContent(section.report_level.cards);
}

function formatLegacyCards(section?: ReportSection | null): LegacyCard[] | undefined {
  const cards = section?.report_level?.cards;
  if (!cards?.length) return undefined;
  return cards.slice(0, 3).map((card) => ({ title: card.ai_generated_title, content: card.content }));
}

function buildLearnMoreContent(
  section?: ReportSection | null,
  fallbackSummary = PLACEHOLDER_SUMMARY,
  fallbackTips?: string[],
): LegacySection["learnMoreContent"] | undefined {
  const cards = section?.learn_more_level?.cards;
  if (!cards?.length) {
    if (!fallbackTips?.length && !fallbackSummary) return undefined;
    return fallbackTips?.length
      ? { description: fallbackSummary, actionSteps: [...fallbackTips], tips: [...fallbackTips] }
      : undefined;
  }

  const description = cards[0]?.content?.trim() || fallbackSummary;
  const actionSteps = cards
    .slice(1, 4)
    .map((card) => card.content?.trim())
    .filter((value): value is string => Boolean(value?.length));
  const tips = cards
    .slice(4)
    .map((card) => card.content?.trim())
    .filter((value): value is string => Boolean(value?.length));

  return {
    description,
    actionSteps: actionSteps.length ? actionSteps : fallbackTips ?? [],
    tips: tips.length ? tips : fallbackTips ?? [],
  };
}

function splitIntoBullets(content?: string, max = 5): string[] {
  if (!content?.trim()) return [];
  const parts = content
    .split(/(?<=[.!?])\s+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
  if (parts.length) return parts.slice(0, max);
  return [content.trim()];
}

function buildMastery(section?: ReportSection | null): LegacySection["elaborateContent"] | undefined {
  const cards = section?.unlock_mastery_level?.cards;
  if (!cards?.length) return undefined;

  const overview = cards[0]?.content?.trim() ?? PLACEHOLDER_SUMMARY;
  const advancedTechniques = {
    title: cards[1]?.ai_generated_title ?? "Advanced Techniques",
    items: splitIntoBullets(cards[1]?.content),
  };
  const troubleshooting = {
    title: cards[3]?.ai_generated_title ?? "Troubleshooting",
    items: splitIntoBullets(cards[3]?.content),
  };
  const longTermStrategy = {
    title: cards[4]?.ai_generated_title ?? "Long-Term Strategy",
    items: splitIntoBullets(cards[4]?.content),
  };
  const expertResources = splitIntoBullets(cards[5]?.content);

  return {
    overview,
    advancedTechniques,
    troubleshooting,
    longTermStrategy,
    expertResources: expertResources.length ? expertResources : undefined,
  };
}

export function reportPlanToLegacy(plan?: ReportPlan | null): LegacyPlan {
  if (!plan) return [];

  const sectionMap = new Map<string, ReportSection>();
  for (const section of plan.sections ?? []) {
    const key = section?.section_title ?? (section as any)?.title;
    if (key) {
      sectionMap.set(key, section);
    }
  }

  return SECTION_TITLES.map((title) => {
    const section = sectionMap.get(title);
    const summary = formatSummary(section);
    const tips = getActionTips(section);

    return {
      title,
      summary,
      personalizedSummary: summary,
      personalizedTips: tips,
      keyInsights: tips,
      cards: formatLegacyCards(section),
      learnMoreContent: buildLearnMoreContent(section, summary, tips),
      elaborateContent: buildMastery(section),
      accentColor: undefined,
    };
  });
}
