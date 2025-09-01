// lib/fame.ts
import type { Persona } from "./reportMapping";
import { normalizeAnswers, deriveSignals } from "./reportMapping";

/** Map various onboarding bits → 0..100 subscores. */
function scoreConsistency(planVsWing: string, userPainPoints: string[]): number {
  const p = planVsWing.toLowerCase();
  const base =
    p.includes("plan") ? 85 :
    p.includes("hybrid") ? 70 :
    p.includes("wing") ? 50 : 60;

  // penalize if they mention consistency as a pain point
  const hit = userPainPoints.join(" ").toLowerCase();
  const penalty = /inconsistent|consisten|schedule|routine/.test(hit) ? 15 : 0;

  return Math.max(0, Math.min(100, base - penalty));
}
function scoreTime(timeAvailable: string): number {
  const t = timeAvailable.toLowerCase();
  if (t.includes("4")) return 95;
  if (t.includes("2-4")) return 85;
  if (t.includes("1-2")) return 70;
  if (t.includes("30") || t.includes("60")) return 55;
  if (t.includes("under")) return 35;
  return 60;
}
function scoreExperience(identity: string): number {
  const id = identity.toLowerCase();
  if (id.includes("large")) return 90;
  if (id.includes("stalled")) return 65;
  if (id.includes("early") || id.includes("small")) return 55;
  if (id.includes("zero") || id.includes("new")) return 40;
  return 60;
}
function scoreContentClarity(interests: string[]): number {
  if (!interests?.length) return 50;
  const txt = interests.join(" ").toLowerCase();
  const hasEdu = /educat|how[-\s]?to|tips/.test(txt);
  const hasEntertain = /entertain|funny|meme|trend/.test(txt);
  const hasBts = /behind|process|journey|authentic/.test(txt);
  let s = 55 + (hasEdu ? 10 : 0) + (hasEntertain ? 5 : 0) + (hasBts ? 5 : 0);
  return Math.min(100, s);
}
function scoreCollab(freqHints: string[]): number {
  const txt = (freqHints || []).join(" ").toLowerCase();
  if (/always|often/.test(txt)) return 85;
  if (/sometimes/.test(txt)) return 65;
  if (/rarely|never/.test(txt)) return 40;
  return 60;
}
function scoreResources(budgetHints: string[]): number {
  const txt = (budgetHints || []).join(" ").toLowerCase();
  if (/\$?500\+|high budget|agency/.test(txt)) return 85;
  if (/200|500/.test(txt)) return 75;
  if (/50|100/.test(txt)) return 60;
  if (/\$?0\b|no budget/.test(txt)) return 40;
  return 55;
}
function scoreEngagementFocus(goals: string[], successBias?: string): number {
  const blob = [successBias || "", ...goals].join(" ").toLowerCase();
  if (/engage|comment|save|watch/.test(blob)) return 90;
  if (/reach|views/.test(blob)) return 80;
  if (/sales|lead/.test(blob)) return 75;
  if (/follower/.test(blob)) return 60;
  return 65;
}
function frictionPenalty(painPoints: string[]): number {
  const txt = (painPoints || []).join(" ").toLowerCase();
  if (/inconsistent|time/.test(txt)) return 65;      // higher = worse
  if (/hook|engage/.test(txt)) return 45;
  if (/idea|what to post/.test(txt)) return 40;
  return 35;
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

export function computeFameFromPersona(persona: Persona) {
  // use your own normalizers/derivers
  const a = normalizeAnswers(persona);
  const s = deriveSignals(a);

  const consistency = scoreConsistency(a.planVsWing, s.userPainPoints || []);
  const time        = scoreTime(a.timeAvailable);
  const experience  = scoreExperience(a.identity);
  const contentClr  = scoreContentClarity(s.contentInterests || []);
  const collaboration = scoreCollab(s.userPainPoints || []); // best proxy you have in current schema
  const resources     = scoreResources(s.triedButDidntWork || []); // rough proxy; tweak when you add explicit budget
  const engagement    = scoreEngagementFocus(s.goals || [], a.feedbackApproach);

  const penalty = frictionPenalty(s.userPainPoints || []);

  // weights (editable)
  const w = {
    consistency: .22, time: .15, experience: .12, contentClr: .10,
    collaboration: .08, resources: .08, engagement: .15, penalty: -.10
  };

  const raw =
    (consistency/100)*w.consistency +
    (time/100)*w.time +
    (experience/100)*w.experience +
    (contentClr/100)*w.contentClr +
    (collaboration/100)*w.collaboration +
    (resources/100)*w.resources +
    (engagement/100)*w.engagement +
    ((100 - penalty)/100) * (-w.penalty); // invert “bad”

  const p = 1/(1+Math.exp(-(4*(clamp01(raw)-0.5))));
  const famePercent = Math.round(p*100);

  // section meters used by the UI
  const section = {
    psych: Math.round((engagement + contentClr)/2),
    foundational: Math.round((consistency + time)/2),
    contentStrategy: Math.round((contentClr + consistency)/2),
    posting: consistency,
    metrics: engagement,
    mentalHealth: 100 - Math.max(0, penalty-20),
  };

  const probs = [
    {v: consistency, label: "inconsistent posting"},
    {v: time,        label: "not enough time"},
    {v: engagement,  label: "weak engagement focus"},
    {v: contentClr,  label: "unclear content direction"},
  ].sort((a,b)=>a.v-b.v);

  return {
    famePercent,
    mainProblem: probs[0].label,
    sectionScores: section,
    drivers: { consistency, time, experience, contentClarity: contentClr, collaboration, resources, engagementFocus: engagement, penalty }
  };
}