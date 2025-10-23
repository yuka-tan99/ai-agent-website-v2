# Personalization System Guide
## How to Generate Dynamic Content from Onboarding Answers

This guide explains how to transform user onboarding responses into personalized dashboard content, calculated scores, and customized visualizations.

---

## 🎯 Core Concept

**Personalization Flow:**
```
User Answers → Analysis Engine → Scoring Algorithm → Content Generation → Visualization
```

---

## 📊 Part 1: Fame Score Calculation

### What to Tell Claude/AI:

**Prompt Template:**
```
"Create a Fame Score calculation algorithm that:
1. Takes user onboarding answers as input
2. Evaluates answers across 6 key dimensions: [list dimensions]
3. Assigns weighted scores to each dimension based on:
   - Current platform presence (0-20 points)
   - Content consistency (0-20 points)
   - Niche clarity (0-15 points)
   - Audience engagement (0-15 points)
   - Marketing strategy (0-15 points)
   - Execution capability (0-15 points)
4. Returns a final score from 0-100 with trend indicator"
```

### Implementation Example:

```typescript
interface ScoreWeights {
  platformPresence: number;      // max 20
  contentConsistency: number;    // max 20
  nicheClarity: number;          // max 15
  audienceEngagement: number;    // max 15
  marketingStrategy: number;     // max 15
  executionCapability: number;   // max 15
}

function calculateFameScore(answers: OnboardingAnswer[]): {
  score: number;
  trend: number;
  breakdown: ScoreWeights;
} {
  // Map answers to scoring dimensions
  const platformPresence = calculatePlatformScore(answers);
  const contentConsistency = calculateConsistencyScore(answers);
  const nicheClarity = calculateNicheScore(answers);
  // ... etc
  
  const totalScore = platformPresence + contentConsistency + nicheClarity + 
                     audienceEngagement + marketingStrategy + executionCapability;
  
  // Trend based on growth indicators in answers
  const trend = calculateTrend(answers);
  
  return {
    score: totalScore,
    trend: trend,
    breakdown: {
      platformPresence,
      contentConsistency,
      nicheClarity,
      audienceEngagement,
      marketingStrategy,
      executionCapability
    }
  };
}

// Example: Platform Presence Calculation
function calculatePlatformScore(answers: OnboardingAnswer[]): number {
  // Find answer to "Which platforms are you currently on?"
  const platformAnswer = answers.find(a => a.questionId === 5);
  
  if (!platformAnswer) return 0;
  
  const platforms = Array.isArray(platformAnswer.answer) 
    ? platformAnswer.answer 
    : [platformAnswer.answer];
  
  let score = 0;
  
  // Base points for being on platforms
  score += Math.min(platforms.length * 5, 15); // Max 15 for multiple platforms
  
  // Bonus points if on high-growth platforms
  if (platforms.includes('TikTok')) score += 3;
  if (platforms.includes('Instagram')) score += 2;
  
  return Math.min(score, 20); // Cap at 20
}
```

---

## 🎨 Part 2: Personalized Content Generation

### What to Tell Claude/AI:

**Prompt Template:**
```
"Generate personalized dashboard section content based on user answers:

Input Data:
- User answers: [provide answers array]
- Question context: [explain what each question means]

Generate for each section:
1. A personalized summary (2-3 paragraphs) that:
   - References specific answers the user gave
   - Identifies their main challenge in this area
   - Explains why this matters for THEIR situation
   - Provides hope/motivation specific to their context

2. 5 personalized action tips that:
   - Are concrete and immediately actionable
   - Reference their time constraints (from answers)
   - Match their experience level
   - Build on their stated strengths
   - Address their stated weaknesses

3. Content should feel like it was written BY a human coach FOR this specific person

Tone: Encouraging but direct, strategic, data-informed
Avoid: Generic advice, one-size-fits-all tips, vague suggestions"
```

### Implementation Pattern:

