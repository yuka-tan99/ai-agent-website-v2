// lib/onboardingFlow.ts
// Smart-branching onboarding flow: types, helpers, decision tree

export type AnswerType = "single" | "multi" | "text";

export interface Option {
  label: string;
  value: string;
  next?: string;
  setVars?: Record<string, any>;
}

export interface ConditionRoute {
  when: string;
  next: string;
}

export interface Node {
  id: string;
  question: string;
  type: AnswerType;
  helperText?: string;
  maxSelect?: number;
  options?: Option[];
  placeholder?: string;
  onAnswer?: ConditionRoute[];
}

export interface DecisionTree {
  start: string;
  exit: string;
  nodes: Record<string, Node>;
}

export interface FlowState {
  vars: Record<string, any>;
  answers: Record<string, any>;
  lastNodeId?: string;
}

const includes = (needle: string, haystack: any[]) => Array.isArray(haystack) && haystack.includes(needle);
const any = (arr: boolean[]) => arr.some(Boolean);
const all = (arr: boolean[]) => arr.every(Boolean);
const not = (v: boolean) => !v;

function evalBool(expr: string, state: FlowState): boolean {
  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function("vars", "answers", "includes", "any", "all", "not", `return (${expr});`);
    return !!fn(state.vars, state.answers, includes, any, all, not);
  } catch {
    return false;
  }
}

export function getNextNode(currentId: string, state: FlowState, tree: DecisionTree): string {
  const node = tree.nodes[currentId];
  if (!node) return tree.exit;

  for (const route of node.onAnswer || []) {
    if (evalBool(route.when, state)) return route.next;
  }

  const ans = state.answers[currentId];
  if (node.type === "single" && ans && node.options) {
    const opt = node.options.find(o => o.value === ans);
    if (opt?.next) return opt.next;
  }

  const match = currentId.match(/^Q(\d+)[A-Z_]*$/);
  if (match) {
    const n = parseInt(match[1], 10) + 1;
    const guess = `Q${n}`;
    if (tree.nodes[guess]) return guess;
  }
  return tree.exit;
}

export function onAnswerPersist(state: FlowState, nodeId: string, answer: any, tree: DecisionTree) {
  state.answers[nodeId] = answer;
  const node = tree.nodes[nodeId];
  if (!node) return;
  if (node.type === 'single' && node.options) {
    const opt = node.options.find(o => o.value === answer);
    if (opt?.setVars) Object.assign(state.vars, opt.setVars);
  }
  if (node.type === 'multi' && node.options && Array.isArray(answer)) {
    for (const val of answer) {
      const opt = node.options.find(o => o.value === val);
      if (opt?.setVars) Object.assign(state.vars, opt.setVars);
    }
  }
}

