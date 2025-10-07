// 1) Keep your current union, add alias "starting" (mapped to 'starting_from_zero')
export type UserStage =
  | 'starting_from_zero'
  | 'starting'              // <-- new alias (maps to 'starting_from_zero')
  | 'early_momentum'
  | 'growing'
  | 'plateauing'
  | 'large_optimizing'
  | 'restart';

// 2) Persona summary (shown once Claude returns it)
export type PersonaSummary = {
  label: string;            // e.g., "Builder-Teacher"
  oneLiner: string;         // short, public-friendly line
  strengths: string[];      // 3 bullets max
  focusAreas: string[];     // 3 bullets max
};

// 3) Stream + readiness
export type ReportSectionId =
  | 'primary_obstacle_resolution'
  | 'strategic_foundation'
  | 'personal_brand_development'
  | 'marketing_strategy_development'
  | 'platform_specific_tactics'
  | 'content_creation_execution'
  | 'mental_health_sustainability';

export type SectionReadiness = Record<ReportSectionId, boolean>;

export type ReportStatus = {
  jobId: string;
  progressPct: number;          // 0–100 (100 means ≥1 section is ready to render)
  stageReady: boolean;
  personaReady: boolean;
  sectionsReady: SectionReadiness;
  error?: string;
};

// 4) Wire up stage mapping while keeping old value
export function normalizeStage(stage: UserStage): Exclude<UserStage,'starting'> {
  return stage === 'starting' ? 'starting_from_zero' : stage;
}

// 5) Persona + Stage envelope
export type ReportHeader = {
  stage?: Exclude<UserStage,'starting'>; // undefined until ready
  persona?: PersonaSummary;              // undefined until ready
};

// 6) Existing types unchanged
export type Metric = { name: string; howToMeasure: string; weeklyTarget: string };

export type UserProfile = {
  userId: string;
  stage: UserStage; // incoming; normalize before saving
  brandType: 'personal' | 'business' | 'artist_luxury' | 'not_sure';
  platforms: Array<'tiktok' | 'instagram' | 'youtube' | 'twitter' | 'linkedin'>;
  blockers: string[];
  timeAvailability: 'low' | 'medium' | 'high';
  comfortWithVisibility: 'low' | 'medium' | 'high';
  technicalSkill: 'beginner' | 'intermediate' | 'advanced';
  monetizationUrgency: 'low' | 'medium' | 'high' | 'scale' | 'none';
  goals: string[];
  personalityType?: string;
};

export type ReportCard = {
  sectionId: ReportSectionId;
  title: string;
  insights: string[];      // 3–5
  quickWins: string[];     // 2–4
  metric: Metric;
  learnMorePayload: {
    profileSnapshot: UserProfile;
    retrievalHints: string[];
    personalizationNotes: string[];
  };
};

export type LessonPack = {
  sectionId: ReportSectionId;
  depthLevel: 2 | 3;
  overview: string;
  frameworks: string[];
  stepByStep: string[];
  templates: { title: string; content: string }[];
  troubleshooting: string[];
  examples: string[];
  checkpoints: string[];
  references: { book: string; sections: string[] }[];

  // depthLevel=3 (Elaborate/Mastery) — optional fields
  advancedTechniques?: string[];     // novel or expert moves
  edgeCases?: string[];              // rare/gnarly scenarios
  failureModes?: string[];           // common ways users fail + fixes
  longTermStrategy?: string[];       // durable, compounding plans
  sourceContextNotes?: string[];     // pulled context from source chunks
};

export type SourceChunk = {
  id: string;
  book: string;
  section: string;
  tags?: string[];
  platforms?: string[];
  problem_types?: string[];
  passage: string;
  weight?: number;
  metadata?: Record<string, any>;
};