```typescript
interface PersonalizationContext {
  userAnswers: OnboardingAnswer[];
  experienceLevel: 'beginner' | 'intermediate' | 'advanced';
  timeAvailable: string; // "1-2 hours daily"
  mainGoal: string;
  currentChallenges: string[];
  platforms: string[];
  contentType: string;
  audienceSize: string;
}

function generatePersonalizedSection(
  sectionId: number,
  context: PersonalizationContext
): {
  personalizedSummary: string;
  personalizedTips: string[];
} {
  // Use rule-based logic + templates + AI generation
  
  const summary = buildPersonalizedSummary(sectionId, context);
  const tips = buildPersonalizedTips(sectionId, context);
  
  return { personalizedSummary: summary, personalizedTips: tips };
}

function buildPersonalizedSummary(
  sectionId: number,
  context: PersonalizationContext
): string {
  // Template with dynamic content
  const templates = {
    1: { // Main Problem section
      hasNicheProblem: `Your onboarding revealed that ${context.currentChallenges[0]}, 
                       which is causing ${identifyImpact(context)}. You mentioned 
                       ${extractSpecificDetail(context)}, but the paradox is that 
                       ${explainParadox(context)}. The breakthrough you need is...`,
      
      hasPerfectionismProblem: `Your assessment shows ${context.currentChallenges[0]}...`,
      // More templates based on detected problems
    }
    // ... more sections
  };
  
  // Detect which problem they have and use appropriate template
  const problemType = detectPrimaryProblem(context, sectionId);
  return fillTemplate(templates[sectionId][problemType], context);
}
```

---

## 📈 Part 3: Chart Data Generation

### What to Tell Claude/AI:

**Prompt Template:**
```
"Generate chart data for analytics visualizations based on user profile:

User Context: [provide parsed answers]

Generate:
1. Section Readiness Scores (0-100 for each of 6 areas):
   - Calculate based on their answers about current state
   - Lower scores for areas they struggle with
   - Higher scores for areas they're already doing well

2. Growth Projection Data:
   - Realistic 6-month trajectory based on:
     * Their time commitment
     * Current baseline
     * Stated consistency level
   - Include optimistic and pessimistic scenarios

3. Platform Readiness Radar Chart:
   - Score 6 dimensions: Content, Audience, Brand, Strategy, Systems, Mental
   - Base scores on specific answer patterns

Return data in format compatible with Recharts library"
```

### Implementation Example:

```typescript
function generateChartData(context: PersonalizationContext) {
  return {
    sectionScores: calculateSectionScores(context),
    growthProjection: projectGrowth(context),
    platformReadiness: calculateReadinessRadar(context),
    actionPriority: generatePriorityMatrix(context)
  };
}

function calculateSectionScores(context: PersonalizationContext) {
  // Section 1: Niche Clarity
  const nicheScore = (() => {
    // Check if they answered "I'm not sure" to niche question
    const nicheAnswer = findAnswer(context, 'niche-definition');
    if (nicheAnswer.includes('not sure')) return 40;
    if (nicheAnswer.includes('general')) return 45;
    if (nicheAnswer.includes('specific')) return 70;
    return 50;
  })();
  
  // Section 2: Execution/Perfectionism
  const executeScore = (() => {
    const postingFreq = findAnswer(context, 'posting-frequency');
    if (postingFreq === 'rarely') return 35;
    if (postingFreq === 'weekly') return 55;
    if (postingFreq === 'daily') return 80;
    return 45;
  })();
  
  return [
    { section: 'Niche', score: nicheScore, potential: 85 },
    { section: 'Execute', score: executeScore, potential: 90 },
    { section: 'Brand', score: calculateBrandScore(context), potential: 88 },
    { section: 'Marketing', score: calculateMarketingScore(context), potential: 92 },
    { section: 'Systems', score: calculateSystemsScore(context), potential: 80 },
    { section: 'Mental', score: calculateMentalHealthScore(context), potential: 75 }
  ];
}

function projectGrowth(context: PersonalizationContext) {
  const currentFollowers = parseInt(context.audienceSize) || 0;
  const timeCommitment = parseTimeCommitment(context.timeAvailable);
  const consistency = evaluateConsistency(context);
  
  // Growth rate formula based on inputs
  const monthlyGrowthRate = calculateGrowthRate(
    timeCommitment,
    consistency,
    context.experienceLevel
  );
  
  const months = ['Month 1', 'Month 2', 'Month 3', 'Month 4', 'Month 5', 'Month 6'];
  
  return months.map((month, index) => ({
    month,
    current: Math.round(currentFollowers * Math.pow(1 + monthlyGrowthRate, index)),
    projected: Math.round(currentFollowers * Math.pow(1 + monthlyGrowthRate * 1.5, index)),
    optimistic: Math.round(currentFollowers * Math.pow(1 + monthlyGrowthRate * 2, index))
  }));
}
```