export const decisionTree: DecisionTree = {
  start: "Q1",
  exit: "REPORT_GENERATION",
  nodes: {
    Q1: {
      id: "Q1",
      question: "What brings you here today?",
      type: "single",
      options: [
        { label: "I want to grow my personal brand", value: "personal_brand", next: "Q2", setVars: { identity: "personal_brand" } },
        { label: "I need to market my business/product", value: "business_brand", next: "Q1B_BUSINESS_TYPE", setVars: { identity: "business" } },
        { label: "I'm an artist/creator seeking visibility", value: "artist_creator", next: "Q1C_ART_MEDIUM", setVars: { identity: "artist" } },
        { label: "I want to monetize my existing following", value: "monetize_existing", next: "Q17", setVars: { already_monetizing_intent: true } },
        { label: "I'm stuck and need a breakthrough", value: "stuck", next: "Q2", setVars: { stage_hint: "stuck" } },
        { label: "Just exploring what's possible", value: "exploring", next: "Q1E_EXCITES", setVars: { exploring: true } }
      ]
    },

    Q1B_BUSINESS_TYPE: {
      id: "Q1B_BUSINESS_TYPE",
      question: "What type of business/product?",
      type: "single",
      options: [
        { label: "Digital product / course / coaching", value: "digital", next: "Q2", setVars: { biz_type: "digital" } },
        { label: "Service (agency/freelance/professional)", value: "service", next: "Q2", setVars: { biz_type: "service" } },
        { label: "Physical product / ecom", value: "physical", next: "Q2", setVars: { biz_type: "physical" } }
      ]
    },

    Q1C_ART_MEDIUM: {
      id: "Q1C_ART_MEDIUM",
      question: "What's your primary medium?",
      type: "single",
      options: [
        { label: "Music / Audio", value: "music", next: "Q2", setVars: { art_medium: "music" } },
        { label: "Visual / Design / Photo", value: "visual", next: "Q2", setVars: { art_medium: "visual" } },
        { label: "Writing / Literary", value: "writing", next: "Q2", setVars: { art_medium: "writing" } },
        { label: "Performance / Other", value: "other", next: "Q2", setVars: { art_medium: "other" } }
      ]
    },

    Q1E_EXCITES: {
      id: "Q1E_EXCITES",
      question: "What excites you most about social media right now?",
      type: "text",
      placeholder: "e.g., building community, creative expression, career opportunities"
    },

    Q2: {
      id: "Q2",
      question: "Where are you on your journey?",
      type: "single",
      options: [
        { label: "Starting from scratch (< 100)", value: "lt_100", setVars: { stage: "starting_from_zero" } },
        { label: "Building momentum (100–1K)", value: "100_1k", setVars: { stage: "early_momentum" } },
        { label: "Growing steadily (1K–10K)", value: "1k_10k", setVars: { stage: "growing" } },
        { label: "Established but plateauing (10K–50K)", value: "10k_50k", next: "Q2A_PLATEAU_CAUSE", setVars: { stage: "plateauing" } },
        { label: "Large following seeking optimization (50K+)", value: "50k_plus", next: "Q2A_PLATEAU_CAUSE", setVars: { stage: "large_optimizing" } },
        { label: "Had success before, starting fresh", value: "restart", setVars: { stage: "restart" } }
      ]
    },

    Q2A_PLATEAU_CAUSE: {
      id: "Q2A_PLATEAU_CAUSE",
      question: "What do you think caused the plateau?",
      type: "multi",
      maxSelect: 3,
      options: [
        { label: "Content got repetitive", value: "repetitive" },
        { label: "Algorithm changes", value: "algo" },
        { label: "Audience shift", value: "audience" },
        { label: "Inconsistent posting", value: "inconsistent" },
        { label: "Lack of new formats", value: "format_gap" }
      ]
    },

    Q3: {
      id: "Q3",
      question: "What's your biggest challenge right now? (Select up to 3)",
      type: "multi",
      maxSelect: 3,
      options: [
        { label: "I don't know what to post about", value: "no_niche" },
        { label: "I can't stay consistent", value: "inconsistent" },
        { label: "My content gets no engagement", value: "low_engagement" },
        { label: "I'm afraid of being judged", value: "fear_judgment" },
        { label: "I don't have enough time", value: "low_time" },
        { label: "I feel inauthentic/fake", value: "inauthentic" },
        { label: "I'm overwhelmed by all the advice", value: "overwhelm" },
        { label: "Technical stuff confuses me", value: "technical" },
        { label: "I compare myself to others constantly", value: "comparison" },
        { label: "My growth has completely stalled", value: "stalled" }
      ],
      onAnswer: [
        { when: "includes('fear_judgment', answers.Q3)", next: "Q14" },
        { when: "any([includes('inconsistent', answers.Q3), includes('low_time', answers.Q3), includes('overwhelm', answers.Q3)])", next: "Q9" },
        { when: "any([includes('low_engagement', answers.Q3), includes('stalled', answers.Q3)])", next: "Q11" }
      ]
    },

    Q4: {
      id: "Q4",
      question: "What does success look like for you in 6 months?",
      type: "multi",
      maxSelect: 3,
      options: [
        { label: "Consistent posting without anxiety", value: "consistency_relief" },
        { label: "A clear brand identity people recognize", value: "brand_clarity" },
        { label: "Regular engagement from my community", value: "steady_engagement" },
        { label: "First paying clients/customers", value: "first_clients" },
        { label: "Brand deals and sponsorships", value: "brand_deals" },
        { label: "Selling my own products/services", value: "sell_own" },
        { label: "Just feeling confident and authentic", value: "confidence" }
      ],
      onAnswer: [
        { when: "includes('first_clients', answers.Q4) || includes('brand_deals', answers.Q4) || includes('sell_own', answers.Q4)", next: "Q17" },
        { when: "includes('confidence', answers.Q4)", next: "Q8" }
      ]
    },

    Q5: {
      id: "Q5",
      question: "What's driving you? (Select all that resonate)",
      type: "multi",
      maxSelect: 4,
      options: [
        { label: "Financial freedom", value: "money" },
        { label: "Creative expression", value: "creative" },
        { label: "Helping others with my knowledge", value: "helping" },
        { label: "Building a legacy", value: "legacy" },
        { label: "Escaping traditional employment", value: "escape" },
        { label: "Connecting with like-minded people", value: "community" },
        { label: "Proving something to myself/others", value: "prove" },
        { label: "Having fun and experimenting", value: "fun" }
      ]
    },

    Q6: {
      id: "Q6",
      question: "How do you want people to feel after consuming your content?",
      type: "multi",
      maxSelect: 3,
      options: [
        { label: "Inspired and motivated", value: "inspired" },
        { label: "Educated and informed", value: "educated" },
        { label: "Entertained and amused", value: "entertained" },
        { label: "Comforted and understood", value: "comforted" },
        { label: "Challenged to think differently", value: "challenged" },
        { label: "Aesthetically pleased", value: "aesthetic" },
        { label: "Part of a community", value: "community" },
        { label: "Excited to take action", value: "action" }
      ]
    },

    Q7: {
      id: "Q7",
      question: "What type of content feels most natural to you?",
      type: "single",
      options: [
        { label: "Teaching/explaining things I know", value: "teaching", setVars: { content_style: "educational" } },
        { label: "Sharing my daily life and experiences", value: "lifestyle", setVars: { content_style: "lifestyle" } },
        { label: "Creating entertaining/funny content", value: "entertaining", setVars: { content_style: "entertainment" } },
        { label: "Showcasing visual aesthetics", value: "visual", setVars: { content_style: "visual" } },
        { label: "Having deep conversations", value: "conversations", setVars: { content_style: "conversation" } },
        { label: "Documenting my process/journey", value: "document", setVars: { content_style: "documentation" } },
        { label: "Reacting to trends/current events", value: "react", setVars: { content_style: "react" } },
        { label: "Building/making things", value: "building", setVars: { content_style: "build" } }
      ]
    },

    Q8: {
      id: "Q8",
      question: "How do you feel about being visible?",
      type: "single",
      options: [
        { label: "Love being on camera, very comfortable", value: "cam_comfort", setVars: { visibility: "face_on" }, next: "Q11" },
        { label: "OK with video but prefer edited/prepared", value: "edited", setVars: { visibility: "scripted" } },
        { label: "Prefer voiceovers with visuals", value: "voiceover", setVars: { visibility: "voiceover" }, next: "Q11" },
        { label: "Want to stay completely behind the scenes", value: "faceless", setVars: { visibility: "faceless" }, next: "Q11" },
        { label: "Depends on my mood/topic", value: "depends", setVars: { visibility: "variable" } },
        { label: "Want to work up to showing my face", value: "work_up", setVars: { visibility: "work_up" } }
      ],
      onAnswer: [
        { when: "answers.Q8 === 'edited' || answers.Q8 === 'depends' || answers.Q8 === 'work_up'", next: "Q11" }
      ]
    },

    Q9: {
      id: "Q9",
      question: "What's your content creation reality?",
      type: "single",
      options: [
        { label: "I can batch create on weekends", value: "batch_weekends", setVars: { time_mode: "batch_weekly" } },
        { label: "I have 15–30 minutes daily", value: "micro_daily", setVars: { time_mode: "micro_daily" } },
        { label: "I can dedicate several hours daily", value: "hours_daily", setVars: { time_mode: "pro_daily" } },
        { label: "My schedule is unpredictable", value: "chaotic", setVars: { time_mode: "chaotic" } },
        { label: "I have help/team support", value: "team", setVars: { time_mode: "team" } },
        { label: "Time isn't an issue, motivation is", value: "motivation", setVars: { time_mode: "motivation_block" } }
      ]
    },

    Q10: {
      id: "Q10",
      question: "What topics could you talk about for hours?",
      type: "text",
      placeholder: "List 3–5 themes. We'll turn these into content pillars."
    },

    Q11: {
      id: "Q11",
      question: "Where do you naturally spend time online?",
      type: "multi",
      maxSelect: 3,
      options: [
        { label: "TikTok", value: "tiktok", setVars: { platform_pref_tiktok: true } },
        { label: "Instagram", value: "instagram", setVars: { platform_pref_instagram: true } },
        { label: "YouTube", value: "youtube", setVars: { platform_pref_youtube: true } },
        { label: "Twitter/X", value: "twitter", setVars: { platform_pref_twitter: true } },
        { label: "LinkedIn", value: "linkedin", setVars: { platform_pref_linkedin: true } },
        { label: "Multiple equally", value: "multi" },
        { label: "Mostly lurking, not participating", value: "lurker" }
      ]
    },

    Q12: {
      id: "Q12",
      question: "Who needs what you have to offer?",
      type: "single",
      options: [
        { label: "People starting where I once was", value: "past_self", setVars: { audience_frame: "past_self" } },
        { label: "Professionals in my industry", value: "industry", setVars: { audience_frame: "industry" } },
        { label: "People with similar hobbies/interests", value: "hobbies", setVars: { audience_frame: "hobbies" } },
        { label: "Local community/geography", value: "local", setVars: { audience_frame: "local" } },
        { label: "Specific age group", value: "age_group" },
        { label: "Anyone who resonates", value: "broad", setVars: { audience_frame: "broad" } },
        { label: "I don't know yet", value: "unknown", next: "Q12A_HELP_WITH" }
      ]
    },

    Q12A_HELP_WITH: {
      id: "Q12A_HELP_WITH",
      question: "What do people often ask you for help with?",
      type: "text",
      placeholder: "e.g., tech tips, fitness advice, career moves"
    },

    Q13: {
      id: "Q13",
      question: "What's your relationship with data and metrics?",
      type: "single",
      options: [
        { label: "I obsessively check stats", value: "obsessive", setVars: { metric_style: "high" } },
        { label: "I look occasionally", value: "casual", setVars: { metric_style: "medium" } },
        { label: "Numbers make me anxious", value: "anxious", setVars: { metric_style: "anxious" } },
        { label: "I ignore them completely", value: "ignore", setVars: { metric_style: "low" } },
        { label: "I want to learn to use them better", value: "learn", setVars: { metric_style: "learn" } },
        { label: "I prefer qualitative feedback", value: "qualitative", setVars: { metric_style: "qual" } }
      ]
    },

    Q14: {
      id: "Q14",
      question: "What specific fears hold you back? (Select all)",
      type: "multi",
      maxSelect: 5,
      options: [
        { label: "Being cringy or embarrassing", value: "cringe" },
        { label: "Family/friends judging me", value: "friends_judging" },
        { label: "Strangers leaving mean comments", value: "mean_comments" },
        { label: "Not being good enough", value: "not_good_enough" },
        { label: "Copying others/not original", value: "copying" },
        { label: "Technical mistakes", value: "tech_mistakes" },
        { label: "Cancel culture / saying wrong thing", value: "cancel" },
        { label: "Success changing me", value: "success_change" },
        { label: "No fears, just need direction", value: "no_fear" }
      ]
    },

    Q15: {
      id: "Q15",
      question: "What have you already tried?",
      type: "multi",
      maxSelect: 4,
      options: [
        { label: "Posting consistently for a while", value: "post_consistent" },
        { label: "Following trends religiously", value: "trend_follow" },
        { label: "Expensive courses/coaching", value: "courses" },
        { label: "Different content styles", value: "style_mix" },
        { label: "Paid advertising", value: "paid_ads" },
        { label: "Nothing substantial yet", value: "nothing" },
        { label: "Everything, I'm exhausted", value: "exhausted" }
      ]
    },

    Q16: {
      id: "Q16",
      question: "How do you handle criticism?",
      type: "single",
      options: [
        { label: "I use it to improve", value: "improve" },
        { label: "It crushes me for days", value: "crushes" },
        { label: "I get defensive", value: "defensive" },
        { label: "I ignore it mostly", value: "ignore" },
        { label: "Depends who it's from", value: "depends" },
        { label: "Haven't faced much yet", value: "new" }
      ]
    },

    Q17: {
      id: "Q17",
      question: "When it comes to making money from this...",
      type: "single",
      options: [
        { label: "I need income ASAP", value: "asap", setVars: { monetization_urgency: "high" }, next: "Q17A_REVENUE_PREF" },
        { label: "I'm building long-term, no rush", value: "long_term", setVars: { monetization_urgency: "low" } },
        { label: "I want multiple revenue streams", value: "multiple", setVars: { monetization_urgency: "medium" }, next: "Q17A_REVENUE_PREF" },
        { label: "I just want to cover my costs", value: "break_even", setVars: { monetization_urgency: "medium" } },
        { label: "Money isn't the main goal", value: "not_main", setVars: { monetization_urgency: "none" } },
        { label: "I'm already monetizing but want to scale", value: "scale", setVars: { monetization_urgency: "scale" }, next: "Q17B_WHAT_WORKS" }
      ]
    },

    Q17A_REVENUE_PREF: {
      id: "Q17A_REVENUE_PREF",
      question: "Which monetization paths interest you most? (Pick up to 3)",
      type: "multi",
      maxSelect: 3,
      options: [
        { label: "Coaching / consulting", value: "coaching" },
        { label: "UGC / brand deals", value: "ugc_brand" },
        { label: "Digital products (templates, courses)", value: "digital_products" },
        { label: "Services / agency", value: "services" },
        { label: "Affiliate / partnerships", value: "affiliate" },
        { label: "Membership / community", value: "membership" }
      ]
    },

    Q17B_WHAT_WORKS: {
      id: "Q17B_WHAT_WORKS",
      question: "Which revenue streams are working best now?",
      type: "multi",
      maxSelect: 3,
      options: [
        { label: "Brand deals", value: "brand_deals" },
        { label: "Services", value: "services" },
        { label: "Digital products", value: "digital_products" },
        { label: "Coaching", value: "coaching" },
        { label: "Affiliate", value: "affiliate" },
        { label: "Other", value: "other" }
      ]
    },

    Q18: {
      id: "Q18",
      question: "What percentage of your dream life requires social media success?",
      type: "single",
      options: [
        { label: "100% - This IS my dream", value: "100" },
        { label: "75% - It's a major component", value: "75" },
        { label: "50% - Important but not everything", value: "50" },
        { label: "25% - Just one piece", value: "25" },
        { label: "Just exploring possibilities", value: "explore" }
      ]
    },

    REPORT_GENERATION: {
      id: "REPORT_GENERATION",
      question: "Generating your personalized plan…",
      type: "text",
      helperText: "We’ll synthesize your answers into obstacles → strategy → platform tactics → 90‑day plan."
    }
  }
};

