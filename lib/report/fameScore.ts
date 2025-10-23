type AnswersRecord = Record<string, unknown>;

function clamp01(value: number) {
  if (Number.isNaN(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function normalizeFactor(
  answers: AnswersRecord | undefined,
  key: string,
  fallback: number,
): number {
  if (!answers) return fallback;

  const raw = (answers as AnswersRecord)[key];

  if (typeof raw === "number") {
    return clamp01(raw);
  }

  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return fallback;

    const numeric = Number.parseFloat(trimmed.replace(/[^0-9.,-]+/g, ""));
    if (Number.isNaN(numeric)) {
      return fallback;
    }
    if (numeric > 1) {
      return clamp01(numeric / 100);
    }
    return clamp01(numeric);
  }

  if (Array.isArray(raw) && raw.length > 0) {
    const numeric = Number.parseFloat(String(raw[0]));
    if (!Number.isNaN(numeric)) {
      if (numeric > 1) {
        return clamp01(numeric / 100);
      }
      return clamp01(numeric);
    }
  }

  return fallback;
}

export type FameMetrics = {
  fame_score: number;
  fame_rating: "Poor" | "Fair" | "Good" | "Excellent";
  success_probability: number;
  progress_percent: number;
  charts: {
    content_quality: number;
    consistency: number;
    niche_clarity: number;
  };
};

export function computeFameMetrics(
  answers: AnswersRecord | undefined | null,
): FameMetrics {
  const contentQualityFactor = normalizeFactor(
    answers ?? undefined,
    "content_strategy_quality",
    0.73,
  );
  const consistencyFactor = normalizeFactor(
    answers ?? undefined,
    "posting_consistency",
    0.38,
  );
  const nicheClarityFactor = normalizeFactor(
    answers ?? undefined,
    "niche_focus_clarity",
    0.48,
  );

  const content_quality = Math.round(contentQualityFactor * 100);
  const consistency = Math.round(consistencyFactor * 100);
  const niche_clarity = Math.round(nicheClarityFactor * 100);

  const fame_score = Math.round(
    content_quality * 0.4 + consistency * 0.3 + niche_clarity * 0.3,
  );

  let fame_rating: FameMetrics["fame_rating"] = "Poor";
  if (fame_score >= 80) {
    fame_rating = "Excellent";
  } else if (fame_score >= 60) {
    fame_rating = "Good";
  } else if (fame_score >= 40) {
    fame_rating = "Fair";
  }

  const success_probability = Math.round(fame_score * 0.2);
  const progress_percent = 35;

  return {
    fame_score,
    fame_rating,
    success_probability,
    progress_percent,
    charts: {
      content_quality,
      consistency,
      niche_clarity,
    },
  };
}