---

## 🔄 Part 4: Answer Analysis & Pattern Detection

### Key Questions to Map:

```typescript
// Define your onboarding questions and what they reveal
const questionMapping = {
  // Platform & Experience
  1: { id: 'platforms', reveals: ['platformPresence', 'marketing'] },
  2: { id: 'experience-level', reveals: ['executionCapability'] },
  3: { id: 'current-followers', reveals: ['platformPresence', 'audienceEngagement'] },
  
  // Content & Niche
  4: { id: 'content-type', reveals: ['nicheClarity', 'brand'] },
  5: { id: 'niche-definition', reveals: ['nicheClarity'] },
  6: { id: 'posting-frequency', reveals: ['contentConsistency', 'executionCapability'] },
  
  // Challenges & Goals
  7: { id: 'main-challenge', reveals: ['ALL_SECTIONS'] },
  8: { id: 'time-available', reveals: ['executionCapability', 'systems'] },
  9: { id: 'growth-goal', reveals: ['marketing', 'audienceEngagement'] },
  
  // Behavior & Mindset
  10: { id: 'perfectionism-level', reveals: ['executionCapability', 'mentalHealth'] },
  11: { id: 'analytics-checking', reveals: ['mentalHealth', 'marketing'] },
  12: { id: 'content-planning', reveals: ['systems'] },
  
  // Strategy
  13: { id: 'collaboration-attempts', reveals: ['marketing'] },
  14: { id: 'brand-consistency', reveals: ['brand'] },
  15: { id: 'engagement-strategy', reveals: ['marketing', 'audienceEngagement'] }
};
```

### Pattern Detection Logic:

```typescript
function detectUserPersona(answers: OnboardingAnswer[]): UserPersona {
  const patterns = {
    isPerfectionist: checkPattern(answers, [
      { q: 'posting-frequency', values: ['rarely', 'sometimes'] },
      { q: 'perfectionism-level', values: ['very high', 'high'] },
      { q: 'unpublished-content', values: ['many', '5+'] }
    ]),
    
    lacksNiche: checkPattern(answers, [
      { q: 'niche-definition', values: ['not sure', 'general', 'everything'] },
      { q: 'content-type', values: ['various', 'random'] }
    ]),
    
    hasSystemsGap: checkPattern(answers, [
      { q: 'content-planning', values: ['no system', 'random'] },
      { q: 'posting-schedule', values: ['inconsistent', 'whenever'] }
    ]),
    
    atBurnoutRisk: checkPattern(answers, [
      { q: 'analytics-checking', values: ['constantly', 'many times daily'] },
      { q: 'stress-level', values: ['very high', 'high'] },
      { q: 'enjoyment', values: ['decreased', 'none'] }
    ])
  };
  
  return {
    primaryChallenge: identifyTopChallenge(patterns),
    secondaryChallenge: identifySecondChallenge(patterns),
    strengths: identifyStrengths(answers),
    riskFactors: identifyRisks(patterns)
  };
}
```

---

## 🎯 Part 5: Putting It All Together

### Complete Personalization Flow:

```typescript
// Main personalization function
export function generatePersonalizedDashboard(
  answers: OnboardingAnswer[]
): PersonalizedDashboard {
  
  // Step 1: Parse and analyze answers
  const context = parseAnswersToContext(answers);
  const persona = detectUserPersona(answers);
  
  // Step 2: Calculate Fame Score
  const fameScore = calculateFameScore(answers);
  
  // Step 3: Generate personalized content for each section
  const sections = [1, 2, 3, 4, 5, 6, 7, 8].map(sectionId => {
    return {
      ...baseSections[sectionId],
      personalizedSummary: generatePersonalizedSummary(sectionId, context, persona),
      personalizedTips: generatePersonalizedTips(sectionId, context, persona)
    };
  });
  
  // Step 4: Generate chart data
  const chartData = {
    sectionScores: calculateSectionScores(context),
    growthProjection: projectGrowth(context),
    platformReadiness: calculateReadinessRadar(context),
    actionPriority: generatePriorityMatrix(context, persona)
  };
  
  // Step 5: Prioritize action items based on persona
  const prioritizedSections = prioritizeSections(sections, persona);
  
  return {
    fameScore,
    sections: prioritizedSections,
    chartData,
    persona
  };
}
```

