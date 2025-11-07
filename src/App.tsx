'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { LandingPage } from './components/LandingPage';
import { PricingPage } from './components/PricingPage';
import { OnboardingFlow } from './components/OnboardingFlow';
import { PaywallPage } from './components/PaywallPage';
import { PreparingDashboard } from './components/PreparingDashboard';
import { AccountPage } from './components/AccountPage';
import { PrivacyPolicyPage } from './components/PrivacyPolicyPage';
import { TermsOfServicePage } from './components/TermsOfServicePage';
import { SignInPage } from './components/SignInPage';
import { SignUpPage } from './components/SignUpPage';
import { AboutPage } from './components/AboutPage';
import { BlogPage } from './components/BlogPage';
import { FAQPage } from './components/FAQPage';
import { WhatsNewPage } from './components/WhatsNewPage';
import { SupportFormPage } from './components/SupportFormPage';
import { ReportHeader } from './components/ReportHeader';
import { ReportOverview } from './components/ReportOverview';
import { FameScoreCard } from './components/FameScoreCard';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { ActionPriorityMatrix } from './components/ActionPriorityMatrix';
import { InteractiveLessons } from './components/InteractiveLessons';
import { AskVeeChat } from './components/AskVeeChat';
import { SectionDetailView } from './components/SectionDetailView';
import { Button } from './components/ui/button';
import { 
  Target, 
  Zap, 
  Compass, 
  User, 
  TrendingUp, 
  FolderKanban, 
  Heart, 
  Rocket,
  DollarSign,
  BookOpen,
  Sparkles
} from 'lucide-react';
import { ScrollArea } from './components/ui/scroll-area';
import { motion } from 'motion/react';
import { supabase } from './lib/supabaseClient';
import { useSupabaseAuth } from './lib/useSupabaseAuth';
import { ResetPasswordPage } from './components/ResetPasswordPage';
import { calculateFameScoreFromAnswers, type OnboardingAnswersSource } from '@/lib/personalization/fameScore';

interface SectionLevelData {
  title: string;
  cards: SectionCard[];
}

interface ReportLevelData extends SectionLevelData {
  actionTips: string[];
}

interface SectionData {
  id: number;
  title: string;
  icon: React.ReactNode;
  accentColor: string;
  reportLevel: ReportLevelData;
  learnMoreLevel: SectionLevelData;
  unlockMasteryLevel: SectionLevelData;
  isPlaceholder?: boolean;
}

type CardIconKey = 'Target' | 'Sparkles' | 'TrendingUp' | 'Rocket' | 'Compass' | 'Zap' | 'User' | 'Heart' | 'FolderKanban';

interface SectionCard {
  title: string;
  content: string;
  icon: CardIconKey;
}

const REPORT_LEVEL_CONCEPTUAL_ROLES = [
  'MIRROR MOMENT',
  'THE CORE INSIGHT',
  'YOUR CURRENT REALITY',
  'YOUR OPPORTUNITY',
  'THE MINDSET SHIFT',
] as const;

const LEARN_MORE_LEVEL_CONCEPTUAL_ROLES = [
  'THE DEEP DIVE',
  'THE FRAMEWORK',
  'THE PROGRESSION',
  'THE PATTERNS',
  'THE COMMON MISTAKES',
  'THE STRATEGIC THINKING',
] as const;

const UNLOCK_MASTERY_LEVEL_CONCEPTUAL_ROLES = [
  'THE ADVANCED MECHANICS',
  'THE STRATEGIC LAYER',
  'THE INTEGRATION',
  'THE EDGE CASES',
  'THE MASTERY INDICATORS',
  'THE CUTTING EDGE',
] as const;

type SectionMeta = {
  id: number;
  title: string;
  icon: React.ReactNode;
  accentColor: string;
};

function assignCardIcons(
  cards: Array<{ conceptualRole: string; aiTitle: string; content: string }>,
  offset = 0,
): SectionCard[] {
  return cards.map((card, index) => ({
    conceptualRole: card.conceptualRole,
    aiTitle: card.aiTitle,
    content: card.content,
    icon: CARD_ICON_KEYS[(offset + index) % CARD_ICON_KEYS.length],
  }));
}

function createLevelFromRoles(title: string, roles: readonly string[], offset = 0): SectionLevelData {
  const cards = roles.map((role) => ({
    conceptualRole: role,
    aiTitle: role,
    content: PLACEHOLDER_MARKER,
  }));
  return {
    title,
    cards: assignCardIcons(cards, offset),
  };
}

function createReportLevelPlaceholder(sectionTitle: string): ReportLevelData {
  return {
    title: `${sectionTitle}: Why & What`,
    cards: assignCardIcons(
      REPORT_LEVEL_CONCEPTUAL_ROLES.map((role) => ({
        conceptualRole: role,
        aiTitle: role,
        content: PLACEHOLDER_MARKER,
      })),
    ),
    actionTips: Array(5).fill(PLACEHOLDER_MARKER),
  };
}

function normalizeActionTips(tips?: string[]): string[] {
  const cleaned = Array.isArray(tips)
    ? tips
        .map((tip) => (typeof tip === 'string' ? tip.trim() : ''))
        .filter((tip) => tip.length > 0)
    : [];
  while (cleaned.length < 5) {
    cleaned.push(PLACEHOLDER_MARKER);
  }
  return cleaned.slice(0, 5);
}

function normalizeCardsFromPayload(
  cards: Array<{ conceptual_role?: string; ai_generated_title?: string; content?: string }> | undefined,
  roles: readonly string[],
  offset = 0,
): SectionCard[] {
  const normalized = roles.map((role, index) => {
    const raw = cards?.[index];
    const aiTitle = typeof raw?.ai_generated_title === 'string' && raw.ai_generated_title.trim().length
      ? raw.ai_generated_title.trim()
      : role;
    const content = typeof raw?.content === 'string' && raw.content.trim().length ? raw.content.trim() : PLACEHOLDER_MARKER;
    return {
      conceptualRole: role,
      aiTitle,
      content,
    };
  });
  return assignCardIcons(normalized, offset);
}

function createBaseSection(meta: SectionMeta): SectionData {
  return {
    id: meta.id,
    title: meta.title,
    icon: meta.icon,
    accentColor: meta.accentColor,
    reportLevel: createReportLevelPlaceholder(meta.title),
    learnMoreLevel: createLevelFromRoles('Learn More', LEARN_MORE_LEVEL_CONCEPTUAL_ROLES, 1),
    unlockMasteryLevel: createLevelFromRoles('Unlock Mastery', UNLOCK_MASTERY_LEVEL_CONCEPTUAL_ROLES, 2),
    isPlaceholder: true,
  };
}

const SECTION_META: SectionMeta[] = [
  { id: 1, title: 'Main Problem | First Advice', icon: <Target className="w-6 h-6" />, accentColor: '#9E5DAB' },
  { id: 2, title: 'Imperfectionism | Execution', icon: <Zap className="w-6 h-6" />, accentColor: '#B481C0' },
  { id: 3, title: 'Niche | Focus Discovery', icon: <Compass className="w-6 h-6" />, accentColor: '#9E5DAB' },
  { id: 4, title: 'Personal Brand Development', icon: <User className="w-6 h-6" />, accentColor: '#D1A5DD' },
  { id: 5, title: 'Marketing Strategy', icon: <TrendingUp className="w-6 h-6" />, accentColor: '#9E5DAB' },
  { id: 6, title: 'Platform Organization & Systems', icon: <FolderKanban className="w-6 h-6" />, accentColor: '#B481C0' },
  { id: 7, title: 'Mental Health & Sustainability', icon: <Heart className="w-6 h-6" />, accentColor: '#9E5DAB' },
  { id: 8, title: 'Advanced Marketing Types & Case Studies', icon: <Rocket className="w-6 h-6" />, accentColor: '#D1A5DD' },
  { id: 9, title: 'Monetization', icon: <DollarSign className="w-6 h-6" />, accentColor: '#00CC66' },
];

const CARD_ICON_KEYS: readonly CardIconKey[] = [
  'Target',
  'Sparkles',
  'TrendingUp',
  'Rocket',
  'Compass',
  'Zap',
  'User',
  'Heart',
  'FolderKanban',
] as const;

const isCardIconKey = (value: unknown): value is CardIconKey =>
  typeof value === 'string' && CARD_ICON_KEYS.includes(value as CardIconKey);

type PlanStatus = 'idle' | 'pending' | 'in-progress' | 'complete';

type ViewType =
  | 'landing'
  | 'pricing'
  | 'privacy'
  | 'terms'
  | 'about'
  | 'blog'
  | 'faq'
  | 'whatsnew'
  | 'support'
  | 'signin'
  | 'signup'
  | 'onboarding'
  | 'paywall'
  | 'preparing'
  | 'account'
  | 'dashboard'
  | 'resetpassword';

type AppProps = {
  initialView?: ViewType;
};

type GeneratedSectionPayload = {
  section_title?: string;
  report_level?: {
    title?: string;
    cards?: Array<{ conceptual_role?: string; ai_generated_title?: string; content?: string }>;
    action_tips?: string[];
  };
  learn_more_level?: {
    title?: string;
    cards?: Array<{ conceptual_role?: string; ai_generated_title?: string; content?: string }>;
  };
  unlock_mastery_level?: {
    title?: string;
    cards?: Array<{ conceptual_role?: string; ai_generated_title?: string; content?: string }>;
  };
  accentColor?: string;
};

interface OnboardingAnswer {
  questionId: number;
  answer: string | string[];
}

const PLACEHOLDER_MARKER = 'content is generating...';

const isPlaceholderContent = (value?: string | null) => {
  if (typeof value !== 'string') return true;
  const normalized = value.trim().toLowerCase();
  return normalized.length === 0 || normalized === PLACEHOLDER_MARKER;
};

const sectionHasGeneratedContent = (section: SectionData) => {
  const combinedCards = [
    ...section.reportLevel.cards,
    ...section.learnMoreLevel.cards,
    ...section.unlockMasteryLevel.cards,
  ];
  if (combinedCards.some((card) => !isPlaceholderContent(card.content))) {
    return true;
  }
  return section.reportLevel.actionTips.some((tip) => !isPlaceholderContent(tip));
};

type SectionProgressMap = Record<number, string[]>;

const getSectionStepKeys = (section: SectionData): string[] =>
  section.reportLevel.cards.map((_, idx) => `report-${idx}`);

