import { SECTION_TITLES, type ReportPlan, type ReportSection } from "./generate";

export type LegacySection = {
  title: ReportSection["title"];
  summary: string;
  personalizedSummary?: string;
  personalizedTips?: string[];
  keyInsights?: string[];
  cards?: Array<{ title?: string; content?: string }>;
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

function defaultActionTips(section?: ReportSection | null): string[] | undefined {
  if (!section?.action_tips?.length) return undefined;
  return [...section.action_tips];
}

export function reportPlanToLegacy(plan?: ReportPlan | null): LegacyPlan {
  if (!plan) return [];

  const sectionMap = new Map<ReportSection["title"], ReportSection>();
  for (const section of plan.sections ?? []) {
    sectionMap.set(section.title, section);
  }

  return SECTION_TITLES.map((title) => {
    const section = sectionMap.get(title);
    const content = section?.content ?? "";
    const tips = defaultActionTips(section);
    const learnMore = section?.learn_more;
    const mastery = section?.elaborate_content;
    const learnMoreDescription = learnMore?.what_you_will_learn?.trim() ?? "";
    const learnMoreActionSteps = learnMore?.action_steps?.length
      ? [...learnMore.action_steps]
      : learnMore
      ? []
      : tips
      ? [...tips]
      : [];
    const learnMoreTips = learnMore?.pro_tips?.length
      ? [...learnMore.pro_tips]
      : learnMore
      ? []
      : tips
      ? [...tips]
      : [];
    const learnMoreContent =
      (learnMoreDescription && learnMoreDescription.length > 0) ||
      learnMoreActionSteps.length ||
      learnMoreTips.length
        ? {
            description: learnMoreDescription.length > 0 ? learnMoreDescription : content,
            actionSteps: learnMoreActionSteps,
            tips: learnMoreTips,
          }
        : undefined;
    return {
      title,
      summary: content,
      personalizedSummary: content,
      personalizedTips: tips,
      keyInsights: tips,
      cards: section?.cards?.map((card) => ({ title: card.title, content: card.content })),
      learnMoreContent,
      elaborateContent: mastery
        ? {
            overview: mastery.overview,
            advancedTechniques: mastery.advancedTechniques,
            troubleshooting: mastery.troubleshooting,
            longTermStrategy: mastery.longTermStrategy,
            expertResources: mastery.expertResources,
          }
        : undefined,
      accentColor: undefined,
    };
  });
}
