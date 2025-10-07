export type LegacySectionKey =
  | 'ai_marketing_psychology'
  | 'foundational_psychology'
  | 'platform_specific_strategies'
  | 'content_strategy'
  | 'posting_frequency'
  | 'metrics_mindset'
  | 'mental_health';

export type LayeredSectionKey =
  | 'primaryObstacle'
  | 'strategicFoundation'
  | 'personalBrand'
  | 'marketingStrategy'
  | 'platformTactics'
  | 'contentExecution'
  | 'mentalHealth';

export const LEGACY_SECTION_FALLBACKS: Record<LegacySectionKey, { summary: string; bullets: string[] }> = {
  ai_marketing_psychology: {
    summary: 'Use simple psychological cues and clarity to make posts easy to understand and share.',
    bullets: [
      'Lead with the outcome in 2 seconds',
      'Use concrete nouns and verbs',
      'Ask one specific question to earn replies',
    ],
  },
  foundational_psychology: {
    summary: 'Build trust and attention by repeating recognizable patterns and showing social proof.',
    bullets: [
      'Pick 3 content pillars',
      'Repeat hooks that already worked',
      'Show quick wins or mini-case studies',
    ],
  },
  platform_specific_strategies: {
    summary: 'Focus on 1–2 platforms you can post on daily; mirror what works there.',
    bullets: [
      'Copy the pacing of top posts',
      'Rework one idea into Shorts/Reels/TikTok',
      'Use captions to add missing context',
    ],
  },
  content_strategy: {
    summary: 'Create repeatable formats so you can ship quickly without losing quality.',
    bullets: [
      'Define 3 formats you can repeat',
      'Keep a swipe file of 20 references',
      'Batch 5 drafts on Sunday',
    ],
  },
  posting_frequency: {
    summary: 'Short, frequent posts beat rare, long ones when you are learning.',
    bullets: [
      'Post 1 small piece daily for 14 days',
      'Review watch-time on the first 2 seconds',
      'Cut slow intros',
    ],
  },
  metrics_mindset: {
    summary: 'Measure inputs you control and study the first moments of attention.',
    bullets: [
      'Track posts/week and 2s retention',
      'Duplicate patterns from winners',
      'Remove low-ROI tasks for a week',
    ],
  },
  mental_health: {
    summary: 'Protect energy; treat each post as an experiment, not a verdict.',
    bullets: [
      'Set a 20-minute publish window',
      'Use templates to reduce friction',
      'Celebrate streaks, not views',
    ],
  },
};

export function isLegacyFallbackSection(key: string, section: any): boolean {
  const profile = LEGACY_SECTION_FALLBACKS[key as LegacySectionKey];
  if (!profile) return false;
  const summary = typeof section?.summary === 'string' ? section.summary.trim() : '';
  const bullets: string[] = Array.isArray(section?.bullets)
    ? section.bullets.map((b: any) => (typeof b === 'string' ? b.trim() : '')).filter((b: string) => Boolean(b))
    : [];
  if (!summary || bullets.length === 0) return false;
  const summaryMatches = summary === profile.summary;
  const bulletsMatch =
    bullets.length === profile.bullets.length &&
    bullets.every((b: string, idx: number): boolean => b === profile.bullets[idx]);
  return summaryMatches && bulletsMatch;
}

const LAYERED_GENERIC_SUMMARY = 'The biggest hurdle for new creators is perfectionism and overthinking.';
const LAYERED_GENERIC_BULLETS = [
  'Use AI to brainstorm 10 content ideas based on topics you\'re interested in',
  'Create content templates with AI that you can fill in weekly',
  'Let AI help analyze which of your early posts perform better and why',
  'Use AI to repurpose one good piece of content across multiple platforms',
];

export function isLayeredFallbackSection(key: string, section: any): boolean {
  const validKey = (
    key === 'primaryObstacle' ||
    key === 'strategicFoundation' ||
    key === 'personalBrand' ||
    key === 'marketingStrategy' ||
    key === 'platformTactics' ||
    key === 'contentExecution' ||
    key === 'mentalHealth'
  );
  if (!validKey) return false;
  const report = section?.report || section;
  if (!report) return false;
  const summary = typeof report.summary === 'string' ? report.summary.trim() : '';
  const items = Array.isArray(report.addToYourPlan) && report.addToYourPlan.length ? report.addToYourPlan : report.bullets
  const bullets: string[] = Array.isArray(items)
    ? (items as unknown[])
        .map((b) => (typeof b === 'string' ? b.trim() : ''))
        .filter((b): b is string => Boolean(b))
    : [];
  if (!summary || bullets.length === 0) return false;
  const summaryMatches = summary === LAYERED_GENERIC_SUMMARY;
  const bulletsMatch =
    bullets.length === LAYERED_GENERIC_BULLETS.length &&
    bullets.every((b: string, idx: number): boolean => b === LAYERED_GENERIC_BULLETS[idx]);
  return summaryMatches && bulletsMatch;
}