const calculateSectionProgressPercent = (
  section: SectionData,
  progressMap: SectionProgressMap,
): number => {
  const keys = getSectionStepKeys(section);
  if (!keys.length) return 0;
  const completed = new Set(progressMap[section.id] ?? []);
  const doneCount = keys.filter((key) => completed.has(key)).length;
  return Math.round((doneCount / keys.length) * 100);
};

const countCompletedSteps = (
  section: SectionData,
  progressMap: SectionProgressMap,
): { completed: number; total: number } => {
  const keys = getSectionStepKeys(section);
  const completed = new Set(progressMap[section.id] ?? []);
  const doneCount = keys.filter((key) => completed.has(key)).length;
  return { completed: doneCount, total: keys.length };
};

function createPlaceholderSection(base: SectionData): SectionData {
  const cloneLevel = (level: SectionLevelData, offset = 0): SectionLevelData => ({
    title: level.title,
    cards: assignCardIcons(
      level.cards.map((card) => ({
        conceptualRole: card.conceptualRole,
        aiTitle: card.aiTitle,
        content: PLACEHOLDER_MARKER,
      })),
      offset,
    ),
  });

  return {
    ...base,
    reportLevel: {
      title: base.reportLevel.title,
      cards: assignCardIcons(
        base.reportLevel.cards.map((card) => ({
          conceptualRole: card.conceptualRole,
          aiTitle: card.aiTitle,
          content: PLACEHOLDER_MARKER,
        })),
      ),
      actionTips: base.reportLevel.actionTips.map(() => PLACEHOLDER_MARKER),
    },
    learnMoreLevel: cloneLevel(base.learnMoreLevel, 1),
    unlockMasteryLevel: cloneLevel(base.unlockMasteryLevel, 2),
    isPlaceholder: true,
  };
}

const DEFAULT_FAME_SCORE = 58;
const DEFAULT_SCORE_TREND = 12;
const PROTECTED_VIEWS = new Set<ViewType>([
  'account',
  'dashboard',
  'preparing',
  'paywall',
]);
const LESSON_PROGRESS_KEY_PREFIX = 'becomefamous_lesson_progress';

