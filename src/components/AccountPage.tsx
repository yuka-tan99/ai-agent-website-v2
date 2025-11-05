import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, 
  BarChart3, 
  Gift, 
  Users, 
  UserCircle, 
  LogOut,
  TrendingUp,
  Calendar,
  Award,
  Sparkles,
  Star,
  Save,
  Lock,
  Mail,
  User as UserIcon,
  Bell,
  Shield,
  CreditCard,
  Menu,
  X,
  Check,
  Clock,
  MapPin,
  Smartphone,
  Download,
  AlertCircle,
  Lightbulb,
  MessageSquare,
  Video,
  Timer,
  Activity,
  Loader2
} from 'lucide-react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Separator } from './ui/separator';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from './ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar as CalendarComponent } from './ui/calendar';
import { BecomeFamousLogo } from './BecomeFamousLogo';

type SectionId = 'report' | 'appointments' | 'usage' | 'rewards' | 'referrals' | 'profile';

type UsageSeriesPoint = {
  week: string;
  reportViews: number;
  aiMessages: number;
};

type BillingSnapshot = {
  complimentary: {
    active: boolean;
    expiresAt: string | null;
    sourceProductKey: string | null;
  };
  subscription: {
    stripeSubscriptionId: string | null;
    status: string | null;
    cancelAtPeriodEnd: boolean;
    currentPeriodStart: string | null;
    currentPeriodEnd: string | null;
    latestInvoiceId: string | null;
    priceAmountCents: number | null;
    priceCurrency: string | null;
    customerId: string | null;
    trialEnd: string | null;
  } | null;
};

interface AccountPageProps {
  onNavigateToDashboard: () => void | Promise<void>;
  hasCompletedOnboarding?: boolean;
  hasPaid?: boolean;
  onBecomeFamousNow?: () => void;
  onLogout?: () => void;
  initialSection?: SectionId;
  profileName?: string;
  profileEmail?: string;
  userId?: string;
  onProfileSave?: (payload: { name: string; email: string }) => Promise<void>;
  profileSaving?: boolean;
  profileError?: string | null;
  onChangePassword?: (currentPassword: string, newPassword: string) => Promise<void>;
  passwordUpdating?: boolean;
  getAuthHeaders?: () => Promise<Record<string, string>>;
  navigateToDashboardLoading?: boolean;
}

