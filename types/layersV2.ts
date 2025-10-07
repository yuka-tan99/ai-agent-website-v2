export type Stage = "0-1K" | "1K-10K" | "10K-100K" | "100K+";
export type PersonaType = "creator" | "business" | "artist";
export type Blocker = "fear_of_judgment" | "lack_of_consistency" | "no_niche" | "low_engagement";
export type PlatformKey = "tiktok" | "instagram" | "youtube";

export type QuickTactic = { label: string; how: string };
export type ReportSection = {
  title: string;
  bullets: string[];
  /** Optional rich narrative paragraph returned by the LLM */
  paragraph?: string;
  /** Short summary (often matches LayerGroup.summary) */
  summary?: string;
  /** Canonical add-to-plan tasks from the LLM; mirrored into bullets for UI compatibility */
  addToYourPlan?: string[];
  quickWins?: QuickTactic[];
};
export type DeepDive = {
  context: string;
  framework: { name: string; steps: string[] };
  caseStudies?: { title: string; takeaway: string }[];
  tools?: string[];
};
export type Mastery = {
  sources?: string[];
  advanced?: string[];
  troubleshooting?: { symptom: string; fix: string }[];
  longTerm?: string[];
};
export type LayerGroup = { report: ReportSection; learnMore: DeepDive; elaborate: Mastery; summary?: string };

export type PlatformStrategy = {
  content_type: string;
  posting_frequency: string;
  key_metrics: string;
  growth_hack: string;
};

export type PersonalizationVars = {
  comfort_with_visibility: "low" | "medium" | "high";
  time_availability: "low" | "medium" | "high";
  technical_skill: "low" | "medium" | "high";
  monetization_urgency: "low" | "medium" | "high";
  personality_type: PersonaType;
};

export type LayersV2 = {
  userName?: string;
  stage: Stage;
  primaryPlatform: PlatformKey;
  biggestBlocker: Blocker;
  personalization: PersonalizationVars;
  platformStrategies: Record<PlatformKey, PlatformStrategy>;
  analysis?: {
    persona: string;            // short role + behavior (e.g., "Aspiring YouTuber with perfectionist tendencies")
    primaryObstacle: string;    // must match sections.primaryObstacle.summary
  };
  sections: {
    primaryObstacle: LayerGroup;
    strategicFoundation: LayerGroup;
    personalBrand: LayerGroup;           // personal brand development
    marketingStrategy: LayerGroup;       // marketing strategy development
    platformTactics: LayerGroup;         // platform-specific tactics
    contentExecution: LayerGroup;        // content creation & execution
    mentalHealth: LayerGroup;            // mental health & sustainability
    // Back-compat (legacy keys may still exist in old plans)
    monetizationPath?: LayerGroup;
    successMeasurement?: LayerGroup;
  };
};