---

## 💡 Practical Prompt for Claude

**When you want Claude to generate personalized content, use this format:**

```
Context:
I'm building a creator growth dashboard that generates personalized advice.

User Onboarding Answers:
1. Q: "Which platforms are you on?" A: "TikTok and Instagram"
2. Q: "How often do you post?" A: "Sporadically, 1-2 times per week"
3. Q: "What's your biggest challenge?" A: "I'm a perfectionist and rarely publish"
4. Q: "How much time can you dedicate?" A: "1-2 hours daily"
5. Q: "Do you have a clear niche?" A: "Not really, I post about various topics"
[... include all relevant answers]

Task:
Generate a personalized summary for Section 2: "Imperfectionism | Execution" that:
- Specifically references their perfectionism challenge from Q3
- Addresses their sporadic posting pattern from Q2
- Considers their time constraint of 1-2 hours from Q4
- Provides 5 actionable tips tailored to THEIR situation
- Should be 2-3 paragraphs, encouraging but direct tone
- Make it feel like a 1-on-1 coaching session

Output Format:
{
  "personalizedSummary": "Your onboarding revealed that...",
  "personalizedTips": [
    "Tip 1 specific to their situation...",
    "Tip 2 building on their answers...",
    ...
  ]
}
```

---

## 📊 Chart Data Generation Prompt

```
Based on these user answers:
[paste parsed answers]

Generate chart data for:

1. Section Readiness Scores (array format):
   - Evaluate their current state in each area (0-100)
   - Consider: posting frequency, niche clarity, system usage, etc.
   - Return: [{ section: 'Niche', score: 45, potential: 85 }, ...]

2. Growth Projection (6 months):
   - Current followers: [from their answer]
   - Time commitment: [from their answer]
   - Calculate realistic monthly growth rate
   - Return: [{ month: 'Month 1', current: X, projected: Y, optimistic: Z }, ...]

3. Platform Readiness Radar:
   - Score 6 areas: Content, Audience, Brand, Marketing, Systems, Mental
   - Base on their specific answers about each area
   - Return: [{ category: 'Content', value: 65 }, ...]

Format all data for Recharts library compatibility.
```

---

## 🚀 Next Steps

### To Implement Full Personalization:

1. **Create Answer Parser** (`/utils/answerParser.ts`)
   - Parse raw answers into structured context
   - Detect patterns and personas

2. **Build Scoring Engine** (`/utils/scoringEngine.ts`)
   - Fame Score calculation
   - Section score calculations
   - Chart data generation

3. **Content Generator** (`/utils/contentGenerator.ts`)
   - Template-based personalization
   - Or AI-powered generation via API

4. **Update App.tsx** to use real personalization:
   ```typescript
   const personalizedData = generatePersonalizedDashboard(onboardingAnswers);
   const [fameScore] = useState(personalizedData.fameScore.score);
   const [sections] = useState(personalizedData.sections);
   const [sectionScores] = useState(personalizedData.chartData.sectionScores);
   ```

---

## 🎓 Key Principles

1. **Data-Driven**: Every personalization should trace back to a specific answer
2. **Contextual**: Consider the full picture (time, experience, goals)
3. **Actionable**: Generic advice is useless; make it specific and doable
4. **Encouraging**: Acknowledge challenges but emphasize potential
5. **Progressive**: Meet users where they are, guide them forward

---

## 📝 Example Full Prompt

```
You are a creator growth strategist analyzing onboarding data.

User Profile:
- Name: Yuka
- Platforms: TikTok, Instagram
- Posting Frequency: Sporadic, 1-2x/week
- Main Challenge: Perfectionism preventing publishing
- Time Available: 1-2 hours daily
- Niche: Unclear, posts about various productivity topics
- Current Followers: ~500
- Unpublished Content: 12 videos sitting on phone
- Analytics Checking: Multiple times daily
- Goal: Reach 10K followers in 6 months

Generate:

1. Fame Score (0-100) with calculation breakdown
2. Personalized summary for each 8 sections
3. 5 specific action tips per section
4. Chart data for all visualizations
5. Prioritized action plan

Make it feel like a personal coaching session - reference specific details from their answers, show you understand their unique situation, and provide hope + strategy.
```

