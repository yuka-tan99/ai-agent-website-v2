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
  return Math.max(min, Math.min(value, max));
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

function includes(values: string[] | undefined, target: string) {
  if (!values?.length) return false;
  const needle = target.toLowerCase();
  return values.some((value) => value.toLowerCase().includes(needle));
}

function scorePlatformPresence(answers: NormalizedAnswers) {
  const platforms = answers[11] ?? [];
  if (!platforms.length) return 4;

  let score = 8;
  if (platforms.length > 1) {
    score += Math.min((platforms.length - 1) * 2, 6);
  }
  if (includes(platforms, "tiktok")) score += 3;
  if (includes(platforms, "youtube")) score += 3;
  if (includes(platforms, "instagram")) score += 2;
  if (
    includes(platforms, "linkedin") ||
    includes(platforms, "twitter") ||
    includes(platforms, "multiple")
  ) {
    score += 1;
  }
  return clamp(score, 0, 20);
}

function scoreContentConsistency(answers: NormalizedAnswers) {
  const stage = answers[2] ?? [];
  const capacity = answers[9] ?? [];
  const blockers = answers[3] ?? [];

  const stageMap: Array<{ keyword: string; value: number }> = [
    { keyword: "haven't started", value: 4 },
    { keyword: "started recently", value: 8 },
    { keyword: "been at it for months", value: 11 },
    { keyword: "established presence", value: 13 },
    { keyword: "successful before", value: 15 },
    { keyword: "burned out", value: 10 },
  ];

  const capacityMap: Array<{ keyword: string; value: number }> = [
    { keyword: "2+ hours", value: 8 },
    { keyword: "batch create", value: 6 },
    { keyword: "15-30 minutes", value: 5 },
    { keyword: "schedule is chaotic", value: 4 },
    { keyword: "team/help", value: 6 },
    { keyword: "motivation/clarity", value: 3 },
    { keyword: "make time", value: 4 },
  ];

  let stageScore = 4;
  for (const item of stageMap) {
    if (includes(stage, item.keyword)) {
      stageScore = Math.max(stageScore, item.value);
    }
  }

  let capacityScore = 3;
  for (const item of capacityMap) {
    if (includes(capacity, item.keyword)) {
      capacityScore = Math.max(capacityScore, item.value);
    }
  }

  let score = stageScore + capacityScore;

  if (stageScore >= 13 && capacityScore >= 6) {
    score += 2;
  }

  if (
    includes(blockers, "stay consistent") ||
    includes(blockers, "no time to create")
  ) {
    score -= 4;
  }

  return clamp(score, 0, 20);
}

function scoreNicheClarity(answers: NormalizedAnswers) {
  const target = answers[12] ?? [];
  const expertise = answers[10] ?? [];
  const blockers = answers[3] ?? [];
  const strengths = answers[7] ?? [];

  let score = 7;

  if (target.length && !includes(target, "still figuring this out")) {
    score += Math.min(target.length * 2, 6);
  } else if (!target.length) {
    score -= 2;
  }

  if (expertise.length) score += 3;

  if (
    includes(strengths, "teaching") ||
    includes(strengths, "process") ||
    includes(strengths, "opinion")
  ) {
    score += 2;
  }

  if (includes(blockers, "don't know what to post")) {
    score -= 5;
  }

  if (includes(blockers, "contradicting advice")) {
    score -= 2;
  }

  return clamp(score, 0, 15);
}

function scoreAudienceEngagement(answers: NormalizedAnswers) {
  const metrics = answers[13] ?? [];
  const tried = answers[15] ?? [];
  const blockers = answers[3] ?? [];

  let score = 6;

  if (includes(metrics, "check regularly")) score += 5;
  else if (includes(metrics, "want to learn to use")) score += 4;
  else if (includes(metrics, "care more about comments")) score += 3;
  else if (includes(metrics, "check obsessively")) score += 2;
  else if (
    includes(metrics, "avoid them") ||
    includes(metrics, "don't understand")
  )
    score += 1;

  if (tried.length) {
    score += Math.min(tried.length * 2, 6);
    if (includes(tried, "posted consistently")) score += 2;
  }

  if (includes(blockers, "gets no engagement")) {
    score -= 4;
  }

  return clamp(score, 0, 15);
}

function scoreMarketingStrategy(answers: NormalizedAnswers) {
  const monetization = answers[18] ?? [];
  const vision = answers[4] ?? [];
  const drivers = answers[5] ?? [];

  let score = 5;

  if (includes(monetization, "already earning")) score += 7;
  if (includes(monetization, "diverse revenue")) score += 6;
  if (includes(monetization, "long-term")) score += 5;
  if (includes(monetization, "income asap")) score += 4;
  if (includes(monetization, "money isn't")) score += 2;
  if (includes(monetization, "not sure if")) score -= 2;

  if (
    vision.some((item) =>
      item.toLowerCase().match(/clients|partnerships|selling|steady stream/),
    )
  ) {
    score += 3;
  }

  if (
    drivers.some((item) =>
      item.toLowerCase().match(/business asset|financial independence/),
    )
  ) {
    score += 3;
  }

  return clamp(score, 0, 15);
}

function scoreExecutionCapability(answers: NormalizedAnswers) {
  const perfectionism = answers[17] ?? [];
  const blockers = answers[3] ?? [];
  const criticism = answers[16] ?? [];
  const capacity = answers[9] ?? [];

  let score = 6;

  if (
    includes(perfectionism, "good enough") ||
    includes(perfectionism, "post without")
  ) {
    score += 5;
  }

  if (
    includes(perfectionism, "perfectionism has killed") ||
    includes(perfectionism, "delete more than I post") ||
    includes(perfectionism, "overthink every caption")
  ) {
    score -= 5;
  }

  if (includes(perfectionism, "depends on my mood")) {
    score -= 1;
  }

  if (includes(blockers, "fear of judgment")) score -= 3;
  if (includes(blockers, "stay consistent")) score -= 4;
  if (includes(blockers, "no time to create")) score -= 3;
  if (includes(blockers, "technical aspects")) score -= 2;

  if (includes(criticism, "analyze it for valid")) score += 4;
  else if (includes(criticism, "learn from it but it still")) score += 3;
  else if (includes(criticism, "feel hurt for days")) score -= 3;
  else if (includes(criticism, "get defensive")) score -= 2;

  if (includes(capacity, "team/help")) score += 2;
  if (includes(capacity, "2+ hours")) score += 3;
  if (includes(capacity, "batch create")) score += 2;
  if (includes(capacity, "15-30 minutes")) score += 1;

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
