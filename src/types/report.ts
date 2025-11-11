import type { ReactNode } from 'react';

export type CardIconKey =
  | 'Target'
  | 'Sparkles'
  | 'TrendingUp'
  | 'Rocket'
  | 'Compass'
  | 'Zap'
  | 'User'
  | 'Heart'
  | 'FolderKanban';

export interface SectionCard {
  aiTitle: string;
  content: string;
  icon: CardIconKey;
}

export interface SectionLevelData {
  title: string;
  cards: SectionCard[];
}

export interface ReportLevelData extends SectionLevelData {
  actionTips: string[];
}

export interface SectionData {
  id: number;
  title: string;
  icon: ReactNode;
  accentColor: string;
  reportLevel: ReportLevelData;
  learnMoreLevel: SectionLevelData;
  unlockMasteryLevel: SectionLevelData;
  isPlaceholder?: boolean;
}