export default function App({ initialView }: AppProps = {}) {
  const DEV_MODE = false;
  const { user, loading: authLoading } = useSupabaseAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const viewToPath = useMemo<Partial<Record<ViewType, string>>>(() => ({
    landing: '/',
    signup: '/signup',
    signin: '/signin',
    account: '/account',
    dashboard: '/dashboard',
    onboarding: '/onboarding',
    paywall: '/paywall',
    preparing: '/preparing',
  }), []);

  const pathToView = useCallback((path: string): ViewType => {
    switch (path) {
      case '/dashboard':
        return 'dashboard';
      case '/account':
        return 'account';
      case '/onboarding':
        return 'onboarding';
      case '/signin':
        return 'signin';
      case '/signup':
        return 'signup';
      case '/paywall':
        return 'paywall';
      case '/preparing':
        return 'preparing';
      default:
        return 'landing';
    }
  }, []);

  const [currentView, setCurrentView] = useState<ViewType>(() => {
    if (initialView) return initialView;
    if (DEV_MODE) return 'dashboard';
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      switch (path) {
        case '/dashboard':
          return 'dashboard';
        case '/account':
          return 'account';
        case '/onboarding':
          return 'onboarding';
        case '/signin':
          return 'signin';
        case '/signup':
          return 'signup';
        default:
          break;
      }
      const stored = window.localStorage.getItem('becomefamous_currentView') as ViewType | null;
      if (stored) return stored;
    }
    return 'landing';
  });

  const allowAutoDashboardRef = useRef(initialView === 'dashboard');

  const setView = useCallback((view: ViewType) => {
    allowAutoDashboardRef.current = view === 'dashboard';
    setCurrentView(view);
  }, []);

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(DEV_MODE);

  const [hasPaid, setHasPaid] = useState<boolean>(DEV_MODE);

  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<boolean>(
    DEV_MODE,
  );

  const [onboardingAnswers, setOnboardingAnswers] = useState<OnboardingAnswer[]>(
    [],
  );
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [reportSections, setReportSections] = useState<SectionData[] | null>(null);
  const reportSectionsRef = useRef<SectionData[] | null>(null);
  const [planStatus, setPlanStatus] = useState<PlanStatus>('idle');
  const [planProgress, setPlanProgress] = useState(0);
  const planAutoNavigationDoneRef = useRef(false);
  const isRoutingRef = useRef(false);
  const planRequestRef = useRef(false);
  const planSettledRef = useRef(false);
  const previousUserIdRef = useRef<string | null>(null);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const planPollTimeoutRef = useRef<number | null>(null);
  const lastSectionsReadyRef = useRef(0);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const checkoutLoadingRef = useRef(false);
  const checkoutHandledRef = useRef(false);
  const chatCheckoutHandledRef = useRef(false);
  const [chatAccessUntil, setChatAccessUntil] = useState<string | null>(null);
  const [chatCheckoutLoading, setChatCheckoutLoading] = useState(false);
  const chatCheckoutLoadingRef = useRef(false);
  const [chatCheckoutError, setChatCheckoutError] = useState<string | null>(null);
  const [openingReport, setOpeningReport] = useState(false);
  const [isInteractiveLessonsOpen, setInteractiveLessonsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [sectionProgressMap, setSectionProgressMap] = useState<Record<number, string[]>>({});
  const [paywallError, setPaywallError] = useState<string | null>(null);
  const lessonProgressLoadedKeyRef = useRef<string | null>(null);

  const changeView = useCallback(
    (view: ViewType) => {
      const hasRoute = Boolean(viewToPath[view]);
      isRoutingRef.current = hasRoute;
      if (view !== 'dashboard') {
        planAutoNavigationDoneRef.current = true;
      }
      setView(view);
    },
    [setView, viewToPath],
  );

  const hasChatAccess = useMemo(() => {
    if (hasPaid) return true;
    if (!chatAccessUntil) return false;
    const expiresAt = new Date(chatAccessUntil).getTime();
    if (Number.isNaN(expiresAt)) return false;
    return expiresAt > Date.now();
  }, [hasPaid, chatAccessUntil]);

  const [hasHydrated, setHasHydrated] = useState(false);
  useEffect(() => {
    setHasHydrated(true);
  }, []);

  useEffect(() => {
    reportSectionsRef.current = reportSections;
  }, [reportSections]);

  useEffect(() => {
    if (!hasHydrated) return;
    const path = pathname ?? '/';
    const mapped = pathToView(path);

    if (isRoutingRef.current) {
      if (viewToPath[currentView] === path) {
        isRoutingRef.current = false;
      }
      return;
    }

    const currentHasPath = Boolean(viewToPath[currentView]);
    if (!currentHasPath && mapped === 'landing') {
      return;
    }

    if (viewToPath[mapped] === path && mapped !== currentView) {
      setView(mapped);
    }
  }, [hasHydrated, pathname, pathToView, currentView, viewToPath, setView]);

  useEffect(() => {
    if (!hasHydrated) return;
    const targetPath = viewToPath[currentView];
    if (!targetPath) return;
    if (pathname !== targetPath) {
      router.replace(targetPath);
    }
  }, [hasHydrated, currentView, pathname, router, viewToPath]);

  const getAuthHeaders = useCallback(async (): Promise<Record<string, string>> => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.access_token) {
      return {
        Authorization: `Bearer ${session.access_token}`,
      };
    }
    return {};
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const existing = window.localStorage.getItem('becomefamous_session_id');
    if (existing) {
      setSessionId(existing);
      return;
    }
    const generated = (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
      ? crypto.randomUUID()
      : `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    window.localStorage.setItem('becomefamous_session_id', generated);
    setSessionId(generated);
  }, []);

  const lessonProgressStorageKey = useMemo(() => {
    if (user?.id) return `${LESSON_PROGRESS_KEY_PREFIX}_${user.id}`;
    if (sessionId) return `${LESSON_PROGRESS_KEY_PREFIX}_${sessionId}`;
    return null;
  }, [sessionId, user?.id]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const update = () => setIsMobile(window.innerWidth < 768);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  useEffect(() => {
    if (!hasHydrated) return;
    if (typeof window === 'undefined') return;

    if (!lessonProgressStorageKey) {
      lessonProgressLoadedKeyRef.current = null;
      setSectionProgressMap({});
      return;
    }

    if (lessonProgressLoadedKeyRef.current === lessonProgressStorageKey) {
      return;
    }

    lessonProgressLoadedKeyRef.current = lessonProgressStorageKey;

    const stored = window.localStorage.getItem(lessonProgressStorageKey);
    if (!stored) {
      setSectionProgressMap({});
      return;
    }

    try {
      const parsed = JSON.parse(stored);
      if (!parsed || typeof parsed !== 'object') {
        setSectionProgressMap({});
        return;
      }
      const sanitized: Record<number, string[]> = {};
      for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
        const sectionId = Number(key);
        if (!Number.isInteger(sectionId)) continue;
        if (!Array.isArray(value)) continue;
        const deduped = Array.from(
          new Set(
            value
              .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
              .filter((entry): entry is string => entry.length > 0),
          ),
        );
        if (deduped.length) {
          sanitized[sectionId] = deduped;
        }
      }
      setSectionProgressMap(sanitized);
    } catch {
      setSectionProgressMap({});
    }
  }, [hasHydrated, lessonProgressStorageKey]);

  useEffect(() => {
    if (hasChatAccess) {
      setChatCheckoutError(null);
    }
  }, [hasChatAccess]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!lessonProgressStorageKey) return;
    if (lessonProgressLoadedKeyRef.current !== lessonProgressStorageKey) return;
    window.localStorage.setItem(
      lessonProgressStorageKey,
      JSON.stringify(sectionProgressMap),
    );
  }, [sectionProgressMap, lessonProgressStorageKey]);

  const answersArrayToRecord = useCallback((answers: OnboardingAnswer[]) => {
    const record: Record<string, unknown> = {};
    for (const entry of answers) {
      const value = Array.isArray(entry.answer)
        ? entry.answer
        : entry.answer != null
          ? [entry.answer]
          : [];
      record[`q${entry.questionId}`] = value;
    }
    return record;
  }, []);

  const persistOnboarding = useCallback(async (
    answers: OnboardingAnswer[] = onboardingAnswers,
  ) => {
    const userId = user?.id ?? null;
    if (!sessionId && !userId) return;

    const payload: Record<string, unknown> = {
      answers: answersArrayToRecord(answers),
      links: [],
    };

    if (userId) payload.userId = userId;
    if (sessionId) payload.sessionId = sessionId;

    try {
      const authHeaders = await getAuthHeaders();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...authHeaders,
      };

      await fetch('/api/onboarding', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
    } catch (error) {
      console.error('Failed to persist onboarding answers', error);
    }
  }, [answersArrayToRecord, onboardingAnswers, sessionId, user?.id, getAuthHeaders]);

  const refreshAccess = useCallback(async () => {
    if (!user?.id) {
      setChatAccessUntil(null);
      return;
    }

    try {
      const authHeaders = await getAuthHeaders();
      const response = await fetch(`/api/access?userId=${user.id}`, {
        headers: {
          Accept: 'application/json',
          ...authHeaders,
        },
      });

      if (!response.ok) {
        return;
      }

      const data = await response.json();
      if (typeof data?.chatUntil === 'string' || data?.chatUntil === null) {
        setChatAccessUntil(data.chatUntil);
      }
      if (data?.report) {
        setHasPaid(true);
      }
    } catch (error) {
      console.error('Failed to refresh access', error);
    }
  }, [getAuthHeaders, user?.id]);

  useEffect(() => {
    if (!user?.id) {
      setChatAccessUntil(null);
      return;
    }
    void refreshAccess();
  }, [user?.id, refreshAccess]);
  const [profileName, setProfileName] = useState<string | null>(null);
  const [profileEmail, setProfileEmail] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [passwordUpdating, setPasswordUpdating] = useState(false);

  const userDisplayName = useMemo(() => {
    const candidates: string[] = [];
    if (profileName && profileName.trim()) candidates.push(profileName.trim());
    const displayName = user?.user_metadata?.display_name;
    if (typeof displayName === 'string' && displayName.trim()) {
      candidates.push(displayName.trim());
    }
    const metaName = user?.user_metadata?.name;
    if (typeof metaName === 'string' && metaName.trim()) {
      candidates.push(metaName.trim());
    }
    if (user?.email) {
      const base = user.email.split('@')[0];
      if (base) candidates.push(base);
    }
    return candidates[0] || 'friend';
  }, [profileName, user?.email, user?.user_metadata?.display_name, user?.user_metadata?.name]);

  const [fameScore, setFameScore] = useState<number>(DEFAULT_FAME_SCORE);
  const [scoreTrend, setScoreTrend] = useState<number>(DEFAULT_SCORE_TREND);
  const [activeDetailSection, setActiveDetailSection] = useState<SectionData | null>(null);
  const [accountInitialSection, setAccountInitialSection] = useState<'report' | 'usage' | 'rewards' | 'referrals' | 'profile'>('usage');
  const initialPlanFetchRef = useRef(false);
  
  const applyFameScoreFromAnswers = useCallback(
    (source: OnboardingAnswersSource) => {
      if (!source) return;
      if (Array.isArray(source) && source.length === 0) return;
      if (!Array.isArray(source) && Object.keys(source).length === 0) return;

      try {
        const result = calculateFameScoreFromAnswers(source);
        if (Number.isFinite(result.score)) {
          setFameScore(result.score);
        }
        if (Number.isFinite(result.trend)) {
          setScoreTrend(result.trend);
        }
      } catch (error) {
        console.error('Failed to calculate fame score', error);
        setFameScore(DEFAULT_FAME_SCORE);
        setScoreTrend(DEFAULT_SCORE_TREND);
      }
    },
    [setFameScore, setScoreTrend],
  );

  const loadProfile = useCallback(async (supabaseUser: SupabaseUser) => {
    setProfileLoading(true);
    setProfileError(null);
    try {
      const { data: freshUser } = await supabase.auth.getUser();
      const userFromSupabase = (freshUser?.user ?? supabaseUser) as SupabaseUser;

      const displayName =
        (userFromSupabase.user_metadata?.display_name as string | undefined) ??
        (userFromSupabase.user_metadata?.name as string | undefined) ??
        (userFromSupabase.user_metadata?.full_name as string | undefined) ??
        (userFromSupabase.email ? userFromSupabase.email.split('@')[0] : null);

      setProfileName(displayName ?? null);
      setProfileEmail(userFromSupabase.email ?? null);

      const nowIso = new Date().toISOString();
      const { data: profileRow, error: selectError, status } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('user_id', userFromSupabase.id)
        .maybeSingle();

      if (selectError && status !== 406) {
        throw selectError;
      }

      if (!profileRow) {
        const { error: insertError } = await supabase.from('profiles').insert({
          user_id: userFromSupabase.id,
          updated_at: nowIso,
          signup_provider: userFromSupabase.app_metadata?.provider ?? null,
          signup_at: userFromSupabase.created_at ?? nowIso,
          last_login_provider: userFromSupabase.app_metadata?.provider ?? null,
          last_login_at: nowIso,
        });

        if (insertError) {
          throw insertError;
        }
      } else {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            updated_at: nowIso,
            last_login_provider: userFromSupabase.app_metadata?.provider ?? null,
            last_login_at: nowIso,
          })
          .eq('user_id', userFromSupabase.id);

        if (updateError) {
          throw updateError;
        }
      }
    } catch (error) {
      console.error('Failed to load profile', error);
      setProfileError(
        error instanceof Error ? error.message : 'Failed to load profile',
      );
    } finally {
      setProfileLoading(false);
    }
  }, []);

  // Persist state to localStorage whenever it changes
  useEffect(() => {
    if (DEV_MODE) return;
    if (typeof window === 'undefined') return;
    localStorage.setItem('becomefamous_currentView', currentView);
  }, [currentView, DEV_MODE]);

  useEffect(() => {
    if (DEV_MODE) return;
    if (typeof window === 'undefined') return;
    localStorage.setItem('becomefamous_isAuthenticated', String(isAuthenticated));
  }, [isAuthenticated, DEV_MODE]);

  useEffect(() => {
    if (DEV_MODE) return;
    if (typeof window === 'undefined') return;
    localStorage.setItem('becomefamous_hasPaid', String(hasPaid));
  }, [hasPaid, DEV_MODE]);

  useEffect(() => {
    if (DEV_MODE) return;
    if (typeof window === 'undefined') return;
    localStorage.setItem('becomefamous_hasCompletedOnboarding', String(hasCompletedOnboarding));
  }, [hasCompletedOnboarding, DEV_MODE]);

  useEffect(() => {
    if (DEV_MODE) return;
    if (typeof window === 'undefined') return;
    localStorage.setItem('becomefamous_onboardingAnswers', JSON.stringify(onboardingAnswers));
  }, [onboardingAnswers, DEV_MODE]);

  useEffect(() => {
    if (authLoading) return;

    if (user) {
      if (previousUserIdRef.current !== user.id) {
        previousUserIdRef.current = user.id;
        planSettledRef.current = false;
        initialPlanFetchRef.current = false;
        planRequestRef.current = false;
        planAutoNavigationDoneRef.current = false;
      }
      setIsAuthenticated(true);
      loadProfile(user);
      if (typeof window !== 'undefined' && !DEV_MODE) {
        localStorage.setItem('becomefamous_isAuthenticated', 'true');
      }
      setAccountInitialSection('usage');
      if (currentView === 'signin' || currentView === 'signup') {
        changeView('account');
      }
    } else {
      previousUserIdRef.current = null;
      setIsAuthenticated(false);
      setProfileName(null);
      setProfileEmail(null);
      setProfileError(null);
      if (typeof window !== 'undefined' && !DEV_MODE) {
        localStorage.setItem('becomefamous_isAuthenticated', 'false');
      }
      if (PROTECTED_VIEWS.has(currentView)) {
        changeView('landing');
      }
      setReportSections(null);
      planRequestRef.current = false;
      planSettledRef.current = false;
      planAutoNavigationDoneRef.current = false;
    }
  }, [user, authLoading, loadProfile, currentView, changeView, DEV_MODE]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!window.location.hash) return;
    if (!window.location.hash.includes('type=recovery')) return;

    const params = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');

    if (accessToken && refreshToken) {
      supabase.auth
        .setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })
        .then(({ error }) => {
          if (error) {
            console.error('Failed to restore session from recovery link', error);
          } else {
            changeView('resetpassword');
          }
        })
        .catch((error) => {
          console.error('Unexpected error restoring session', error);
        })
        .finally(() => {
          window.location.hash = '';
        });
    } else {
      window.location.hash = '';
    }
  }, [changeView]);

  const defaultSections = useMemo<SectionData[]>(() =>
    SECTION_META.map((meta) => createBaseSection(meta)),
  [],
  );


  const mergePlanWithDefaults = useCallback(
    (plan: GeneratedSectionPayload[]) => {
      if (!Array.isArray(plan) || plan.length === 0) {
        return defaultSections;
      }

      return defaultSections.map((section, index) => {
        const generated = plan.find((item) => item.section_title === section.title) ?? plan[index];
        if (!generated) {
          return createPlaceholderSection(section);
        }

        const reportLevelPayload = generated.report_level;
        const learnLevelPayload = generated.learn_more_level;
        const masteryPayload = generated.unlock_mastery_level;

        return {
          ...section,
          title: typeof generated.section_title === 'string' && generated.section_title.trim().length
            ? generated.section_title.trim()
            : section.title,
          reportLevel: {
            title: typeof reportLevelPayload?.title === 'string' && reportLevelPayload.title.trim().length
              ? reportLevelPayload.title.trim()
              : section.reportLevel.title,
            cards: normalizeCardsFromPayload(reportLevelPayload?.cards, REPORT_LEVEL_CONCEPTUAL_ROLES),
            actionTips: normalizeActionTips(reportLevelPayload?.action_tips),
          },
          learnMoreLevel: {
            title: typeof learnLevelPayload?.title === 'string' && learnLevelPayload.title.trim().length
              ? learnLevelPayload.title.trim()
              : section.learnMoreLevel.title,
            cards: normalizeCardsFromPayload(learnLevelPayload?.cards, LEARN_MORE_LEVEL_CONCEPTUAL_ROLES, 1),
          },
          unlockMasteryLevel: {
            title: typeof masteryPayload?.title === 'string' && masteryPayload.title.trim().length
              ? masteryPayload.title.trim()
              : section.unlockMasteryLevel.title,
            cards: normalizeCardsFromPayload(masteryPayload?.cards, UNLOCK_MASTERY_LEVEL_CONCEPTUAL_ROLES, 2),
          },
          accentColor: generated.accentColor ?? section.accentColor,
          isPlaceholder: false,
        };
      });
    },
    [defaultSections],
  );


  const placeholderSections = useMemo(
    () => defaultSections.map((section) => createPlaceholderSection(section)),
    [defaultSections],
  );

  const analyticsDefaults = useMemo(() => ({
    sectionScores: [
      { section: 'Niche', score: 40, potential: 85 },
      { section: 'Execute', score: 35, potential: 80 },
      { section: 'Brand', score: 55, potential: 88 },
      { section: 'Marketing', score: 50, potential: 92 },
      { section: 'Systems', score: 35, potential: 80 },
      { section: 'Mental', score: 60, potential: 75 }
    ],
    readinessData: [
      { category: 'Content', value: 65, fullMark: 100 },
      { category: 'Consistency', value: 45, fullMark: 100 },
      { category: 'Niche', value: 40, fullMark: 100 },
      { category: 'Brand', value: 55, fullMark: 100 },
      { category: 'Marketing', value: 50, fullMark: 100 },
      { category: 'Systems', value: 35, fullMark: 100 }
    ],
    projectionData: [
      { month: 'Now', followers: 0, projected: 0 },
      { month: 'Month 1', followers: 150, projected: 200 },
      { month: 'Month 2', followers: 450, projected: 600 },
      { month: 'Month 3', followers: 1200, projected: 1800 },
      { month: 'Month 4', followers: 2800, projected: 4500 },
      { month: 'Month 5', followers: 5500, projected: 9000 },
      { month: 'Month 6', followers: 10000, projected: 18000 }
    ],
    consistencyData: [
      { day: 'Mon', posts: 2, target: 3 },
      { day: 'Tue', posts: 1, target: 3 },
      { day: 'Wed', posts: 3, target: 3 },
      { day: 'Thu', posts: 0, target: 3 },
      { day: 'Fri', posts: 2, target: 3 },
      { day: 'Sat', posts: 1, target: 3 },
      { day: 'Sun', posts: 2, target: 3 }
    ],
  }), []);

  const analyticsData = useMemo(() => {
    if (!onboardingAnswers.length) {
      return analyticsDefaults;
    }

    const clampValue = (value: number, min = 0, max = 100) => {
      if (Number.isNaN(value)) return min;
      return Math.max(min, Math.min(max, Math.round(value)));
    };

    const findAnswer = (id: number) =>
      onboardingAnswers.find((entry) => entry.questionId === id);

    const getRawValues = (id: number): string[] => {
      const entry = findAnswer(id);
      if (!entry) return [];
      if (Array.isArray(entry.answer)) return entry.answer as string[];
      if (typeof entry.answer === "string" && entry.answer.trim().length) {
        return [entry.answer];
      }
      return [];
    };

    const normalize = (value: string) => value.split(":")[0];

    const valueList = (id: number) => getRawValues(id).map(normalize);

    const has = (id: number, target: string) =>
      valueList(id).some((value) => value === target || value.startsWith(`${target}-`));

    const hasExact = (id: number, target: string) =>
      valueList(id).includes(target);

    const countSelections = (id: number) =>
      new Set(valueList(id)).size;

    const textLength = (id: number, key?: string) => {
      const raw = getRawValues(id);
      if (!raw.length) return 0;
      return raw.reduce((total, entry) => {
        const [entryKey, ...rest] = entry.split(":");
        if (key && normalize(entry) !== key) return total;
        if (!rest.length) return total;
        return total + rest.join(":").trim().length;
      }, 0);
    };

    const potentialFromScore = (score: number) => {
      const uplift = Math.max(10, Math.round((100 - score) * 0.55));
      return clampValue(score + uplift, score + 5, 100);
    };

    const adjustScore = (
      base: number,
      adjustments: Array<{ condition: boolean; delta: number }>,
    ) => {
      const total = adjustments.reduce(
        (acc, item) => (item.condition ? acc + item.delta : acc),
        base,
      );
      return clampValue(total, 10, 95);
    };

    const nicheScore = adjustScore(64, [
      { condition: hasExact(1, "figuring-out"), delta: -18 },
      { condition: hasExact(1, "just-me"), delta: -12 },
      { condition: countSelections(3) >= 4, delta: 8 },
      { condition: countSelections(3) >= 2, delta: 6 },
      {
        condition:
          has(6, "expert") || has(6, "sell") || has(6, "monetize"),
        delta: 8,
      },
      { condition: hasExact(15, "not-sure"), delta: -16 },
      { condition: countSelections(15) >= 2, delta: 8 },
      { condition: countSelections(18) >= 2, delta: 6 },
      { condition: countSelections(18) === 0, delta: -6 },
      { condition: textLength(18, "other-topics") > 40, delta: 4 },
    ]);

    const executeScore = adjustScore(58, [
      { condition: hasExact(8, "consistency"), delta: -22 },
      { condition: hasExact(8, "executing"), delta: -16 },
      { condition: hasExact(8, "time"), delta: -14 },
      { condition: hasExact(8, "burnout"), delta: -12 },
      { condition: hasExact(8, "perfectionism"), delta: -10 },
      { condition: hasExact(8, "anxiety"), delta: -8 },
      { condition: hasExact(5, "plan"), delta: 10 },
      { condition: hasExact(5, "mix"), delta: 6 },
      { condition: hasExact(5, "moment"), delta: -6 },
      { condition: hasExact(14, "40plus"), delta: 14 },
      { condition: hasExact(14, "20-40"), delta: 12 },
      { condition: hasExact(14, "10-20"), delta: 8 },
      { condition: hasExact(14, "5-10"), delta: 5 },
      { condition: hasExact(14, "1-3"), delta: -4 },
      { condition: countSelections(13) >= 3, delta: 8 },
      { condition: hasExact(13, "nothing"), delta: -10 },
    ]);

    const brandScore = adjustScore(60, [
      { condition: hasExact(10, "unique"), delta: 8 },
      { condition: hasExact(10, "creative"), delta: 6 },
      {
        condition: hasExact(10, "inspiring") || hasExact(10, "friendly"),
        delta: 5,
      },
      {
        condition: hasExact(7, "storytelling") || hasExact(7, "visuals"),
        delta: 5,
      },
      { condition: hasExact(7, "talking") || hasExact(7, "funny"), delta: 3 },
      { condition: hasExact(8, "authentic"), delta: -12 },
      { condition: hasExact(8, "judgment"), delta: -12 },
      { condition: hasExact(8, "comparing"), delta: -10 },
      { condition: hasExact(15, "not-sure"), delta: -10 },
      { condition: countSelections(3) >= 4, delta: 6 },
      { condition: hasExact(16, "identity"), delta: 8 },
      { condition: hasExact(16, "confident"), delta: 6 },
      { condition: textLength(15, "other-different") > 20, delta: 6 },
    ]);

    const marketingScore = adjustScore(55, [
      { condition: has(6, "monetize") || has(6, "sell"), delta: 10 },
      { condition: has(6, "traffic") || has(6, "network"), delta: 7 },
      { condition: has(6, "reach") || has(6, "project"), delta: 5 },
      {
        condition: hasExact(17, "financial") || hasExact(17, "building"),
        delta: 6,
      },
      { condition: hasExact(17, "legacy"), delta: 4 },
      { condition: countSelections(13) >= 3, delta: 8 },
      {
        condition:
          hasExact(13, "ads") ||
          hasExact(13, "collaborating") ||
          hasExact(13, "hashtags"),
        delta: 4,
      },
      { condition: hasExact(13, "nothing"), delta: -12 },
      { condition: hasExact(8, "strategy"), delta: -10 },
      { condition: hasExact(8, "engagement"), delta: -8 },
      { condition: hasExact(8, "monetization"), delta: -6 },
      { condition: countSelections(9) >= 3, delta: 5 },
    ]);

    const systemsScore = adjustScore(52, [
      { condition: hasExact(5, "plan"), delta: 8 },
      { condition: hasExact(5, "mix"), delta: 4 },
      { condition: hasExact(5, "moment"), delta: -6 },
      { condition: hasExact(14, "40plus"), delta: 10 },
      { condition: hasExact(14, "20-40"), delta: 8 },
      { condition: hasExact(14, "10-20"), delta: 6 },
      { condition: hasExact(14, "1-3"), delta: -4 },
      { condition: hasExact(8, "time"), delta: -12 },
      { condition: hasExact(8, "consistency"), delta: -10 },
      { condition: hasExact(8, "executing"), delta: -8 },
      {
        condition:
          hasExact(13, "posting-more") || hasExact(13, "timing"),
        delta: 6,
      },
      { condition: countSelections(13) >= 4, delta: 6 },
      { condition: hasExact(13, "nothing"), delta: -8 },
    ]);

    const mentalScore = adjustScore(63, [
      { condition: hasExact(8, "anxiety"), delta: -16 },
      { condition: hasExact(8, "judgment"), delta: -14 },
      { condition: hasExact(8, "negative"), delta: -12 },
      { condition: hasExact(8, "perfectionism"), delta: -10 },
      { condition: hasExact(8, "burnout"), delta: -9 },
      { condition: hasExact(8, "comparing"), delta: -8 },
      { condition: hasExact(8, "likes"), delta: -5 },
      { condition: hasExact(16, "confident"), delta: 10 },
      { condition: hasExact(16, "consistent"), delta: 8 },
      {
        condition:
          hasExact(17, "creative") ||
          hasExact(17, "helping") ||
          hasExact(17, "connecting"),
        delta: 6,
      },
      { condition: hasExact(17, "fun"), delta: 5 },
      {
        condition:
          hasExact(11, "love-it") ||
          hasExact(11, "okay") ||
          hasExact(11, "voice-ok"),
        delta: 6,
      },
      {
        condition:
          hasExact(11, "no-thanks") ||
          hasExact(11, "awkward") ||
          hasExact(11, "privacy") ||
          hasExact(11, "restrictions"),
        delta: -8,
      },
      { condition: countSelections(7) >= 3, delta: 4 },
    ]);

    const sectionScores = [
      {
        section: "Niche",
        score: nicheScore,
        potential: potentialFromScore(nicheScore),
      },
      {
        section: "Execute",
        score: executeScore,
        potential: potentialFromScore(executeScore),
      },
      {
        section: "Brand",
        score: brandScore,
        potential: potentialFromScore(brandScore),
      },
      {
        section: "Marketing",
        score: marketingScore,
        potential: potentialFromScore(marketingScore),
      },
      {
        section: "Systems",
        score: systemsScore,
        potential: potentialFromScore(systemsScore),
      },
      {
        section: "Mental",
        score: mentalScore,
        potential: potentialFromScore(mentalScore),
      },
    ];

    const averageScore =
      sectionScores.reduce((sum, item) => sum + item.score, 0) /
      sectionScores.length;
    const potentialAverage =
      sectionScores.reduce((sum, item) => sum + item.potential, 0) /
      sectionScores.length;

    const readinessData = [
      {
        category: "Content",
        value: clampValue((nicheScore + brandScore + marketingScore) / 3),
        fullMark: 100,
      },
      { category: "Consistency", value: executeScore, fullMark: 100 },
      { category: "Niche", value: nicheScore, fullMark: 100 },
      { category: "Brand", value: brandScore, fullMark: 100 },
      { category: "Marketing", value: marketingScore, fullMark: 100 },
      { category: "Systems", value: systemsScore, fullMark: 100 },
    ];

    let effortLevel = 0.55;
    if (hasExact(14, "40plus")) effortLevel = 1;
    else if (hasExact(14, "20-40")) effortLevel = 0.92;
    else if (hasExact(14, "10-20")) effortLevel = 0.82;
    else if (hasExact(14, "5-10")) effortLevel = 0.7;
    else if (hasExact(14, "3-5")) effortLevel = 0.6;
    else effortLevel = 0.5;

    if (hasExact(5, "plan")) effortLevel += 0.08;
    if (hasExact(5, "mix")) effortLevel += 0.04;
    if (hasExact(5, "moment")) effortLevel -= 0.08;
    if (hasExact(13, "nothing")) effortLevel -= 0.1;
    if (hasExact(8, "time")) effortLevel -= 0.15;
    if (hasExact(8, "consistency")) effortLevel -= 0.12;
    effortLevel = Math.max(0.3, Math.min(1, effortLevel));

    const consistencyFactor = Math.max(0.25, executeScore / 100);
    const improvementMultiplier =
      averageScore > 0
        ? Math.max(1.25, potentialAverage / Math.max(averageScore, 1))
        : 1.4;

    const baseGrowth = 140 + averageScore * 3;
    const actualRate = baseGrowth * effortLevel * (consistencyFactor + 0.35);
    const projectedRate = actualRate * improvementMultiplier;

    const months = [
      "Now",
      "Month 1",
      "Month 2",
      "Month 3",
      "Month 4",
      "Month 5",
      "Month 6",
    ];
    let cumulativeFollowers = 0;
    let cumulativeProjected = 0;
    const projectionData = months.map((month, index) => {
      if (index === 0) {
        return { month, followers: 0, projected: 0 };
      }
      cumulativeFollowers += actualRate;
      cumulativeProjected += projectedRate;
      return {
        month,
        followers: Math.round(cumulativeFollowers),
        projected: Math.round(cumulativeProjected),
      };
    });

    const consistencyDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const dayWeights = [1, 0.85, 1.05, 0.75, 1, 0.7, 0.9];
    const weeklyTargetBase = Math.max(7, Math.round(effortLevel * 14));
    const weeklyActualBase = Math.max(
      2,
      Math.round(weeklyTargetBase * Math.min(1, consistencyFactor + 0.15)),
    );

    const consistencyData = consistencyDays.map((day, index) => {
      const weight = dayWeights[index] ?? 1;
      const target = clampValue((weeklyTargetBase / 7) * weight, 1, 8);
      const posts = clampValue((weeklyActualBase / 7) * weight, 0, 6);
      return {
        day,
        posts: Math.max(0, Math.round(posts)),
        target: Math.max(1, Math.round(target)),
      };
    });

    return {
      sectionScores,
      readinessData,
      projectionData,
      consistencyData,
    };
  }, [analyticsDefaults, onboardingAnswers]);

  const { sectionScores, readinessData, projectionData, consistencyData } = analyticsData;

  const fetchPlan = useCallback(async () => {
    if (!user?.id) return false;
    try {
      const authHeaders = await getAuthHeaders();
      const response = await fetch('/api/reports/plan', {
        headers: authHeaders,
      });
      if (!response.ok) return false;
      const data = await response.json();
      if (data?.fameScore) {
        const scoreValue = Number(data.fameScore.score);
        if (Number.isFinite(scoreValue)) {
          setFameScore(Math.round(scoreValue));
        }
        const trendValue = Number(data.fameScore.trend);
        if (Number.isFinite(trendValue)) {
          setScoreTrend(trendValue);
        }
      } else if (onboardingAnswers.length) {
        applyFameScoreFromAnswers(onboardingAnswers);
      }
      if (data?.hasOnboarding) {
        setHasCompletedOnboarding(true);
      }
      if (Array.isArray(data.plan) && data.plan.length) {
        const merged = mergePlanWithDefaults(data.plan as GeneratedSectionPayload[]);
        setReportSections(merged);

        const totalSections = merged.length || defaultSections.length || 1;
        const readyCount = merged.filter((section) => !section.isPlaceholder).length;
        const percentage = Math.round((readyCount / totalSections) * 100);

        setPlanProgress(percentage);
        lastSectionsReadyRef.current = readyCount;

        if (readyCount === 0) {
          if (planStatus === 'idle') {
            setPlanStatus('pending');
          }
          return false;
        }

        if (readyCount === totalSections) {
          setPlanStatus('complete');
        } else if (planStatus !== 'complete') {
          setPlanStatus('in-progress');
        }

        setHasCompletedOnboarding(true);
        setHasPaid(true);
        if (
          allowAutoDashboardRef.current &&
          !planAutoNavigationDoneRef.current &&
          currentView !== 'dashboard'
        ) {
          planAutoNavigationDoneRef.current = true;
          changeView('dashboard');
        }
        planRequestRef.current = true;
        return true;
      }
    } catch (error) {
      console.error('Failed to fetch report plan', error);
    }
    return false;
  }, [
    mergePlanWithDefaults,
    user?.id,
    getAuthHeaders,
    setFameScore,
    setScoreTrend,
    onboardingAnswers,
    applyFameScoreFromAnswers,
    currentView,
    changeView,
    planStatus,
    defaultSections,
  ]);

  const generatePlan = useCallback(async () => {
    if (!user?.id) return false;
    setLoadingPlan(true);
    try {
      const authHeaders = await getAuthHeaders();
      const response = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: authHeaders,
      });
      if (response.ok) {
        const data = await response.json();
        if (data?.fameScore) {
          const scoreValue = Number(data.fameScore.score);
          if (Number.isFinite(scoreValue)) {
            setFameScore(Math.round(scoreValue));
          }
          const trendValue = Number(data.fameScore.trend);
          if (Number.isFinite(trendValue)) {
            setScoreTrend(trendValue);
          }
        } else if (onboardingAnswers.length) {
          applyFameScoreFromAnswers(onboardingAnswers);
        }
        if (Array.isArray(data.plan) && data.plan.length) {
          const merged = mergePlanWithDefaults(data.plan as GeneratedSectionPayload[]);
          setReportSections(merged);
          const totalSections = merged.length || defaultSections.length || 1;
          const readyCount = merged.filter((section) => !section.isPlaceholder).length;
          const percentage = Math.round((readyCount / totalSections) * 100);
          setPlanProgress(percentage);
          lastSectionsReadyRef.current = readyCount;
          if (readyCount === totalSections) {
            setPlanStatus('complete');
          } else if (readyCount > 0 && planStatus !== 'complete') {
            setPlanStatus('in-progress');
          }
          setHasCompletedOnboarding(true);
          setHasPaid(true);
          planRequestRef.current = true;
          return true;
        }
      }
      return fetchPlan();
    } catch (error) {
      console.error('Failed to generate report plan', error);
      return false;
    } finally {
      setLoadingPlan(false);
    }
  }, [
    fetchPlan,
    mergePlanWithDefaults,
    user?.id,
    getAuthHeaders,
    setFameScore,
    setScoreTrend,
    onboardingAnswers,
    applyFameScoreFromAnswers,
    planStatus,
    defaultSections,
  ]);

  const waitForReportCompletion = useCallback(async (): Promise<boolean> => {
    const isComplete = () => {
      const sections = reportSectionsRef.current;
      if (!Array.isArray(sections) || sections.length === 0) return false;
      return sections.every((section) => !section.isPlaceholder);
    };

    if (isComplete()) {
      return true;
    }

    if (typeof window === 'undefined') {
      return isComplete();
    }

    return new Promise<boolean>((resolve) => {
      let attempts = 0;
      const maxAttempts = 120;
      const check = () => {
        if (isComplete()) {
          resolve(true);
          return;
        }
        if (attempts >= maxAttempts) {
          resolve(false);
          return;
        }
        attempts += 1;
        window.requestAnimationFrame(check);
      };
      check();
    });
  }, []);

  const ensureReportReady = useCallback(async () => {
    if (reportSectionsRef.current && reportSectionsRef.current.every((section) => !section.isPlaceholder)) {
      return true;
    }
    if (await waitForReportCompletion()) {
      return true;
    }
    const fetched = await fetchPlan();
    if (fetched && (await waitForReportCompletion())) {
      return true;
    }
    const generated = await generatePlan();
    if (generated && (await waitForReportCompletion())) {
      return true;
    }
    return false;
  }, [fetchPlan, generatePlan, waitForReportCompletion]);

  useEffect(() => {
    if (!user?.id) return;
    if (planStatus === 'complete') return;
    if (currentView !== 'preparing' && currentView !== 'dashboard') return;

    let cancelled = false;

    const pollProgress = async () => {
      try {
        const authHeaders = await getAuthHeaders();
        const response = await fetch('/api/report/progress', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders,
          },
          body: JSON.stringify({ userId: user.id }),
        });

        if (!response.ok) {
          throw new Error('Progress request failed');
        }

        const data = await response.json();
        if (cancelled) return;

        const percent = Number(data.percent);
        if (Number.isFinite(percent)) {
          setPlanProgress((prev) => (percent > prev ? percent : prev));
        }

        const status = (typeof data.status === 'string' ? data.status : 'pending') as PlanStatus;
        if (status === 'pending' && planStatus === 'idle') {
          setPlanStatus('pending');
        } else if (status === 'in-progress') {
          setPlanStatus('in-progress');
        }

        const sectionsReady = Number(data.sectionsReady) || 0;
        if (sectionsReady > lastSectionsReadyRef.current) {
          lastSectionsReadyRef.current = sectionsReady;
          await fetchPlan();
        }

        if (status === 'complete') {
          await fetchPlan();
          setPlanProgress(100);
          setPlanStatus('complete');
          return;
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to poll report progress', error);
        }
      }

      if (!cancelled) {
        planPollTimeoutRef.current = window.setTimeout(pollProgress, 2500);
      }
    };

    pollProgress();

    return () => {
      cancelled = true;
      if (planPollTimeoutRef.current) {
        window.clearTimeout(planPollTimeoutRef.current);
        planPollTimeoutRef.current = null;
      }
    };
  }, [
    currentView,
    user?.id,
    planStatus,
    getAuthHeaders,
    fetchPlan,
  ]);

  useEffect(() => {
    if (pathname !== '/dashboard' && pathname !== '/preparing') return;
    if (authLoading) return;
    if (!user?.id) return;
    if (!hasCompletedOnboarding) return;

    if (reportSections) {
      const allSectionsReady = reportSections.every((section) => !section.isPlaceholder);

      if (!allSectionsReady) {
        planSettledRef.current = false;
        if (currentView === 'dashboard') {
          setView('preparing');
        }
        return;
      }

      if (!planSettledRef.current) {
        planSettledRef.current = true;
      }

      if (
        allowAutoDashboardRef.current &&
        !planAutoNavigationDoneRef.current &&
        currentView !== 'dashboard'
      ) {
        planAutoNavigationDoneRef.current = true;
        setView('dashboard');
      }
      return;
    }

    if (planSettledRef.current) return;
    if (planRequestRef.current || loadingPlan) {
      return;
    }

    let cancelled = false;
    planRequestRef.current = true;

    (async () => {
      try {
        await persistOnboarding(onboardingAnswers);
        const hasExistingPlan = await fetchPlan();
        if (!hasExistingPlan) {
          await generatePlan();
        }
        if (
          !cancelled &&
          allowAutoDashboardRef.current &&
          !planAutoNavigationDoneRef.current
        ) {
          setView('dashboard');
          planSettledRef.current = true;
          planAutoNavigationDoneRef.current = true;
        } else if (!cancelled) {
          planSettledRef.current = true;
        }
      } catch (error) {
        console.error('Failed to prepare personalized plan', error);
        planRequestRef.current = false;
      } finally {
        if (!cancelled) {
          planRequestRef.current = false;
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    authLoading,
    user?.id,
    hasCompletedOnboarding,
    reportSections,
    loadingPlan,
    onboardingAnswers,
    persistOnboarding,
    fetchPlan,
    generatePlan,
    currentView,
    setView,
    pathname,
  ]);

  useEffect(() => {
    if (currentView !== 'dashboard' && reportSections) {
      planAutoNavigationDoneRef.current = true;
    }
  }, [currentView, reportSections]);

  useEffect(() => {
    if (authLoading) return;
    if (!user?.id) {
      initialPlanFetchRef.current = false;
      return;
    }
    if (initialPlanFetchRef.current) return;
    initialPlanFetchRef.current = true;
    fetchPlan();
  }, [authLoading, user?.id, fetchPlan]);

  const renderSections = reportSections ?? placeholderSections;

  const interactiveSections = useMemo(
    () => renderSections.filter((section) => !section.isPlaceholder),
    [renderSections],
  );

  const reportProgress = useMemo(() => {
    let completed = 0;
    let total = 0;
    for (const section of interactiveSections) {
      const { completed: done, total: steps } = countCompletedSteps(section, sectionProgressMap);
      completed += done;
      total += steps;
    }
    if (!total) return 0;
    return Math.round((completed / total) * 100);
  }, [interactiveSections, sectionProgressMap]);

  const overviewSections = useMemo(
    () =>
      renderSections.map((section) => {
        const progress = calculateSectionProgressPercent(section, sectionProgressMap);
        return {
          id: section.id,
          title: section.title,
          icon: section.icon,
          accentColor: section.accentColor,
          completed: !section.isPlaceholder && progress === 100,
          progress,
        };
      }),
    [renderSections, sectionProgressMap],
  );
  const completedLessonIds = useMemo(
    () =>
      renderSections
        .filter((section) => calculateSectionProgressPercent(section, sectionProgressMap) === 100)
        .map((section) => section.id),
    [renderSections, sectionProgressMap],
  );
  const totalSections = renderSections.length;
  const hasCompleteReport = Boolean(
    reportSections && reportSections.every((section) => !section.isPlaceholder),
  );

  useEffect(() => {
    if (!activeDetailSection || !reportSections) return;
    const updated = reportSections.find(
      (section) => section.id === activeDetailSection.id,
    );
    if (updated && updated !== activeDetailSection) {
      setActiveDetailSection(updated);
    }
  }, [activeDetailSection, reportSections]);

  const handleOpenSectionDetail = useCallback((section: SectionData) => {
    if (!section) return;
    setActiveDetailSection(section);
  }, []);

  const handleOpenSectionDetailById = useCallback(
    (sectionId: number) => {
      const target = renderSections.find((section) => section.id === sectionId);
      if (target) {
        handleOpenSectionDetail(target);
      }
    },
    [handleOpenSectionDetail, renderSections],
  );

  const activeDetailNeighbors = useMemo(() => {
    if (!activeDetailSection) {
      return { previous: null, next: null };
    }
    const currentIndex = renderSections.findIndex(
      (section) => section.id === activeDetailSection.id,
    );
    if (currentIndex === -1) {
      return { previous: null, next: null };
    }
    const findNeighbor = (direction: 1 | -1): SectionData | null => {
      let index = currentIndex + direction;
      while (index >= 0 && index < renderSections.length) {
        const candidate = renderSections[index];
        if (
          candidate &&
          !candidate.isPlaceholder &&
          sectionHasGeneratedContent(candidate)
        ) {
          return candidate;
        }
        index += direction;
      }
      return null;
    };
    return {
      previous: findNeighbor(-1),
      next: findNeighbor(1),
    };
  }, [activeDetailSection, renderSections]);
  const previousDetailSection = activeDetailNeighbors.previous;
  const nextDetailSection = activeDetailNeighbors.next;

  useEffect(() => {
    if (currentView !== 'dashboard' || !isMobile) {
      setInteractiveLessonsOpen(false);
    }
  }, [currentView, isMobile]);

  useEffect(() => {
    if (isInteractiveLessonsOpen && interactiveSections.length === 0) {
      setInteractiveLessonsOpen(false);
    }
  }, [interactiveSections.length, isInteractiveLessonsOpen]);

  // Handler Functions
  const handleLessonCompleted = useCallback((lessonId: number) => {
    const section = renderSections.find((item) => item.id === lessonId);
    if (!section) return;
    const validKeys = getSectionStepKeys(section);
    if (!validKeys.length) return;
    setSectionProgressMap((prev) => {
      const existing = new Set(prev[section.id] ?? []);
      let changed = false;
      for (const key of validKeys) {
        if (!existing.has(key)) {
          existing.add(key);
          changed = true;
        }
      }
      if (!changed) return prev;
      return { ...prev, [section.id]: Array.from(existing) };
    });
  }, [renderSections]);

  const handleSectionStepComplete = useCallback((section: SectionData, stepKey: string) => {
    const validKeys = getSectionStepKeys(section);
    if (!validKeys.includes(stepKey)) return;
    setSectionProgressMap((prev) => {
      const existing = new Set(prev[section.id] ?? []);
      if (existing.has(stepKey)) return prev;
      existing.add(stepKey);
      return { ...prev, [section.id]: Array.from(existing) };
    });
  }, []);

  const handleStartOnboarding = () => {
    changeView('onboarding');
  };

  const handleNavigateToSignIn = () => {
    changeView('signin');
  };

  const handleNavigateToSignUp = () => {
    changeView('signup');
  };

  const handleProfileSave = async ({ name, email }: { name: string; email: string }) => {
    if (!user) {
      throw new Error('You must be signed in to update your profile.');
    }

    setProfileSaving(true);
    setProfileError(null);

    try {
      const metadata = {
        ...(user.user_metadata || {}),
        display_name: name,
        name,
        full_name: name,
      };

      const updatePayload: {
        email?: string;
        data: Record<string, unknown>;
      } = {
        data: metadata,
      };

      if (email && email !== user.email) {
        updatePayload.email = email;
      }

      const { data: updatedUser, error: updateError } = await supabase.auth.updateUser(updatePayload);
      if (updateError) {
        throw updateError;
      }

      const { error: profileUpdateError } = await supabase
        .from('profiles')
        .update({
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (profileUpdateError && profileUpdateError.code !== 'PGRST116') {
        throw profileUpdateError;
      }

      const refreshedName =
        updatedUser?.user?.user_metadata?.display_name ??
        updatedUser?.user?.user_metadata?.name ??
        name ??
        null;

      setProfileName(refreshedName);
      setProfileEmail(email || null);
      if (updatedUser?.user) {
        await loadProfile(updatedUser.user as SupabaseUser);
      }
    } catch (error) {
      console.error('Failed to update profile', error);
      setProfileError(
        error instanceof Error ? error.message : 'Failed to update profile',
      );
      throw error;
    } finally {
      setProfileSaving(false);
    }
  };

  const handleChangePassword = async (
    currentPassword: string,
    newPassword: string,
  ) => {
    if (!user) {
      throw new Error('You must be signed in to change your password.');
    }
    if (!user.email) {
      throw new Error('Your account does not have an email address.');
    }

    setPasswordUpdating(true);
    try {
      const { error: reauthError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });

      if (reauthError) {
        throw new Error('Current password is incorrect.');
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        throw updateError;
      }
    } finally {
      setPasswordUpdating(false);
    }
  };

  const handlePasswordReset = async (newPassword: string) => {
    setPasswordUpdating(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) {
        throw error;
      }
      await supabase.auth.signOut();
      setIsAuthenticated(false);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('becomefamous_password_reset_success', 'true');
      }
      changeView('signin');
    } finally {
      setPasswordUpdating(false);
    }
  };

  const handleSignInSuccess = () => {
    if (hasCompletedOnboarding && !hasPaid) {
      changeView('paywall');
    } else {
      setAccountInitialSection('usage');
      changeView('account');
    }
  };

  const handleSignUpSuccess = () => {
    changeView('signin');
  };

  const handleOnboardingComplete = async (answers: OnboardingAnswer[]) => {
    applyFameScoreFromAnswers(answers);
    setOnboardingAnswers(answers);
    setHasCompletedOnboarding(true);
    await persistOnboarding(answers);

    if (!isAuthenticated) {
      changeView('signin');
    } else {
      changeView('dashboard');
    }
  };

  const startReportGeneration = useCallback(async () => {
    if (!user?.id) {
      changeView('signin');
      return false;
    }

    checkoutLoadingRef.current = false;
    setCheckoutLoading(false);
    setReportSections(null);
    setPlanProgress(0);
    setPlanStatus('pending');
    lastSectionsReadyRef.current = 0;
    if (planPollTimeoutRef.current) {
      window.clearTimeout(planPollTimeoutRef.current);
      planPollTimeoutRef.current = null;
    }
    planSettledRef.current = false;
    planRequestRef.current = false;
    changeView('preparing');

    try {
      const authHeaders = await getAuthHeaders();
      const response = await fetch('/api/report/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({ userId: user.id }),
      });

      if (!response.ok) {
        if (response.status === 403) {
          setPaywallError('We’re still confirming your purchase. Try again in a few seconds.');
        } else {
          setPaywallError('Could not start preparing your dashboard. Please try again.');
        }
        setPlanStatus('idle');
        setPlanProgress(0);
        changeView('paywall');
        return false;
      }

      setHasPaid(true);
      setPaywallError(null);
      await refreshAccess();
      return true;
    } catch (error) {
      console.error('Failed to start report generation', error);
      setPaywallError('We hit a snag preparing your dashboard. Please try again.');
      setPlanStatus('idle');
      setPlanProgress(0);
      changeView('paywall');
      return false;
    }
  }, [user?.id, changeView, getAuthHeaders, refreshAccess]);

  useEffect(() => {
    if (!searchParams) return;
    const checkoutStatus = searchParams.get('checkout');
    if (!checkoutStatus) return;

    checkoutLoadingRef.current = false;
    setCheckoutLoading(false);
    chatCheckoutLoadingRef.current = false;
    setChatCheckoutLoading(false);

    if (typeof window !== 'undefined') {
      if (checkoutStatus === 'plan_success' || checkoutStatus === 'ai_success') {
        window.localStorage.setItem('becomefamous_pending_checkout', checkoutStatus);
      } else {
        window.localStorage.removeItem('becomefamous_pending_checkout');
      }
    }

    if (checkoutStatus === 'plan_success') {
      if (user?.id && !checkoutHandledRef.current) {
        checkoutHandledRef.current = true;
        (async () => {
          const started = await startReportGeneration();
          if (started && typeof window !== 'undefined') {
            window.localStorage.removeItem('becomefamous_pending_checkout');
          }
          if (!started) {
            checkoutHandledRef.current = false;
          }
        })();
      } else if (!user?.id) {
        setPaywallError('Sign in to finish unlocking your dashboard.');
        changeView('signin');
      }
    } else if (checkoutStatus === 'ai_success') {
      setChatCheckoutError(null);
      if (user?.id && !chatCheckoutHandledRef.current) {
        chatCheckoutHandledRef.current = true;
        (async () => {
          await refreshAccess();
          if (typeof window !== 'undefined') {
            window.localStorage.removeItem('becomefamous_pending_checkout');
          }
          chatCheckoutHandledRef.current = false;
        })();
      } else if (!user?.id) {
        setChatCheckoutError('Sign in to finish activating AI Mentor.');
        changeView('signin');
      }
    } else if (checkoutStatus === 'plan_cancelled') {
      setPaywallError('Checkout was cancelled. No charge was made.');
      changeView('paywall');
    } else if (checkoutStatus === 'ai_cancelled') {
      setChatCheckoutError('Checkout cancelled. No charge was made.');
    }

    const basePath = pathname ?? '/';
    router.replace(basePath, { scroll: false });
  }, [
    changeView,
    pathname,
    refreshAccess,
    router,
    searchParams,
    startReportGeneration,
    user?.id,
  ]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!user?.id) return;
    const pending = window.localStorage.getItem('becomefamous_pending_checkout');
    if (pending === 'plan_success' && !checkoutHandledRef.current) {
      window.localStorage.removeItem('becomefamous_pending_checkout');
      checkoutHandledRef.current = true;
      (async () => {
        const started = await startReportGeneration();
        if (started && typeof window !== 'undefined') {
          window.localStorage.removeItem('becomefamous_pending_checkout');
        }
        if (!started) {
          checkoutHandledRef.current = false;
        }
      })();
    }
    if (pending === 'ai_success' && !chatCheckoutHandledRef.current) {
      window.localStorage.removeItem('becomefamous_pending_checkout');
      chatCheckoutHandledRef.current = true;
      (async () => {
        await refreshAccess();
        chatCheckoutHandledRef.current = false;
      })();
    }
  }, [refreshAccess, startReportGeneration, user?.id]);

  const handleOpenLessons = useCallback(() => {
    if (!interactiveSections.length) return;
    setInteractiveLessonsOpen(true);
  }, [interactiveSections.length]);

  const handleCloseLessons = useCallback(() => {
    setInteractiveLessonsOpen(false);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  const handleOpenReport = useCallback(async () => {
    if (!user?.id) {
      changeView('signin');
      return;
    }
    if (openingReport) {
      return;
    }
    if (reportSectionsRef.current && reportSectionsRef.current.every((section) => !section.isPlaceholder)) {
      changeView('dashboard');
      return;
    }
    setOpeningReport(true);
    try {
      const ready = await ensureReportReady();
      if (ready) {
        changeView('dashboard');
      }
    } finally {
      setOpeningReport(false);
    }
  }, [changeView, ensureReportReady, openingReport, user?.id]);

  const handleUnlockDashboard = useCallback(async () => {
    if (!user?.id) {
      changeView('signin');
      return;
    }

    if (checkoutLoadingRef.current) {
      return;
    }

    checkoutLoadingRef.current = true;
    setCheckoutLoading(true);
    setPaywallError(null);

    try {
      const authHeaders = await getAuthHeaders();
      const origin =
        typeof window !== 'undefined' ? window.location.origin : undefined;
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({
          productKey: 'report_plan',
          userId: user.id,
          successUrl: origin ? `${origin}/?checkout=plan_success` : undefined,
          cancelUrl: origin ? `${origin}/paywall?checkout=plan_cancelled` : undefined,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data?.url) {
        const errorMessage =
          typeof data?.error === 'string'
            ? data.error
            : 'Unable to start checkout. Please try again.';
        setPaywallError(errorMessage);
        setCheckoutLoading(false);
        checkoutLoadingRef.current = false;
        return;
      }

      window.location.href = data.url as string;
    } catch (error) {
      console.error('Failed to start checkout session', error);
      setPaywallError('Unable to connect to the payment provider. Please try again.');
      setCheckoutLoading(false);
      checkoutLoadingRef.current = false;
    }
  }, [changeView, getAuthHeaders, user?.id]);

  const handleStartChatCheckout = useCallback(async () => {
    if (!user?.id) {
      changeView('signin');
      return;
    }

    if (chatCheckoutLoadingRef.current) {
      return;
    }

    chatCheckoutLoadingRef.current = true;
    setChatCheckoutLoading(true);
    setChatCheckoutError(null);

    try {
      const authHeaders = await getAuthHeaders();
      const origin =
        typeof window !== 'undefined' ? window.location.origin : undefined;
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({
          productKey: 'ai_subscription',
          userId: user.id,
          successUrl: origin ? `${origin}/?checkout=ai_success` : undefined,
          cancelUrl: origin ? `${origin}/?checkout=ai_cancelled` : undefined,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data?.url) {
        const errorMessage =
          typeof data?.error === 'string'
            ? data.error
            : 'Unable to start subscription checkout. Please try again.';
        setChatCheckoutError(errorMessage);
        setChatCheckoutLoading(false);
        chatCheckoutLoadingRef.current = false;
        return;
      }

      window.location.href = data.url as string;
    } catch (error) {
      console.error('Failed to start AI subscription checkout', error);
      setChatCheckoutError('Unable to connect to the payment provider. Please try again.');
      setChatCheckoutLoading(false);
      chatCheckoutLoadingRef.current = false;
    }
  }, [changeView, getAuthHeaders, user?.id]);

  const handlePreparingComplete = () => {
    setHasPaid(true);
    setPlanStatus('complete');
    setPlanProgress(100);
    // After first payment, show account page with Usage section
    setAccountInitialSection('usage');
    if (
      reportSections &&
      reportSections.every((section) => !section.isPlaceholder)
    ) {
      changeView('dashboard');
    }
    void refreshAccess();
  };

  const handleBackToAccount = () => {
    setAccountInitialSection('usage');
    setPaywallError(null);
    changeView('account');
  };

  const handleBecomeFamousNow = () => {
    setPaywallError(null);
    // From account page, start onboarding if not completed
    if (!hasCompletedOnboarding) {
      changeView('onboarding');
    } else if (!hasPaid) {
      changeView('paywall');
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Failed to sign out of Supabase', error);
    }

    setIsAuthenticated(false);
    setHasPaid(false);
    setHasCompletedOnboarding(false);
    setOnboardingAnswers([]);
    setFameScore(DEFAULT_FAME_SCORE);
    setScoreTrend(DEFAULT_SCORE_TREND);
    allowAutoDashboardRef.current = false;
    planAutoNavigationDoneRef.current = false;
    setChatAccessUntil(null);
    setChatCheckoutError(null);
    setChatCheckoutLoading(false);
    chatCheckoutLoadingRef.current = false;
    changeView('landing');
    setProfileName(null);
    setProfileEmail(null);
    setProfileError(null);
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('becomefamous_pending_checkout');
    }

    if (typeof window !== 'undefined') {
      localStorage.removeItem('becomefamous_isAuthenticated');
      localStorage.removeItem('becomefamous_hasPaid');
      localStorage.removeItem('becomefamous_hasCompletedOnboarding');
      localStorage.removeItem('becomefamous_onboardingAnswers');
      localStorage.removeItem('becomefamous_currentView');
    }

    if (pathname !== '/') {
      isRoutingRef.current = true;
      router.replace('/');
    }

  };

  if (!hasHydrated) {
    return <div className="min-h-screen bg-background" />;
  }

  // View Routing
  if (currentView === 'landing') {
    return (
      <LandingPage 
        onStartOnboarding={handleStartOnboarding}
        onSignIn={handleNavigateToSignIn}
        onNavigateToPricing={() => changeView('pricing')}
        onNavigateToPrivacy={() => changeView('privacy')}
        onNavigateToTerms={() => changeView('terms')}
        onNavigateToAbout={() => changeView('about')}
        onNavigateToBlog={() => changeView('blog')}
        onNavigateToFAQ={() => changeView('faq')}
        onNavigateToWhatsNew={() => changeView('whatsnew')}
      />
    );
  }

  if (currentView === 'pricing') {
    return (
      <PricingPage
        onBack={() => changeView('landing')}
        onGetStarted={handleStartOnboarding}
      />
    );
  }

  if (currentView === 'privacy') {
    return (
      <PrivacyPolicyPage
        onBack={() => changeView('landing')}
      />
    );
  }

  if (currentView === 'terms') {
    return (
      <TermsOfServicePage
        onBack={() => changeView('landing')}
      />
    );
  }

  if (currentView === 'about') {
    return (
      <AboutPage
        onBack={() => changeView('landing')}
      />
    );
  }

  if (currentView === 'blog') {
    return (
      <BlogPage
        onBack={() => changeView('landing')}
      />
    );
  }

  if (currentView === 'faq') {
    return (
      <FAQPage
        onBack={() => changeView('landing')}
        onNavigateToSupport={() => changeView('support')}
      />
    );
  }

  if (currentView === 'whatsnew') {
    return (
      <WhatsNewPage
        onBack={() => changeView('landing')}
      />
    );
  }

  if (currentView === 'support') {
    return (
      <SupportFormPage
        onBack={() => changeView('faq')}
      />
    );
  }

  if (currentView === 'resetpassword') {
    return (
      <ResetPasswordPage
        isLoading={passwordUpdating}
        onSubmit={handlePasswordReset}
        onCancel={() => changeView('signin')}
      />
    );
  }

  if (currentView === 'signin') {
    return (
      <SignInPage
        onBack={() => changeView('landing')}
        onSignIn={handleSignInSuccess}
        onNavigateToSignUp={handleNavigateToSignUp}
      />
    );
  }

  if (currentView === 'signup') {
    return (
      <SignUpPage
        onBack={() => changeView('landing')}
        onSignUp={handleSignUpSuccess}
        onNavigateToSignIn={handleNavigateToSignIn}
      />
    );
  }

  if (currentView === 'onboarding') {
    return (
      <OnboardingFlow 
        onComplete={handleOnboardingComplete}
        onBack={() => changeView('landing')}
      />
    );
  }

  if (currentView === 'paywall') {
    return (
      <PaywallPage 
        onUnlock={handleUnlockDashboard}
        onBack={handleBackToAccount}
        isProcessing={checkoutLoading}
        errorMessage={paywallError}
      />
    );
  }

  if (currentView === 'preparing') {
    return (
      <PreparingDashboard 
        onComplete={handlePreparingComplete}
        progress={planProgress}
        status={planStatus}
      />
    );
  }

  // Show Account Page
  if (currentView === 'account') {
    return (
      <>
        <AccountPage 
          onNavigateToDashboard={handleOpenReport}
          hasCompletedOnboarding={hasCompletedOnboarding}
          hasPaid={hasPaid}
          onBecomeFamousNow={handleBecomeFamousNow}
          onLogout={handleLogout}
          initialSection={accountInitialSection}
          profileName={profileName || ''}
          profileEmail={profileEmail || user?.email || ''}
          onProfileSave={handleProfileSave}
          profileSaving={profileSaving}
          profileError={profileError}
          onChangePassword={handleChangePassword}
          passwordUpdating={passwordUpdating}
          getAuthHeaders={getAuthHeaders}
          navigateToDashboardLoading={openingReport}
        />
        {/* Ask Vee Chat - Available in Account Page */}
        <AskVeeChat 
          isPaidUser={hasChatAccess}
          creatorType="content creator"
          onboardingAnswers={onboardingAnswers}
          userName={userDisplayName}
          userId={user?.id ?? undefined}
          onUpgrade={handleStartChatCheckout}
          upgradeLoading={chatCheckoutLoading}
          upgradeError={chatCheckoutError}
        />
      </>
    );
  }

  if (currentView === 'dashboard' && !hasCompleteReport) {
    return (
      <PreparingDashboard
        onComplete={handlePreparingComplete}
        progress={planProgress}
        status={planStatus}
      />
    );
  }

  // Show Dashboard
  return (
    <>
      {/* Section Detail View - Immersive Overlay */}
      {activeDetailSection && (
        <SectionDetailView
          sectionNumber={activeDetailSection.id}
          totalSections={totalSections}
          title={activeDetailSection.title}
          icon={activeDetailSection.icon}
          accentColor={activeDetailSection.accentColor}
          mainCards={activeDetailSection.reportLevel.cards.map((card) => ({
            title: card.aiTitle,
            content: card.content,
          }))}
          actionTips={activeDetailSection.reportLevel.actionTips}
          learnMoreSubpages={activeDetailSection.learnMoreLevel.cards.map((card) => ({
            title: card.aiTitle,
            content: card.content,
          }))}
          unlockMasterySubpages={activeDetailSection.unlockMasteryLevel.cards.map((card) => ({
            title: card.aiTitle,
            content: card.content,
          }))}
          onBack={() => setActiveDetailSection(null)}
          onNextSection={
            nextDetailSection ? () => setActiveDetailSection(nextDetailSection) : undefined
          }
          onPreviousSection={
            previousDetailSection ? () => setActiveDetailSection(previousDetailSection) : undefined
          }
          completedStepKeys={sectionProgressMap[activeDetailSection.id] ?? []}
          onCompleteStep={(stepKey) => handleSectionStepComplete(activeDetailSection, stepKey)}
        />
      )}

      {isMobile && (
        <InteractiveLessons
          isOpen={isInteractiveLessonsOpen}
          onClose={handleCloseLessons}
          sections={interactiveSections}
          completedLessonIds={completedLessonIds}
          onMarkLessonComplete={handleLessonCompleted}
        />
      )}

      {/* Main Dashboard */}
      <div className="min-h-screen bg-background">
        <ScrollArea className="h-screen">
          <div className="max-w-7xl mx-auto p-6 lg:p-8">
            <ReportHeader
              progress={reportProgress}
              onBackToAccount={() => changeView('account')}
            />

            {/* Fame Score - Prominent Position */}
            <div className="mb-8 max-w-2xl mx-auto">
              <FameScoreCard score={fameScore} trend={scoreTrend} />
            </div>

            <div className="mb-10">
              <ReportOverview
                sections={overviewSections}
                onViewSection={handleOpenSectionDetailById}
              />
            </div>

            {isMobile && interactiveSections.length > 0 && (
              <div className="mb-8 max-w-2xl mx-auto">
                <motion.button
                  onClick={handleOpenLessons}
                  className="group relative w-full overflow-hidden rounded-[36px]"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{
                    opacity: 1,
                    y: 0,
                    scale: [1, 1.02, 1],
                    boxShadow: [
                      '0 16px 48px rgba(158, 93, 171, 0.12)',
                      '0 24px 56px rgba(158, 93, 171, 0.22)',
                      '0 16px 48px rgba(158, 93, 171, 0.12)',
                    ],
                  }}
                  whileHover={{ scale: 1.04, boxShadow: '0 28px 64px rgba(158, 93, 171, 0.28)' }}
                  whileTap={{ scale: 0.98 }}
                  transition={{
                    duration: 0.6,
                    ease: 'easeOut',
                    scale: { duration: 3.5, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' },
                    boxShadow: { duration: 3.5, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' },
                  }}
                  >
                  <motion.div
                    className="absolute inset-0"
                    style={{
                      background: 'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.6), transparent 60%)',
                    }}
                    animate={{
                      opacity: [0.5, 0.8, 0.5],
                    }}
                    transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                  />
                  <div
                    className="relative rounded-[36px] p-6"
                    style={{
                      border: '3px solid #9932CC',
                      background: 'linear-gradient(135deg, rgba(158, 93, 171, 0.08) 0%, rgba(143, 217, 251, 0.08) 100%)',
                      boxShadow: '0 16px 48px rgba(158, 93, 171, 0.16)',
                    }}
                  >
                    <motion.div
                      className="absolute -right-6 top-0 h-20 w-20 rounded-full opacity-0 group-hover:opacity-40"
                      style={{ background: 'radial-gradient(circle, rgba(143, 217, 251, 0.4), transparent 70%)' }}
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                    />

                    <div className="relative flex items-center gap-4">
                      <motion.div
                        className="flex h-14 w-14 items-center justify-center rounded-[22px] shadow-xl"
                        style={{
                          background: 'linear-gradient(135deg, #F8E8F5 0%, #D4E5F9 100%)',
                        }}
                        animate={{ rotate: [0, 6, -6, 0], scale: [1, 1.05, 1] }}
                        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                      >
                        <BookOpen className="h-7 w-7" style={{ color: '#9E5DAB' }} />
                      </motion.div>
                      <div className="flex-1 text-left">
                        <h3 className="text-base font-semibold" style={{ color: '#9E5DAB' }}>
                          Start Interactive Lessons
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          Learn your personalized action plan with a swipe-friendly storybook experience.
                        </p>
                      </div>
                      <motion.div
                        className="hidden items-center gap-2 rounded-full bg-[#9E5DAB] px-4 py-2 text-xs font-medium text-white sm:flex"
                        animate={{ x: [0, 6, 0] }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                      >
                        9 chapters
                        <Sparkles className="h-4 w-4" />
                      </motion.div>
                    </div>
                  </div>
                </motion.button>
              </div>
            )}

            {/* Analytics Overview Section */}
            <div className="mb-8 space-y-6">
              <div className="text-center mb-6">
                <h2>Your Analytics Dashboard</h2>
                <p className="text-muted-foreground mt-2">
                  Track your progress and identify opportunities
                </p>
              </div>

              <ActionPriorityMatrix />

              <AnalyticsDashboard
                sectionScores={sectionScores}
                readinessData={readinessData}
                projectionData={projectionData}
                consistencyData={consistencyData}
              />
            </div>

            <div className="mt-12 p-6 rounded-2xl text-center" style={{ backgroundColor: '#EBD7DC20' }}>
              <h3 className="mb-2">Ready to take action?</h3>
              <p className="text-muted-foreground mb-4">
                Start with Section 1 and work your way through each action step
              </p>
              <div className="text-sm text-muted-foreground">
                Updated: {new Date().toLocaleDateString()}
              </div>
            </div>
          </div>
        </ScrollArea>
      </div>

      {/* Ask Vee Chat - Available in Dashboard */}
      <AskVeeChat 
        isPaidUser={hasChatAccess}
        creatorType="content creator"
        onboardingAnswers={onboardingAnswers}
        userName={userDisplayName}
        userId={user?.id ?? undefined}
        onUpgrade={handleStartChatCheckout}
        upgradeLoading={chatCheckoutLoading}
        upgradeError={chatCheckoutError}
      />
    </>
  );
}
