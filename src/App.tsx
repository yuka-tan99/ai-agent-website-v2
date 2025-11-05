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
import { ReportSection } from './components/ReportSection';
import { FameScoreCard } from './components/FameScoreCard';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { ActionPriorityMatrix } from './components/ActionPriorityMatrix';
import { LessonView } from './components/LessonView';
import { InteractiveLessons } from './components/InteractiveLessons';
import { AskVeeChat } from './components/AskVeeChat';
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

interface SectionData {
  id: number;
  title: string;
  icon: React.ReactNode;
  summary: string;
  personalizedSummary?: string;
  personalizedTips?: string[];
  keyInsights: string[];
  learnMoreContent: {
    description: string;
    actionSteps: string[];
    tips: string[];
  };
  cards?: SectionCard[];
  elaborateContent?: {
    overview: string;
    advancedTechniques: {
      title: string;
      items: string[];
    };
    troubleshooting: {
      title: string;
      items: string[];
    };
    longTermStrategy: {
      title: string;
      items: string[];
    };
    expertResources?: string[];
  };
  accentColor: string;
  isPlaceholder?: boolean;
}

type CardIconKey = 'Target' | 'Sparkles' | 'TrendingUp' | 'Rocket' | 'Compass' | 'Zap' | 'User' | 'Heart' | 'FolderKanban';

interface SectionCard {
  title: string;
  content: string;
  icon?: CardIconKey;
}

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
  title?: string;
  summary?: string;
  personalizedSummary?: string;
  personalizedTips?: string[];
  keyInsights?: string[];
  cards?: Array<{
    title?: string;
    content?: string;
    icon?: CardIconKey;
  }>;
  learnMoreContent?: {
    description?: string;
    actionSteps?: string[];
    tips?: string[];
  };
  elaborateContent?: {
    overview?: string;
    advancedTechniques?: {
      title?: string;
      items?: string[];
    };
    troubleshooting?: {
      title?: string;
      items?: string[];
    };
    longTermStrategy?: {
      title?: string;
      items?: string[];
    };
    expertResources?: string[];
  };
  accentColor?: string;
};

interface OnboardingAnswer {
  questionId: number;
  answer: string | string[];
}

const PLACEHOLDER_MARKER = 'content is generating...';

