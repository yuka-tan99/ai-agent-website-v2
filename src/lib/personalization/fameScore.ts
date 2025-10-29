export type OnboardingAnswersSource =
  | Record<string, unknown>
  | Array<{ questionId: number; answer: unknown }>;

type NormalizedAnswers = Record<number, string[]>;

export type FameScoreBreakdown = {
  platformPresence: number;
  contentConsistency: number;
  nicheClarity: number;
  audienceEngagement: number;
  marketingStrategy: number;
  executionCapability: number;
};

export type FameScoreResult = {
  score: number;
  trend: number;
  breakdown: FameScoreBreakdown;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function baseId(value: string): string {
  return value.split(":")[0];
}

function normalizeValue(value: unknown): string[] {
  if (Array.isArray(value)) {
    const set = new Set<string>();
    for (const entry of value) {
      if (entry == null) continue;
      const str = String(entry).trim();
      if (str) set.add(str);
    }
    return Array.from(set);
  }
  if (value == null) return [];
  const trimmed = String(value).trim();
  return trimmed ? [trimmed] : [];
}

function normalizeAnswers(raw: OnboardingAnswersSource): NormalizedAnswers {
  const normalized: NormalizedAnswers = {};

  if (Array.isArray(raw)) {
    for (const entry of raw) {
      if (!entry) continue;
      const id = Number(entry.questionId);
      if (!Number.isFinite(id)) continue;
      normalized[id] = normalizeValue(entry.answer);
    }
    return normalized;
  }

  for (const [key, value] of Object.entries(raw)) {
    const match = /^q(\d+)$/.exec(key);
    if (!match) continue;
    const id = Number(match[1]);
    if (!Number.isFinite(id)) continue;
    normalized[id] = normalizeValue(value);
  }

  return normalized;
}

function hasId(values: string[] | undefined, target: string) {
  if (!values?.length) return false;
  return values.some((value) => {
    const id = baseId(value);
    if (id === target) return true;
    return id.startsWith(`${target}-`);
  });
}

function hasExact(values: string[] | undefined, target: string) {
  if (!values?.length) return false;
  return values.some((value) => baseId(value) === target);
}

function selectionCount(values: string[] | undefined) {
  if (!values?.length) return 0;
  const unique = new Set(values.map((value) => baseId(value)));
  return unique.size;
}

function extractCustomNumber(values: string[] | undefined, key = "custom") {
  if (!values?.length) return null;
  for (const value of values) {
    const [id, raw] = value.split(":");
    if (id !== key || !raw) continue;
    const digits = raw.replace(/[^\d]/g, "");
    if (!digits) continue;
    const num = Number(digits);
    if (Number.isFinite(num)) {
      return num;
    }
  }
  return null;
}

function scorePlatformPresence(answers: NormalizedAnswers) {
  const platforms = answers[9] ?? [];
  const followers = answers[2] ?? [];

  let score = 6;

  if (platforms.length) {
    const uniquePlatforms = selectionCount(platforms);
    score = 8 + Math.min(uniquePlatforms * 2, 8);

    if (hasExact(platforms, "tiktok")) score += 4;
    if (hasExact(platforms, "youtube")) score += 4;
    if (hasExact(platforms, "instagram")) score += 3;
    if (hasExact(platforms, "twitter")) score += 2;
    if (hasExact(platforms, "twitch")) score += 2;
    if (hasExact(platforms, "linkedin") || hasExact(platforms, "pinterest")) {
      score += 1;
    }
  }

  if (hasExact(followers, "1m+")) score += 6;
  else if (hasExact(followers, "250k-1m")) score += 5;
  else if (hasExact(followers, "50k-250k")) score += 4;
  else if (hasExact(followers, "10k-50k")) score += 3;
  else if (hasExact(followers, "1k-10k")) score += 2;
  else if (hasExact(followers, "0-1k")) score += 1;

  const customFollowers = extractCustomNumber(followers);
  if (customFollowers != null) {
    if (customFollowers >= 1_000_000) score += 6;
    else if (customFollowers >= 250_000) score += 5;
    else if (customFollowers >= 50_000) score += 4;
    else if (customFollowers >= 10_000) score += 3;
    else if (customFollowers >= 1_000) score += 2;
    else score += 1;
  }

  return clamp(score, 0, 20);
}

function scoreContentConsistency(answers: NormalizedAnswers) {
  const experience = answers[4] ?? [];
  const planning = answers[5] ?? [];
  const blockers = answers[8] ?? [];
  const hours = answers[14] ?? [];
  const experiments = answers[13] ?? [];

  let score = 8;

  if (hasExact(experience, "5plus")) score += 14;
  else if (hasExact(experience, "2-5yr")) score += 13;
  else if (hasExact(experience, "1-2yr")) score += 12;
  else if (hasExact(experience, "6mo-1yr")) score += 10;
  else if (hasExact(experience, "3-6mo")) score += 8;
  else if (hasExact(experience, "less-3mo")) score += 6;
  else if (hasExact(experience, "not-started")) score += 2;
  else score += 7;

  if (hasExact(planning, "plan")) score += 4;
  if (hasExact(planning, "mix")) score += 2;
  if (hasExact(planning, "moment")) score -= 3;

  if (hasExact(hours, "40plus")) score += 6;
  else if (hasExact(hours, "20-40")) score += 5;
  else if (hasExact(hours, "10-20")) score += 4;
  else if (hasExact(hours, "5-10")) score += 3;
  else if (hasExact(hours, "3-5")) score += 2;
  else if (hasExact(hours, "1-3")) score -= 1;

  const expCount = selectionCount(experiments);
  if (expCount >= 5) score += 5;
  else if (expCount >= 3) score += 4;
  else if (expCount >= 1) score += 2;
  if (hasExact(experiments, "nothing")) score -= 5;

  if (hasExact(blockers, "consistency")) score -= 5;
  if (hasExact(blockers, "time")) score -= 4;
  if (hasExact(blockers, "executing")) score -= 4;
  if (hasExact(blockers, "burnout")) score -= 3;
  if (hasExact(blockers, "perfectionism")) score -= 2;
  if (hasExact(blockers, "anxiety")) score -= 1;

  return clamp(score, 0, 20);
}

function scoreNicheClarity(answers: NormalizedAnswers) {
  const identity = answers[1] ?? [];
  const passions = answers[3] ?? [];
  const goals = answers[6] ?? [];
  const differentiators = answers[15] ?? [];
  const topics = answers[18] ?? [];

  let score = 8;

  if (identity.length) score += 4;
  if (hasExact(identity, "just-me")) score -= 4;
  if (hasExact(identity, "figuring-out")) score -= 6;

  const passionCount = selectionCount(passions);
  if (passionCount >= 4) score += 6;
  else if (passionCount >= 2) score += 4;
  else if (passionCount >= 1) score += 2;

  if (hasExact(goals, "expert") || hasExact(goals, "sell")) score += 4;
  if (hasExact(goals, "monetize") || hasExact(goals, "traffic")) score += 3;
  if (hasExact(goals, "journey") || hasExact(goals, "community"))
    score += 2;

  if (hasExact(differentiators, "not-sure")) score -= 8;
  else if (selectionCount(differentiators) >= 2) score += 5;
  else if (selectionCount(differentiators) === 1) score += 3;

  const topicCount = selectionCount(topics);
  if (topicCount >= 3) score += 5;
  else if (topicCount >= 1) score += 3;
  else score -= 2;

  return clamp(score, 0, 15);
}

function scoreAudienceEngagement(answers: NormalizedAnswers) {
  const experiments = answers[13] ?? [];
  const blockers = answers[8] ?? [];
  const platforms = answers[9] ?? [];

  let score = 7;

  const experimentCount = selectionCount(experiments);
  if (experimentCount >= 5) score += 7;
  else if (experimentCount >= 3) score += 5;
  else if (experimentCount >= 1) score += 3;
  if (hasExact(experiments, "nothing")) score -= 5;

  if (hasExact(experiments, "engaging")) score += 2;
  if (hasExact(experiments, "posting-more")) score += 1;
  if (hasExact(experiments, "collaborating")) score += 2;
  if (hasExact(experiments, "trends")) score += 1;

  const platformCount = selectionCount(platforms);
  if (platformCount >= 3) score += 3;

  if (hasExact(blockers, "engagement")) score -= 5;
  if (hasExact(blockers, "likes")) score -= 3;
  if (hasExact(blockers, "strategy")) score -= 2;
  if (hasExact(blockers, "monetization")) score -= 1;

  return clamp(score, 0, 15);
}

function scoreMarketingStrategy(answers: NormalizedAnswers) {
  const goals = answers[6] ?? [];
  const drivers = answers[17] ?? [];
  const blockers = answers[8] ?? [];
  const experiments = answers[13] ?? [];

  let score = 7;

  if (hasExact(goals, "monetize")) score += 6;
  if (hasExact(goals, "sell")) score += 5;
  if (hasExact(goals, "traffic")) score += 4;
  if (hasExact(goals, "network")) score += 3;
  if (hasExact(goals, "reach") || hasExact(goals, "project")) score += 3;

  if (hasExact(drivers, "financial")) score += 4;
  if (hasExact(drivers, "building")) score += 3;
  if (hasExact(drivers, "legacy")) score += 2;
  if (hasExact(drivers, "helping")) score += 2;

  const experimentCount = selectionCount(experiments);
  if (experimentCount >= 4) score += 4;
  else if (experimentCount >= 2) score += 3;
  if (hasExact(experiments, "ads")) score += 2;
  if (hasExact(experiments, "collaborating")) score += 2;
  if (hasExact(experiments, "hashtags")) score += 2;
  if (hasExact(experiments, "timing")) score += 1;
  if (hasExact(experiments, "nothing")) score -= 4;

  if (hasExact(blockers, "strategy")) score -= 5;
  if (hasExact(blockers, "engagement")) score -= 3;
  if (hasExact(blockers, "monetization")) score -= 3;

  return clamp(score, 0, 15);
}

function scoreExecutionCapability(answers: NormalizedAnswers) {
  const planning = answers[5] ?? [];
  const blockers = answers[8] ?? [];
  const camera = answers[11] ?? [];
  const hours = answers[14] ?? [];
  const drivers = answers[17] ?? [];

  let score = 8;

  if (hasExact(planning, "plan")) score += 5;
  if (hasExact(planning, "mix")) score += 3;
  if (hasExact(planning, "moment")) score -= 3;

  if (hasExact(hours, "40plus")) score += 5;
  else if (hasExact(hours, "20-40")) score += 4;
  else if (hasExact(hours, "10-20")) score += 3;
  else if (hasExact(hours, "5-10")) score += 2;
  else if (hasExact(hours, "1-3")) score -= 2;

  if (hasExact(camera, "love-it")) score += 4;
  if (hasExact(camera, "okay")) score += 2;
  if (hasExact(camera, "voice-ok")) score += 2;
  if (hasExact(camera, "confidence")) score += 2;
  if (
    hasExact(camera, "no-thanks") ||
    hasExact(camera, "awkward") ||
    hasExact(camera, "privacy") ||
    hasExact(camera, "restrictions") ||
    hasExact(camera, "faceless")
  ) {
    score -= 4;
  }

  if (hasExact(blockers, "consistency")) score -= 5;
  if (hasExact(blockers, "executing")) score -= 5;
  if (hasExact(blockers, "time")) score -= 4;
  if (hasExact(blockers, "perfectionism")) score -= 4;
  if (hasExact(blockers, "anxiety")) score -= 3;
  if (hasExact(blockers, "burnout")) score -= 3;
  if (hasExact(blockers, "negative")) score -= 2;

  if (hasExact(drivers, "building")) score += 2;
  if (hasExact(drivers, "creative")) score += 2;
  if (hasExact(drivers, "helping")) score += 1;
  if (hasExact(drivers, "fun")) score += 1;

  return clamp(score, 0, 15);
}

export function calculateFameScoreFromAnswers(
  raw: OnboardingAnswersSource,
): FameScoreResult {
  const normalized = normalizeAnswers(raw);

  const breakdown: FameScoreBreakdown = {
    platformPresence: scorePlatformPresence(normalized),
    contentConsistency: scoreContentConsistency(normalized),
    nicheClarity: scoreNicheClarity(normalized),
    audienceEngagement: scoreAudienceEngagement(normalized),
    marketingStrategy: scoreMarketingStrategy(normalized),
    executionCapability: scoreExecutionCapability(normalized),
  };

  const score =
    breakdown.platformPresence +
    breakdown.contentConsistency +
    breakdown.nicheClarity +
    breakdown.audienceEngagement +
    breakdown.marketingStrategy +
    breakdown.executionCapability;

  const momentum =
    breakdown.contentConsistency +
    breakdown.executionCapability +
    breakdown.marketingStrategy;

  const trend = clamp(Math.round((momentum - 33) / 2), -15, 15);

  return {
    score: clamp(Math.round(score), 0, 100),
    trend,
    breakdown,
  };
}
