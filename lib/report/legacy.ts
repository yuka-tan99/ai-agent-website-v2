import { SECTION_TITLES, type ReportPlan, type ReportSection } from "./generate";

export type LegacySection = {
  title: ReportSection["title"];
  summary: string;
  personalizedSummary?: string;
  personalizedTips?: string[];
  keyInsights?: string[];
  learnMoreContent?: {
    description?: string;
    actionSteps?: string[];
    tips?: string[];
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
    return {
      title,
      summary: content,
      personalizedSummary: content,
      personalizedTips: tips,
      keyInsights: tips,
      learnMoreContent: tips
        ? {
            description: content,
            actionSteps: tips,
            tips,
          }
        : undefined,
      accentColor: undefined,
    };
  });
}
