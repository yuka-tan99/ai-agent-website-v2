"use client"

import React, { useMemo, useState } from "react";
import { AlertTriangle, Landmark, Wallet2, HeartPulse, BarChart3, Sparkles } from 'lucide-react'
import { isLayeredFallbackSection } from '@/lib/reportFallbacks'

/**
 * ReportShell.tsx
 * Layered report UI: Report (overview) → Learn More (deep dive) → Elaborate (mastery)
 * - No streaks
 * - Keeps "Learn More" and "Elaborate" UX vibe
 * - Pure React + Tailwind; shadcn/ui optional wrappers noted where to slot in
 *
 * HOW TO USE
 * 1) Import in any client page or component.
 * 2) Render <ReportShell data={...}/> inside your dashboard layout.
 * 3) Pass user stage, blockers, platform, and personalized recommendations via props.
 * 4) Wire the optional callbacks (onElaborate, onPlatformChange) to your RAG/agent if desired.
 */

// ---------- Types ----------
export type Stage = "0-1K" | "1K-10K" | "10K-100K" | "100K+";
export type PersonaType = "creator" | "business" | "artist";
export type Blocker =
  | "fear_of_judgment"
  | "lack_of_consistency"
  | "no_niche"
  | "low_engagement";

export type PlatformKey = "tiktok" | "instagram" | "youtube";

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

export type QuickTactic = { label: string; how: string };

export type ReportSection = {
  title: string;
  bullets: string[]; // 3–5 key insights (mirrors addToYourPlan when present)
  paragraph?: string; // 120–150 word narrative overview
  summary?: string; // 1-sentence essence
  addToYourPlan?: string[]; // canonical 3-task list from the model
  quickWins?: QuickTactic[]; // 1–3 quick win tactics
};

export type DeepDive = {
  context: string; // why it matters
  framework: { name: string; steps: string[] }; // 3-step execution
  caseStudies?: { title: string; takeaway: string }[];
  tools?: string[]; // templates/tools
};

export type Mastery = {
  sources?: string[]; // names of frameworks/books
  advanced?: string[]; // advanced techniques
  troubleshooting?: { symptom: string; fix: string }[];
  longTerm?: string[]; // quarterly/next-stage guidance
};

export type LayerGroup = {
  report: ReportSection;
  learnMore: DeepDive;
  elaborate: Mastery;
};

export interface ReportData {
  userName?: string;
  stage: Stage;
  primaryPlatform: PlatformKey;
  biggestBlocker: Blocker;
  sections: {
    primaryObstacle: LayerGroup;
    strategicFoundation: LayerGroup;
    personalBrand: LayerGroup;
    marketingStrategy: LayerGroup;
    platformTactics: LayerGroup;
    contentExecution: LayerGroup;
    mentalHealth: LayerGroup;
  };
  personalization: PersonalizationVars;
  platformStrategies: Record<PlatformKey, PlatformStrategy>;
  analysis?: { persona?: string; primaryObstacle?: string };
  uiStageLabel?: string; // derived from onboarding vars; UI-only label
}

export interface ReportShellProps {
  data: ReportData;
  onPlatformChange?: (p: PlatformKey) => void;
  onElaborate?: (sectionKey: keyof ReportData["sections"]) => void; // hook to RAG agent
  typewriterKey?: string; // when set, play typewriter once per user/key
  sectionReadiness?: Partial<Record<keyof ReportData['sections'], boolean>>;
}

// ---------- Helpers ----------
const stageBadgeColor: Record<Stage, string> = {
  "0-1K": "bg-gray-900 text-white",
  "1K-10K": "bg-indigo-600 text-white",
  "10K-100K": "bg-emerald-600 text-white",
  "100K+": "bg-amber-600 text-black",
};

const blockerCopy: Record<Blocker, string> = {
  fear_of_judgment: "Fear of judgment",
  lack_of_consistency: "Lack of consistency",
  no_niche: "No clear niche",
  low_engagement: "Low engagement",
};

const platformLabel: Record<PlatformKey, string> = {
  tiktok: "TikTok",
  instagram: "Instagram",
  youtube: "YouTube",
};

function SectionPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700">
      {children}
    </span>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  // Inherit /report-board glass card styling
  return <div className={`dashboard-card p-5 ${className}`}>{children}</div>
}

function Divider() {
  return <div className="h-px w-full bg-zinc-200" />;
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="mt-3 list-disc space-y-2 pl-5 text-zinc-700">
      {items.map((i, idx) => (
        <li key={idx}>{i}</li>
      ))}
    </ul>
  );
}

function QuickWins({ wins }: { wins?: QuickTactic[] }) {
  if (!wins?.length) return null;
  return (
    <div className="mt-4 rounded-xl bg-zinc-50 p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Quick Wins</div>
      <ul className="mt-2 space-y-2">
        {wins.map((w, i) => (
          <li key={i} className="text-sm">
            <span className="font-medium">{w.label}:</span> {w.how}
          </li>
        ))}
      </ul>
    </div>
  );
}

// Generic layered panel with tabs (Report / Learn More / Elaborate)
function LayeredPanel({ group, onElaborate, iconLabel, typewriterKey, headerTitle, sectionSlug, ready, sectionKey }: { group: LayerGroup | undefined; onElaborate?: () => void; iconLabel?: React.ReactNode; typewriterKey?: string; headerTitle?: string; sectionSlug: string; ready?: boolean; sectionKey: keyof ReportData['sections'] }) {
  const [open, setOpen] = useState(true)
  const safeGroup: LayerGroup = React.useMemo(() => {
    if (group && typeof group === 'object') return group
    return { report: { title: '', bullets: [] }, learnMore: { context: '', framework: { name: '', steps: [] } }, elaborate: {} }
  }, [group])
  const fallback = isLayeredFallbackSection(sectionKey, safeGroup)
  const isReady = ready !== false && !fallback
  const planItems = Array.isArray(safeGroup.report?.addToYourPlan) && safeGroup.report.addToYourPlan.length
    ? safeGroup.report.addToYourPlan
    : safeGroup.report?.bullets
  const listItems = Array.isArray(planItems) ? planItems : []
  const hasContent = listItems.length > 0
  const showContent = isReady && hasContent

  return (
    <Card className="fade-in">
      <button
        className="sect-btn w-full flex items-center justify-between text-left"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
      >
        <div className="flex items-center gap-2">
          {iconLabel}
          <h3 className="text-base font-semibold text-zinc-900">{headerTitle || safeGroup.report.title}</h3>
        </div>
        <span className="flex items-center gap-3">
          {!isReady && (
            <span
              className="inline-block h-4 w-4 rounded-full border-2 border-[rgba(158,93,171,.22)] border-t-[#9E5DAB] animate-spin"
              aria-hidden
            />
          )}
          <span className="text-xl leading-none" aria-hidden>{open ? '–' : '+'}</span>
        </span>
      </button>

      <div className="sect-panel" data-open={open ? 'true' : 'false'}>
        {/* Overview content or loader */}
        {showContent ? (
          <div className="mt-2">
            {(() => {
              const paragraph = (safeGroup.report?.paragraph || '').trim()
              const context = (safeGroup.learnMore?.context || '').trim()
              const text = paragraph || context
              return text ? (
                <p className="text-zinc-700 leading-relaxed fade-in">{text}</p>
              ) : null
            })()}
            <div className="fade-in">
              <TypewriterList items={listItems} onceKey={safeGroup.report.title} persistKey={typewriterKey} />
            </div>
            <div className="mt-5 rounded-xl bg-zinc-50 p-4 fade-in">
              <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Add to your plan</div>
              <ul className="mt-2 space-y-2 text-sm text-zinc-700">
                {makePlanAdds(safeGroup).slice(0,5).map((t, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="mt-[6px] inline-block h-2 w-2 rounded-full bg-zinc-400" aria-hidden />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>
            {/* Centered Learn More button */}
            <div className="mt-6 flex justify-center">
              <a
                href={`/dashboard/learn/${encodeURIComponent(sectionSlug)}`}
                className="inline-flex items-center justify-center rounded-full px-6 py-2.5 text-white shadow-md transition transform hover:scale-[1.02]"
                style={{ background: '#9E5DAB' }}
              >
                Learn more
              </a>
            </div>
          </div>
        ) : !isReady ? (
          <div className="py-10 flex items-center justify-center" aria-live="polite">
            <div className="h-10 w-10 rounded-full border-4 border-[rgba(158,93,171,.22)] border-t-[#9E5DAB] animate-spin" aria-label="Generating section" />
          </div>
        ) : (
          <div className="py-10 text-center text-sm text-zinc-500">No insights available yet.</div>
        )}
      </div>
    </Card>
  );
}

// ---------- Root Component ----------
export default function ReportShell({ data, onPlatformChange, onElaborate, typewriterKey, sectionReadiness }: ReportShellProps) {
  const [platform, setPlatform] = useState<PlatformKey>(data.primaryPlatform);
  const isSectionReady = (key: keyof ReportData['sections']) => {
    if (!sectionReadiness) return true
    const value = sectionReadiness[key]
    return value !== false
  }

  // Defensive: ensure we always have platform strategies + a selected platform
  const defaultPlatformMap: Record<PlatformKey, PlatformStrategy> = {
    tiktok: { content_type: 'raw_authentic_short', posting_frequency: '1-3x daily', key_metrics: 'completion_rate, shares', growth_hack: 'trend_surfing, original_sounds' },
    instagram: { content_type: 'visual_storytelling', posting_frequency: '1x daily + stories', key_metrics: 'saves, replies', growth_hack: 'carousel_hooks, reel_covers' },
    youtube: { content_type: 'long_form_value', posting_frequency: '1-2x weekly', key_metrics: 'watch_time, CTR', growth_hack: 'thumbnail_psychology, series_creation' },
  }
  const strategies = useMemo(() => ({ ...(data.platformStrategies || {}), ...{} }) as Record<PlatformKey, PlatformStrategy>, [data.platformStrategies])
  const safeStrategies = Object.keys(strategies || {}).length ? strategies : defaultPlatformMap
  const safePlatform: PlatformKey = (safeStrategies as any)[platform] ? platform : 'instagram'
  const ps = useMemo(() => safeStrategies[safePlatform], [safeStrategies, safePlatform]);
  const humanize = (s: string) => {
    const t = (s || '').replace(/[_-]+/g, ' ')
    const sentence = t.charAt(0).toUpperCase() + t.slice(1)
    return sentence.replace(/\bctr\b/gi, 'CTR')
  }

  const IconPill = ({ children }: { children: React.ReactNode }) => (
    <span className="inline-flex items-center justify-center rounded-full bg-zinc-900 text-white w-7 h-7">
      {children}
    </span>
  )

  const titleCase = (s: string) => (s || '')
    .replace(/[\-_]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')

  // Build succinct persona phrase and primary obstacle header text
  const personaText = (data.analysis?.persona || '').trim()

  const primaryObstacleHeader = (() => {
    const raw = data.sections.primaryObstacle?.report?.title || ''
    const isDefault = /^\s*primary\s+obstacle\s*$/i.test(raw)
    const suffix = !isDefault && raw.trim() ? `: ${titleCase(raw)}` : ''
    return `Primary Obstacle${suffix}`
  })()

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col items-center text-center gap-4">
        <div className="max-w-3xl">
          <h1 className="report-title">your personalized report</h1>
          <div className="report-subtitle">your path to social media fame</div>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            {/* Stage: only show when we have a UI label derived from onboarding; no fallback */}
            {data.uiStageLabel ? (
              <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold text-white bg-[var(--accent-grape)] fade-in">
                Stage: {data.uiStageLabel}
              </span>
            ) : null}
            {/* Persona: only show when analysis.persona exists; no fallback */}
            {personaText ? (
              <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs bg-[#D7BFDC] text-[var(--accent-grape)] fade-in">
                Persona: {personaText}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {/* Removed prior JSON analysis card; concise info shown in header pills */}

      {/* Sections */}
      <div className="grid grid-cols-1 gap-6">
        <LayeredPanel
          group={data.sections.primaryObstacle}
        onElaborate={() => onElaborate?.("primaryObstacle")}
        iconLabel={<GradientBadge><AlertTriangle className="w-6 h-6" color="white" /></GradientBadge>}
        typewriterKey={typewriterKey}
        ready={isSectionReady('primaryObstacle')}
        sectionSlug={'primary_obstacle_resolution'}
        headerTitle={'Section 1: Primary Obstacle Resolution'}
        sectionKey="primaryObstacle"
      />
      <LayeredPanel
        group={data.sections.strategicFoundation}
        onElaborate={() => onElaborate?.("personalBrand")}
        iconLabel={<GradientBadge><Landmark className="w-6 h-6" color="white" /></GradientBadge>}
        typewriterKey={typewriterKey}
        ready={isSectionReady('strategicFoundation')}
        sectionSlug={'strategic_foundation'}
        headerTitle={'Section 2: Niche & Focus Discovery'}
        sectionKey="strategicFoundation"
      />
      {/* Section 3: Personal Brand Development */}
      <LayeredPanel
        group={data.sections.personalBrand}
        onElaborate={() => onElaborate?.("strategicFoundation")}
        iconLabel={<GradientBadge><Sparkles className="w-6 h-6" color="white" /></GradientBadge>}
        typewriterKey={typewriterKey}
        ready={isSectionReady('personalBrand')}
        sectionSlug={'personal_brand_development'}
        headerTitle={'Section 3: Personal Brand Development'}
        sectionKey="personalBrand"
      />
      <LayeredPanel
        group={data.sections.marketingStrategy}
        onElaborate={() => onElaborate?.("marketingStrategy")}
        iconLabel={<GradientBadge><Wallet2 className="w-6 h-6" color="white" /></GradientBadge>}
        typewriterKey={typewriterKey}
        ready={isSectionReady('marketingStrategy')}
        sectionSlug={'marketing_strategy_development'}
        headerTitle={'Section 4: Marketing Strategy Development'}
        sectionKey="marketingStrategy"
      />
      <LayeredPanel
        group={data.sections.platformTactics}
        onElaborate={() => onElaborate?.("platformTactics")}
        iconLabel={<GradientBadge><Landmark className="w-6 h-6" color="white" /></GradientBadge>}
        typewriterKey={typewriterKey}
        ready={isSectionReady('platformTactics')}
        sectionSlug={'platform_specific_tactics'}
        headerTitle={'Section 5: Platform-Specific Tactics'}
        sectionKey="platformTactics"
      />
      <LayeredPanel
        group={data.sections.contentExecution}
        onElaborate={() => onElaborate?.("contentExecution")}
        iconLabel={<GradientBadge><BarChart3 className="w-6 h-6" color="white" /></GradientBadge>}
        typewriterKey={typewriterKey}
        ready={isSectionReady('contentExecution')}
        sectionSlug={'content_creation_execution'}
        headerTitle={'Section 6: Content Creation & Execution'}
        sectionKey="contentExecution"
      />
      <LayeredPanel
        group={data.sections.mentalHealth}
        onElaborate={() => onElaborate?.("mentalHealth")}
        iconLabel={<GradientBadge><HeartPulse className="w-6 h-6" color="white" /></GradientBadge>}
        typewriterKey={typewriterKey}
        ready={isSectionReady('mentalHealth')}
        sectionSlug={'mental_health_sustainability'}
        headerTitle={'Section 7: Mental Health & Sustainability'}
        sectionKey="mentalHealth"
      />
      </div>

      {/* Footer CTA */}
      <div className="rounded-2xl border border-zinc-200 bg-gradient-to-r from-zinc-50 to-white p-6 text-center">
        <h3 className="text-lg font-semibold text-zinc-900">Your next step this week</h3>
        <p className="mt-1 text-zinc-700">Pick one "Quick Win" above and schedule it. Small actions → Compounding momentum.</p>
        <div className="mt-4 flex justify-center">
          <button className="rounded-full bg-[var(--accent-grape)] px-4 py-2 text-sm font-medium text-white hover:bg-[#874E95] transition">
            Add to my plan
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- Example Mock Data (delete in prod) ----------
export const MOCK_DATA: ReportData = {
  userName: "Alex",
  stage: "1K-10K",
  primaryPlatform: "instagram",
  biggestBlocker: "lack_of_consistency",
  personalization: {
    comfort_with_visibility: "medium",
    time_availability: "medium",
    technical_skill: "medium",
    monetization_urgency: "high",
    personality_type: "creator",
  },
  platformStrategies: {
    tiktok: {
      content_type: "raw_authentic_short",
      posting_frequency: "1-3x daily",
      key_metrics: "completion_rate, shares",
      growth_hack: "trend_surfing, original_sounds",
    },
    instagram: {
      content_type: "visual_storytelling",
      posting_frequency: "1x daily + stories",
      key_metrics: "saves, story_replies",
      growth_hack: "carousel_hooks, reel_covers",
    },
    youtube: {
      content_type: "long_form_value",
      posting_frequency: "1-2x weekly",
      key_metrics: "watch_time, ctr",
      growth_hack: "thumbnail_psychology, series_creation",
    },
  },
  sections: {
    primaryObstacle: {
      report: {
        title: "Fix Consistency First",
        bullets: [
          "Adopt binary habit: \"Publish something\" 5 days/week.",
          "Reduce scope: 20‑minute content blocks.",
          "Batch 3 reels in a 60‑minute sprint.",
        ],
        quickWins: [
          { label: "2‑Sentence Posts", how: "Write hook + 1 insight. Ship." },
          { label: "Template Day", how: "Reuse last week’s top post format." },
        ],
      },
      learnMore: {
        context: "Consistency compounds algorithmic exposure and skill acquisition.",
        framework: {
          name: "Mini‑Habit Ladder",
          steps: [
            "Define the absolute minimum (30s post).",
            "Time‑block 20‑minute creation windows.",
            "Weekly review to lock in what worked.",
          ],
        },
        caseStudies: [
          { title: "Creator A", takeaway: "+3x output with 20‑min slots" },
        ],
        tools: ["10 hook starters", "Reel outline template"],
      },
      elaborate: {
        sources: ["Atomic Habits", "Tiny Habits"],
        advanced: [
          "Systemize prompts per pillar to cut decision fatigue.",
          "Weekend batching → weekday polish pipeline.",
        ],
        troubleshooting: [
          { symptom: "Still skipping days", fix: "Cut scope again. Ship text‑only." },
        ],
        longTerm: ["Quarterly content OS tune‑up"],
      },
    },
    strategicFoundation: {
      report: {
        title: "Tighten Brand & Pillars",
        bullets: [
          "Define 3 content pillars tied to your transformation.",
          "Lock a distinct visual/voice cue.",
          "Map weekly slots per pillar (Mon/Wed/Fri).",
        ],
      },
      learnMore: {
        context: "Clarity accelerates recall and followership.",
        framework: { name: "Brand Diamond", steps: ["Who you are", "Who you help", "Signature POV"] },
        tools: ["Pillar planner", "Voice grid worksheet"],
      },
      elaborate: {
        sources: ["Byron Sharp – Distinctive Assets"],
        advanced: ["Intro a catchphrase & consistent shot framing"],
      },
    },
    personalBrand: {
      report: {
        title: "Sharpen Personal Brand",
        bullets: [
          "Codify a signature intro and sign-off.",
          "Highlight proof stories that show transformation.",
          "Use color + typography cues across channels.",
        ],
      },
      learnMore: {
        context: "Distinct stories and signals make you memorable fast.",
        framework: { name: "Story Strip", steps: ["Origin", "Tension", "Resolution"] },
      },
      elaborate: {
        advanced: ["Film a brand trailer for profile pin"],
        troubleshooting: [
          { symptom: "Audience can't explain you", fix: "Repeat your transformation promise at the end of posts." },
        ],
      },
    },
    marketingStrategy: {
      report: {
        title: "Stage‑Fit Monetization",
        bullets: [
          "Start email capture (lead magnet).",
          "Test 1 low‑lift offer (e.g., templates).",
          "Validate with 10 preorders before building.",
        ],
      },
      learnMore: {
        context: "Email list derisks platform volatility.",
        framework: { name: "Lean Offer Loop", steps: ["Hypothesis", "Pre‑sell", "Deliver"] },
      },
      elaborate: {
        advanced: ["Price testing via A/B checkout links"],
        longTerm: ["Move to cohort course or community at 10K+"],
      },
    },
    platformTactics: {
      report: {
        title: "Platform-Specific Tactics",
        bullets: [
          "Optimize the first two seconds for hooks.",
          "Use each platform's native feature weekly.",
          "Schedule duet/remix replies to trending clips.",
        ],
      },
      learnMore: {
        context: "Each platform rewards different viewer behavior; tailor format and cadence.",
        framework: { name: "Pick-1-Platform", steps: ["Choose pillar", "Match format", "Measure one metric"] },
      },
      elaborate: {
        troubleshooting: [
          { symptom: "Reels dropping reach", fix: "Refresh cover styles + test 3 new hooks." },
        ],
      },
    },
    contentExecution: {
      report: {
        title: "Content Creation & Execution",
        bullets: [
          "Batch three scripts every Sunday.",
          "Record 3 takes per idea and pick the tightest cut.",
          "Edit with a fixed template to stay under 45 minutes per post.",
        ],
      },
      learnMore: {
        context: "Execution systems reduce friction and increase publish reliability.",
        framework: { name: "Ship-Loop", steps: ["Draft", "Polish", "Ship"] },
        tools: ["B-roll template kit", "Hook swipe file"],
      },
      elaborate: {
        advanced: ["Automate captions + repurposing via Zapier/Descript"],
        longTerm: ["Review KPIs weekly; archive top-performing templates quarterly."],
      },
    },
    mentalHealth: {
      report: {
        title: "Sustainable Systems",
        bullets: [
          "Swap perfectionism for \"minimum shippable\".",
          "Schedule 1 no‑post day for recovery.",
          "Use comparison guardrails (mute triggers).",
        ],
      },
      learnMore: {
        context: "Burnout erodes long‑term compounding.",
        framework: { name: "Imperfectionist Playbook", steps: ["Permission slip", "Constraint", "Ship"] },
      },
      elaborate: {
        troubleshooting: [
          { symptom: "Anxiety before posting", fix: "Post with comments off; open later." },
        ],
        longTerm: ["Quarterly social sabbatical week to reset"],
      },
    },
  },
};

// Example usage (remove in prod):
// <ReportShell data={MOCK_DATA} onElaborate={(k)=>console.log("Elaborate:",k)} />
// Typewriter list (cute, fashionable) and helpers
function TypewriterList({ items, onceKey, persistKey }: { items: string[]; onceKey?: string; persistKey?: string }) {
  const [visible, setVisible] = React.useState<string[]>([])
  const playedRef = React.useRef<string | null>(null)
  React.useEffect(() => {
    if (!items?.length) return
    // If we have a persistent gate and it is marked done, skip typing.
    try {
      if (persistKey && localStorage.getItem(persistKey) === 'done') {
        setVisible(items)
        return
      }
    } catch {}

    if (onceKey && playedRef.current === onceKey) { setVisible(items); return }
    let i = 0
    setVisible([])
    const id = setInterval(() => {
      setVisible((v) => (i < items.length ? [...v, items[i++]] : v))
      if (i >= items.length) {
        clearInterval(id)
        if (onceKey) playedRef.current = onceKey
        try { if (persistKey) localStorage.setItem(persistKey, 'done') } catch {}
      }
    }, 200)
    return () => clearInterval(id)
  }, [items, onceKey, persistKey])
  return (
    <ul className="mt-3 list-disc space-y-2 pl-5 text-zinc-700">
      {visible.map((t, idx) => (
        <li key={idx} className="relative"><TypeLine text={t} /></li>
      ))}
    </ul>
  )
}

function TypeLine({ text }: { text: string }) {
  const [n, setN] = React.useState(0)
  React.useEffect(() => {
    let raf = 0; let i = 0
    const step = () => {
      i += Math.max(1, Math.round(text.length / 40))
      setN((prev) => (i > text.length ? text.length : i))
      if (i <= text.length) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [text])
  return <span className="relative after:ml-0.5 after:inline-block after:h-[1em] after:w-[2px] after:bg-[#9B7EDE] after:align-middle after:animate-pulse">{text.slice(0, n)}</span>
}

function makePlanAdds(group: LayerGroup): string[] {
  const tasks: string[] = []
  const pushUnique = (value: string | undefined) => {
    const v = (value || '').trim()
    if (!v) return
    if (!tasks.includes(v)) tasks.push(v)
  }
  // 1) Valid quick wins (label + how)
  if (Array.isArray(group.report.quickWins)) {
    for (const q of group.report.quickWins) {
      const label = String((q as any)?.label || '').trim()
      const how = String((q as any)?.how || '').trim()
      if (label && how) pushUnique(`${label}: ${how}`)
      if (tasks.length >= 5) break
    }
  }
  // 2) Model-supplied action bullets
  if (Array.isArray(group.report.addToYourPlan)) {
    for (const item of group.report.addToYourPlan) {
      pushUnique(typeof item === 'string' ? item : '')
      if (tasks.length >= 5) break
    }
  }
  // 2) Framework steps
  const steps = (group.learnMore?.framework?.steps || []).filter(Boolean).map(String)
  for (const s of steps) {
    if (tasks.length >= 5) break
    pushUnique(s)
  }
  // 3) Report bullets
  const bullets = (group.report?.bullets || []).filter(Boolean).map(String)
  for (const b of bullets) {
    if (tasks.length >= 5) break
    pushUnique(b)
  }
  return tasks.slice(0,5)
}

function PlatformStrategyCard({ title, content, rightSlot }: { title: string; content: { content_type: string; posting_frequency: string; key_metrics: string; growth_hack: string }, rightSlot?: React.ReactNode }) {
  const [open, setOpen] = React.useState(true)
  return (
    <Card className="fade-in">
      <div className="flex items-stretch justify-between gap-3 pr-2">
        <button
          className="sect-btn flex-1 flex items-center text-left"
          onClick={() => setOpen(v => !v)}
          aria-expanded={open}
        >
          <div className="flex items-center gap-2">
            <GradientBadge>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <circle cx="12" cy="12" r="9"/>
                <path d="M12 7v6l4 2"/>
              </svg>
            </GradientBadge>
            <h3 className="text-base font-semibold text-zinc-900">{title}</h3>
          </div>
        </button>
        <div className="shrink-0 flex items-center gap-2">
          {rightSlot}
          <button
            onClick={() => setOpen(v => !v)}
            aria-label={open ? 'Collapse' : 'Expand'}
            className="text-xl leading-none ml-2"
          >
            {open ? '–' : '+'}
          </button>
        </div>
      </div>

      <div className="sect-panel" data-open={open ? 'true' : 'false'}>
        {/* Overview paragraph tailored per platform */}
        <p className="mt-2 text-zinc-700">
          These tactics prioritize what works on each platform you select. Start with one small weekly ritual:
          match your content type to platform norms, post at a sustainable cadence, measure one key metric,
          and try one growth lever.
        </p>
        <div className="mt-3 grid grid-cols-1 gap-3 text-sm text-zinc-800 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="text-zinc-500">Content Type</div>
            <div className="font-medium">{content.content_type}</div>
          </div>
          <div>
            <div className="text-zinc-500">Posting Frequency</div>
            <div className="font-medium">{content.posting_frequency}</div>
          </div>
          <div>
            <div className="text-zinc-500">Key Metrics</div>
            <div className="font-medium">{content.key_metrics}</div>
          </div>
          <div>
            <div className="text-zinc-500">Growth Hack</div>
            <div className="font-medium">{content.growth_hack}</div>
          </div>
        </div>
        {/* Learn more for platform tactics */}
        <div className="mt-6 flex justify-center">
          <a href="/dashboard/learn/platform_specific_tactics" className="inline-flex items-center justify-center rounded-full px-6 py-2.5 text-white shadow-md transition transform hover:scale-[1.02]" style={{ background: '#9E5DAB' }}>Learn more</a>
        </div>
      </div>
    </Card>
  )
}

function GradientBadge({ children }: { children: React.ReactNode }) {
  const size = 48
  return (
    <div
      className="flex items-center justify-center rounded-full"
      style={{
        width: size,
        height: size,
        background: 'radial-gradient(circle at 30% 30%, var(--accent-grape), #8b5cf6)',
        boxShadow: '0 0 0 2px rgba(255,255,255,0.6)'
      }}
      aria-hidden
    >
      {children}
    </div>
  )
}