export function AccountPage({ 
  onNavigateToDashboard, 
  hasCompletedOnboarding = true,
  hasPaid = true,
  onBecomeFamousNow,
  onLogout,
  initialSection = 'usage',
  profileName: profileNameProp,
  profileEmail: profileEmailProp,
  userId,
  onProfileSave,
  profileSaving = false,
  profileError,
  onChangePassword,
  passwordUpdating = false,
  getAuthHeaders,
  navigateToDashboardLoading = false,
}: AccountPageProps) {
  const handleReportClick = () => {
    if (navigateToDashboardLoading) return;
    if (hasCompletedOnboarding && hasPaid) {
      onNavigateToDashboard();
    } else {
      setActiveSection('report');
    }
  };

  const navigationItems: Array<{
    id: SectionId;
    label: string;
    icon: React.ReactNode;
    action?: () => void;
  }> = [
    { id: 'report', label: 'My Report', icon: <LayoutDashboard className="w-5 h-5" />, action: handleReportClick },
    { id: 'appointments', label: 'My Appointments', icon: <Calendar className="w-5 h-5" /> },
    { id: 'usage', label: 'Usage', icon: <BarChart3 className="w-5 h-5" /> },
    { id: 'rewards', label: 'Rewards', icon: <Gift className="w-5 h-5" /> },
    { id: 'referrals', label: 'Referrals', icon: <Users className="w-5 h-5" /> },
    { id: 'profile', label: 'Profile', icon: <UserCircle className="w-5 h-5" /> },
  ];

  const [activeSection, setActiveSection] = useState<SectionId>(initialSection);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [privacySecurityOpen, setPrivacySecurityOpen] = useState(false);
  const [billingOpen, setBillingOpen] = useState(false);
  const [activityLogOpen, setActivityLogOpen] = useState(false);
  const [scheduleSessionOpen, setScheduleSessionOpen] = useState(false);
  const [billingSnapshot, setBillingSnapshot] = useState<BillingSnapshot | null>(null);
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingActionLoading, setBillingActionLoading] = useState(false);
  const [billingError, setBillingError] = useState<string | null>(null);
  const [billingMessage, setBillingMessage] = useState<string | null>(null);

  const formatDateDisplay = useCallback((value: string | null | undefined) => {
    if (!value) return "—";
    try {
      return new Date(value).toLocaleDateString(undefined, {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return "—";
    }
  }, []);

  const formatCurrencyDisplay = (
    amountCents: number | null | undefined,
    currency: string | null | undefined,
  ) => {
    if (amountCents == null) return "";
    const code = (currency ?? "usd").toUpperCase();
    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: code,
      }).format(amountCents / 100);
    } catch {
      const symbol = code === "USD" ? "$" : `${code} `;
      return `${symbol}${(amountCents / 100).toFixed(2)}`;
    }
  };

  const isSubscriptionActive = useCallback(
    (status: string | null | undefined) =>
      status ? ["active", "trialing", "past_due"].includes(status) : false,
    [],
  );
  
  // Form states
  const [email, setEmail] = useState(profileEmailProp ?? '');
  const [name, setName] = useState(profileNameProp ?? '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profileStateError, setProfileStateError] = useState<string | null>(null);
  const [profileSuccessMessage, setProfileSuccessMessage] = useState<string | null>(null);
  const [changePasswordError, setChangePasswordError] = useState<string | null>(null);
  
  // Notification preferences
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(true);
  const [productUpdates, setProductUpdates] = useState(true);
  const [growthTips, setGrowthTips] = useState(true);
  const [communityUpdates, setCommunityUpdates] = useState(false);
  
  // Privacy preferences  
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [profilePublic, setProfilePublic] = useState(false);
  const [dataSharing, setDataSharing] = useState(true);

  // Session scheduling states
  const [sessionType, setSessionType] = useState('');
  const [sessionExpert, setSessionExpert] = useState('');
  const [sessionDate, setSessionDate] = useState<Date | undefined>(undefined);
  const [sessionTime, setSessionTime] = useState('');
  const [sessionNotes, setSessionNotes] = useState('');

  // Usage analytics state
  const [usageSeries, setUsageSeries] = useState<UsageSeriesPoint[] | null>(null);
  const [usageTotals, setUsageTotals] = useState<{ reportViews: number; aiMessages: number }>({
    reportViews: 0,
    aiMessages: 0,
  });
  const [usageLoading, setUsageLoading] = useState(false);
  const [usageError, setUsageError] = useState<string | null>(null);

  const loadUsageAnalytics = useCallback(async () => {
    if (usageLoading) return;
    setUsageLoading(true);
    setUsageError(null);
    try {
      let headers: Record<string, string> = {};
      if (typeof getAuthHeaders === "function") {
        try {
          headers = await getAuthHeaders();
        } catch (authError) {
          console.warn("[AccountPage] Failed to obtain auth headers", authError);
        }
      }

      const response = await fetch("/api/usage/weekly", {
        credentials: "include",
        headers: {
          Accept: "application/json",
          ...headers,
        },
      });
      if (!response.ok) {
        if (response.status === 401) {
          setUsageSeries([]);
          setUsageTotals({ reportViews: 0, aiMessages: 0 });
          setUsageError(null);
          return;
        }
        throw new Error(`Request failed with status ${response.status}`);
      }
      const payload = (await response.json()) as {
        series?: UsageSeriesPoint[];
        totals?: { reportViews?: number; aiMessages?: number };
      };
      if (Array.isArray(payload.series) && payload.series.length) {
        setUsageSeries(
          payload.series.map((item) => ({
            week: item.week,
            reportViews: Number(item.reportViews ?? 0),
            aiMessages: Number(item.aiMessages ?? 0),
          })),
        );
      } else {
        setUsageSeries([]);
      }
      setUsageTotals({
        reportViews: Number(payload.totals?.reportViews ?? 0),
        aiMessages: Number(payload.totals?.aiMessages ?? 0),
      });
      setUsageError(null);
    } catch (error) {
      console.error("[AccountPage] Failed to load usage analytics", error);
      setUsageError(
        error instanceof Error ? error.message : "Unable to load usage analytics.",
      );
    } finally {
      setUsageLoading(false);
    }
  }, [usageLoading, getAuthHeaders]);

  const fetchBillingSnapshot = useCallback(async () => {
    if (billingLoading) return;
    setBillingLoading(true);
    setBillingError(null);
    try {
      let headers: Record<string, string> = {
        Accept: "application/json",
      };

      if (typeof getAuthHeaders === "function") {
        try {
          headers = { ...headers, ...(await getAuthHeaders()) };
        } catch (authError) {
          console.warn("[AccountPage] Failed to obtain auth headers", authError);
        }
      }

      const response = await fetch("/api/subscription/status", {
        credentials: "include",
        headers,
      });

      if (!response.ok) {
        if (response.status === 401) {
          setBillingSnapshot(null);
          setBillingError("Please sign in to manage billing.");
          return;
        }
        throw new Error(`Request failed with status ${response.status}`);
      }

      const data = (await response.json()) as BillingSnapshot;
      setBillingSnapshot(data);
      setBillingMessage(null);
    } catch (error) {
      console.error("[AccountPage] Failed to load billing snapshot", error);
      setBillingError(
        error instanceof Error
          ? error.message
          : "Unable to load subscription details.",
      );
    } finally {
      setBillingLoading(false);
    }
  }, [billingLoading, getAuthHeaders]);

  const performBillingAction = useCallback(
    async (endpoint: string) => {
      setBillingActionLoading(true);
      setBillingError(null);
      setBillingMessage(null);
      try {
        let headers: Record<string, string> = {
          Accept: "application/json",
          "Content-Type": "application/json",
        };

        if (typeof getAuthHeaders === "function") {
          try {
            headers = { ...headers, ...(await getAuthHeaders()) };
          } catch (authError) {
            console.warn(
              "[AccountPage] Failed to obtain auth headers",
              authError,
            );
          }
        }

        const response = await fetch(endpoint, {
          method: "POST",
          credentials: "include",
          headers,
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          setBillingError(
            (data && typeof data.error === "string")
              ? data.error
              : "Unable to update subscription.",
          );
          return;
        }

        if (data?.message) {
          setBillingMessage(data.message);
        }

        if (data?.blocked) {
          if (data?.snapshot) {
            setBillingSnapshot(data.snapshot as BillingSnapshot);
          }
          return;
        }

        if (data?.snapshot) {
          setBillingSnapshot(data.snapshot as BillingSnapshot);
        } else {
          await fetchBillingSnapshot();
        }
      } catch (error) {
        console.error("[AccountPage] Billing action failed", error);
        setBillingError(
          error instanceof Error
            ? error.message
            : "Unable to update subscription.",
        );
      } finally {
        setBillingActionLoading(false);
      }
    },
    [fetchBillingSnapshot, getAuthHeaders],
  );

  const handleCancelSubscription = useCallback(() => {
    return performBillingAction("/api/subscription/cancel");
  }, [performBillingAction]);

  const handleResumeSubscription = useCallback(() => {
    return performBillingAction("/api/subscription/resume");
  }, [performBillingAction]);

  const handleStartSubscription = useCallback(async () => {
    if (!userId) {
      setBillingError("You need to be signed in to start a subscription.");
      return;
    }

    setBillingActionLoading(true);
    setBillingError(null);
    setBillingMessage(null);

    try {
      let headers: Record<string, string> = {
        Accept: "application/json",
        "Content-Type": "application/json",
      };

      if (typeof getAuthHeaders === "function") {
        try {
          headers = { ...headers, ...(await getAuthHeaders()) };
        } catch (authError) {
          console.warn("[AccountPage] Failed to obtain auth headers", authError);
        }
      }

      const response = await fetch("/api/checkout", {
        method: "POST",
        credentials: "include",
        headers,
        body: JSON.stringify({ productKey: "ai_subscription", userId }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setBillingError(
          (data && typeof data.error === "string")
            ? data.error
            : "Unable to start subscription checkout.",
        );
        return;
      }

      if (data?.url) {
        window.location.href = data.url as string;
      } else {
        setBillingMessage("Checkout session created. Please follow the prompts to subscribe.");
      }
    } catch (error) {
      console.error("[AccountPage] Failed to start subscription", error);
      setBillingError(
        error instanceof Error
          ? error.message
          : "Unable to start subscription checkout.",
      );
    } finally {
      setBillingActionLoading(false);
    }
  }, [getAuthHeaders, userId]);

  // Mock expert availability data - replace with API call in production
  const expertAvailability: Record<string, Record<string, string[]>> = {
    'sarah-chen': {
      '2025-10-28': ['9:00 AM', '10:30 AM', '2:00 PM', '4:00 PM'],
    '2025-10-29': ['9:00 AM', '11:00 AM', '1:00 PM', '3:30 PM'],
    '2025-10-30': ['10:00 AM', '2:00 PM', '4:30 PM'],
    '2025-11-01': ['9:00 AM', '11:30 AM', '2:00 PM'],
    '2025-11-04': ['9:00 AM', '10:00 AM', '1:00 PM', '3:00 PM', '4:30 PM'],
  },
  'marcus-rodriguez': {
    '2025-10-28': ['11:00 AM', '1:00 PM', '3:00 PM'],
    '2025-10-29': ['9:30 AM', '12:00 PM', '2:30 PM', '4:00 PM'],
    '2025-10-31': ['10:00 AM', '1:30 PM', '3:30 PM'],
    '2025-11-01': ['9:00 AM', '11:00 AM', '2:00 PM', '4:00 PM'],
    '2025-11-03': ['10:30 AM', '1:00 PM', '3:00 PM'],
  },
  'emma-thompson': {
    '2025-10-28': ['10:00 AM', '12:00 PM', '3:30 PM'],
    '2025-10-30': ['9:00 AM', '11:30 AM', '1:00 PM', '3:00 PM'],
    '2025-10-31': ['10:00 AM', '2:00 PM', '4:00 PM'],
    '2025-11-02': ['9:30 AM', '12:30 PM', '3:30 PM'],
    '2025-11-05': ['9:00 AM', '10:30 AM', '1:00 PM', '2:30 PM', '4:00 PM'],
  },
  'david-kim': {
    '2025-10-29': ['11:00 AM', '1:30 PM', '4:00 PM'],
    '2025-10-30': ['9:00 AM', '12:00 PM', '2:30 PM'],
    '2025-11-01': ['10:00 AM', '1:00 PM', '3:30 PM'],
    '2025-11-04': ['9:30 AM', '11:30 AM', '2:00 PM', '4:30 PM'],
    '2025-11-05': ['10:00 AM', '12:00 PM', '3:00 PM'],
  },
  any: {
    '2025-10-28': ['9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '3:30 PM', '4:00 PM'],
    '2025-10-29': ['9:00 AM', '9:30 AM', '11:00 AM', '12:00 PM', '1:00 PM', '1:30 PM', '2:30 PM', '3:30 PM', '4:00 PM'],
    '2025-10-30': ['9:00 AM', '10:00 AM', '11:30 AM', '12:00 PM', '1:00 PM', '2:00 PM', '2:30 PM', '3:00 PM', '4:30 PM'],
    '2025-10-31': ['10:00 AM', '1:30 PM', '2:00 PM', '3:30 PM', '4:00 PM'],
    '2025-11-01': ['9:00 AM', '10:00 AM', '11:00 AM', '11:30 AM', '1:00 PM', '2:00 PM', '3:30 PM', '4:00 PM'],
    '2025-11-02': ['9:30 AM', '12:30 PM', '3:30 PM'],
    '2025-11-03': ['10:30 AM', '1:00 PM', '3:00 PM'],
    '2025-11-04': ['9:00 AM', '9:30 AM', '10:00 AM', '11:30 AM', '1:00 PM', '2:00 PM', '3:00 PM', '4:30 PM'],
    '2025-11-05': ['9:00 AM', '10:00 AM', '10:30 AM', '12:00 PM', '1:00 PM', '2:30 PM', '3:00 PM', '4:00 PM'],
  },
  };

  const getAvailableTimeSlots = (expertId: string, date: Date | undefined): string[] => {
    if (!expertId || !date || !expertAvailability[expertId]) return [];
    const dateStr = date.toISOString().split('T')[0];
    return expertAvailability[expertId][dateStr] || [];
  };

  const dateHasAvailability = (expertId: string, date: Date): boolean => {
    if (!expertId) return false;
    const dateStr = date.toISOString().split('T')[0];
    const slots = expertAvailability[expertId]?.[dateStr];
    return Array.isArray(slots) && slots.length > 0;
  };

  const handleLogoClick = () => {
    setActiveSection('usage');
  };

  const handleNavClick = (item: typeof navigationItems[0]) => {
    if (item.id === 'report' && navigateToDashboardLoading) {
      return;
    }
    if (item.action) {
      item.action();
    } else {
      setActiveSection(item.id);
    }
    setMobileMenuOpen(false); // Close mobile menu after selection
  };

  useEffect(() => {
    if (profileEmailProp !== undefined && profileEmailProp !== null) {
      setEmail(profileEmailProp);
    }
  }, [profileEmailProp]);

  useEffect(() => {
    if (profileNameProp !== undefined && profileNameProp !== null) {
      setName(profileNameProp);
    }
  }, [profileNameProp]);

  useEffect(() => {
    setProfileSuccessMessage(null);
    setProfileStateError(null);
  }, [name, email]);

  useEffect(() => {
    if (!changePasswordOpen) {
      setChangePasswordError(null);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }
  }, [changePasswordOpen]);

  useEffect(() => {
    if (!usageSeries && !usageLoading && !usageError) {
      void loadUsageAnalytics();
    }
  }, [usageSeries, usageLoading, usageError, loadUsageAnalytics]);

useEffect(() => {
  if (!billingOpen) return;
  void fetchBillingSnapshot();
}, [billingOpen, fetchBillingSnapshot]);

  useEffect(() => {
    if (billingSnapshot || billingLoading) return;
    void fetchBillingSnapshot();
  }, [billingSnapshot, billingLoading, fetchBillingSnapshot]);

  const displayName = useMemo(() => {
    const trimmed = name?.trim();
    if (trimmed) return trimmed;
    const propTrimmed = profileNameProp?.trim();
    if (propTrimmed) return propTrimmed;
    if (profileEmailProp) {
      const prefix = profileEmailProp.split('@')[0];
      if (prefix) return prefix;
    }
    return 'Creator';
  }, [name, profileNameProp, profileEmailProp]);

  const avatarInitial = useMemo(() => {
    return displayName.charAt(0).toUpperCase();
  }, [displayName]);

  const fallbackUsageSeries = useMemo<UsageSeriesPoint[]>(() => [
    { week: "2024-10-07T00:00:00.000Z", reportViews: 12, aiMessages: 45 },
    { week: "2024-10-14T00:00:00.000Z", reportViews: 18, aiMessages: 62 },
    { week: "2024-10-21T00:00:00.000Z", reportViews: 8, aiMessages: 38 },
    { week: "2024-10-28T00:00:00.000Z", reportViews: 22, aiMessages: 71 },
    { week: "2024-11-04T00:00:00.000Z", reportViews: 15, aiMessages: 89 },
    { week: "2024-11-11T00:00:00.000Z", reportViews: 28, aiMessages: 105 },
  ], []);

  const fallbackTotals = useMemo(
    () =>
      fallbackUsageSeries.reduce(
        (acc, item) => {
          acc.reportViews += item.reportViews;
          acc.aiMessages += item.aiMessages;
          return acc;
        },
        { reportViews: 0, aiMessages: 0 },
      ),
    [fallbackUsageSeries],
  );

  const resolvedUsageSeries =
    usageSeries && usageSeries.length ? usageSeries : fallbackUsageSeries;

  const resolvedTotals =
    usageSeries && usageSeries.length ? usageTotals : fallbackTotals;

  const accessDetails = useMemo(() => {
    const MS_PER_DAY = 86_400_000;
    const clamp = (value: number) => Math.min(Math.max(value, 0), 1);
    const now = Date.now();

    const defaultDetails = {
      isLoading: billingLoading && !billingSnapshot,
      hasAccess: false,
      badgeLabel: billingLoading ? 'Loading…' : 'Inactive',
      badgeBackground: billingLoading ? '#F3E8F740' : '#E5E7EB',
      badgeColor: billingLoading ? '#9E5DAB' : '#6B7280',
      accentColor: billingLoading ? '#9E5DAB' : '#E5E7EB',
      percentRemaining: 0,
      percentLabel: billingLoading ? '--' : '0%',
      circleSubtitle: billingLoading ? 'Checking…' : 'No access',
      daysSummaryValue: billingLoading ? '—' : '0',
      daysSummaryCaption: billingLoading ? 'Checking status' : 'days remaining',
      statusLine: billingLoading
        ? 'Checking your access status…'
        : 'No active chat access.',
      helperLine: billingLoading
        ? null
        : 'Unlock AI Mentor to start chatting instantly.',
    };

    if (!billingSnapshot) {
      return defaultDetails;
    }

    const parseDate = (value: string | null | undefined): Date | null => {
      if (!value) return null;
      const parsed = new Date(value);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    };

    type AccessEntry = {
      type: 'subscription' | 'complimentary';
      startDate: Date | null;
      endDate: Date | null;
      label: string;
      statusLine: string;
      helperLine: string | null;
      accentColor: string;
      badgeBackground: string;
      badgeColor: string;
      isActive: boolean;
    };

    const entries: AccessEntry[] = [];
    const { subscription, complimentary } = billingSnapshot;

    if (subscription) {
      const endDate = parseDate(subscription.currentPeriodEnd);
      let startDate = parseDate(subscription.currentPeriodStart);
      if (!startDate && endDate) {
        const fallback = new Date(endDate);
        fallback.setMonth(fallback.getMonth() - 1);
        startDate = fallback;
      }

      const subscriptionActive = isSubscriptionActive(subscription.status);
      const isActive =
        Boolean(endDate && endDate.getTime() > now && subscriptionActive) ||
        Boolean(endDate && endDate.getTime() > now && !subscription.cancelAtPeriodEnd);

      const endFormatted = endDate ? formatDateDisplay(endDate.toISOString()) : '—';

      let statusLine = 'Subscription status unavailable.';
      if (endDate) {
        if (subscription.cancelAtPeriodEnd) {
          statusLine = `Expires: ${endFormatted}`;
        } else if (subscriptionActive) {
          statusLine = `Renews: ${endFormatted}`;
        } else {
          statusLine = `Expired: ${endFormatted}`;
        }
      }

      const helperLine = subscription.cancelAtPeriodEnd
        ? 'Subscription will end after the current billing cycle.'
        : null;

      entries.push({
        type: 'subscription',
        startDate,
        endDate,
        label: isActive
          ? subscription.cancelAtPeriodEnd
            ? 'Active (ends soon)'
            : 'Active'
          : endDate && endDate.getTime() > now
            ? subscription.cancelAtPeriodEnd
              ? 'Active (ends soon)'
              : 'Active'
            : 'Inactive',
        statusLine,
        helperLine,
        accentColor: '#9E5DAB',
        badgeBackground: '#9E5DAB20',
        badgeColor: '#9E5DAB',
        isActive: Boolean(endDate && endDate.getTime() > now),
      });
    }

    if (complimentary?.expiresAt) {
      const endDate = parseDate(complimentary.expiresAt);
      let startDate: Date | null = null;
      if (endDate) {
        startDate = new Date(endDate);
        startDate.setMonth(startDate.getMonth() - 3);
      }

      const isActive = Boolean(complimentary.active && endDate && endDate.getTime() > now);
      const endFormatted = endDate ? formatDateDisplay(endDate.toISOString()) : '—';

      entries.push({
        type: 'complimentary',
        startDate,
        endDate,
        label: isActive ? 'Complimentary' : 'Complimentary (expired)',
        statusLine: endDate
          ? `${isActive ? 'Expires' : 'Expired'}: ${endFormatted}`
          : 'Complimentary access window unavailable.',
        helperLine: isActive
          ? 'Unlocked with your personalized report purchase.'
          : null,
        accentColor: '#6BA3D1',
        badgeBackground: '#6BA3D120',
        badgeColor: '#6BA3D1',
        isActive,
      });
    }

    if (!entries.length) {
      return {
        ...defaultDetails,
        isLoading: billingLoading,
      };
    }

    let chosen: AccessEntry | null = null;
    const activeSubscription = entries.find(
      (entry) => entry.type === 'subscription' && entry.isActive,
    );
    if (activeSubscription) {
      chosen = activeSubscription;
    } else {
      const activeEntries = entries.filter((entry) => entry.isActive && entry.endDate);
      if (activeEntries.length) {
        activeEntries.sort(
          (a, b) => (b.endDate!.getTime() - a.endDate!.getTime()),
        );
        chosen = activeEntries[0];
      } else {
        entries.sort(
          (a, b) => (b.endDate?.getTime() ?? 0) - (a.endDate?.getTime() ?? 0),
        );
        chosen = entries[0];
      }
    }

    if (!chosen) {
      return {
        ...defaultDetails,
        isLoading: billingLoading,
      };
    }

    const endDate = chosen.endDate;
    const startDate = chosen.startDate;
    const msRemaining = endDate ? endDate.getTime() - now : null;
    const hasAccess = Boolean(endDate && msRemaining !== null && msRemaining > 0);

    let percentRemaining = 0;
    if (endDate && startDate && msRemaining !== null) {
      const totalMs = endDate.getTime() - startDate.getTime();
      if (totalMs > 0) {
        percentRemaining = clamp(msRemaining / totalMs);
      }
    } else if (hasAccess) {
      percentRemaining = 1;
    }

    const percentLabel = `${Math.round(percentRemaining * 100)}%`;

    let circleSubtitle = 'No access';
    if (msRemaining !== null) {
      if (msRemaining > 0) {
        const daysLeft = Math.ceil(msRemaining / MS_PER_DAY);
        circleSubtitle =
          daysLeft <= 0
            ? 'Less than 1 day left'
            : daysLeft === 1
              ? '1 day left'
              : `${daysLeft} days left`;
      } else {
        circleSubtitle = 'Expired';
      }
    } else if (chosen.endDate) {
      circleSubtitle = 'Expired';
    }

    let daysSummaryValue = '0';
    let daysSummaryCaption = 'days remaining';
    if (msRemaining !== null) {
      if (msRemaining > 0) {
        const daysLeft = Math.ceil(msRemaining / MS_PER_DAY);
        daysSummaryValue = `${daysLeft}`;
        daysSummaryCaption = daysLeft === 1 ? 'day remaining' : 'days remaining';
      } else if (msRemaining === 0) {
        daysSummaryValue = '0';
        daysSummaryCaption = 'days remaining';
      } else {
        daysSummaryValue = '0';
        daysSummaryCaption = 'days remaining';
      }
    } else if (!endDate) {
      daysSummaryValue = hasAccess ? '—' : '0';
      daysSummaryCaption = hasAccess ? 'remaining' : 'days remaining';
    }

    let helperLine = chosen.helperLine;
    if (
      chosen.type === 'subscription' &&
      complimentary?.active &&
      complimentary.expiresAt
    ) {
      const complimentaryFormatted = formatDateDisplay(complimentary.expiresAt);
      if (complimentaryFormatted !== '—') {
        helperLine =
          helperLine ??
          `Complimentary access active through ${complimentaryFormatted}.`;
      }
    }

    return {
      isLoading: billingLoading,
      hasAccess,
      badgeLabel: chosen.label,
      badgeBackground: chosen.badgeBackground,
      badgeColor: chosen.badgeColor,
      accentColor: chosen.accentColor,
      percentRemaining,
      percentLabel,
      circleSubtitle,
      daysSummaryValue,
      daysSummaryCaption,
      statusLine: chosen.statusLine,
      helperLine,
    };
  }, [billingSnapshot, billingLoading, formatDateDisplay, isSubscriptionActive]);

  const usageChartData = useMemo(() => {
    const formatter = new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
    });

    return resolvedUsageSeries.map((item, index) => {
      const date = new Date(item.week);
      const weekLabel = Number.isNaN(date.getTime())
        ? `Week ${index + 1}`
        : formatter.format(date);
      return {
        week: weekLabel,
        reportViews: item.reportViews,
        aiMessages: item.aiMessages,
      };
    });
  }, [resolvedUsageSeries]);

  const handleProfileSubmit = async () => {
    if (!onProfileSave) return;
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setProfileStateError('Email is required.');
      return;
    }

    setProfileStateError(null);
    setProfileSuccessMessage(null);

    try {
      await onProfileSave({ name: trimmedName, email: trimmedEmail });
      setProfileSuccessMessage('Profile updated successfully.');
    } catch (error) {
      setProfileStateError(
        error instanceof Error
          ? error.message
          : 'Unable to update profile. Please try again.',
      );
    }
  };

  const handlePasswordChange = async () => {
    if (!onChangePassword) return;

    if (!currentPassword) {
      setChangePasswordError('Enter your current password.');
      return;
    }

    if (!newPassword || newPassword.length < 8) {
      setChangePasswordError('New password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setChangePasswordError('New passwords do not match.');
      return;
    }

    setChangePasswordError(null);

    try {
      await onChangePassword(currentPassword, newPassword);
      setProfileSuccessMessage('Password updated successfully.');
      setChangePasswordOpen(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      setChangePasswordError(
        error instanceof Error
          ? error.message
          : 'Unable to update password. Please try again.',
      );
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        {/* Desktop Sidebar Navigation */}
        <aside className="hidden lg:block w-64 min-h-screen border-r border-border bg-card p-6">
          <div className="mb-8">
            <BecomeFamousLogo size="md" onClick={handleLogoClick} />
          </div>

          <nav className="space-y-2">
            {navigationItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavClick(item)}
                disabled={item.id === 'report' && navigateToDashboardLoading}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                  activeSection === item.id
                    ? 'text-white'
                    : 'text-foreground hover:bg-muted'
                } ${
                  item.id === 'report' && navigateToDashboardLoading
                    ? 'opacity-70 cursor-not-allowed'
                    : ''
                }`}
                style={
                  activeSection === item.id
                    ? { backgroundColor: '#9E5DAB' }
                    : {}
                }
              >
                <span className="flex items-center gap-3" style={{ color: activeSection === item.id ? 'white' : undefined }}>
                  <span style={activeSection === item.id ? { color: 'white' } : { color: '#9E5DAB' }}>
                    {item.id === 'report' && navigateToDashboardLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      item.icon
                    )}
                  </span>
                  <span style={{ color: activeSection === item.id ? 'white' : 'black' }}>{item.label}</span>
                </span>
              </button>
            ))}
          </nav>
        </aside>

        {/* Mobile Menu Button - Fixed at top */}
        <motion.button
          className="lg:hidden fixed top-4 left-4 z-50 p-3 rounded-full shadow-lg"
          style={{ backgroundColor: '#9E5DAB' }}
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {mobileMenuOpen ? (
            <X className="w-6 h-6 text-white" />
          ) : (
            <Menu className="w-6 h-6 text-white" />
          )}
        </motion.button>

        {/* Mobile Sidebar Navigation - Overlay */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="lg:hidden fixed inset-0 bg-black/50 z-40"
                onClick={() => setMobileMenuOpen(false)}
              />
              
              {/* Sidebar */}
              <motion.aside
                initial={{ x: -280 }}
                animate={{ x: 0 }}
                exit={{ x: -280 }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="lg:hidden fixed left-0 top-0 bottom-0 w-64 bg-card border-r border-border p-6 z-50 overflow-y-auto"
              >
                <div className="mb-8 mt-16">
                  <BecomeFamousLogo size="md" onClick={handleLogoClick} />
                </div>

                <nav className="space-y-2">
                  {navigationItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleNavClick(item)}
                      disabled={item.id === 'report' && navigateToDashboardLoading}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                        activeSection === item.id
                          ? 'text-white'
                          : 'text-foreground hover:bg-muted'
                      } ${
                        item.id === 'report' && navigateToDashboardLoading
                          ? 'opacity-70 cursor-not-allowed'
                          : ''
                      }`}
                      style={
                        activeSection === item.id
                          ? { backgroundColor: '#9E5DAB' }
                          : {}
                      }
                    >
                      <span className="flex items-center gap-3" style={{ color: activeSection === item.id ? 'white' : undefined }}>
                        <span style={activeSection === item.id ? { color: 'white' } : { color: '#9E5DAB' }}>
                          {item.id === 'report' && navigateToDashboardLoading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : (
                            item.icon
                          )}
                        </span>
                        <span style={{ color: activeSection === item.id ? 'white' : 'black' }}>{item.label}</span>
                      </span>
                    </button>
                  ))}
                </nav>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* Main Content Area */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 pt-20 lg:pt-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
            <div>
              <h1 className="mb-1">My Report</h1>
              <p className="text-muted-foreground text-sm sm:text-base">
                Manage your creator journey and unlock rewards
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-muted-foreground text-sm hidden sm:inline">welcome, {displayName}</span>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <motion.button
                    className="rounded-full cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                    style={{ 
                      outlineColor: '#9E5DAB',
                      ['--tw-ring-color' as string]: '#9E5DAB'
                    }}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                    onClick={() => setActiveSection('profile')}
                  >
                    <motion.div
                      whileHover={{ rotate: [0, -10, 10, -10, 0] }}
                      transition={{ duration: 0.5 }}
                    >
                      <Avatar className="h-10 w-10" style={{ backgroundColor: '#9E5DAB20' }}>
                        <AvatarFallback style={{ backgroundColor: '#9E5DAB', color: 'white' }}>{avatarInitial}</AvatarFallback>
                      </Avatar>
                    </motion.div>
                  </motion.button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => setActiveSection('profile')}
                    className="cursor-pointer"
                  >
                    <UserCircle className="w-4 h-4 mr-2" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={onLogout}
                    className="cursor-pointer text-destructive focus:text-destructive"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Log Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Onboarding Prompt - Show if not completed onboarding or not paid */}
          {(!hasCompletedOnboarding || !hasPaid) && activeSection === 'report' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <Card className="p-12 text-center border-2" style={{ borderColor: '#9E5DAB' }}>
                <div 
                  className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6"
                  style={{ backgroundColor: '#EBD7DC' }}
                >
                  {!hasCompletedOnboarding ? (
                    <Sparkles className="w-12 h-12" style={{ color: '#9E5DAB' }} />
                  ) : (
                    <Lock className="w-12 h-12" style={{ color: '#9E5DAB' }} />
                  )}
                </div>
                
                <h2 className="mb-4">
                  {!hasCompletedOnboarding 
                    ? "Complete Your Creator Profile"
                    : "Unlock Your Personalized Dashboard"
                  }
                </h2>
                
                <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
                  {!hasCompletedOnboarding 
                    ? "Answer a few questions about your creator journey so we can build a personalized growth plan tailored specifically to your goals and challenges."
                    : "Your personalized report is ready! Get access to your Fame Score, growth projections, action priority matrix, and 8 strategic sections designed to accelerate your success."
                  }
                </p>
                
                <Button
                  onClick={onBecomeFamousNow}
                  className="px-12 py-6 rounded-full"
                  style={{ backgroundColor: '#9E5DAB' }}
                >
                  {!hasCompletedOnboarding ? "Become Famous Now" : "Unlock Dashboard"}
                </Button>
              </Card>
            </motion.div>
          )}

          {/* Content based on active section */}
          {activeSection === 'referrals' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <Card className="p-8 border-l-4" style={{ borderLeftColor: '#9E5DAB' }}>
                <div className="flex items-start gap-6">
                  <div 
                    className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: '#9E5DAB20' }}
                  >
                    <Users className="w-8 h-8" style={{ color: '#9E5DAB' }} />
                  </div>
                  
                  <div className="flex-1">
                    <h2 className="mb-2">Referrals</h2>
                    <p className="text-muted-foreground mb-6">
                      Track your invites and unlock exclusive rewards
                    </p>

                    {/* Empty State */}
                    <div className="bg-muted/50 rounded-xl p-8 text-center">
                      <div 
                        className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4"
                        style={{ backgroundColor: '#9E5DAB10' }}
                      >
                        <Sparkles className="w-10 h-10" style={{ color: '#9E5DAB' }} />
                      </div>
                      <h3 className="mb-2">You're early!</h3>
                      <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                        Referral rewards are on the way. Soon you'll be able to invite fellow creators and earn exclusive benefits together.
                      </p>
                      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        <span>Coming soon</span>
                      </div>
                    </div>

                    {/* Preview Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
                      <Card className="p-4 bg-background hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-2 mb-2">
                          <TrendingUp className="w-4 h-4" style={{ color: '#9E5DAB' }} />
                          <span className="text-sm text-muted-foreground">Total Invites</span>
                        </div>
                        <p className="text-muted-foreground">—</p>
                      </Card>

                      <Card className="p-4 bg-background hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-2 mb-2">
                          <Users className="w-4 h-4" style={{ color: '#9E5DAB' }} />
                          <span className="text-sm text-muted-foreground">Active Referrals</span>
                        </div>
                        <p className="text-muted-foreground">—</p>
                      </Card>

                      <Card className="p-4 bg-background hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-2 mb-2">
                          <Award className="w-4 h-4" style={{ color: '#9E5DAB' }} />
                          <span className="text-sm text-muted-foreground">Rewards Earned</span>
                        </div>
                        <p className="text-muted-foreground">—</p>
                      </Card>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}

          {activeSection === 'appointments' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="space-y-6"
            >
              <Card className="p-8 border-l-4" style={{ borderLeftColor: '#9E5DAB' }}>
                <div className="flex items-start gap-6">
                  <div 
                    className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: '#9E5DAB20' }}
                  >
                    <Calendar className="w-8 h-8" style={{ color: '#9E5DAB' }} />
                  </div>
                  
                  <div className="flex-1">
                    <h2 className="mb-2">My Appointments</h2>
                    <p className="text-muted-foreground">
                      Manage your 1:1 expert sessions and coaching appointments
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start gap-4 mb-6">
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: '#EBD7DC' }}
                  >
                    <Video className="w-6 h-6" style={{ color: '#9E5DAB' }} />
                  </div>
                  <div className="flex-1">
                    <h3 className="mb-1">1:1 Expert Sessions</h3>
                    <p className="text-sm text-muted-foreground">Completed and scheduled sessions</p>
                  </div>
                  <Badge 
                    className="px-3 py-1"
                    style={{ backgroundColor: '#9E5DAB20', color: '#9E5DAB' }}
                  >
                    3 Total
                  </Badge>
                </div>

                <div className="relative">
                  <div className="absolute left-6 top-8 bottom-8 w-0.5 bg-gradient-to-b from-muted via-muted to-transparent" />

                  <div className="space-y-6">
                    <div className="flex items-start gap-4 relative">
                      <div 
                        className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 z-10"
                        style={{ backgroundColor: '#9E5DAB' }}
                      >
                        <Check className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1 pt-2">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <span>Strategy Session: Content Calendar</span>
                          <span className="text-sm text-muted-foreground whitespace-nowrap">Nov 15, 2025</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Developed 30-day content strategy with Sarah Chen
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4 relative">
                      <div 
                        className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 z-10"
                        style={{ backgroundColor: '#9E5DAB' }}
                      >
                        <Check className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1 pt-2">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <span>Growth Deep Dive: Algorithm Optimization</span>
                          <span className="text-sm text-muted-foreground whitespace-nowrap">Oct 22, 2025</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Platform-specific tactics with Marcus Rodriguez
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4 relative">
                      <motion.div 
                        className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 z-10 border-2"
                        style={{ 
                          borderColor: '#8FD9FB',
                          backgroundColor: 'white'
                        }}
                        animate={{ 
                          scale: [1, 1.1, 1],
                          boxShadow: [
                            '0 0 0 0 rgba(143, 217, 251, 0.4)',
                            '0 0 0 8px rgba(143, 217, 251, 0)',
                            '0 0 0 0 rgba(143, 217, 251, 0)'
                          ]
                        }}
                        transition={{ 
                          duration: 2,
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                      >
                        <Calendar className="w-6 h-6" style={{ color: '#8FD9FB' }} />
                      </motion.div>
                      <div className="flex-1 pt-2">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <span>Monetization Strategy Session</span>
                          <span className="text-sm text-muted-foreground whitespace-nowrap">Nov 28, 2025</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Upcoming session with Emma Thompson
                        </p>
                        <Badge 
                          className="mt-2 px-2 py-0.5 text-xs"
                          style={{ backgroundColor: '#8FD9FB20', color: '#6BA3D1' }}
                        >
                          Scheduled
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-border">
                  <Dialog open={scheduleSessionOpen} onOpenChange={setScheduleSessionOpen}>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        className="w-full sm:w-auto gap-2"
                        style={{ borderColor: '#9E5DAB', color: '#9E5DAB' }}
                      >
                        <Calendar className="w-4 h-4" />
                        Schedule New Session
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <div 
                            className="w-10 h-10 rounded-xl flex items-center justify-center"
                            style={{ backgroundColor: '#9E5DAB20' }}
                          >
                            <Video className="w-5 h-5" style={{ color: '#9E5DAB' }} />
                          </div>
                          Schedule Expert Session
                        </DialogTitle>
                        <DialogDescription>
                          Book a personalized 1:1 session with one of our expert coaches to accelerate your creator journey.
                        </DialogDescription>
                      </DialogHeader>

                      <div className="space-y-6 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="session-type" className="flex items-center gap-2">
                            <Lightbulb className="w-4 h-4" style={{ color: '#9E5DAB' }} />
                            Session Focus
                          </Label>
                          <Select value={sessionType} onValueChange={setSessionType}>
                            <SelectTrigger id="session-type" className="bg-input-background">
                              <SelectValue placeholder="Choose what you'd like to work on..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="content-strategy">Content Strategy & Planning</SelectItem>
                              <SelectItem value="algorithm-optimization">Algorithm Optimization</SelectItem>
                              <SelectItem value="monetization">Monetization Strategy</SelectItem>
                              <SelectItem value="brand-partnerships">Brand Partnerships</SelectItem>
                              <SelectItem value="audience-growth">Audience Growth Tactics</SelectItem>
                              <SelectItem value="platform-specific">Platform-Specific Tips</SelectItem>
                              <SelectItem value="creative-direction">Creative Direction</SelectItem>
                              <SelectItem value="analytics-review">Analytics Deep Dive</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="expert" className="flex items-center gap-2">
                            <UserCircle className="w-4 h-4" style={{ color: '#9E5DAB' }} />
                            Preferred Expert
                          </Label>
                          <Select 
                            value={sessionExpert} 
                            onValueChange={(value) => {
                              setSessionExpert(value);
                              setSessionDate(undefined);
                              setSessionTime('');
                            }}
                          >
                            <SelectTrigger id="expert" className="bg-input-background">
                              <SelectValue placeholder="Select an expert coach..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="sarah-chen">
                                <div className="flex flex-col">
                                  <span>Sarah Chen</span>
                                  <span className="text-xs text-muted-foreground">Content Strategy Specialist</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="marcus-rodriguez">
                                <div className="flex flex-col">
                                  <span>Marcus Rodriguez</span>
                                  <span className="text-xs text-muted-foreground">Growth & Algorithm Expert</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="emma-thompson">
                                <div className="flex flex-col">
                                  <span>Emma Thompson</span>
                                  <span className="text-xs text-muted-foreground">Monetization Expert</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="david-kim">
                                <div className="flex flex-col">
                                  <span>David Kim</span>
                                  <span className="text-xs text-muted-foreground">Brand Partnerships Strategist</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="any">
                                <div className="flex flex-col">
                                  <span>No Preference</span>
                                  <span className="text-xs text-muted-foreground">Match me with the best fit</span>
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          {sessionExpert && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Check className="w-3 h-3" style={{ color: '#9E5DAB' }} />
                              Showing availability for selected expert
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" style={{ color: '#9E5DAB' }} />
                            Select Date
                          </Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className="w-full justify-start text-left font-normal bg-input-background"
                                disabled={!sessionExpert}
                              >
                                <Calendar className="mr-2 h-4 w-4" />
                                {sessionDate ? sessionDate.toLocaleDateString('en-US', { 
                                  weekday: 'long', 
                                  year: 'numeric', 
                                  month: 'long', 
                                  day: 'numeric' 
                                }) : <span>{sessionExpert ? 'Pick a date' : 'Select an expert first'}</span>}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <CalendarComponent
                                mode="single"
                                selected={sessionDate}
                                onSelect={(date) => {
                                  setSessionDate(date);
                                  setSessionTime('');
                                }}
                                disabled={(date) => {
                                  const today = new Date();
                                  today.setHours(0, 0, 0, 0);
                                  if (date < today) return true;
                                  if (!sessionExpert) return true;
                                  return !dateHasAvailability(sessionExpert, date);
                                }}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          {sessionExpert && !sessionDate && (
                            <p className="text-xs text-muted-foreground">
                              Only dates with available time slots are selectable
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label className="flex items-center gap-2">
                            <Clock className="w-4 h-4" style={{ color: '#9E5DAB' }} />
                            Available Time Slots
                          </Label>
                          {!sessionExpert || !sessionDate ? (
                            <div className="p-4 bg-muted/50 rounded-lg text-center text-sm text-muted-foreground">
                              {!sessionExpert 
                                ? 'Select an expert to see available times' 
                                : 'Select a date to see available time slots'
                              }
                            </div>
                          ) : (
                            <>
                              {getAvailableTimeSlots(sessionExpert, sessionDate).length > 0 ? (
                                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1">
                                  {getAvailableTimeSlots(sessionExpert, sessionDate).map((time) => (
                                    <Button
                                      key={time}
                                      variant={sessionTime === time ? "default" : "outline"}
                                      className="justify-center text-sm"
                                      style={
                                        sessionTime === time
                                          ? { backgroundColor: '#9E5DAB', color: 'white' }
                                          : {}
                                      }
                                      onClick={() => setSessionTime(time)}
                                    >
                                      {time}
                                    </Button>
                                  ))}
                                </div>
                              ) : (
                                <div className="p-4 bg-muted/50 rounded-lg text-center text-sm text-muted-foreground">
                                  No available time slots for this date
                                </div>
                              )}
                            </>
                          )}
                          {sessionTime && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Check className="w-3 h-3" style={{ color: '#9E5DAB' }} />
                              {sessionTime} selected • 60-minute session
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="session-notes" className="flex items-center gap-2">
                            <MessageSquare className="w-4 h-4" style={{ color: '#9E5DAB' }} />
                            Goals & Topics
                          </Label>
                          <Textarea
                            id="session-notes"
                            placeholder="What would you like to focus on in this session? Share any specific challenges or goals..."
                            value={sessionNotes}
                            onChange={(e) => setSessionNotes(e.target.value)}
                            className="bg-input-background min-h-[100px] resize-none"
                          />
                          <p className="text-xs text-muted-foreground">
                            This helps your expert prepare a customized session for you.
                          </p>
                        </div>

                        <div 
                          className="p-4 rounded-lg border-2"
                          style={{ 
                            backgroundColor: '#9E5DAB10',
                            borderColor: '#9E5DAB40'
                          }}
                        >
                          <div className="flex items-start gap-3">
                            <div 
                              className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                              style={{ backgroundColor: '#9E5DAB20' }}
                            >
                              <CreditCard className="w-5 h-5" style={{ color: '#9E5DAB' }} />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-baseline gap-2 mb-1">
                                <span>$150</span>
                                <span className="text-sm text-muted-foreground">per session</span>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                60-minute personalized coaching session with expert-level guidance and actionable strategies.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <DialogFooter className="gap-2">
                        <Button 
                          variant="outline" 
                          onClick={() => {
                            setScheduleSessionOpen(false);
                            setSessionType('');
                            setSessionExpert('');
                            setSessionDate(undefined);
                            setSessionTime('');
                            setSessionNotes('');
                          }}
                        >
                          Cancel
                        </Button>
                        <Button 
                          style={{ backgroundColor: '#9E5DAB', color: 'white' }}
                          disabled={!sessionType || !sessionExpert || !sessionDate || !sessionTime}
                          onClick={() => {
                            const bookingData = {
                              type: sessionType,
                              expert: sessionExpert,
                              date: sessionDate?.toISOString().split('T')[0],
                              time: sessionTime,
                              notes: sessionNotes,
                              timestamp: new Date().toISOString()
                            };
                            console.log('Session scheduled:', bookingData);
                            setScheduleSessionOpen(false);
                            setSessionType('');
                            setSessionExpert('');
                            setSessionDate(undefined);
                            setSessionTime('');
                            setSessionNotes('');
                          }}
                        >
                          <Check className="w-4 h-4 mr-2" />
                          Confirm Booking
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </Card>
            </motion.div>
          )}

          {activeSection === 'usage' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="space-y-6"
            >
              <Card className="p-8 border-l-4" style={{ borderLeftColor: '#6BA3D1' }}>
                <div className="flex items-start gap-6">
                  <div 
                    className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: '#6BA3D120' }}
                  >
                    <BarChart3 className="w-8 h-8" style={{ color: '#6BA3D1' }} />
                  </div>
                  
                  <div className="flex-1">
                    <h2 className="mb-2">Usage Analytics</h2>
                    <p className="text-muted-foreground">
                      Monitor your platform usage and activity insights
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between gap-4 mb-6">
                  <div className="flex items-start gap-4">
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${accessDetails.accentColor}20` }}
                    >
                      <Timer className="w-6 h-6" style={{ color: accessDetails.accentColor }} />
                    </div>
                    <div>
                      <h3 className="mb-1">Access Time Left</h3>
                      <p className="text-sm text-muted-foreground">AI Mentor Plan</p>
                    </div>
                  </div>
                  <Badge 
                    className="px-3 py-1" 
                    style={{ backgroundColor: accessDetails.badgeBackground, color: accessDetails.badgeColor }}
                  >
                    {accessDetails.badgeLabel}
                  </Badge>
                </div>

                <div className="flex items-center gap-8 flex-wrap">
                  <div className="relative w-32 h-32 flex-shrink-0">
                    <svg className="w-32 h-32 transform -rotate-90">
                      <circle
                        cx="64"
                        cy="64"
                        r="56"
                        stroke="#E8E8E8"
                        strokeWidth="8"
                        fill="none"
                      />
                      <circle
                        cx="64"
                        cy="64"
                        r="56"
                        stroke={accessDetails.accentColor}
                        strokeWidth="8"
                        fill="none"
                        strokeDasharray={`${Math.max(0, Math.min(accessDetails.percentRemaining, 1)) * (2 * Math.PI * 56)} ${(2 * Math.PI * 56)}`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-sm text-muted-foreground">{accessDetails.percentLabel}</span>
                      <span className="text-xs text-muted-foreground text-center leading-tight">
                        {accessDetails.circleSubtitle}
                      </span>
                    </div>
                  </div>

                  <div className="flex-1 space-y-4 min-w-[220px]">
                    <div>
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="text-muted-foreground">
                          {accessDetails.daysSummaryValue}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {accessDetails.daysSummaryCaption}
                        </span>
                      </div>
                      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all duration-500"
                          style={{ 
                            width: `${Math.round(Math.max(0, Math.min(accessDetails.percentRemaining, 1)) * 100)}%`,
                            background: accessDetails.hasAccess
                              ? `linear-gradient(90deg, ${accessDetails.accentColor} 0%, ${accessDetails.accentColor} 100%)`
                              : '#E5E7EB'
                          }}
                        />
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="w-4 h-4" style={{ color: accessDetails.accentColor }} />
                      <span>{accessDetails.statusLine}</span>
                    </div>
                    {accessDetails.helperLine && (
                      <p className="text-xs text-muted-foreground">
                        {accessDetails.helperLine}
                      </p>
                    )}
                  </div>
                </div>
              </Card>

              <Card className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start gap-4 mb-6">
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ 
                      background: 'linear-gradient(135deg, #9E5DAB 0%, #8FD9FB 100%)'
                    }}
                  >
                    <Activity className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="mb-1">Usage Statistics</h3>
                    <p className="text-sm text-muted-foreground">Report views and AI chat activity</p>
                  </div>
                </div>

                {usageError && (
                  <div className="mb-4 rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                    We couldn&rsquo;t load your live usage stats. Showing sample data instead.
                  </div>
                )}

                <ResponsiveContainer width="100%" height={250}>
                  <LineChart
                    data={usageChartData}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#E8E8E8" vertical={false} />
                    <XAxis
                      dataKey="week"
                      tick={{ fill: '#666', fontSize: 12 }}
                      axisLine={{ stroke: '#E8E8E8' }}
                    />
                    <YAxis
                      tick={{ fill: '#666', fontSize: 12 }}
                      axisLine={{ stroke: '#E8E8E8' }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #E8E8E8',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                      }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="line" />
                    <Line
                      type="monotone"
                      dataKey="reportViews"
                      name="Report Views"
                      stroke="#9E5DAB"
                      strokeWidth={2}
                      dot={{ fill: '#9E5DAB', r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="aiMessages"
                      name="AI Chat Messages"
                      stroke="#6BA3D1"
                      strokeWidth={2}
                      dot={{ fill: '#6BA3D1', r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>

                <div className="mt-6 grid grid-cols-2 gap-4">
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#9E5DAB' }} />
                      <span className="text-xs text-muted-foreground">Report Views</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span>{resolvedTotals.reportViews}</span>
                      <span className="text-xs text-muted-foreground">total</span>
                    </div>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#6BA3D1' }} />
                      <span className="text-xs text-muted-foreground">AI Messages</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span>{resolvedTotals.aiMessages}</span>
                      <span className="text-xs text-muted-foreground">total</span>
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start gap-4 mb-6">
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: '#EBD7DC' }}
                  >
                    <Video className="w-6 h-6" style={{ color: '#9E5DAB' }} />
                  </div>
                  <div className="flex-1">
                    <h3 className="mb-1">1:1 Expert Sessions</h3>
                    <p className="text-sm text-muted-foreground">Completed and scheduled sessions</p>
                  </div>
                  <Badge 
                    className="px-3 py-1"
                    style={{ backgroundColor: '#9E5DAB20', color: '#9E5DAB' }}
                  >
                    3 Total
                  </Badge>
                </div>

                <div className="relative">
                  <div className="absolute left-6 top-8 bottom-8 w-0.5 bg-gradient-to-b from-muted via-muted to-transparent" />

                  <div className="space-y-6">
                    <div className="flex items-start gap-4 relative">
                      <div 
                        className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 z-10"
                        style={{ backgroundColor: '#9E5DAB' }}
                      >
                        <Check className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1 pt-2">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <span>Strategy Session: Content Calendar</span>
                          <span className="text-sm text-muted-foreground whitespace-nowrap">Nov 15, 2025</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Developed 30-day content strategy with Sarah Chen
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4 relative">
                      <div 
                        className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 z-10"
                        style={{ backgroundColor: '#9E5DAB' }}
                      >
                        <Check className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1 pt-2">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <span>Growth Deep Dive: Algorithm Optimization</span>
                          <span className="text-sm text-muted-foreground whitespace-nowrap">Oct 22, 2025</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Platform-specific tactics with Marcus Rodriguez
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4 relative">
                      <motion.div 
                        className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 z-10 border-2"
                        style={{ 
                          borderColor: '#8FD9FB',
                          backgroundColor: 'white'
                        }}
                        animate={{ 
                          scale: [1, 1.1, 1],
                          boxShadow: [
                            '0 0 0 0 rgba(143, 217, 251, 0.4)',
                            '0 0 0 8px rgba(143, 217, 251, 0)',
                            '0 0 0 0 rgba(143, 217, 251, 0)'
                          ]
                        }}
                        transition={{ 
                          duration: 2,
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                      >
                        <Calendar className="w-6 h-6" style={{ color: '#8FD9FB' }} />
                      </motion.div>
                      <div className="flex-1 pt-2">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <span>Monetization Strategy Session</span>
                          <span className="text-sm text-muted-foreground whitespace-nowrap">Nov 28, 2025</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Upcoming session with Emma Thompson
                        </p>
                        <Badge 
                          className="mt-2 px-2 py-0.5 text-xs"
                          style={{ backgroundColor: '#8FD9FB20', color: '#6BA3D1' }}
                        >
                          Scheduled
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-border">
                  <Dialog open={scheduleSessionOpen} onOpenChange={setScheduleSessionOpen}>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        className="w-full sm:w-auto gap-2"
                        style={{ borderColor: '#9E5DAB', color: '#9E5DAB' }}
                      >
                        <Calendar className="w-4 h-4" />
                        Schedule New Session
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <div 
                            className="w-10 h-10 rounded-xl flex items-center justify-center"
                            style={{ backgroundColor: '#9E5DAB20' }}
                          >
                            <Video className="w-5 h-5" style={{ color: '#9E5DAB' }} />
                          </div>
                          Schedule Expert Session
                        </DialogTitle>
                        <DialogDescription>
                          Book a personalized 1:1 session with one of our expert coaches to accelerate your creator journey.
                        </DialogDescription>
                      </DialogHeader>
                      {/* Dialog content duplicated intentionally for consistent UX */}
                      <div className="space-y-6 py-4">
                        {/* we can reuse same form */}
                        <div className="space-y-2">
                          <Label htmlFor="session-type-secondary" className="flex items-center gap-2">
                            <Lightbulb className="w-4 h-4" style={{ color: '#9E5DAB' }} />
                            Session Focus
                          </Label>
                          <Select value={sessionType} onValueChange={setSessionType}>
                            <SelectTrigger id="session-type-secondary" className="bg-input-background">
                              <SelectValue placeholder="Choose what you'd like to work on..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="content-strategy">Content Strategy & Planning</SelectItem>
                              <SelectItem value="algorithm-optimization">Algorithm Optimization</SelectItem>
                              <SelectItem value="monetization">Monetization Strategy</SelectItem>
                              <SelectItem value="brand-partnerships">Brand Partnerships</SelectItem>
                              <SelectItem value="audience-growth">Audience Growth Tactics</SelectItem>
                              <SelectItem value="platform-specific">Platform-Specific Tips</SelectItem>
                              <SelectItem value="creative-direction">Creative Direction</SelectItem>
                              <SelectItem value="analytics-review">Analytics Deep Dive</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="expert-secondary" className="flex items-center gap-2">
                            <UserCircle className="w-4 h-4" style={{ color: '#9E5DAB' }} />
                            Preferred Expert
                          </Label>
                          <Select 
                            value={sessionExpert} 
                            onValueChange={(value) => {
                              setSessionExpert(value);
                              setSessionDate(undefined);
                              setSessionTime('');
                            }}
                          >
                            <SelectTrigger id="expert-secondary" className="bg-input-background">
                              <SelectValue placeholder="Select an expert coach..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="sarah-chen">
                                <div className="flex flex-col">
                                  <span>Sarah Chen</span>
                                  <span className="text-xs text-muted-foreground">Content Strategy Specialist</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="marcus-rodriguez">
                                <div className="flex flex-col">
                                  <span>Marcus Rodriguez</span>
                                  <span className="text-xs text-muted-foreground">Growth & Algorithm Expert</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="emma-thompson">
                                <div className="flex flex-col">
                                  <span>Emma Thompson</span>
                                  <span className="text-xs text-muted-foreground">Monetization Expert</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="david-kim">
                                <div className="flex flex-col">
                                  <span>David Kim</span>
                                  <span className="text-xs text-muted-foreground">Brand Partnerships Strategist</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="any">
                                <div className="flex flex-col">
                                  <span>No Preference</span>
                                  <span className="text-xs text-muted-foreground">Match me with the best fit</span>
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" style={{ color: '#9E5DAB' }} />
                            Select Date
                          </Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className="w-full justify-start text-left font-normal bg-input-background"
                                disabled={!sessionExpert}
                              >
                                <Calendar className="mr-2 h-4 w-4" />
                                {sessionDate ? sessionDate.toLocaleDateString('en-US', { 
                                  weekday: 'long', 
                                  year: 'numeric', 
                                  month: 'long', 
                                  day: 'numeric' 
                                }) : <span>{sessionExpert ? 'Pick a date' : 'Select an expert first'}</span>}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <CalendarComponent
                                mode="single"
                                selected={sessionDate}
                                onSelect={(date) => {
                                  setSessionDate(date);
                                  setSessionTime('');
                                }}
                                disabled={(date) => {
                                  const today = new Date();
                                  today.setHours(0, 0, 0, 0);
                                  if (date < today) return true;
                                  if (!sessionExpert) return true;
                                  return !dateHasAvailability(sessionExpert, date);
                                }}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </div>

                        <div className="space-y-2">
                          <Label className="flex items-center gap-2">
                            <Clock className="w-4 h-4" style={{ color: '#9E5DAB' }} />
                            Available Time Slots
                          </Label>
                          {!sessionExpert || !sessionDate ? (
                            <div className="p-4 bg-muted/50 rounded-lg text-center text-sm text-muted-foreground">
                              {!sessionExpert 
                                ? 'Select an expert to see available times' 
                                : 'Select a date to see available time slots'
                              }
                            </div>
                          ) : (
                            <>
                              {getAvailableTimeSlots(sessionExpert, sessionDate).length > 0 ? (
                                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1">
                                  {getAvailableTimeSlots(sessionExpert, sessionDate).map((time) => (
                                    <Button
                                      key={time}
                                      variant={sessionTime === time ? "default" : "outline"}
                                      className="justify-center text-sm"
                                      style={
                                        sessionTime === time
                                          ? { backgroundColor: '#9E5DAB', color: 'white' }
                                          : {}
                                      }
                                      onClick={() => setSessionTime(time)}
                                    >
                                      {time}
                                    </Button>
                                  ))}
                                </div>
                              ) : (
                                <div className="p-4 bg-muted/50 rounded-lg text-center text-sm text-muted-foreground">
                                  No available time slots for this date
                                </div>
                              )}
                            </>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="session-notes-secondary" className="flex items-center gap-2">
                            <MessageSquare className="w-4 h-4" style={{ color: '#9E5DAB' }} />
                            Goals & Topics
                          </Label>
                          <Textarea
                            id="session-notes-secondary"
                            placeholder="What would you like to focus on in this session? Share any specific challenges or goals..."
                            value={sessionNotes}
                            onChange={(e) => setSessionNotes(e.target.value)}
                            className="bg-input-background min-h-[100px] resize-none"
                          />
                        </div>
                      </div>

                      <DialogFooter className="gap-2">
                        <Button 
                          variant="outline" 
                          onClick={() => {
                            setScheduleSessionOpen(false);
                            setSessionType('');
                            setSessionExpert('');
                            setSessionDate(undefined);
                            setSessionTime('');
                            setSessionNotes('');
                          }}
                        >
                          Cancel
                        </Button>
                        <Button 
                          style={{ backgroundColor: '#9E5DAB', color: 'white' }}
                          disabled={!sessionType || !sessionExpert || !sessionDate || !sessionTime}
                          onClick={() => {
                            const bookingData = {
                              type: sessionType,
                              expert: sessionExpert,
                              date: sessionDate?.toISOString().split('T')[0],
                              time: sessionTime,
                              notes: sessionNotes,
                              timestamp: new Date().toISOString()
                            };
                            console.log('Session scheduled:', bookingData);
                            setScheduleSessionOpen(false);
                            setSessionType('');
                            setSessionExpert('');
                            setSessionDate(undefined);
                            setSessionTime('');
                            setSessionNotes('');
                          }}
                        >
                          <Check className="w-4 h-4 mr-2" />
                          Confirm Booking
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </Card>
            </motion.div>
          )}

          {activeSection === 'rewards' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <Card className="p-8 border-l-4" style={{ borderLeftColor: '#B481C0' }}>
                <div className="flex items-start gap-6">
                  <div 
                    className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: '#B481C020' }}
                  >
                    <Gift className="w-8 h-8" style={{ color: '#B481C0' }} />
                  </div>
                  
                  <div className="flex-1">
                    <h2 className="mb-2">Rewards Program</h2>
                    <p className="text-muted-foreground mb-6">
                      Unlock exclusive perks and benefits as you grow
                    </p>

                    <div className="bg-muted/50 rounded-xl p-8 text-center">
                      <div 
                        className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4"
                        style={{ backgroundColor: '#B481C010' }}
                      >
                        <Award className="w-10 h-10" style={{ color: '#B481C0' }} />
                      </div>
                      <h3 className="mb-2">Exciting Rewards Await</h3>
                      <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                        We're building a comprehensive rewards system to celebrate your milestones and achievements as a creator.
                      </p>
                      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        <span>Coming soon</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}

          {activeSection === 'profile' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="space-y-6"
            >
              {/* Profile Header Card */}
              <Card className="p-8 border-l-4" style={{ borderLeftColor: '#D1A5DD' }}>
                <div className="flex items-start gap-6 mb-6">
                  <div 
                    className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: '#D1A5DD20' }}
                  >
                    <UserCircle className="w-8 h-8" style={{ color: '#D1A5DD' }} />
                  </div>
                  
                  <div className="flex-1">
                    <h2 className="mb-2">Profile</h2>
                    <p className="text-muted-foreground">
                      Manage your account information and preferences
                    </p>
                  </div>
                </div>

                <Separator className="mb-6" />

                {/* Basic Details Section */}
                <div className="space-y-6">
                  <div>
                    <h3 className="mb-4">Basic details</h3>
                    
                    <div className="space-y-4 max-w-2xl">
                      {/* Email Field */}
                      <div className="space-y-2">
                        <Label htmlFor="email" className="flex items-center gap-2">
                          <Mail className="w-4 h-4" style={{ color: '#D1A5DD' }} />
                          Email
                        </Label>
                        <Input
                          id="email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="bg-input-background"
                        />
                      </div>

                      {/* Name Field */}
                      <div className="space-y-2">
                        <Label htmlFor="name" className="flex items-center gap-2">
                          <UserIcon className="w-4 h-4" style={{ color: '#D1A5DD' }} />
                          Name
                        </Label>
                        <Input
                          id="name"
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="bg-input-background"
                        />
                      </div>

                      {(profileStateError || profileError) && (
                        <div className="rounded-2xl bg-destructive/10 text-destructive text-sm px-4 py-2">
                          {profileStateError || profileError}
                        </div>
                      )}

                      {profileSuccessMessage && !profileStateError && !profileError && (
                        <div className="rounded-2xl bg-emerald-100/70 text-emerald-600 text-sm px-4 py-2">
                          {profileSuccessMessage}
                        </div>
                      )}

                      {/* Change Password Button */}
                      <div className="flex items-center gap-3 pt-2 flex-wrap">
                        <Dialog open={changePasswordOpen} onOpenChange={setChangePasswordOpen}>
                          <DialogTrigger asChild>
                            <Button variant="outline" className="gap-2">
                              <Lock className="w-4 h-4" />
                              Change password
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Change Password</DialogTitle>
                              <DialogDescription>
                                Enter your current password and choose a new one.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <div className="space-y-2">
                                <Label htmlFor="current-password">Current Password</Label>
                                <Input
                                  id="current-password"
                                  type="password"
                                  value={currentPassword}
                                  onChange={(e) => setCurrentPassword(e.target.value)}
                                  className="bg-input-background"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="new-password">New Password</Label>
                                <Input
                                  id="new-password"
                                  type="password"
                                  value={newPassword}
                                  onChange={(e) => setNewPassword(e.target.value)}
                                  className="bg-input-background"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="confirm-password">Confirm New Password</Label>
                                <Input
                                  id="confirm-password"
                                  type="password"
                                  value={confirmPassword}
                                  onChange={(e) => setConfirmPassword(e.target.value)}
                                  className="bg-input-background"
                                />
                              </div>
                            </div>
                            {changePasswordError && (
                              <div className="bg-destructive/10 text-destructive text-sm rounded-xl px-4 py-2">
                                {changePasswordError}
                              </div>
                            )}
                            <DialogFooter>
                              <Button variant="outline" onClick={() => setChangePasswordOpen(false)}>
                                Cancel
                              </Button>
                              <Button 
                                style={{ backgroundColor: '#9E5DAB', color: 'white' }}
                                onClick={handlePasswordChange}
                                disabled={passwordUpdating}
                              >
                                {passwordUpdating ? 'Updating...' : 'Update Password'}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>

                        <Button
                          style={{ backgroundColor: '#9E5DAB', color: 'white' }}
                          className="gap-2"
                          onClick={handleProfileSubmit}
                          disabled={profileSaving}
                        >
                          <Save className="w-4 h-4" />
                          {profileSaving ? 'Saving...' : 'Save'}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Additional Settings Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Notifications */}
                <Card className="p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-4">
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: '#9E5DAB20' }}
                    >
                      <Bell className="w-6 h-6" style={{ color: '#9E5DAB' }} />
                    </div>
                    <div className="flex-1">
                      <h4 className="mb-1">Notifications</h4>
                      <p className="text-sm text-muted-foreground mb-3">
                        Manage your email and push notification preferences
                      </p>
                      <Dialog open={notificationsOpen} onOpenChange={setNotificationsOpen}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" className="text-sm">
                            Configure
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                              <Bell className="w-5 h-5" style={{ color: '#9E5DAB' }} />
                              Notification Preferences
                            </DialogTitle>
                            <DialogDescription>
                              Choose how and when you want to receive updates from BecomeFamous.AI
                            </DialogDescription>
                          </DialogHeader>
                          
                          <div className="space-y-6 py-4">
                            {/* Email Notifications */}
                            <div>
                              <h4 className="mb-4">Email Notifications</h4>
                              <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 rounded-lg border">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <Mail className="w-4 h-4" style={{ color: '#9E5DAB' }} />
                                      <Label htmlFor="email-notif" className="cursor-pointer">Email Notifications</Label>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                      Receive email updates about your account activity
                                    </p>
                                  </div>
                                  <Switch 
                                    id="email-notif" 
                                    checked={emailNotifications}
                                    onCheckedChange={setEmailNotifications}
                                  />
                                </div>

                                <div className="flex items-center justify-between p-4 rounded-lg border">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <TrendingUp className="w-4 h-4" style={{ color: '#9E5DAB' }} />
                                      <Label htmlFor="weekly-digest" className="cursor-pointer">Weekly Progress Digest</Label>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                      Get a weekly summary of your growth and achievements
                                    </p>
                                  </div>
                                  <Switch 
                                    id="weekly-digest" 
                                    checked={weeklyDigest}
                                    onCheckedChange={setWeeklyDigest}
                                    disabled={!emailNotifications}
                                  />
                                </div>

                                <div className="flex items-center justify-between p-4 rounded-lg border">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <Lightbulb className="w-4 h-4" style={{ color: '#9E5DAB' }} />
                                      <Label htmlFor="growth-tips" className="cursor-pointer">Growth Tips & Strategies</Label>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                      Receive personalized tips to accelerate your creator journey
                                    </p>
                                  </div>
                                  <Switch 
                                    id="growth-tips" 
                                    checked={growthTips}
                                    onCheckedChange={setGrowthTips}
                                    disabled={!emailNotifications}
                                  />
                                </div>
                              </div>
                            </div>

                            <Separator />

                            {/* Push Notifications */}
                            <div>
                              <h4 className="mb-4">Push Notifications</h4>
                              <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 rounded-lg border">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <Smartphone className="w-4 h-4" style={{ color: '#9E5DAB' }} />
                                      <Label htmlFor="push-notif" className="cursor-pointer">Push Notifications</Label>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                      Get real-time notifications on your device
                                    </p>
                                  </div>
                                  <Switch 
                                    id="push-notif" 
                                    checked={pushNotifications}
                                    onCheckedChange={setPushNotifications}
                                  />
                                </div>
                              </div>
                            </div>

                            <Separator />

                            {/* Updates & Announcements */}
                            <div>
                              <h4 className="mb-4">Updates & Announcements</h4>
                              <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 rounded-lg border">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <Sparkles className="w-4 h-4" style={{ color: '#9E5DAB' }} />
                                      <Label htmlFor="product-updates" className="cursor-pointer">Product Updates</Label>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                      Stay informed about new features and improvements
                                    </p>
                                  </div>
                                  <Switch 
                                    id="product-updates" 
                                    checked={productUpdates}
                                    onCheckedChange={setProductUpdates}
                                  />
                                </div>

                                <div className="flex items-center justify-between p-4 rounded-lg border">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <Users className="w-4 h-4" style={{ color: '#9E5DAB' }} />
                                      <Label htmlFor="community-updates" className="cursor-pointer">Community Updates</Label>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                      Get updates from the BecomeFamous.AI creator community
                                    </p>
                                  </div>
                                  <Switch 
                                    id="community-updates" 
                                    checked={communityUpdates}
                                    onCheckedChange={setCommunityUpdates}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>

                          <DialogFooter>
                            <Button variant="outline" onClick={() => setNotificationsOpen(false)}>
                              Cancel
                            </Button>
                            <Button 
                              style={{ backgroundColor: '#9E5DAB', color: 'white' }}
                              onClick={() => {
                                // Save preferences
                                setNotificationsOpen(false);
                              }}
                            >
                              <Check className="w-4 h-4 mr-2" />
                              Save Preferences
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </Card>

                {/* Privacy & Security */}
                <Card className="p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-4">
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: '#B481C020' }}
                    >
                      <Shield className="w-6 h-6" style={{ color: '#B481C0' }} />
                    </div>
                    <div className="flex-1">
                      <h4 className="mb-1">Privacy & Security</h4>
                      <p className="text-sm text-muted-foreground mb-3">
                        Control your data and security settings
                      </p>
                      <Dialog open={privacySecurityOpen} onOpenChange={setPrivacySecurityOpen}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" className="text-sm">
                            Manage
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                              <Shield className="w-5 h-5" style={{ color: '#B481C0' }} />
                              Privacy & Security Settings
                            </DialogTitle>
                            <DialogDescription>
                              Manage your account security and data privacy preferences
                            </DialogDescription>
                          </DialogHeader>
                          
                          <div className="space-y-6 py-4">
                            {/* Two-Factor Authentication */}
                            <div>
                              <h4 className="mb-4">Account Security</h4>
                              <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 rounded-lg border-2" style={{ borderColor: twoFactorEnabled ? '#B481C040' : 'transparent' }}>
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <Lock className="w-4 h-4" style={{ color: '#B481C0' }} />
                                      <Label htmlFor="two-factor" className="cursor-pointer">Two-Factor Authentication</Label>
                                      {twoFactorEnabled && (
                                        <Badge style={{ backgroundColor: '#B481C020', color: '#B481C0' }}>
                                          Enabled
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                      Add an extra layer of security to your account
                                    </p>
                                  </div>
                                  <Switch 
                                    id="two-factor" 
                                    checked={twoFactorEnabled}
                                    onCheckedChange={setTwoFactorEnabled}
                                  />
                                </div>

                                <Card className="p-4 bg-muted/50">
                                  <h4 className="mb-3 flex items-center gap-2">
                                    <Smartphone className="w-4 h-4" style={{ color: '#B481C0' }} />
                                    Active Sessions
                                  </h4>
                                  <div className="space-y-3">
                                    <div className="flex items-start justify-between gap-4 p-3 bg-background rounded-lg">
                                      <div className="flex items-start gap-3">
                                        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#B481C020' }}>
                                          <Smartphone className="w-5 h-5" style={{ color: '#B481C0' }} />
                                        </div>
                                        <div>
                                          <div className="flex items-center gap-2 mb-1">
                                            <p className="text-sm">Chrome on MacOS</p>
                                            <Badge variant="outline" className="text-xs">
                                              Current
                                            </Badge>
                                          </div>
                                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                            <span className="flex items-center gap-1">
                                              <MapPin className="w-3 h-3" />
                                              San Francisco, CA
                                            </span>
                                            <span className="flex items-center gap-1">
                                              <Clock className="w-3 h-3" />
                                              Active now
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    </div>

                                    <div className="flex items-start justify-between gap-4 p-3 bg-background rounded-lg">
                                      <div className="flex items-start gap-3">
                                        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#B481C020' }}>
                                          <Smartphone className="w-5 h-5" style={{ color: '#B481C0' }} />
                                        </div>
                                        <div>
                                          <p className="text-sm mb-1">Safari on iPhone</p>
                                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                            <span className="flex items-center gap-1">
                                              <MapPin className="w-3 h-3" />
                                              San Francisco, CA
                                            </span>
                                            <span className="flex items-center gap-1">
                                              <Clock className="w-3 h-3" />
                                              2 hours ago
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                      <Button variant="outline" size="sm" className="text-xs">
                                        Revoke
                                      </Button>
                                    </div>
                                  </div>
                                </Card>
                              </div>
                            </div>

                            <Separator />

                            {/* Privacy Controls */}
                            <div>
                              <h4 className="mb-4">Privacy Controls</h4>
                              <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 rounded-lg border">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <UserCircle className="w-4 h-4" style={{ color: '#B481C0' }} />
                                      <Label htmlFor="profile-public" className="cursor-pointer">Public Profile</Label>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                      Make your profile visible to other creators
                                    </p>
                                  </div>
                                  <Switch 
                                    id="profile-public" 
                                    checked={profilePublic}
                                    onCheckedChange={setProfilePublic}
                                  />
                                </div>

                                <div className="flex items-center justify-between p-4 rounded-lg border">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <BarChart3 className="w-4 h-4" style={{ color: '#B481C0' }} />
                                      <Label htmlFor="data-sharing" className="cursor-pointer">Analytics Data Sharing</Label>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                      Help improve BecomeFamous.AI by sharing anonymized data
                                    </p>
                                  </div>
                                  <Switch 
                                    id="data-sharing" 
                                    checked={dataSharing}
                                    onCheckedChange={setDataSharing}
                                  />
                                </div>
                              </div>
                            </div>

                            <Separator />

                            {/* Data Management */}
                            <div>
                              <h4 className="mb-4">Data Management</h4>
                              <div className="space-y-3">
                                <Button variant="outline" className="w-full justify-start gap-2">
                                  <Download className="w-4 h-4" />
                                  Download Your Data
                                </Button>
                                <Button variant="outline" className="w-full justify-start gap-2 text-destructive hover:text-destructive">
                                  <AlertCircle className="w-4 h-4" />
                                  Delete Account
                                </Button>
                              </div>
                            </div>
                          </div>

                          <DialogFooter>
                            <Button variant="outline" onClick={() => setPrivacySecurityOpen(false)}>
                              Cancel
                            </Button>
                            <Button 
                              style={{ backgroundColor: '#B481C0', color: 'white' }}
                              onClick={() => {
                                // Save preferences
                                setPrivacySecurityOpen(false);
                              }}
                            >
                              <Check className="w-4 h-4 mr-2" />
                              Save Changes
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </Card>

                {/* Billing & Subscription */}
                <Card className="p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-4">
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: '#6BA3D120' }}
                    >
                      <CreditCard className="w-6 h-6" style={{ color: '#6BA3D1' }} />
                    </div>
                    <div className="flex-1">
                      <h4 className="mb-1">Billing & Subscription</h4>
                      <p className="text-sm text-muted-foreground mb-3">
                        Manage your payment methods and plan
                      </p>
                      <Dialog open={billingOpen} onOpenChange={setBillingOpen}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" className="text-sm">
                            View Details
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                              <CreditCard className="w-5 h-5" style={{ color: '#6BA3D1' }} />
                              Billing & Subscription
                            </DialogTitle>
                            <DialogDescription>
                              Manage your subscription plan, payment methods, and billing history
                            </DialogDescription>
                          </DialogHeader>
                          
                          <div className="space-y-6 py-4">
                            {/* Current Plan */}
                            <div>
                              <h4 className="mb-4">Current Plan</h4>
                              <Card className="p-6 border-2" style={{ borderColor: '#6BA3D1', backgroundColor: '#6BA3D105' }}>
                                <div className="flex items-start justify-between mb-4">
                                  <div>
                                    <div className="flex items-center gap-3 mb-2">
                                      <h3 style={{ color: '#6BA3D1' }}>AI Mentor Pro</h3>
                                      <Badge style={{ backgroundColor: '#6BA3D1', color: 'white' }}>
                                        Active
                                      </Badge>
                                    </div>
                                    <p className="text-muted-foreground">
                                      Unlimited coaching + saved sessions
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <div className="mb-1">
                                      <span className="text-2xl" style={{ color: '#6BA3D1' }}>$6</span>
                                      <span className="text-muted-foreground">/month</span>
                                    </div>
                                  </div>
                                </div>
                                <Separator className="my-4" />
                                <div className="space-y-2 text-sm">
                                  <div className="flex items-center gap-2">
                                    <Check className="w-4 h-4" style={{ color: '#6BA3D1' }} />
                                    <span>Unlimited Ask Vee questions</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Check className="w-4 h-4" style={{ color: '#6BA3D1' }} />
                                    <span>Chat history & saved sessions</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Check className="w-4 h-4" style={{ color: '#6BA3D1' }} />
                                    <span>Priority support</span>
                                  </div>
                                </div>
                                <Separator className="my-4" />
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-muted-foreground">Next billing date</span>
                                  <span>November 20, 2025</span>
                                </div>
                                <div className="flex gap-2 mt-4">
                                  <Button variant="outline" size="sm" className="flex-1">
                                    Change Plan
                                  </Button>
                                  <Button variant="outline" size="sm" className="flex-1 text-destructive hover:text-destructive">
                                    Cancel Subscription
                                  </Button>
                                </div>
                              </Card>
                            </div>

                            <Separator />

                            {/* Payment Methods */}
                            <div>
                              <div className="flex items-center justify-between mb-4">
                                <h4>Payment Methods</h4>
                                <Button variant="outline" size="sm">
                                  Add Payment Method
                                </Button>
                              </div>
                              <div className="space-y-3">
                                <Card className="p-4 border-2" style={{ borderColor: '#6BA3D140' }}>
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      <div className="w-12 h-8 rounded flex items-center justify-center bg-gradient-to-r from-blue-600 to-blue-400">
                                        <CreditCard className="w-6 h-6 text-white" />
                                      </div>
                                      <div>
                                        <div className="flex items-center gap-2 mb-1">
                                          <p>Visa ending in 4242</p>
                                          <Badge variant="outline" className="text-xs">
                                            Default
                                          </Badge>
                                        </div>
                                        <p className="text-xs text-muted-foreground">Expires 12/2027</p>
                                      </div>
                                    </div>
                                    <Button variant="ghost" size="sm">
                                      Edit
                                    </Button>
                                  </div>
                                </Card>
                              </div>
                            </div>

                            <Separator />

                            {/* Billing History */}
                            <div>
                              <div className="flex items-center justify-between mb-4">
                                <h4>Billing History</h4>
                                <Button variant="outline" size="sm">
                                  <Download className="w-4 h-4 mr-2" />
                                  Download All
                                </Button>
                              </div>
                              <div className="space-y-2">
                                {[
                                  { date: 'October 20, 2025', amount: '$6.00', status: 'Paid', invoice: 'INV-2025-10' },
                                  { date: 'September 20, 2025', amount: '$6.00', status: 'Paid', invoice: 'INV-2025-09' },
                                  { date: 'August 20, 2025', amount: '$6.00', status: 'Paid', invoice: 'INV-2025-08' },
                                  { date: 'July 20, 2025', amount: '$39.00', status: 'Paid', invoice: 'INV-2025-07', description: 'Personalized Report' },
                                ].map((invoice, idx) => (
                                  <Card key={idx} className="p-4 hover:bg-muted/50 transition-colors">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#6BA3D120' }}>
                                          <CreditCard className="w-5 h-5" style={{ color: '#6BA3D1' }} />
                                        </div>
                                        <div>
                                          <div className="flex items-center gap-2 mb-1">
                                            <p className="text-sm">{invoice.date}</p>
                                            <Badge variant="outline" className="text-xs" style={{ borderColor: '#6BA3D1', color: '#6BA3D1' }}>
                                              {invoice.status}
                                            </Badge>
                                          </div>
                                          <p className="text-xs text-muted-foreground">
                                            {invoice.description || 'AI Mentor Pro - Monthly'}
                                          </p>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-4">
                                        <p>{invoice.amount}</p>
                                        <Button variant="ghost" size="sm" className="gap-1">
                                          <Download className="w-3 h-3" />
                                          PDF
                                        </Button>
                                      </div>
                                    </div>
                                  </Card>
                                ))}
                              </div>
                            </div>
                          </div>

                          <DialogFooter>
                            <Button variant="outline" onClick={() => setBillingOpen(false)}>
                              Close
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </Card>

                {/* Account Activity */}
                <Card className="p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-4">
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: '#D1A5DD20' }}
                    >
                      <TrendingUp className="w-6 h-6" style={{ color: '#D1A5DD' }} />
                    </div>
                    <div className="flex-1">
                      <h4 className="mb-1">Account Activity</h4>
                      <p className="text-sm text-muted-foreground mb-3">
                        Review your recent account activity
                      </p>
                      <Dialog open={activityLogOpen} onOpenChange={setActivityLogOpen}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" className="text-sm">
                            View Log
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                              <TrendingUp className="w-5 h-5" style={{ color: '#D1A5DD' }} />
                              Account Activity Log
                            </DialogTitle>
                            <DialogDescription>
                              Track all actions and changes made to your account
                            </DialogDescription>
                          </DialogHeader>
                          
                          <div className="py-4">
                            {/* Activity Timeline */}
                            <div className="space-y-1">
                              {[
                                {
                                  icon: <Bell className="w-4 h-4" />,
                                  color: '#9E5DAB',
                                  title: 'Notification preferences updated',
                                  description: 'You enabled weekly progress digest',
                                  timestamp: '2 hours ago',
                                  location: 'San Francisco, CA'
                                },
                                {
                                  icon: <Sparkles className="w-4 h-4" />,
                                  color: '#6BA3D1',
                                  title: 'Asked Vee a question',
                                  description: 'Topic: Content creation strategies',
                                  timestamp: '5 hours ago',
                                  location: 'San Francisco, CA'
                                },
                                {
                                  icon: <LayoutDashboard className="w-4 h-4" />,
                                  color: '#9E5DAB',
                                  title: 'Viewed dashboard',
                                  description: 'Accessed your personalized report',
                                  timestamp: 'Yesterday at 3:42 PM',
                                  location: 'San Francisco, CA'
                                },
                                {
                                  icon: <UserCircle className="w-4 h-4" />,
                                  color: '#D1A5DD',
                                  title: 'Profile updated',
                                  description: 'Changed name from "Y" to "Yuka"',
                                  timestamp: 'Yesterday at 2:15 PM',
                                  location: 'San Francisco, CA'
                                },
                                {
                                  icon: <CreditCard className="w-4 h-4" />,
                                  color: '#6BA3D1',
                                  title: 'Payment successful',
                                  description: 'AI Mentor Pro subscription - $6.00',
                                  timestamp: 'October 20 at 9:00 AM',
                                  location: 'San Francisco, CA'
                                },
                                {
                                  icon: <Smartphone className="w-4 h-4" />,
                                  color: '#B481C0',
                                  title: 'New login detected',
                                  description: 'Safari on iPhone',
                                  timestamp: 'October 19 at 5:30 PM',
                                  location: 'San Francisco, CA'
                                },
                                {
                                  icon: <Lock className="w-4 h-4" />,
                                  color: '#B481C0',
                                  title: 'Password changed',
                                  description: 'Your password was successfully updated',
                                  timestamp: 'October 18 at 11:20 AM',
                                  location: 'San Francisco, CA'
                                },
                                {
                                  icon: <Star className="w-4 h-4" />,
                                  color: '#9E5DAB',
                                  title: 'Report generated',
                                  description: 'Your personalized Fame Score report is ready',
                                  timestamp: 'October 15 at 4:00 PM',
                                  location: 'San Francisco, CA'
                                },
                                {
                                  icon: <CreditCard className="w-4 h-4" />,
                                  color: '#6BA3D1',
                                  title: 'Payment successful',
                                  description: 'Personalized Report - $39.00',
                                  timestamp: 'October 15 at 3:45 PM',
                                  location: 'San Francisco, CA'
                                },
                                {
                                  icon: <UserCircle className="w-4 h-4" />,
                                  color: '#D1A5DD',
                                  title: 'Account created',
                                  description: 'Welcome to BecomeFamous.AI!',
                                  timestamp: 'October 15 at 3:30 PM',
                                  location: 'San Francisco, CA'
                                },
                              ].map((activity, idx) => (
                                <div key={idx} className="relative">
                                  {idx !== 9 && (
                                    <div 
                                      className="absolute left-[21px] top-10 bottom-0 w-px" 
                                      style={{ backgroundColor: '#E8E8E8' }}
                                    />
                                  )}
                                  <Card className="p-4 hover:bg-muted/50 transition-colors relative">
                                    <div className="flex items-start gap-4">
                                      <div 
                                        className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 relative z-10" 
                                        style={{ backgroundColor: `${activity.color}20`, border: '2px solid white' }}
                                      >
                                        <span style={{ color: activity.color }}>
                                          {activity.icon}
                                        </span>
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-4 mb-1">
                                          <p className="text-sm">{activity.title}</p>
                                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                                            {activity.timestamp}
                                          </span>
                                        </div>
                                        <p className="text-sm text-muted-foreground mb-2">
                                          {activity.description}
                                        </p>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                          <MapPin className="w-3 h-3" />
                                          <span>{activity.location}</span>
                                        </div>
                                      </div>
                                    </div>
                                  </Card>
                                </div>
                              ))}
                            </div>

                            {/* Load More */}
                            <div className="mt-6 text-center">
                              <Button variant="outline" className="gap-2">
                                <Clock className="w-4 h-4" />
                                Load Earlier Activity
                              </Button>
                            </div>
                          </div>

                          <DialogFooter>
                            <Button variant="outline" onClick={() => setActivityLogOpen(false)}>
                              Close
                            </Button>
                            <Button 
                              variant="outline"
                              className="gap-2"
                              onClick={() => {
                                // Export activity log
                              }}
                            >
                              <Download className="w-4 h-4" />
                              Export Log
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </Card>
              </div>
            </motion.div>
          )}
        </main>
      </div>
    </div>
  );
}