function createPlaceholderSection(base: SectionData): SectionData {
  return {
    ...base,
    summary: '',
    personalizedSummary: '',
    personalizedTips: [],
    keyInsights: [],
    learnMoreContent: {
      description: '',
      actionSteps: [],
      tips: [],
    },
    elaborateContent: undefined,
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
const LESSON_COMPLETION_KEY_PREFIX = 'becomefamous_completed_lessons';

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
  const [completedLessonIds, setCompletedLessonIds] = useState<number[]>([]);
  const [paywallError, setPaywallError] = useState<string | null>(null);
  const completedLessonsLoadedKeyRef = useRef<string | null>(null);

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

  const lessonCompletionStorageKey = useMemo(() => {
    if (user?.id) return `${LESSON_COMPLETION_KEY_PREFIX}_${user.id}`;
    if (sessionId) return `${LESSON_COMPLETION_KEY_PREFIX}_${sessionId}`;
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

    if (!lessonCompletionStorageKey) {
      completedLessonsLoadedKeyRef.current = null;
      setCompletedLessonIds((prev) => (prev.length ? [] : prev));
      return;
    }

    if (completedLessonsLoadedKeyRef.current === lessonCompletionStorageKey) {
      return;
    }

    completedLessonsLoadedKeyRef.current = lessonCompletionStorageKey;

    const stored = window.localStorage.getItem(lessonCompletionStorageKey);
    if (!stored) {
      return;
    }

    try {
      const parsed = JSON.parse(stored);
      const sanitized = Array.isArray(parsed)
        ? Array.from(
            new Set(
              parsed
                .map((value) => Number(value))
                .filter((value) => Number.isInteger(value)),
            ),
          ).sort((a, b) => a - b)
        : [];
      setCompletedLessonIds((prev) => {
        if (
          prev.length === sanitized.length &&
          prev.every((value, index) => value === sanitized[index])
        ) {
          return prev;
        }
        return sanitized;
      });
    } catch {
      // Ignore malformed data and keep current in-memory progress.
    }
  }, [hasHydrated, lessonCompletionStorageKey]);

  useEffect(() => {
    if (hasChatAccess) {
      setChatCheckoutError(null);
    }
  }, [hasChatAccess]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!lessonCompletionStorageKey) return;
    if (completedLessonsLoadedKeyRef.current !== lessonCompletionStorageKey) return;
    const uniqueSorted = Array.from(new Set(completedLessonIds)).sort(
      (a, b) => a - b,
    );
    window.localStorage.setItem(
      lessonCompletionStorageKey,
      JSON.stringify(uniqueSorted),
    );
  }, [completedLessonIds, lessonCompletionStorageKey]);

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
  const [activeLessonSection, setActiveLessonSection] = useState<SectionData | null>(null);
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

  const defaultSections = useMemo<SectionData[]>(() => [
    {
      id: 1,
      title: "Main Problem | First Advice",
      icon: <Target className="w-6 h-6" />,
      summary: "Niche clarity emerges through content experimentation, not perfect planning",
      personalizedSummary: "Based on your onboarding responses, you're currently posting sporadically across multiple topics without a clear focus, which is causing inconsistent engagement and making it difficult to attract a dedicated audience. Your main challenge isn't a lack of ideas—it's the uncertainty about which direction to commit to. You mentioned feeling overwhelmed by the pressure to 'pick the perfect niche' before starting, which has kept you in analysis paralysis for the past few months. The key insight for you is that your niche will reveal itself through experimentation, not contemplation. You have diverse interests in productivity, personal development, and lifestyle content, but you haven't tested which one resonates most with both you and your audience. Your time constraint of 1-2 hours per day actually works in your favor here—it forces you to be strategic and experiment quickly rather than overproducing content that might miss the mark.",
      personalizedTips: [
        "This week, create three 15-30 second videos on three different subtopics within your interests: one about a productivity hack you actually use, one sharing a personal growth lesson, and one showing your authentic daily routine. Post them and track which one feels most natural to create.",
        "Set up a simple notes app on your phone and for the next 7 days, record every question people ask you in real life or online. These questions are gold—they show what people naturally see you as an expert in.",
        "Spend 20 minutes today watching the top 10 videos in each of your potential niches. Notice which content you can watch without getting bored and which makes you think 'I could do this better.' That's your signal.",
        "Create a 'content energy tracker'—after each video you make this week, rate 1-10 how energized vs. drained you felt. Your sustainable niche lives at the intersection of high energy and audience interest.",
        "Schedule 30 minutes this Sunday to review your week's experiments. Look for patterns: What got the most saves? What generated meaningful comments? What did YOU enjoy making? Use this data to double down next week."
      ],
      keyInsights: [
        "Create three 15-second TikToks about different topics you enjoy, posting one daily for immediate feedback.",
        "Document audience questions from comments and DMs to identify what people actually want to learn from you.",
        "Test one 'day in the life' style video showing your authentic process—viewers often connect with the person behind the content.",
        "Surface sparks",
        "Map audience"
      ],
      learnMoreContent: {
        description: "Finding your niche isn't about picking the perfect box to fit in—it's about discovering where your authentic interests intersect with audience demand. Many creators get stuck endlessly researching niches without actually creating any. The truth? Your niche evolves through experimentation, not contemplation.",
        actionSteps: [
          "Set up a simple content calendar for the next 7 days with 2-3 different topic areas you're passionate about",
          "Create your first experimental video today - make it 15-30 seconds, focus on one clear idea",
          "Set up a simple spreadsheet to track: topic, engagement rate, questions asked, and your energy level creating it",
          "After posting each video, spend 15 minutes engaging with comments and documenting what resonates",
          "Review your data weekly to identify patterns in what energizes you AND attracts engagement"
        ],
        tips: [
          "Don't wait for the 'perfect' niche - your authentic voice will naturally attract the right audience",
          "The content that feels easiest to create is often your strongest signal",
          "Pay attention to the questions people ask you in real life - that's content gold"
        ]
      },
      elaborateContent: {
        overview: "Advanced niche discovery involves understanding the intersection of four key elements: your unique expertise (what you know better than most), your energy alignment (what you could talk about endlessly), market demand (what people are actively searching for), and your personal story (what makes your perspective unique). The most successful creators find the sweet spot where all four overlap.",
        advancedTechniques: {
          title: "Advanced Techniques & Edge Cases",
          items: [
            "The Niche Validation Framework: Use the '4-Quadrant Method' to plot your content ideas against Passion (Y-axis) and Market Demand (X-axis). Only pursue niches in the high-passion, high-demand quadrant.",
            "Micro-Niche Stacking: Instead of one broad niche, combine 2-3 micro-niches to create a unique positioning (e.g., 'productivity for creative introverts' vs. just 'productivity tips').",
            "The Search Data Validation Test: Before committing to a niche, analyze search volume and competition using tools like Google Trends, TikTok search suggestions, and YouTube autocomplete to ensure demand exists.",
            "Edge Case - The Passion Trap: What if your passion has zero market demand? Strategy: Find the closest adjacent niche that HAS demand and bridge to your passion topic gradually over time.",
            "The 'Could I create 100 pieces?' sustainability test: List 100 potential content topics in your niche in 30 minutes. If you struggle to hit 50, your niche might be too narrow for long-term sustainability."
          ]
        },
        troubleshooting: {
          title: "Troubleshooting Common Failures",
          items: [
            "Problem: 'I tested 3 niches and none are working' → Solution: You likely didn't give each niche enough time. Commit to 30 pieces of content minimum per niche before evaluating performance. Early metrics are unreliable.",
            "Problem: 'My niche performs well but I hate creating content for it' → Solution: This is unsustainable. Pivot toward a sub-topic within your niche that energizes you, even if it initially gets less traction. Passion compounds over time.",
            "Problem: 'I found my niche but growth is slow' → Diagnosis: Your niche might be too specific or saturated. Run competitive analysis—if top creators in your space have <50K followers, market size might be limited. Consider expanding slightly.",
            "Problem: 'I keep changing niches every few weeks' → Root cause: Fear of commitment and perfectionism. Implement the '90-day niche commitment contract'—commit to one niche for 90 days no matter what, then evaluate with data.",
            "Problem: 'My audience engages but doesn't grow' → Analysis: You might have niche-audience fit but lack discovery optimization. Focus on trend participation and strategic hashtags to increase reach while maintaining your niche focus."
          ]
        },
        longTermStrategy: {
          title: "Long-Term Strategy Development",
          items: [
            "The Niche Evolution Roadmap: Plan your niche expansion over 12-24 months. Start hyper-specific (Year 1), establish authority, then strategically expand to adjacent topics (Year 2) while maintaining core expertise.",
            "Building a Defensible Niche Moat: Develop unique frameworks, signature content formats, or proprietary methodologies that make your niche positioning difficult to replicate. Your story + your system = defensible position.",
            "Multi-Platform Niche Adaptation: Your niche might need slight positioning adjustments per platform. Document your 'niche positioning guide' for TikTok vs. Instagram vs. YouTube to optimize for each algorithm while maintaining brand consistency.",
            "The Audience Segmentation Strategy: As you grow, your audience will naturally segment into sub-groups. Plan how you'll serve different segments (beginners vs. advanced) without diluting your core message—consider platform separation or content series.",
            "Monetization Alignment: Design your niche with future monetization in mind. Can this niche support digital products? Sponsorships? Coaching? Services? Map your 3-year revenue model to ensure your niche has commercial viability.",
            "Authority Compounding System: Create a content flywheel where each piece builds on previous work. Develop 'pillar content' in your niche that you reference repeatedly, establishing you as THE definitive source over time."
          ]
        },
        expertResources: [
          "Case Study: How @creatorname went from 0 to 100K by testing 30 different content angles in 60 days and using data to find their winning niche",
          "Template: The Niche Discovery Matrix - Interactive worksheet to map your expertise vs. audience demand with scoring system",
          "Advanced: Using YouTube/TikTok search data and Google Trends to validate niche demand before committing time and energy"
        ]
      },
      accentColor: "#9E5DAB"
    },
    {
      id: 2,
      title: "Imperfectionism | Execution",
      icon: <Zap className="w-6 h-6" />,
      summary: "Action beats perfection—ship content consistently to build momentum",
      personalizedSummary: "Your onboarding revealed that perfectionism is your biggest execution blocker—you've spent weeks refining scripts, re-recording videos multiple times, and ultimately not posting because 'it's not quite right yet.' You mentioned having 12 drafted videos sitting unpublished on your phone, each one representing hours of work that your audience will never see. This pattern is costing you real growth: while you're perfecting one video, creators in your space are posting daily and learning what actually works. Your fear stems from concern about judgment and wanting every piece to be 'worthy' of your audience's time, but ironically, your audience can't even find you because you're not consistently showing up. With limited time (1-2 hours daily), perfectionism is especially destructive because it amplifies the time cost of each piece. The breakthrough you need is redefining success: from 'creating perfect content' to 'consistently shipping valuable content.' Your 'B- work' is probably better than most people's 'A' work, and more importantly, imperfect content that exists beats perfect content that doesn't.",
      personalizedTips: [
        "Today, right now, choose one of those 12 drafted videos, spend maximum 10 minutes adding a caption, and post it. No re-recording, no major edits. This breaks the perfection spell and you'll likely find it performs better than you expect.",
        "Implement the '20-minute content sprint' rule: Set a timer for 20 minutes, create one piece of content start to finish (record, basic edit, caption), and when the timer ends, it must be posted within 5 minutes. Do this 3x this week.",
        "Create a 'good enough' checklist personalized to your content type: Clear audio? ✓ One valuable takeaway? ✓ Authentic energy? ✓ If yes to all three, it ships today. This removes subjective perfectionism and gives you objective criteria.",
        "Join a creator accountability group or find one creator friend to do daily 'ship challenges' with. Knowing someone else is expecting you to post creates positive pressure that overrides perfectionism.",
        "Track your 'hours spent per published video' this week vs. next week. Challenge yourself to cut that time in half while maintaining your quality checklist. You'll discover most perfectionist editing adds zero value to the viewer experience."
      ],
      keyInsights: [
        "Set a 20-minute timer and create one piece of content start to finish without editing",
        "Publish 'good enough' content 3x per week rather than perfect content once per month",
        "Track completion rate, not perfection score—celebrate shipping over polishing"
      ],
      learnMoreContent: {
        description: "Perfectionism is the silent killer of creative careers. While you're perfecting that one piece of content, competitors are shipping daily and learning what actually works. The market rewards consistency and volume in the early stages more than perfection.",
        actionSteps: [
          "Create a 'minimum viable post' checklist - what's the bare minimum for you to hit publish?",
          "Schedule specific 'creation windows' in your calendar where you batch create without editing",
          "Join an accountability group or find a partner who commits to shipping on the same schedule",
          "Implement the 'B- work' rule: If it's at least B- quality, it ships today"
        ],
        tips: [
          "Your 'imperfect' content often performs better because it feels more authentic",
          "Every piece of content is a learning opportunity - you can't learn from unpublished work",
          "The difference between 80% and 95% quality is rarely noticeable to your audience"
        ]
      },
      elaborateContent: {
        overview: "Understanding the psychology behind perfectionism helps you overcome it. Most perfectionism stems from fear of judgment, imposter syndrome, or unclear success metrics. By reframing 'done' as the new metric of success, you shift from a fixed mindset to a growth mindset. Elite creators understand that velocity beats perfection in the early growth stages.",
        advancedTechniques: {
          title: "Advanced Techniques & Edge Cases",
          items: [
            "The 70-20-10 Quality Allocation: Spend 70% effort on 'good enough' daily content, 20% on polished weekly pieces, 10% on exceptional monthly cornerstone content. This balances quality and consistency.",
            "Batch Creation Sprints: Use the Pomodoro method for content creation—25-minute focused sprints where you can't edit, only create. This forces you past perfectionist paralysis and into flow state.",
            "The 'B- Work' Publishing Threshold: Develop a simple 3-criteria checklist (clear message, acceptable quality, provides value). If it meets these, it ships immediately. Removes subjective perfectionism.",
            "Strategic Imperfection: Intentionally include minor 'imperfections' (authentic pauses, natural speech patterns, casual editing) that increase relatability and parasocial connection.",
            "Edge Case - High-Stakes Content: Some content (brand partnerships, major announcements) warrants extra polish. Create a 'polish matrix' defining which content types get 20-min edits vs. 2-hour edits."
          ]
        },
        troubleshooting: {
          title: "Troubleshooting Common Failures",
          items: [
            "Problem: 'I still can't hit publish even with lower standards' → Solution: Use the '5-4-3-2-1 Launch Method'—count down from 5 and hit publish at 1. Your brain doesn't have time to generate perfectionist objections.",
            "Problem: 'My 'imperfect' content performs worse' → Reality check: Track actual metrics over 30 days. You'll often find no correlation between your perceived quality and audience engagement. They care about value, not polish.",
            "Problem: 'I feel shame after posting imperfect work' → Reframe: Every post is market research. You're not publishing failures; you're running experiments. Detach ego from individual posts and attach to overall trajectory.",
            "Problem: 'My audience expects high quality from me now' → Truth: You created this expectation and can slowly shift it. Gradually introduce more 'raw' content formats while maintaining your core quality standards on key pieces.",
            "Problem: 'I waste hours re-recording the same video' → Implementation: One-take rule—you get exactly one take, then edit that take. If it's truly unusable, you re-record the entire script differently, not the same script again."
          ]
        },
        longTermStrategy: {
          title: "Long-Term Strategy Development",
          items: [
            "Building Your Content Operating System: Document your entire creation workflow with time budgets per step. Over time, optimize this system to reduce time investment while maintaining quality floor.",
            "The Velocity-Quality Growth Curve: In months 1-6, optimize for velocity and learning (3-7 posts/week at B+ quality). Months 6-12, introduce quality tiers. Year 2+, you can afford more polish because you have audience and data.",
            "Developing Format Mastery: Perfectionism often comes from creating new formats constantly. Master 2-3 repeatable formats so well that you can execute them quickly at high quality. Familiarity breeds speed.",
            "Team & Delegation Strategy: As you grow, identify which parts of creation you're perfectionistic about and which you're not. Delegate the rest. Many creators hire editors because they're precious about filming, not editing.",
            "Audience Education: Train your audience to expect and value your 'raw authentic style' through consistent messaging. Make it part of your brand: 'I prioritize helping you quickly over perfect production.'",
            "The Perfection Audit Ritual: Monthly, review your creation time logs. Identify where perfectionism added time without adding value to the viewer. Eliminate those steps next month. Continuous improvement, not perfection."
          ]
        },
        expertResources: [
          "Framework: The 70-20-10 Content Quality Matrix—how to allocate effort across your content library",
          "Template: Post-publish reflection tracker to compare perceived vs. actual quality metrics over time",
          "Case Study: Creator who 10x their growth by publishing daily 'imperfect' content vs. weekly 'perfect' content"
        ]
      },
      accentColor: "#B481C0"
    },
    {
      id: 3,
      title: "Niche | Focus Discovery",
      icon: <Compass className="w-6 h-6" />,
      summary: "Narrow your focus to dominate a specific audience segment",
      personalizedSummary: "Your current content strategy is too broad—you're trying to appeal to 'anyone interested in self-improvement,' which in practice means you're not strongly resonating with anyone specific. Your analytics show scattered engagement across different topics with no clear core audience emerging. You mentioned wanting to avoid 'boxing yourself in,' but the paradox is that trying to serve everyone is actually limiting your growth. Your diverse background in both corporate productivity and creative pursuits is an asset, but right now it's diluting your message rather than strengthening it. The data from your onboarding shows you get the most engagement when talking about 'productivity for creative people,' but you've been afraid to lean fully into that because it feels too narrow. Here's what you're missing: that intersection is actually a thriving micro-niche with hungry audience demand and relatively low competition. People who identify as both creative and productivity-focused are desperate for content that speaks to their unique struggles—not generic productivity tips designed for corporate workers, and not pure creativity content that ignores structure. This is your opportunity to own a specific space.",
      personalizedTips: [
        "Write one crystal-clear sentence: 'I help [creative professionals / content creators / artists] who struggle with [consistency / time management / staying organized] achieve [specific outcome].' Put this at the top of your profile and let it guide every piece of content for 30 days.",
        "Audit your last 20 posts and categorize them by audience. Delete or archive anything that doesn't serve your newly defined niche. This clarity will make your profile instantly more followable when new visitors arrive.",
        "Create a 'niche filter' document: Before creating any content, ask 'Would my ideal viewer—a creative person struggling with productivity—find this immediately valuable?' If not, it doesn't get made this month.",
        "Study 5 creators who successfully serve your specific niche intersection. What language do they use? What problems do they address? What gaps can you fill better than they do? Create a competitive advantage map.",
        "Design a 7-day content series specifically for your niche: '7 productivity systems that actually work for creative brains.' This forces you to commit to your focus and demonstrates authority to both you and your audience."
      ],
      keyInsights: [
        "Define your 'who for' and 'what problem' in one sentence",
        "Audit your last 10 posts—do they all serve the same core audience?",
        "Create content exclusively for one specific person for 30 days"
      ],
      learnMoreContent: {
        description: "A focused niche isn't about limiting your potential—it's about maximizing your impact. When you try to serve everyone, you serve no one well. The riches are in the niches.",
        actionSteps: [
          "Write out your 'ideal viewer' avatar in detail - their age, struggles, aspirations, and current situation",
          "Review your existing content and categorize it by audience segment",
          "Identify your top 3 performing pieces and find the common thread",
          "Commit to a 30-day niche focus challenge with clear boundaries"
        ],
        tips: [
          "You can always expand your niche later—start narrow and go deep",
          "The more specific your niche, the easier it is to create targeted content",
          "Your sub-niche should be specific enough that you can describe your exact audience in detail"
        ]
      },
      elaborateContent: {
        overview: "The most successful niches operate at the intersection of specificity and scale. You want a niche narrow enough that you're seen as THE expert, but broad enough to sustain long-term growth. Advanced niche strategy involves creating a 'niche ladder'—starting hyper-specific to gain authority, then strategically expanding while maintaining your core expertise.",
        advancedTechniques: {
          title: "Advanced Techniques & Edge Cases",
          items: [
            "The Niche Specificity Sweet Spot Formula: Your niche should be specific enough to rank in top 10 creators within 6 months, but broad enough to support 500+ content ideas. Use this as your calibration test.",
            "Psychographic Niche Positioning: Instead of demographic targeting (women 25-35), focus on psychographic targeting (ambitious people who feel stuck). This creates deeper resonance and clearer content direction.",
            "The Anti-Niche Strategy: For creators with diverse interests, create a 'personal brand niche' where YOU are the niche. Your unique combination of experiences becomes the throughline, not a topic.",
            "Platform-Specific Niche Adaptation: Your niche might need micro-adjustments per platform—TikTok rewards hyper-specific hooks, YouTube rewards broader educational value. Document your positioning guide for each.",
            "Edge Case - Niche Saturation: If your ideal niche is saturated, use the 'Perspective Pivot'—same niche, but unique angle (productivity tips FROM a neurodivergent perspective, not just productivity tips)."
          ]
        },
        troubleshooting: {
          title: "Troubleshooting Common Failures",
          items: [
            "Problem: 'My niche is too narrow—I ran out of content ideas' → Solution: You likely went too specific. Expand one level broader (from 'morning routines for night shift nurses' to 'wellness for shift workers').",
            "Problem: 'I defined my niche but content still feels scattered' → Root cause: You have a stated niche but haven't internalized it. Create a one-sentence content filter and pin it above your workspace. Every idea must pass through it.",
            "Problem: 'My niche attracts audience but wrong audience type' → Diagnosis: Messaging mismatch. Audit your language, hooks, and imagery. You might be attracting beginners when you want to serve advanced folks (or vice versa).",
            "Problem: 'I feel boxed in by my niche' → Reframe: A niche isn't a cage; it's a starting point. Plan your expansion ladder. Master your core niche for 6-12 months, then expand to adjacent topics from position of authority.",
            "Problem: 'Different platforms need different niches' → Strategy: Keep your core niche consistent, but adapt your content format and depth per platform. Same topic, different execution styles."
          ]
        },
        longTermStrategy: {
          title: "Long-Term Strategy Development",
          items: [
            "The Niche Ladder Framework: Design a 3-year expansion plan. Year 1: Hyper-specific niche (establish authority). Year 2: Expand to adjacent topics. Year 3: Become category leader across broader niche.",
            "Building Niche Authority Assets: Create definitive resources in your niche—ultimate guides, frameworks, free tools—that make you the default expert. These compound your authority over time.",
            "The Sub-Niche Franchise Model: Once you own your core niche, you can branch into sub-niches or related topics. But always maintain your core. Think: main show + spin-offs, not constant pivots.",
            "Competitive Positioning Map: Quarterly, map where you sit versus other creators in your niche on 2 axes (education vs. entertainment, beginner vs. advanced). Identify white space and strategic positioning opportunities.",
            "Audience Maturation Strategy: Your audience will evolve in their journey. Plan how your niche will evolve with them (start with beginner content, gradually introduce intermediate/advanced) without alienating new followers.",
            "Cross-Niche Collaboration Strategy: Identify 3-5 adjacent niches whose audiences would benefit from your expertise. Build relationships with creators in those spaces for mutual growth through collaboration."
          ]
        },
        expertResources: [
          "Case Study: How a fitness creator went from 'general fitness' to 'desk worker mobility' and 5x their engagement by getting laser-focused",
          "Template: Audience Avatar Deep-Dive Worksheet with psychographic profiling and pain point mapping",
          "Exercise: Competitive Niche Gap Analysis—finding profitable white space in crowded markets"
        ]
      },
      accentColor: "#9E5DAB"
    },
    {
      id: 4,
      title: "Personal Brand Development",
      icon: <User className="w-6 h-6" />,
      summary: "Build a recognizable identity that attracts your ideal audience",
      personalizedSummary: "Your onboarding assessment reveals that your personal brand is currently undefined and inconsistent—your visual style changes from post to post, your tone varies dramatically, and there's no clear 'you' that people can connect with or remember. You mentioned feeling like you're 'trying on different personas' to see what works, but this experimentation phase has gone on too long and is preventing people from forming a clear impression of who you are and what you stand for. Your profile lacks a cohesive story: your bio is generic, your content has no visual consistency, and viewers can't predict what to expect from you. This matters because in a crowded creator space, people follow personalities, not just content. Your authentic self—someone who's professionally accomplished but also values creativity and balance—is actually compelling, but you've been hiding behind overly polished 'content creator' templates instead of showing up as yourself. The breakthrough is understanding that your brand doesn't need to be perfect or revolutionary; it needs to be consistent and authentically you. People connect with real humans, not content machines.",
      personalizedTips: [
        "Spend 1 hour today creating your 'brand story' document: Write out your journey (why you started creating, what you've learned, what you stand for), your three core values that guide your content, and the transformation you want to help your audience achieve. This becomes your north star.",
        "Design 3 simple content templates in Canva that reflect your personality—choose 2-3 brand colors (stick to them for 30 days), select one font combination, and create intro/outro styles you'll use consistently. Visual consistency builds recognition faster than you think.",
        "Identify your 'signature elements': This could be how you start videos ('Hey, it's [name] and today we're talking about...'), a unique format (always 3 tips, always story-then-lesson), or a catchphrase. Pick 1-2 elements and use them in every piece for the next month.",
        "Film a 60-second 'this is me' video sharing your real story—why you're qualified to teach your niche, what makes your perspective unique, and what you're working toward. Pin this to your profile. Vulnerability builds connection and trust faster than polish.",
        "Create a 'brand alignment check' you run before posting: Does this content reflect my core values? Does it sound like how I actually talk? Would I share this with a friend? If not, revise it until it feels authentic to your voice and brand."
      ],
      keyInsights: [
        "Define your 3 core brand pillars and ensure every post touches at least one",
        "Create a consistent visual style guide (colors, fonts, intro style)",
        "Develop your signature phrases or format that makes you instantly recognizable"
      ],
      learnMoreContent: {
        description: "Your personal brand is what people say about you when you're not in the room. It's the consistent thread that runs through all your content, making you memorable and trustworthy.",
        actionSteps: [
          "Complete a brand audit: What do you want to be known for?",
          "Create a mood board of visual inspiration for your content aesthetic",
          "Write your brand story in 2-3 paragraphs",
          "Design 3 content templates that reflect your brand style"
        ],
        tips: [
          "Authenticity beats aspiration—show the real you",
          "Consistency compounds—small branding choices add up over time",
          "Your personality is your biggest differentiator"
        ]
      },
      elaborateContent: {
        overview: "Elite personal brands are built on a foundation of strategic storytelling, consistent visual identity, and authentic personality. The most powerful brands have a clear 'brand DNA'—a unique combination of values, visual style, tone of voice, and content formats that become instantly recognizable. This goes beyond logos and colors; it's about creating an emotional connection and consistent expectation with your audience.",
        advancedTechniques: {
          title: "Advanced Techniques & Edge Cases",
          items: [
            "The Brand Archetype System: Identify your primary brand archetype (Creator, Sage, Hero, Rebel, etc.) and let it guide all brand decisions—from visual style to content tone to partnerships.",
            "Signature Format Engineering: Develop a proprietary content format that becomes synonymous with you (e.g., 'Explain X in 3 Levels' or 'I tested X for 30 days'). Format consistency = brand recognition.",
            "Visual Brand Anchors: Beyond colors/fonts, establish 'brand anchors'—specific visual elements (how you frame shots, your intro animation, your thumbnail style) that make your content instantly recognizable in-feed.",
            "Voice & Tone Gradient: Document not just your brand voice (friendly, authoritative, casual) but how it shifts based on context (educational content vs. personal vlogs vs. collaborations). Consistency within flexibility.",
            "Edge Case - Evolving Without Confusing: As you grow, your brand will evolve. Use the '80/20 rule'—keep 80% of brand elements consistent while evolving 20% to stay fresh without losing recognition."
          ]
        },
        troubleshooting: {
          title: "Troubleshooting Common Failures",
          items: [
            "Problem: 'My brand feels inauthentic' → Root cause: You're copying someone else's brand instead of developing your own. Audit: What would you create if no one was watching? That's your authentic brand voice.",
            "Problem: 'I change my visual style every week' → Solution: Create a locked-in brand kit (3 colors, 2 fonts, 5 content templates) and commit to using ONLY these for 90 days. Consistency requires discipline.",
            "Problem: 'My brand is consistent but boring' → Missing element: Personality. Consistency in structure, variety in content. Your format can be repeatable while your topics and energy vary.",
            "Problem: 'People don't remember me after seeing my content' → Diagnosis: Lack of distinctive elements. You need a 'signature' something—a catchphrase, visual element, format, or perspective that makes you memorable.",
            "Problem: 'My brand works on one platform but not others' → Strategy: Your core brand (values, personality, mission) stays constant. Your execution (format, length, style) adapts per platform. Same essence, different packaging."
          ]
        },
        longTermStrategy: {
          title: "Long-Term Strategy Development",
          items: [
            "The Brand Evolution Roadmap: Plan how your brand will mature over 2-3 years. Early stage: build recognition through consistency. Mid-stage: expand while maintaining core. Late stage: you have permission to innovate.",
            "Building Brand Equity: Every piece of content is a deposit into your brand equity bank. Consistency compounds. Document what your brand stands for and against—this guides all future decisions.",
            "Multi-Format Brand Consistency: As you expand to new platforms or formats (podcast, newsletter, courses), create a 'brand translation guide' that ensures consistent brand experience across all touchpoints.",
            "Personal Story Integration: Your personal journey is the ultimate brand differentiator. Strategically weave your story into content—not every video, but consistently enough that your audience feels they know you.",
            "Brand Partnership Strategy: As opportunities arise, use brand fit as your filter. If a partnership doesn't align with your brand values or aesthetic, decline it. Protecting brand integrity is more valuable than short-term revenue.",
            "Building a Brand Legacy System: Document your brand in a comprehensive guide (voice, values, visual standards, content pillars) so that if you eventually build a team or scale, your brand remains consistent across all creators."
          ]
        },
        expertResources: [
          "Template: Complete Brand Style Guide Generator—colors, fonts, voice, values, and visual standards all in one document",
          "Framework: The Brand Archetype System—discover your authentic brand personality among 12 proven archetypes",
          "Exercise: Brand consistency audit tool—measure alignment across all platforms and touchpoints"
        ]
      },
      accentColor: "#D1A5DD"
    },
    {
      id: 5,
      title: "Marketing Strategy",
      icon: <TrendingUp className="w-6 h-6" />,
      summary: "Strategic content distribution to maximize reach and impact",
      personalizedSummary: "Your onboarding revealed a critical gap in your strategy: you're creating content but not actively marketing or distributing it beyond just posting and hoping. You mentioned posting on TikTok and Instagram but doing zero community engagement, no strategic hashtag research, no collaboration outreach, and no content repurposing across platforms. Your current 'strategy' is essentially: create, post, and pray for the algorithm to favor you. This passive approach is why your growth has stagnated despite creating decent content. You're treating content creation as the end goal when it's actually just the beginning. Your limited time (1-2 hours daily) is currently spent 90% on creation and 10% on distribution, when it should be closer to 60/40. The data shows you're active on platforms where your target audience exists, but you're not engaging with that community, commenting on other creators' posts, or making yourself discoverable through strategic interactions. Additionally, you're creating content in one format for one platform and leaving massive opportunities on the table by not repurposing. A single piece of content could become 5+ touchpoints with your audience, but you're treating each post as a one-and-done effort.",
      personalizedTips: [
        "Implement the '10-10-10 rule' starting today: Before posting any content, spend 10 minutes engaging with comments on similar creators' posts, 10 minutes researching trending hashtags in your niche, and 10 minutes planning how you'll repurpose this content for another platform. This ensures distribution gets equal focus.",
        "Create a 'repurposing workflow' for every piece of main content: 1 TikTok video → becomes → 3 Instagram reels (different hooks), 5 tweet threads (key insights), 1 carousel post (visual summary), and 1 newsletter section. Set aside 30 minutes weekly to batch this repurposing.",
        "Join 3-5 niche-specific communities (Discord servers, Facebook groups, Reddit communities) where your target audience hangs out. Spend 15 minutes daily adding value through comments and answers—not promoting, just being helpful. This builds authority and drives organic traffic.",
        "Reach out to 5 creators in your niche this week with genuine, specific compliments about their work and propose a collaboration idea (duet, shared challenge, mutual shoutout). Make collaboration a monthly habit, not a rare occurrence.",
        "Set up a simple analytics tracking sheet: Track posting time, engagement rate, which hashtags performed best, and which content types got the most saves. Review this weekly to identify patterns and double down on what's working. Marketing is data-driven experimentation, not guessing."
      ],
      keyInsights: [
        "Identify which platform your target audience spends the most time on",
        "Create a content repurposing workflow to maximize each idea across platforms",
        "Test different posting times and analyze when your audience is most active"
      ],
      learnMoreContent: {
        description: "Great content without distribution strategy is like shouting into the void. Strategic marketing means getting your content in front of the right people at the right time.",
        actionSteps: [
          "Map out your content distribution channels and prioritize top 2",
          "Create a repurposing checklist: 1 video → 3 TikToks → 5 tweets → 1 blog",
          "Set up analytics tracking for each platform",
          "Build a simple engagement routine: comment on 10 posts in your niche daily"
        ],
        tips: [
          "Go where your audience already is, don't try to pull them somewhere new",
          "Engagement is a two-way street—give attention to get attention",
          "Quality distribution beats quantity of platforms"
        ]
      },
      elaborateContent: {
        overview: "Advanced marketing strategy combines algorithmic understanding, audience psychology, and strategic timing. The most successful creators don't just post—they orchestrate multi-platform campaigns with intentional cross-pollination. This includes understanding platform-specific algorithms, leveraging network effects, strategic collaborations, and building owned audience channels (email, community) alongside rented platforms.",
        advancedTechniques: {
          title: "Advanced Techniques & Edge Cases",
          items: [
            "The PESO Model for Creators: Strategically balance Paid (ads), Earned (PR/features), Shared (collaborations), and Owned (email list) media. Most creators over-rely on Shared and neglect Owned channels—a major mistake.",
            "Algorithm Hack - The Velocity Trigger: Platforms reward early engagement velocity. Post when your core audience is online and prime 5-10 superfans to engage in the first 5 minutes. This signals quality to the algorithm.",
            "Cross-Platform Content Atomization: One core piece of content → 15+ micro-pieces across platforms. Master this skill: 1 YouTube video = 10 TikToks + 5 Instagram posts + 1 newsletter + 3 Twitter threads.",
            "The Collaboration Multiplication Effect: Strategic collabs aren't just one-time shoutouts. Create collaboration series (monthly challenges, ongoing podcasts) that continuously expose you to new audiences.",
            "Edge Case - Saturated Markets: When your niche is crowded, use 'blue ocean tactics'—find underserved platforms (maybe your audience is on Pinterest or LinkedIn, not just TikTok) and dominate there first."
          ]
        },
        troubleshooting: {
          title: "Troubleshooting Common Failures",
          items: [
            "Problem: 'I post consistently but reach is declining' → Diagnosis: Platform fatigue or algorithm change. Solution: Inject trend participation (20% of content), test new formats, and increase comment engagement to signal vitality.",
            "Problem: 'Collaborations don't translate to followers' → Error: Wrong collaboration type or audience mismatch. Fix: Only collaborate with creators whose audience would genuinely benefit from your content (adjacent niches, not identical).",
            "Problem: 'I'm active on 5 platforms but growing on none' → Truth: You're spread too thin. Strategy: Pick 1-2 platforms to master first. Once you hit 10K on primary platform, expand to secondary. Sequential focus > simultaneous dilution.",
            "Problem: 'High engagement but no follower growth' → Analysis: You're preaching to the choir (existing audience loves you but isn't sharing). Solution: Create more shareable/saveable content formats that encourage discovery.",
            "Problem: 'Paid promotion isn't working' → Common mistakes: Targeting too broad, boosting wrong content type, or expecting followers from ads. Ads should drive awareness; organic content converts to follows. Use ads strategically."
          ]
        },
        longTermStrategy: {
          title: "Long-Term Strategy Development",
          items: [
            "Building Owned Audience Channels: Every follower on social media is rented—platforms can ban you or change algorithms. Priority: convert 10%+ of followers to owned channels (email, SMS, Discord, Patreon).",
            "The Content Flywheel System: Design a flywheel where each piece of content fuels the next. Example: TikTok video → YouTube deep dive → Newsletter case study → Course. Each format feeds into and promotes others.",
            "Multi-Platform Growth Sequencing: Year 1: Master TikTok/Instagram. Year 2: Expand to YouTube. Year 3: Launch podcast/newsletter. Strategic sequencing prevents burnout and ensures strong foundation before scaling.",
            "Strategic Partnership Ladder: Map a partnership roadmap from micro-collabs (similar-sized creators) → macro-collabs (larger creators) → brand partnerships → media features. Each tier requires different pitches and value props.",
            "Quarterly Marketing Experiments: Dedicate 10% of your content to testing new marketing strategies each quarter (new platform, new format, paid ads, PR outreach). Treat growth like R&D—always testing new channels.",
            "Building a Marketing Dashboard: Track 10-15 key metrics across all platforms in one dashboard (growth rate, engagement rate, conversion to owned channels, revenue per follower). Data-driven decisions > gut feelings."
          ]
        },
        expertResources: [
          "Framework: The PESO Model breakdown—how to allocate effort across Paid, Earned, Shared, and Owned media strategies",
          "Template: Multi-platform content repurposing matrix—turn one piece of content into 15+ pieces strategically",
          "Case Study: Creator who used coordinated launch strategy across 4 platforms to gain 50K followers in one week"
        ]
      },
      accentColor: "#9E5DAB"
    },
    {
      id: 6,
      title: "Platform Organization & Systems",
      icon: <FolderKanban className="w-6 h-6" />,
      summary: "Build sustainable systems to maintain consistent content creation",
      personalizedSummary: "Your onboarding assessment exposed a major weakness: you have zero organizational systems for content creation, which is causing chaotic, last-minute scrambling and inconsistent output. You mentioned that content ideas come to you randomly and you either immediately try to execute them (dropping everything) or forget them entirely because you have no capture system. Your phone is full of random video files with no naming convention, you don't use any content calendar, and you admitted to frequently staring at a blank screen asking 'what should I post today?' This reactive approach is exhausting and unsustainable—it makes content creation feel like a constant emergency rather than a managed process. With your limited daily time (1-2 hours), the lack of systems means you waste precious minutes on decisions that could be automated. You mentioned missing posting days because you 'didn't feel inspired' or 'ran out of time,' but the reality is that inspiration and time management are system problems, not motivation problems. Successful creators don't rely on inspiration—they have systems that make content creation inevitable. Your chaos is also preventing you from batch-creating content during high-energy periods to cover low-energy periods, leaving you vulnerable to gaps.",
      personalizedTips: [
        "Today, set up a simple Notion or Trello board with four columns: 'Content Ideas' (capture anything instantly), 'In Production' (actively working on), 'Ready to Post' (scheduled with captions), and 'Published' (with performance notes). Migrate your 12 existing drafts into this system immediately.",
        "Create a '30-day content bank' this weekend: Block 2 hours, brainstorm 30 content ideas using a simple prompt ('What are 30 questions my audience asks?'), and put them all in your 'Ideas' column. You now have a month of content direction and will never face a blank screen again.",
        "Establish 'batch creation Sundays': Every Sunday, dedicate 90 minutes to filming 3-4 pieces of content back-to-back. Don't edit yet—just capture. Then schedule 30 minutes Monday to batch edit them all. This concentrated effort is more efficient than daily scattered creation.",
        "Build a 'content creation kit': Create a Google Doc with your go-to hooks (5 opening lines you can adapt), your caption templates (3 caption structures you reuse), your hashtag sets (3 groups of hashtags for different content types), and your posting checklist. This eliminates decision fatigue every time you post.",
        "Set up automation where possible: Use a scheduling tool (Later, Buffer, or native platform scheduling) to schedule posts at optimal times in advance. Every Sunday evening, schedule your week's content. This creates buffer and prevents the daily posting panic you currently experience."
      ],
      keyInsights: [
        "Set up a content idea bank—capture inspiration the moment it strikes",
        "Create batch production days to film multiple pieces at once",
        "Build a simple content calendar that you'll actually use"
      ],
      learnMoreContent: {
        description: "Systems create freedom. The most successful creators don't rely on motivation—they rely on processes that make content creation inevitable.",
        actionSteps: [
          "Set up a Notion/Trello board with columns: Ideas → In Progress → Scheduled → Published",
          "Block out 2 hours weekly for batch content creation",
          "Create a pre-flight checklist for publishing (caption, hashtags, thumbnail, etc.)",
          "Set up automation where possible (scheduling tools, templates, etc.)"
        ],
        tips: [
          "Your system should reduce decision fatigue, not add complexity",
          "Start simple and iterate—a basic system you use beats a complex one you don't",
          "Build in buffer content for busy weeks"
        ]
      },
      elaborateContent: {
        overview: "Elite creator systems are designed for scale and sustainability. This means building production pipelines that can handle 10x growth, implementing quality control checkpoints, creating asset libraries for rapid content assembly, and developing SOPs (Standard Operating Procedures) that allow for delegation or team scaling. The goal is to build a content machine that runs smoothly whether you're inspired or not.",
        advancedTechniques: {
          title: "Advanced Techniques & Edge Cases",
          items: [
            "The 4-Tier Content System: Organize content into Pillar (flagship long-form), Cluster (supporting mid-form), Micro (daily short-form), and Evergreen (timeless searchable). Each tier has different production systems.",
            "Batch Production Assembly Line: Dedicate specific days to specific tasks. Monday: ideation. Tuesday: scripting. Wednesday: filming. Thursday: editing. Friday: scheduling. Batching similar tasks dramatically increases efficiency.",
            "Asset Library Strategy: Build reusable asset libraries (hook templates, B-roll footage, music tracks, caption formulas, hashtag sets). Each new video should use 50%+ pre-existing assets for speed.",
            "The Pre-Production Checklist System: Create detailed checklists for every content type that eliminate decision fatigue. When you sit down to create, the system tells you exactly what to do step-by-step.",
            "Edge Case - Creative Burnout: When systems feel too rigid and creativity suffers, build in 'creative playground time'—10-20% of your content calendar is reserved for experimental, unstructured creation."
          ]
        },
        troubleshooting: {
          title: "Troubleshooting Common Failures",
          items: [
            "Problem: 'My system is too complicated—I don't follow it' → Solution: Complexity kills compliance. Strip your system down to the absolute minimum viable process. 3 simple steps you'll actually do > 15 complex steps you'll ignore.",
            "Problem: 'I batch create but never post them' → Root cause: Separation between creation and publishing. Fix: Immediately after batching, schedule every piece. Don't leave posting to 'future you'—automate it in the system.",
            "Problem: 'My content calendar is always behind' → Diagnosis: You're planning too specifically. Create themed buckets (Motivation Monday, Tutorial Tuesday) and plug content ideas into flexible frameworks, not rigid calendars.",
            "Problem: 'I have a system but it doesn't save time' → Analysis: Your bottleneck is elsewhere. Time audit: where are you actually losing time? Often it's indecision (what to post) or perfectionism (endless editing), not lack of process.",
            "Problem: 'Systems make my content feel robotic' → Reframe: Systems handle the repeatable parts (editing workflow, posting schedule) to FREE your creativity for the parts that matter (storytelling, unique insights). Systems enable creativity."
          ]
        },
        longTermStrategy: {
          title: "Long-Term Strategy Development",
          items: [
            "Building SOPs for Delegation: Document every step of your content process as if teaching someone else. When you're ready to hire, you'll have ready-made training materials and can scale without bottlenecking on you.",
            "The Content Production Pipeline: Design a pipeline with clear stages (Ideation → Research → Script → Film → Edit → Schedule → Publish → Analyze). Track content through stages like a production line. Prevents bottlenecks.",
            "Automation & Tool Stack Optimization: Identify which tools can handle repetitive tasks. Auto-posting, auto-captioning, template-based editing. Every hour automated = one more hour for high-value creative work.",
            "Quality Control Gates: Build in review checkpoints at key stages (script approval, rough cut review, final check). This prevents wasted effort and ensures quality without perfectionism at every micro-step.",
            "Content Bank Strategy: Always maintain 2 weeks of pre-created, scheduled content as emergency buffer. Life happens—systems should protect you from having to create content during crisis or vacation.",
            "Annual System Audit & Optimization: Quarterly, review your entire system. What's working? What's friction? What new tools exist? Continuous optimization over years compounds into massive efficiency gains."
          ]
        },
        expertResources: [
          "Template: The Complete Creator OS—Notion template with full production workflow, content calendar, and analytics tracking",
          "Case Study: How a creator scaled from 3 posts/week to daily content without burning out using batching systems",
          "Blueprint: Setting up virtual assistants and team members for content operations with delegation frameworks"
        ]
      },
      accentColor: "#B481C0"
    },
    {
      id: 7,
      title: "Mental Health & Sustainability",
      icon: <Heart className="w-6 h-6" />,
      summary: "Protect your energy and avoid creator burnout",
      personalizedSummary: "Your onboarding responses revealed concerning patterns around mental health and sustainability: you mentioned checking analytics 'multiple times per day,' feeling anxious when videos don't perform well, comparing yourself to creators with larger followings, and experiencing guilt when you take breaks from posting. You admitted that content creation, which started as something enjoyable, now feels like a source of stress and obligation. Your perfectionism compounds this—you're simultaneously afraid of posting 'bad' content AND feeling behind because you're not posting enough. This mental pattern is the fast track to burnout. You also mentioned that you don't have clear boundaries between 'creator time' and 'personal time,' leading to constant mental tab-switching where you're never fully present. The warning signs are clear: decreasing enjoyment of creation, increased anxiety around metrics, and the feeling that you 'should' be doing more. Without intervention, you're 6-8 weeks away from complete burnout where you'll either quit entirely or need an extended break to recover. The solution isn't to push harder—it's to build sustainability practices into your creative process before burnout forces you to stop.",
      personalizedTips: [
        "Implement 'analytics blackout windows' immediately: Check your stats only twice per week (Sunday evening and Wednesday evening) for exactly 15 minutes. Delete apps from your phone if needed. Your mental health improves dramatically when you stop obsessively checking metrics that you can't control anyway.",
        "Create a 'creator well-being checklist' you review weekly: Am I still enjoying creating? Am I sleeping well? Am I comparing myself to others excessively? Am I feeling resentful about content creation? If you answer poorly to 2+ questions, it's time for a mandatory break or strategy shift.",
        "Schedule 'no-phone hours' daily: Pick 2-3 hours where your phone is in another room and you're completely offline. This could be during meals, early morning, or before bed. Constant connectivity is draining your creative energy and preventing genuine rest and recovery.",
        "Build a creator support system: Find 2-3 other creators at similar stages and create a private group chat or weekly call where you share struggles honestly (not just wins). Knowing others face the same challenges reduces the isolation and comparison that drives burnout.",
        "Design 'creative recovery weeks' into your annual calendar: Every 8-10 weeks, plan a week where you only post pre-scheduled content and don't create anything new. Use this week to consume content, rest, and remember why you started creating in the first place. Sustainability requires built-in rest, not just pushing until you break."
      ],
      keyInsights: [
        "Set clear boundaries for content creation hours",
        "Build in rest weeks where you only post pre-scheduled content",
        "Develop a routine for disconnecting from metrics and comparison"
      ],
      learnMoreContent: {
        description: "Sustainable growth requires protecting your mental health. Burnout doesn't just happen—it's the result of ignoring early warning signs and pushing past your limits.",
        actionSteps: [
          "Audit your current creator routine—what drains you vs. energizes you?",
          "Set 'no phone' hours to disconnect from the algorithm",
          "Create a self-care checklist for high-stress weeks",
          "Build a support system of fellow creators who understand the journey"
        ],
        tips: [
          "Your worth isn't determined by your last video's performance",
          "Comparison is creativity's kryptonite—focus on your own journey",
          "Taking breaks makes you a better creator, not a lazy one"
        ]
      },
      elaborateContent: {
        overview: "Long-term creator success requires treating your mental health as a strategic asset, not an afterthought. This involves understanding burnout cycles, implementing proactive recovery protocols, building psychological resilience to negative feedback and algorithm changes, and creating boundaries that protect your creative energy. The most sustainable creators have systems for mental health maintenance built into their business model.",
        advancedTechniques: {
          title: "Advanced Techniques & Edge Cases",
          items: [
            "The Energy Management Matrix: Track your creative energy across four types—physical, emotional, mental, creative. Schedule high-creativity tasks during your peak creative energy windows (don't waste them on admin).",
            "Proactive Recovery Protocols: Don't wait for burnout. Build in mandatory recovery weeks every 8-10 weeks where you only post pre-scheduled content and completely disconnect from creation. Prevention > cure.",
            "Psychological Boundary Setting: Develop 'phone-free hours,' 'metric-free days,' and 'no-scroll zones' as non-negotiable boundaries. Your attention is your most valuable asset—guard it fiercely.",
            "The Negativity Filter System: Use tools or assistants to filter comments/DMs for hate before you see it. Your mental health is worth more than personally reading every toxic message. Let your system or team handle moderation.",
            "Edge Case - Already Burned Out: If you're already in burnout, you can't 'push through.' You need a full reset—2-4 weeks completely offline, potentially therapy, and redesigning your entire creator business model before returning."
          ]
        },
        troubleshooting: {
          title: "Troubleshooting Common Failures",
          items: [
            "Problem: 'I feel guilty taking breaks' → Reframe: Rest isn't laziness; it's strategic recovery. Athletes schedule rest days. Creators need creative rest days. Your best content comes after rest, not despite it.",
            "Problem: 'Negative comments ruin my entire day' → Solution: Implement the 99:1 Rule—for every negative comment, there are 99 people who loved it silently. One hater doesn't represent your audience. Consider disabling comments or using filters.",
            "Problem: 'I can't stop checking analytics' → Root cause: External validation addiction. Fix: Schedule specific 'analytics windows' (2x per week max), delete apps from phone, and track fulfillment metrics (energy, joy) alongside performance metrics.",
            "Problem: 'Creating content doesn't bring joy anymore' → Warning sign: This is late-stage burnout. Stop creating immediately for 2 weeks minimum. Reconnect with why you started. If joy doesn't return, consider a major pivot or exit.",
            "Problem: 'I compare myself to other creators constantly' → Strategy: Unfollow or mute creators who trigger comparison. Curate your feed for inspiration, not comparison. Your journey is unique—someone else's Chapter 10 vs. your Chapter 3 is irrelevant."
          ]
        },
        longTermStrategy: {
          title: "Long-Term Strategy Development",
          items: [
            "The Sustainable Creator Business Model: Design a business that doesn't require constant content output. Evergreen products, courses, memberships, sponsorships provide income stability that allows content breaks without financial panic.",
            "Building a Creator Support Network: Develop relationships with 3-5 fellow creators at similar stages. Regular check-ins, shared struggles, mutual encouragement. Creator life is isolating—community prevents this.",
            "The Burnout Early Warning System: Document your personal burnout symptoms (sleep changes, irritability, loss of joy, resentment toward content). Check in weekly. If 2+ symptoms appear, trigger mandatory recovery protocol.",
            "Designing Annual Creative Sabbaticals: Plan 2-4 week breaks into your annual calendar in advance. Treat them as non-negotiable as any brand partnership. Long-term sustainability requires regular deep recovery.",
            "Therapy & Professional Support: As your platform grows, so does psychological pressure. Budget for therapy or coaching as a business expense. Mental health support isn't a luxury—it's infrastructure for long-term success.",
            "Values Alignment Audits: Quarterly, audit whether your content aligns with your core values. Creating content that conflicts with your values is a fast track to burnout. Realign or pivot as needed."
          ]
        },
        expertResources: [
          "Framework: The Creator Burnout Prevention System—recognize early warning signs and implement intervention strategies",
          "Template: Personal energy management tracker—monitor your physical, emotional, mental, and creative capacity weekly",
          "Case Study: Creators who took extended sabbaticals and came back stronger—what they did differently during breaks"
        ]
      },
      accentColor: "#9E5DAB"
    },
    {
      id: 8,
      title: "Monetization Strategies",
      icon: <DollarSign className="w-6 h-6" />,
      summary: "Turn your passion into profit with smart monetization",
      cards: [
        {
          title: "Revenue Roadblocks",
          content: "Creating great content but not monetizing effectively. Relying on single income stream (ad revenue or brand deals). Missing opportunities for passive income through digital products, memberships, or affiliate partnerships that could provide financial stability.",
          icon: "Target"
        },
        {
          title: "The Money Mindset",
          content: "Many creators feel uncomfortable 'selling' to their audience or believe they need millions of followers before monetizing. Truth: You can start monetizing with 1,000 engaged followers. Your audience wants to support you—give them ways to do it.",
          icon: "Sparkles"
        },
        {
          title: "Multiple Revenue Streams",
          content: "Diversify income across 5-7 streams: sponsorships, digital products, courses, memberships, affiliate marketing, consulting, and ad revenue. When one dips, others sustain you. Financial stability enables better content and reduces creator anxiety.",
          icon: "TrendingUp"
        }
      ],
      personalizedSummary: "Based on your onboarding responses, you're creating valuable content but haven't developed a clear monetization strategy beyond hoping for brand deals or ad revenue. You mentioned feeling uncomfortable with 'selling' to your audience, worrying it might seem pushy or damage trust. This mindset is costing you financial stability and growth potential. The truth is, your engaged audience wants ways to support you and go deeper with your content—you just haven't created those opportunities yet. You're leaving money on the table by not offering digital products, courses, memberships, or strategic affiliate partnerships that align with your content. Your current financial uncertainty around content creation is creating stress that affects your creative output and sustainability. By implementing diverse monetization strategies, you can reduce financial anxiety, invest back into better content, and build a sustainable creator business that doesn't rely on unpredictable algorithm changes or brand deal timing.",
      personalizedTips: [
        "Start with a simple digital product this month: Create a $7-27 guide, template, or resource that solves a specific problem your audience asks about repeatedly. Use Gumroad or Stan Store. Even 20 sales proves people will pay you, shifting your creator identity from 'hobbyist' to 'business owner.'",
        "Implement strategic affiliate marketing immediately: Make a list of 5-10 products/services you genuinely use and recommend in your niche. Sign up for their affiliate programs (Amazon Associates, ShareASale, individual brand programs). Add affiliate links to your bio, pin comments, and naturally mention them in relevant content. This requires zero product creation but can generate $100-500+ monthly.",
        "Test a membership or Patreon tier: Offer exclusive content, early access, or community access for $5-15/month. Even 50 members = $250-750 monthly recurring revenue that's more stable than sponsorships. Create 1 exclusive post weekly—could be behind-the-scenes, extended content, or Q&A access.",
        "Develop a signature course or workshop: Package your expertise into a structured learning experience. Start small—a $97-297 mini-course teaching one specific skill. Pre-sell it to your audience before creating all the content. 20 sales = $2,000-6,000, validating demand before major time investment.",
        "Create a 'monetization tracking spreadsheet': Track all income sources monthly (sponsorships, affiliates, products, memberships, etc.). This visibility helps you see what's working, what to scale, and where you're over-reliant. Goal: No single source represents more than 40% of income for true stability."
      ],
      keyInsights: [
        "Launch one digital product this month (guide, template, or resource)",
        "Add affiliate links for products you already recommend",
        "Test a membership tier offering exclusive content or community access",
        "Track all income sources to identify diversification opportunities",
        "Remember: monetization serves your audience by providing deeper value"
      ],
      learnMoreContent: {
        description: "Smart monetization isn't about 'selling out'—it's about building a sustainable business that allows you to create your best work. Diversified income streams provide financial stability and creative freedom.",
        actionSteps: [
          "Audit your current income sources and identify gaps in your monetization strategy",
          "Survey your audience about what products or services they'd find valuable",
          "Research affiliate programs for products you already use and recommend",
          "Outline a simple digital product you could create in the next 2 weeks",
          "Set up a basic sales/tracking system to monitor monetization performance"
        ],
        tips: [
          "You don't need millions of followers to start monetizing—1,000 engaged fans is enough",
          "Monetization that serves your audience builds trust, not breaks it",
          "Passive income (products, memberships) provides more stability than active income (brand deals)"
        ]
      },
      elaborateContent: {
        overview: "Professional creator monetization involves building a diversified revenue portfolio that provides both stability and growth potential. This includes understanding the full monetization spectrum (from ad revenue to premium products), implementing pricing psychology, creating passive income systems, building strategic brand partnerships, and developing premium offerings. Elite creators treat monetization as a core business function, not an afterthought, and systematically optimize each revenue stream.",
        advancedTechniques: {
          title: "Advanced Techniques & Edge Cases",
          items: [
            "The Revenue Diversification Matrix: Map 7 income streams across Active (trading time for money) vs. Passive (earning while you sleep) and Scalable vs. Non-scalable. Focus on building at least 2 Passive + Scalable streams (digital products, courses, memberships).",
            "Value Ladder Strategy: Create offerings at multiple price points—free content → $10-30 entry product → $100-300 mid-tier course → $1,000+ premium consulting/mastermind. Each tier serves different audience segments and maximizes customer lifetime value.",
            "Pricing Psychology Mastery: Use charm pricing ($97 not $100), decoy pricing (3 tiers where middle looks best), and value anchoring (show original price vs. discount). Strategic pricing can increase revenue 30-50% without changing the product.",
            "Evergreen Product Funnels: Create automated sales systems where free content leads to email sequences that sell products on autopilot. Once built, this generates income 24/7 without active selling.",
            "Edge Case - Premium Positioning: Sometimes charging MORE increases sales by signaling higher value. Test premium pricing ($500-2,000+) for exclusive access, consulting, or masterminds. High prices filter for committed buyers."
          ]
        },
        troubleshooting: {
          title: "Troubleshooting Common Failures",
          items: [
            "Problem: 'My audience doesn't buy anything I create' → Diagnosis: Product-audience mismatch. You're solving problems YOU find interesting, not problems THEY actively struggle with. Solution: Survey your audience, analyze their most common questions, create products that solve real pain points.",
            "Problem: 'I feel gross selling to my audience' → Mindset shift: You're not 'selling'—you're serving. If your product genuinely helps them, you're doing them a disservice by NOT offering it. Monetization that serves builds trust, not breaks it.",
            "Problem: 'I launched a product and only got 3 sales' → Common mistakes: No pre-launch marketing, unclear value proposition, or price mismatch. Solution: Build hype for 2-4 weeks before launch, clearly articulate transformation/outcome, test pricing with early bird discount.",
            "Problem: 'Brand deals are inconsistent and I need stable income' → Reality: Sponsorships are active income. Build passive streams (products, courses, memberships, affiliate) for stability. Treat sponsorships as bonus income, not primary revenue.",
            "Problem: 'I don't know what price to charge' → Strategy: Start by asking—survey your audience about willingness to pay. Research competitor pricing. Test multiple price points with A/B testing. Generally, creators underprice by 30-50% due to imposter syndrome."
          ]
        },
        longTermStrategy: {
          title: "Long-Term Strategy Development",
          items: [
            "Building Multiple Revenue Engines: Develop 5-7 distinct income streams that complement each other. Example: Ad revenue (platform) + Sponsorships (brands) + Digital products (courses) + Membership (Patreon) + Affiliate (recommendations) + Consulting (high-ticket) + Physical products (merch).",
            "The Product Ecosystem Model: Create a suite of products at different price points that naturally lead to each other. Free content → Email list → $27 guide → $197 course → $997 mastermind. Each product is both valuable standalone AND a pathway to the next level.",
            "Automated Passive Income Systems: Build evergreen funnels that sell products without active involvement. This might include: automated email sequences, product recommendation bots, course platforms with self-service purchase, affiliate income from evergreen content.",
            "Strategic Brand Partnership Development: Move beyond one-off sponsorships to long-term brand partnerships and ambassadorships. These provide 6-12 month contracts with predictable income. Position yourself as a strategic partner, not just an influencer for hire.",
            "Premium Offer Scaling: As your authority grows, introduce high-ticket offers ($1,000-10,000+): private consulting, done-for-you services, exclusive masterminds, licensing deals. Even 5-10 premium clients can match income from thousands of low-ticket sales.",
            "Exit Strategy Planning: Build a creator business with equity value—something you could sell. This means: owning your email list, having diversified income, documented systems, and potentially a team. Plan for the option to exit at peak value or transition to CEO role while others run operations."
          ]
        },
        expertResources: [
          "Framework: The Revenue Diversification Matrix—mapping active vs passive and scalable vs non-scalable income streams",
          "Template: Product creation roadmap—from idea validation to launch to evergreen automation",
          "Case Study: Creators who built 6-figure+ businesses with under 50K followers through strategic monetization"
        ]
      },
      accentColor: "#00CC66"
    },
    {
      id: 9,
      title: "Advanced Marketing Types & Case Studies",
      icon: <Rocket className="w-6 h-6" />,
      summary: "Learn from successful creators and advanced strategies",
      personalizedSummary: "Your onboarding showed that while you're aware successful creators exist in your niche, you haven't studied them strategically or reverse-engineered their growth patterns. You mentioned following a few creators you admire but not analyzing what specifically makes their content work or how their strategies could apply to your situation. This is leaving massive learning opportunities on the table. You're essentially trying to figure everything out through trial and error when there's a wealth of proven strategies you could adapt. Your hesitation to try 'advanced' tactics like collaborations, paid promotion, or trend-jacking stems from feeling like you're 'not ready yet' or 'not big enough yet,' but this scarcity mindset is holding you back. The creators you admire didn't wait until they were 'big enough'—they used strategic tactics to become big. You have the foundational skills (content creation, basic editing) but lack the strategic playbook that accelerates growth. The gap between where you are (sporadic growth, inconsistent engagement) and where you want to be (consistent growth, engaged community) is bridged by implementing proven advanced strategies, not just creating more content. It's time to shift from 'content creator' to 'strategic growth marketer' who happens to create content.",
      personalizedTips: [
        "Create a 'success swipe file' starting today: Identify 5 creators in your niche who have the growth trajectory you want. For each, analyze their top 10 performing posts—what hooks do they use? What formats? What topics? What calls-to-action? Document patterns in a shared doc and commit to testing one pattern per week in your content.",
        "Reach out to 3 creators this week who are 1-2 steps ahead of you (not mega-influencers, but people with 5-20K followers) and propose a collaboration. Most will say yes because it's mutually beneficial. Even one collaboration can expose you to hundreds of potential new followers who are pre-qualified (they follow similar content).",
        "Experiment with 'strategic trend participation': Spend 20 minutes daily monitoring trending sounds, hashtags, and challenges in your niche. Once per week, create your own unique spin on a trending format adapted to your niche. This leverages existing algorithm momentum while showcasing your unique perspective.",
        "Study one viral post per day for 30 days: Not just scrolling—actually analyze it. Screenshot it, write down why you think it went viral (timing? hook? controversy? relatability?), and brainstorm how you could adapt that principle to your content. Build a personal 'viral playbook' of proven patterns.",
        "Test one paid promotion experiment this month (even just $20-50): Boost your best-performing organic post to reach people who follow accounts similar to yours. Track the cost per follower and engagement rate. Understanding paid amplification removes fear around it and gives you another growth lever when you're ready to invest more seriously."
      ],
      keyInsights: [
        "Study 3 creators in your niche—what patterns do you notice?",
        "Experiment with one advanced tactic per month (collaborations, trends, paid promotion)",
        "Document what works to build your personal playbook"
      ],
      learnMoreContent: {
        description: "Advanced creators don't just create—they strategically engineer growth through proven frameworks and creative experimentation.",
        actionSteps: [
          "Create a 'swipe file' of high-performing content in your niche",
          "Reach out to 5 creators for potential collaborations",
          "Test one viral content format adapted to your niche",
          "Analyze your top 10 performing posts to find patterns"
        ],
        tips: [
          "Innovation comes from remixing what works, not reinventing the wheel",
          "The best creators are students of the game—always learning",
          "Test, measure, iterate—let data guide your strategy"
        ]
      },
      elaborateContent: {
        overview: "Mastery-level marketing combines deep platform expertise, psychological triggers, trend forecasting, and strategic partnerships. This includes understanding viral mechanics, leveraging influencer collaboration strategies, implementing paid growth strategies effectively, building PR and media relationships, and developing multiple revenue streams. Elite creators treat their content as a full-fledged media business with sophisticated growth and monetization strategies.",
        advancedTechniques: {
          title: "Advanced Techniques & Edge Cases",
          items: [
            "The Viral Coefficient Formula: Engineer shareability by optimizing for 3 factors—Emotional Intensity (strong reaction) × Social Currency (makes sharer look good) × Practical Value (useful to share). Content with all 3 has highest viral potential.",
            "Trend Forecasting Strategy: Don't just react to trends—predict them. Monitor early signals (subreddits, niche TikTok communities, Twitter spaces) to participate in trends before they peak, maximizing algorithm boost.",
            "Strategic Paid Amplification: Use ads not for direct follower acquisition, but to amplify high-performing organic content to lookalike audiences. $50-200 can turn a good video into a viral one through strategic boost timing.",
            "PR & Media Relationship Building: Develop relationships with journalists/podcasters in your niche. Offer yourself as expert source with unique data or perspectives. One feature can drive thousands of followers.",
            "Edge Case - Controversial Topics: High-risk/high-reward strategy. Controversial content gets massive engagement but can attract hate or brand partnership issues. Use strategically and infrequently if brand-safe is priority."
          ]
        },
        troubleshooting: {
          title: "Troubleshooting Common Failures",
          items: [
            "Problem: 'I tried a viral strategy and it flopped' → Reality: Most viral attempts fail. You need 10-20 experiments to find what resonates with YOUR audience. Viral is probabilistic, not guaranteed. Keep testing.",
            "Problem: 'Viral video brought followers but no retention' → Diagnosis: Content-audience mismatch. Viral content attracted wrong audience. Solution: Follow viral hit with 5-7 pieces of core niche content to filter audience.",
            "Problem: 'Collaborations seem forced or inauthentic' → Error: Partnering for metrics not mission. Only collaborate with creators you genuinely respect and whose values align with yours. Authenticity translates to performance.",
            "Problem: 'Paid ads are expensive with low ROI' → Common mistakes: Targeting too broad, wrong content type, or poor landing page. Use ads for warm audiences (retargeting) not cold, and test small ($20-50) before scaling.",
            "Problem: 'I can't track which strategy is working' → Solution: Attribution tracking. Tag traffic sources (collab links, ad campaigns, PR features) so you know what drives growth. Data > assumptions."
          ]
        },
        longTermStrategy: {
          title: "Long-Term Strategy Development",
          items: [
            "Building a Multi-Channel Media Empire: Successful creators don't rely on one platform. Develop strategic presence across 3-5 channels (social platforms + owned channels like newsletter/podcast) to diversify risk and reach.",
            "The Revenue Diversification Model: Map out 5-7 revenue streams (ad revenue, sponsorships, digital products, courses, memberships, affiliate, services). When one stream dips, others sustain you. Never rely on single income source.",
            "Strategic Partnership Ladder: Build relationships progressively. Start: peer collaborations. Mid: brand partnerships. Advanced: media appearances and speaking. Peak: launching products or companies with partners.",
            "Building a Personal Board of Advisors: Recruit 3-5 mentors/advisors (larger creators, business owners, marketers) who you can consult quarterly for strategic guidance. Perspective from experienced voices accelerates growth.",
            "Cohort Analysis for Retention: Move beyond vanity metrics. Track follower cohorts monthly—what % of followers from January still engage in June? Retention is more valuable than growth. Optimize for both.",
            "Scaling from Creator to CEO: Plan your transition from 'person who creates content' to 'person who leads a content business.' This means hiring, delegating, systematizing, and eventually stepping back from daily creation."
          ]
        },
        expertResources: [
          "Case Study Collection: 20 viral campaigns deconstructed—psychological triggers, timing, and platform mechanics that made them explode",
          "Framework: The Viral Coefficient Formula—how to engineer shareability into your content systematically",
          "Template: PR outreach system for getting featured in major media publications and podcasts"
        ]
      },
      accentColor: "#D1A5DD"
    }
  ], []);

  const mergePlanWithDefaults = useCallback(
    (plan: GeneratedSectionPayload[]) => {
      return defaultSections.map((section, index) => {
        const generated = plan.find((item) => item.title === section.title) ?? plan[index];
        if (!generated) {
          return createPlaceholderSection(section);
        }

        const summary = typeof generated.summary === 'string' ? generated.summary.trim() : '';
        const isPlaceholderSummary = !summary || summary.toLowerCase() === PLACEHOLDER_MARKER;
        if (isPlaceholderSummary) {
          return createPlaceholderSection(section);
        }

        const personalizedSummary = typeof generated.personalizedSummary === 'string'
          ? generated.personalizedSummary.trim()
          : '';

        const sanitizedTips = Array.isArray(generated.personalizedTips)
          ? generated.personalizedTips.filter((tip): tip is string => typeof tip === 'string' && tip.trim().length > 0)
          : section.personalizedTips ?? [];

        const sanitizedInsights = Array.isArray(generated.keyInsights)
          ? generated.keyInsights.filter((tip): tip is string => typeof tip === 'string' && tip.trim().length > 0)
          : section.keyInsights ?? [];

        const learnMore = generated.learnMoreContent;
        const learnMoreDescription = typeof learnMore?.description === 'string'
          ? learnMore.description.trim()
          : section.learnMoreContent?.description ?? '';
        const learnMoreActionSteps = Array.isArray(learnMore?.actionSteps) && learnMore.actionSteps.length
          ? learnMore.actionSteps.filter((step): step is string => typeof step === 'string' && step.trim().length > 0)
          : section.learnMoreContent?.actionSteps ?? [];
        const learnMoreTips = Array.isArray(learnMore?.tips) && learnMore.tips.length
          ? learnMore.tips.filter((tip): tip is string => typeof tip === 'string' && tip.trim().length > 0)
          : section.learnMoreContent?.tips ?? [];

        const defaultElaborate = section.elaborateContent;
        const elaborate = generated.elaborateContent;

        const sanitizeBlock = (
          block: { title?: string; items?: string[] } | undefined,
          fallback: { title: string; items: string[] } | undefined,
        ) => {
          const title = typeof block?.title === 'string' && block.title.trim().length
            ? block.title.trim()
            : fallback?.title ?? '';
          const items = Array.isArray(block?.items) && block?.items.length
            ? block.items.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
            : fallback?.items ?? [];
          return { title, items };
        };

        const elaborateContent = elaborate || defaultElaborate
          ? {
              overview: typeof elaborate?.overview === 'string' && elaborate.overview.trim().length
                ? elaborate.overview.trim()
                : defaultElaborate?.overview ?? '',
              advancedTechniques: sanitizeBlock(elaborate?.advancedTechniques, defaultElaborate?.advancedTechniques),
              troubleshooting: sanitizeBlock(elaborate?.troubleshooting, defaultElaborate?.troubleshooting),
              longTermStrategy: sanitizeBlock(elaborate?.longTermStrategy, defaultElaborate?.longTermStrategy),
              expertResources: Array.isArray(elaborate?.expertResources) && elaborate.expertResources.length
                ? elaborate.expertResources.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
                : defaultElaborate?.expertResources ?? [],
            }
          : undefined;

        const defaultCards: SectionCard[] = section.cards ?? [];
        const generatedCards: Array<{ title?: string; content?: string; icon?: CardIconKey }> = Array.isArray(generated.cards)
          ? generated.cards
          : [];
        const mergedCards: SectionCard[] = defaultCards.length
          ? defaultCards.map((card: SectionCard, idx: number) => {
              const generatedCard = generatedCards[idx];
              const title = typeof generatedCard?.title === 'string' && generatedCard.title.trim().length
                ? generatedCard.title.trim()
                : card.title;
              const content = typeof generatedCard?.content === 'string' && generatedCard.content.trim().length
                ? generatedCard.content.trim()
                : card.content;
              const icon = isCardIconKey(generatedCard?.icon)
                ? generatedCard.icon
                : card.icon;
              return { ...card, title, content, icon };
            })
          : generatedCards
            .filter((card): card is { title?: string; content?: string; icon?: CardIconKey } => Boolean(card))
            .slice(0, 3)
            .map((card): SectionCard => ({
              title: typeof card.title === 'string' && card.title.trim().length ? card.title.trim() : 'Key Insight',
              content: typeof card.content === 'string' && card.content.trim().length ? card.content.trim() : '',
              icon: isCardIconKey(card.icon) ? card.icon : 'Sparkles',
            }));

        return {
          ...section,
          summary,
          personalizedSummary: personalizedSummary || summary,
          personalizedTips: sanitizedTips.length ? sanitizedTips : undefined,
          keyInsights: sanitizedInsights.length ? sanitizedInsights : [],
          learnMoreContent: {
            description: learnMoreDescription,
            actionSteps: learnMoreActionSteps,
            tips: learnMoreTips,
          },
          elaborateContent,
          accentColor: generated.accentColor ?? section.accentColor,
          cards: mergedCards,
          isPlaceholder: false,
        } as SectionData;
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

  const interactiveSections = useMemo(() => {
    const base = reportSections ?? placeholderSections;
    return base.filter((section) => !section.isPlaceholder);
  }, [reportSections, placeholderSections]);

  const validLessonIds = useMemo(
    () => new Set(interactiveSections.map((section) => section.id)),
    [interactiveSections],
  );

  useEffect(() => {
    if (!validLessonIds.size) return;
    setCompletedLessonIds((prev) => {
      const filtered = prev.filter((id) => validLessonIds.has(id));
      if (filtered.length === prev.length) {
        return prev;
      }
      return filtered;
    });
  }, [validLessonIds]);

  const reportProgress = useMemo(() => {
    if (!validLessonIds.size) return 0;
    const completedCount = completedLessonIds.filter((id) =>
      validLessonIds.has(id),
    ).length;
    return Math.round((completedCount / validLessonIds.size) * 100);
  }, [completedLessonIds, validLessonIds]);

  const renderSections = reportSections ?? placeholderSections;
  const hasCompleteReport = Boolean(
    reportSections && reportSections.every((section) => !section.isPlaceholder),
  );

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
    setCompletedLessonIds((prev) => {
      if (!validLessonIds.has(lessonId)) return prev;
      if (prev.includes(lessonId)) return prev;
      return [...prev, lessonId].sort((a, b) => a - b);
    });
  }, [validLessonIds]);

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
      {/* Lesson View - Full Screen Overlay */}
      {activeLessonSection && (
        <LessonView
          isOpen={true}
          onClose={() => setActiveLessonSection(null)}
          sectionNumber={activeLessonSection.id}
          title={activeLessonSection.title}
          icon={activeLessonSection.icon}
          summary={activeLessonSection.summary}
          learnMoreContent={activeLessonSection.learnMoreContent}
          elaborateContent={activeLessonSection.elaborateContent}
          accentColor={activeLessonSection.accentColor}
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
                    className="relative rounded-[36px] border-2 border-[#9E5DAB30] p-6"
                    style={{
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

            {!isMobile && (
              <div className="mb-8">
                <div className="text-center mb-8">
                  <h2 className="inline-block pb-1" style={{ color: '#9E5DAB' }}>
                    Your Personalized Action Plan
                  </h2>
                  <p className="text-muted-foreground mt-2">
                    Follow these strategic steps to accelerate your growth
                  </p>
                </div>
                <div className="space-y-6">
                  {renderSections.map((section) => (
                    <ReportSection
                      key={section.id}
                      sectionNumber={section.id}
                      title={section.title}
                      icon={section.icon}
                      summary={section.summary}
                      cards={section.cards}
                      personalizedSummary={section.personalizedSummary}
                      personalizedTips={section.personalizedTips}
                      keyInsights={section.keyInsights}
                      learnMoreContent={section.learnMoreContent}
                      elaborateContent={section.elaborateContent}
                      accentColor={section.accentColor}
                      isPlaceholder={section.isPlaceholder}
                      onLearnMore={() => setActiveLessonSection(section)}
                    />
                  ))}
                </div>
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
