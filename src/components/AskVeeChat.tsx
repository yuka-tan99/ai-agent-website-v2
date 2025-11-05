'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MessageCircle, 
  X, 
  Send, 
  Sparkles, 
  Mic,
  Pin,
  Trash2,
  TrendingUp,
  Bot,
  History,
  DollarSign,
  Target,
  Users,
  Calendar,
  Zap
} from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { supabase } from '@/lib/supabaseClient';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isPinned?: boolean;
  suggestions?: string[];
  isThinking?: boolean;
}

interface ChatSession {
  id: string;
  title: string;
  timestamp: Date;
  messages: Message[];
}

interface OnboardingAnswer {
  questionId: number;
  answer: string | string[];
}

interface AskVeeChatProps {
  isPaidUser?: boolean;
  creatorType?: string;
  onboardingAnswers?: OnboardingAnswer[];
  userName?: string;
  userId?: string;
  onUpgrade?: () => void;
  upgradeLoading?: boolean;
  upgradeError?: string | null;
}

const SESSIONS_STORAGE_KEY = "askvee_sessions_v1";
const FREE_USAGE_STORAGE_PREFIX = "askvee_free_usage_v1";

const getFreeUsageKey = (userId?: string) => {
  const normalized = typeof userId === "string" && userId.trim() ? userId.trim() : "anon";
  return `${FREE_USAGE_STORAGE_PREFIX}:${normalized}`;
};

function useChatSessionStorage() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    try {
      if (typeof window === "undefined") return;
      const stored = window.localStorage.getItem(SESSIONS_STORAGE_KEY);
      if (!stored) return;
      const parsed = JSON.parse(stored) as Array<{
        id: string;
        title: string;
        timestamp: string;
        messages: Array<{
          id: string;
          role: Message["role"];
          content: string;
          timestamp: string;
          isPinned?: boolean;
          suggestions?: string[];
          isThinking?: boolean;
        }>;
      }>;
      if (!Array.isArray(parsed)) return;
      const restored: ChatSession[] = parsed.map((session) => ({
        id: session.id,
        title: session.title,
        timestamp: new Date(session.timestamp),
        messages: session.messages.map((msg) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        })),
      }));
      restored.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      setSessions(restored.slice(0, 10));
    } catch (error) {
      console.warn("[AskVeeChat] failed to load sessions", error);
    }
  }, []);

  useEffect(() => {
    if (!loadedRef.current) return;
    try {
      if (typeof window === "undefined") return;
      const payload = sessions.map((session) => ({
        id: session.id,
        title: session.title,
        timestamp: session.timestamp.toISOString(),
        messages: session.messages.map((msg) => ({
          ...msg,
          timestamp: msg.timestamp.toISOString(),
        })),
      }));
      window.localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(payload));
    } catch (error) {
      console.warn("[AskVeeChat] failed to persist sessions", error);
    }
  }, [sessions]);

  return { sessions, setSessions, sessionsLoadedRef: loadedRef };
}

export function AskVeeChat({ 
  isPaidUser = false,
  creatorType = "content creator",
  onboardingAnswers = [],
  userName = '',
  userId,
  onUpgrade,
  upgradeLoading = false,
  upgradeError,
}: AskVeeChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const { sessions, setSessions, sessionsLoadedRef } = useChatSessionStorage();
  const [currentSessionId, setCurrentSessionId] = useState<string>('');
  const [inputValue, setInputValue] = useState('');
  const [questionsUsed, setQuestionsUsed] = useState<number>(() => {
    if (typeof window === 'undefined') return 0;
    const raw = window.localStorage.getItem(getFreeUsageKey(userId));
    const parsed = raw != null ? Number.parseInt(raw, 10) : 0;
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  });
  const [isListening, setIsListening] = useState(false);
  const [isSpeechSupported, setIsSpeechSupported] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'history' | 'pinned'>('chat');
  const [isSending, setIsSending] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const usageStorageKey = useMemo(() => getFreeUsageKey(userId), [userId]);

  const maxFreeQuestions = 5;
  const questionsRemaining = isPaidUser
    ? Number.POSITIVE_INFINITY
    : Math.max(0, maxFreeQuestions - questionsUsed);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (isPaidUser) {
      window.localStorage.removeItem(usageStorageKey);
      if (questionsUsed !== 0) {
        setQuestionsUsed(0);
      }
      return;
    }
    const raw = window.localStorage.getItem(usageStorageKey);
    const parsed = raw != null ? Number.parseInt(raw, 10) : 0;
    const normalized =
      Number.isFinite(parsed) && parsed >= 0 ? Math.min(parsed, maxFreeQuestions) : 0;
    if (normalized !== questionsUsed) {
      setQuestionsUsed(normalized);
    }
  }, [isPaidUser, maxFreeQuestions, usageStorageKey, questionsUsed]);

  const persistFreeUsage = useCallback(
    (count: number) => {
      if (typeof window === 'undefined') return;
      if (isPaidUser) {
        window.localStorage.removeItem(usageStorageKey);
        return;
      }
      window.localStorage.setItem(usageStorageKey, String(count));
    },
    [isPaidUser, usageStorageKey],
  );

  const displayName = useMemo(() => {
    const trimmed = typeof userName === 'string' ? userName.trim() : '';
    if (trimmed) return trimmed.split(' ')[0];
    return 'friend';
  }, [userName]);

  const renderMessageContent = useCallback((text: string, role: Message['role']) => {
    if (!text) return null;
    const accent = role === 'user' ? '#FCE0FF' : '#9E5DAB';
    const segments = text.split(/(\*\*[^*]+\*\*)/g);
    return segments
      .filter((segment) => segment.length > 0)
      .map((segment, index) => {
        if (/^\*\*.*\*\*$/.test(segment)) {
          const clean = segment.slice(2, -2);
          return (
            <span key={`msg-bold-${index}`} style={{ fontWeight: 600, color: accent }}>
              {clean}
            </span>
          );
        }
        return <span key={`msg-text-${index}`}>{segment}</span>;
      });
  }, []);

  // Generate personalized suggestions based on onboarding
  const getPersonalizedSuggestions = (userMessage: string): string[] => {
    const suggestions: string[] = [];
    
    // Base suggestions that are always relevant
    const baseSuggestions = [
      "Give me 3 video ideas for this week",
      "How can I improve my engagement?",
      "What hashtags should I use?",
      "Review my content strategy",
    ];

    // Add personalized suggestions based on onboarding
    if (onboardingAnswers.length > 0) {
      // Example: if user mentioned they struggle with consistency
      suggestions.push("Help me create a posting schedule");
      suggestions.push("Give me a content batching strategy");
    }

    // Contextual suggestions based on recent message
    const lowerMessage = userMessage.toLowerCase();
    if (lowerMessage.includes('video') || lowerMessage.includes('content')) {
      suggestions.push("Suggest video formats that work");
      suggestions.push("How do I make my videos more engaging?");
    } else if (lowerMessage.includes('grow') || lowerMessage.includes('follower')) {
      suggestions.push("What's my growth strategy?");
      suggestions.push("How do I reach more people?");
    } else if (lowerMessage.includes('monetize') || lowerMessage.includes('money')) {
      suggestions.push("When should I start monetizing?");
      suggestions.push("What are my monetization options?");
    }

    // Return mix of contextual and base suggestions
    const combined = [...suggestions, ...baseSuggestions];
    return combined.slice(0, 4); // Return top 4 suggestions
  };

  const speechRecognitionRef = useRef<any>(null);
  const speechBaseValueRef = useRef('');

  useEffect(() => {
    if (typeof window === "undefined") return;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSpeechSupported(false);
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onend = () => {
      speechBaseValueRef.current = speechBaseValueRef.current.trim();
      setInputValue((prev) => prev.trim());
      setIsListening(false);
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onresult = (event: any) => {
      let interimTranscript = "";
      let finalTranscript = "";
      const joinSegments = (base: string, addition: string) => {
        const trimmedAddition = addition.trim();
        if (!trimmedAddition) return base.trim();
        if (!base.trim()) return trimmedAddition;
        return `${base.trim()} ${trimmedAddition}`.replace(/\s+/g, ' ').trim();
      };
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      if (finalTranscript) {
        speechBaseValueRef.current = joinSegments(
          speechBaseValueRef.current,
          finalTranscript,
        );
        setInputValue(speechBaseValueRef.current);
      } else if (interimTranscript) {
        const combined = joinSegments(speechBaseValueRef.current, interimTranscript);
        setInputValue(combined);
      }
    };

    speechRecognitionRef.current = recognition;
    setIsSpeechSupported(true);

    return () => {
      recognition.onresult = null;
      recognition.onend = null;
      recognition.onerror = null;
      recognition.stop();
      speechRecognitionRef.current = null;
    };
  }, []);

  // Initialize with welcome message and session
  useEffect(() => {
    if (messages.length === 0 && isOpen) {
      const sessionId = Date.now().toString();
      setCurrentSessionId(sessionId);
      
      const welcomeMessage: Message = {
        id: 'welcome',
        role: 'assistant',
        content: `Hey ${displayName}, how can I help you today? I'm Vee, your creative growth mentor. ✨ We can map content ideas, unlock growth, or tune your monetization—whatever feels most urgent.`,
        timestamp: new Date(),
        isPinned: false,
        suggestions: [
          "Give me 3 video ideas",
          "Review my strategy",
          "Help me with monetization",
          "Optimize my hashtags"
        ]
      };
      setMessages([welcomeMessage]);
    }
  }, [displayName, isOpen, messages.length]);

  // Save session when closing
  const handleCloseChat = () => {
    if (messages.length > 1) {
      const firstUserMessage = messages.find((msg) => msg.role === 'user');
      const lastMessage = messages[messages.length - 1];
      const session: ChatSession = {
        id: currentSessionId,
        title: firstUserMessage
          ? `${firstUserMessage.content.slice(0, 60)}${firstUserMessage.content.length > 60 ? '…' : ''}`
          : messages[1]?.content.slice(0, 60) ?? 'New conversation',
        timestamp: lastMessage?.timestamp
          ? new Date(lastMessage.timestamp)
          : new Date(),
        messages: messages.map((msg) => ({ ...msg }))
      };
      
      setSessions(prev => {
        const withoutCurrent = prev.filter(existing => existing.id !== session.id);
        return [session, ...withoutCurrent].slice(0, 10);
      });
    }
    setIsOpen(false);
  };

  // Load a past session
  const loadSession = (session: ChatSession) => {
    setMessages(session.messages.map((msg) => ({ ...msg, timestamp: new Date(msg.timestamp) })));
    setCurrentSessionId(session.id);
    setActiveTab('chat');
  };

  // Start new chat
  const startNewChat = () => {
    const sessionId = Date.now().toString();
    setCurrentSessionId(sessionId);
    setMessages([]);
    setActiveTab('chat');
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  const handleSendMessage = async (content: string = inputValue) => {
    if (isSending) return;
    const trimmed = content.trim();
    if (!trimmed) return;

    if (!isPaidUser && questionsUsed >= maxFreeQuestions) {
      return;
    }

    const timestamp = new Date();
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: trimmed,
      timestamp,
      isPinned: false,
    };

    const thinkingId = `thinking-${timestamp.getTime()}`;
    const thinkingMessage: Message = {
      id: thinkingId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isPinned: false,
      isThinking: true,
      suggestions: [],
    };

    const payloadMessages = [...messages, userMessage].map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    setMessages((prev) => [...prev, userMessage, thinkingMessage]);
    setInputValue('');
    setActiveTab('chat');
    setIsSending(true);

    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;

      const accessToken = sessionData.session?.access_token ?? null;
      if (!accessToken) {
        const signInMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'You’ll need to sign in to keep chatting with me. Once you’re logged in, I can pick up right where we left off.',
          timestamp: new Date(),
          isPinned: false,
          suggestions: [],
        };
        setMessages((prev) =>
          prev.map((msg) => (msg.id === thinkingId ? signInMessage : msg)),
        );
        return;
      }

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          messages: payloadMessages,
          rag: {
            persona: {
              userName: displayName,
              creatorType,
              onboardingAnswers,
            },
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || 'Request failed');
      }

      const serverText = typeof data?.text === 'string' ? data.text : '';
      const assistantContent = serverText.trim().length
        ? serverText.trim()
        : generateAIResponse(trimmed, questionsRemaining);

      const requiresSignIn = /please\s+sign\s+in\s+to\s+chat/i.test(assistantContent);

      const suggestionList: string[] = requiresSignIn
        ? []
        : Array.isArray(data?.suggestions) && data.suggestions.length
          ? (data.suggestions as string[])
          : getPersonalizedSuggestions(trimmed);

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data?.reason === 'expired_access' ? (data.text ?? assistantContent) : assistantContent,
        timestamp: new Date(),
        isPinned: false,
        isThinking: false,
        suggestions: data?.reason === 'expired_access' ? [] : suggestionList,
      };

      setMessages((prev) =>
        prev.map((msg) => (msg.id === thinkingId ? assistantMessage : msg)),
      );

      if (!isPaidUser && !data?.reason && !requiresSignIn) {
        setQuestionsUsed((prev) => {
          const next = Math.min(maxFreeQuestions, prev + 1);
          persistFreeUsage(next);
          return next;
        });
      }
      if (requiresSignIn) {
        return;
      }
    } catch (error) {
      const fallbackMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: generateAIResponse(trimmed, questionsRemaining),
        timestamp: new Date(),
        isPinned: false,
        isThinking: false,
        suggestions: getPersonalizedSuggestions(trimmed),
      };

      setMessages((prev) =>
        prev.map((msg) => (msg.id === thinkingId ? fallbackMessage : msg)),
      );
    } finally {
      setIsSending(false);
    }
  };

  const generateAIResponse = (userMessage: string, remaining: number): string => {
    const lowerMessage = userMessage.toLowerCase();

    if (lowerMessage.includes('video') || lowerMessage.includes('content') || lowerMessage.includes('idea')) {
      return `Here’s a quick trio to spark your feed:\n\n• **Mini lesson:** Share one myth your audience keeps believing and bust it in 45 seconds.\n• **Behind-the-scenes:** Show the messy middle of your process — people crave the honest view.\n• **Trend remix:** Grab a trending sound and add your take on why most ${creatorType}s miss the mark.\n\nWant me to help script one of those?`;
    }

    if (lowerMessage.includes('bio') || lowerMessage.includes('profile')) {
      return `Let’s tidy your bio. Keep it to three beats:\n\n• Who you help\n• The transformation you unlock\n• A proof point or signature energy\n\nExample: “Helping busy creatives publish daily without burnout ✨”. Drop yours and I’ll remix it with punch.`;
    }

    if (lowerMessage.includes('hashtag')) {
      return `Try a three-tier hashtag set every post:\n\n• 2 high-volume tags for reach (250k–1M posts)\n• 4 mid-volume tags for discoverability (50k–250k)\n• 3 niche tags under 20k so your content anchors in the right circles\n\nRotate two or three sets so the algorithm doesn’t tune you out. Want me to build a set for your niche?`;
    }

    const remainingCopy = isPaidUser
      ? ''
      : remaining === Number.POSITIVE_INFINITY
        ? ''
        : `You still have ${Math.max(0, remaining)} free questions today.`;

    return `I’m still here with you. ${remainingCopy ? `${remainingCopy} ` : ''}Tell me a bit more about what you want to tackle next and I’ll map the first move.`;
  };

  const togglePin = (messageId: string) => {
    setMessages(prev => prev.map(msg => 
      msg.id === messageId ? { ...msg, isPinned: !msg.isPinned } : msg
    ));
  };

  const deleteMessage = (messageId: string) => {
    setMessages(prev => prev.filter(msg => msg.id !== messageId));
  };

  const toggleVoiceInput = () => {
    const recognition = speechRecognitionRef.current;
    if (!recognition) return;
    if (isListening) {
      recognition.stop();
      return;
    }
    try {
      speechBaseValueRef.current = inputValue.trim();
      recognition.start();
    } catch (error) {
      console.warn("[AskVeeChat] speech recognition failed to start", error);
    }
  };

  const pinnedMessages = messages.filter(msg => msg.isPinned);

  return (
    <>
      {/* Floating Chat Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", bounce: 0.5 }}
            className="fixed bottom-4 right-4 md:bottom-8 md:right-8 z-50"
          >
            <motion.button
              onClick={() => setIsOpen(true)}
              className="relative group"
              whileHover={{ scale: 1.08, rotate: 5 }}
              whileTap={{ scale: 0.92 }}
              animate={{
                y: [0, -8, 0],
              }}
              transition={{
                y: {
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }
              }}
            >
              {/* Soft glow effect */}
              <motion.div
                className="absolute inset-0 rounded-full blur-2xl"
                style={{ background: 'radial-gradient(circle, #9E5DAB 0%, #EBD7DC 70%, transparent 100%)' }}
                animate={{
                  scale: [1, 1.3, 1],
                  opacity: [0.3, 0.5, 0.3],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
              
              {/* Main button */}
              <div 
                className="relative w-[60px] h-[60px] md:w-[70px] md:h-[70px] rounded-full flex items-center justify-center shadow-2xl border-4"
                style={{ 
                  background: 'linear-gradient(135deg, #9E5DAB 0%, #B481C0 100%)',
                  borderColor: '#EBD7DC'
                }}
              >
                <motion.div
                  animate={{ rotate: [0, -10, 10, -10, 0] }}
                  transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
                >
                  <MessageCircle className="w-8 h-8 text-white" strokeWidth={2.5} />
                </motion.div>
                
                {/* Cute sparkle badge */}
                <motion.div
                  className="absolute -top-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center shadow-lg"
                  style={{ 
                    background: 'linear-gradient(135deg, #8FD9FB 0%, #6BA3D1 100%)',
                    border: '2px solid white'
                  }}
                  animate={{ 
                    scale: [1, 1.15, 1],
                    rotate: [0, 360]
                  }}
                  transition={{ 
                    scale: { duration: 1.5, repeat: Infinity },
                    rotate: { duration: 3, repeat: Infinity, ease: "linear" }
                  }}
                >
                  <Sparkles className="w-3.5 h-3.5 text-white" />
                </motion.div>

                {/* Cute little dots floating around */}
                <motion.div
                  className="absolute w-2 h-2 rounded-full"
                  style={{ 
                    backgroundColor: '#EBD7DC',
                    top: '10%',
                    right: '-5px'
                  }}
                  animate={{
                    y: [-3, 3, -3],
                    opacity: [0.5, 1, 0.5]
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                />
                <motion.div
                  className="absolute w-1.5 h-1.5 rounded-full"
                  style={{ 
                    backgroundColor: '#8FD9FB',
                    bottom: '15%',
                    left: '-3px'
                  }}
                  animate={{
                    y: [3, -3, 3],
                    opacity: [0.5, 1, 0.5]
                  }}
                  transition={{
                    duration: 2.5,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 0.5
                  }}
                />
              </div>

              {/* Cute tooltip */}
              <motion.div
                className="absolute bottom-full right-0 mb-3 px-4 py-2 text-sm rounded-2xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity shadow-xl"
                style={{ 
                  pointerEvents: 'none',
                  background: 'linear-gradient(135deg, #9E5DAB 0%, #B481C0 100%)',
                  color: 'white',
                  border: '2px solid #EBD7DC'
                }}
              >
                <span className="flex items-center gap-1.5">
                  Ask Vee 💬
                  <Sparkles className="w-3.5 h-3.5" />
                </span>
                <div 
                  className="absolute top-full right-6 w-3 h-3 transform rotate-45 -mt-1.5"
                  style={{ 
                    background: 'linear-gradient(135deg, #9E5DAB 0%, #B481C0 100%)',
                    border: '2px solid #EBD7DC',
                    borderTop: 'none',
                    borderLeft: 'none'
                  }}
                />
              </motion.div>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.3, type: "spring", bounce: 0.3 }}
            className="fixed bottom-4 right-4 md:bottom-16 md:right-8 z-50 flex flex-col"
            style={{ 
              width: '480px', 
              maxWidth: 'calc(100vw - 2rem)',
              height: 'calc(100vh - 10rem)',
              maxHeight: '700px'
            }}
          >
            <Card className="overflow-hidden shadow-2xl backdrop-blur-xl relative flex flex-col h-full" style={{ 
              background: 'linear-gradient(to bottom, #FDFBFD, #FFFFFF)',
              border: '3px solid',
              borderColor: '#EBD7DC',
              borderRadius: '28px',
              boxShadow: '0 20px 60px rgba(158, 93, 171, 0.15), 0 8px 16px rgba(0, 0, 0, 0.1)'
            }}>
              {/* Subtle floating orb decorations */}
              <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden" style={{ borderRadius: '28px' }}>
                <motion.div
                  className="absolute -top-20 -right-20 w-40 h-40 rounded-full opacity-10"
                  style={{ background: 'radial-gradient(circle, #9E5DAB 0%, transparent 70%)' }}
                  animate={{
                    scale: [1, 1.2, 1],
                    x: [0, -20, 0],
                    y: [0, 20, 0],
                  }}
                  transition={{
                    duration: 8,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                />
                <motion.div
                  className="absolute -bottom-20 -left-20 w-40 h-40 rounded-full opacity-10"
                  style={{ background: 'radial-gradient(circle, #8FD9FB 0%, transparent 70%)' }}
                  animate={{
                    scale: [1, 1.1, 1],
                    x: [0, 20, 0],
                    y: [0, -20, 0],
                  }}
                  transition={{
                    duration: 10,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 1
                  }}
                />
              </div>
              {/* Header */}
              <div 
                className="px-5 py-4 border-b flex items-center justify-between relative overflow-hidden z-10 flex-shrink-0"
                style={{ 
                  background: 'linear-gradient(135deg, #EBD7DC 0%, #F5E6F0 100%)',
                  borderColor: '#EBD7DC',
                  borderTopLeftRadius: '24px',
                  borderTopRightRadius: '24px'
                }}
              >
                {/* Cute floating orbs in background */}
                <motion.div
                  className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-20"
                  style={{ background: 'radial-gradient(circle, #9E5DAB 0%, transparent 70%)' }}
                  animate={{
                    scale: [1, 1.2, 1],
                    x: [0, -10, 0],
                    y: [0, 10, 0],
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                />
                <motion.div
                  className="absolute bottom-0 left-0 w-20 h-20 rounded-full opacity-20"
                  style={{ background: 'radial-gradient(circle, #8FD9FB 0%, transparent 70%)' }}
                  animate={{
                    scale: [1, 1.1, 1],
                    x: [0, 10, 0],
                    y: [0, -5, 0],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 0.5
                  }}
                />
                
                <div className="flex items-center gap-3 relative z-10">
                  <div className="relative">
                    <motion.div
                      animate={{
                        rotate: [0, 5, -5, 0],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    >
                      <Avatar className="w-12 h-12 border-3 shadow-md" style={{ 
                        borderColor: '#9E5DAB',
                        background: 'linear-gradient(135deg, #9E5DAB 0%, #B481C0 100%)'
                      }}>
                        <AvatarFallback className="text-white" style={{ background: 'transparent' }}>
                          <Bot className="w-6 h-6" />
                        </AvatarFallback>
                      </Avatar>
                    </motion.div>
                    <motion.div
                      className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 shadow-sm"
                      style={{ 
                        backgroundColor: '#8FD9FB',
                        borderColor: '#FDFBFD'
                      }}
                      animate={{ 
                        scale: [1, 1.15, 1],
                      }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                  </div>
                  <div>
                    <h3 style={{ color: '#9E5DAB' }}>Ask Vee 💬</h3>
                    <p className="text-xs" style={{ color: '#9E5DAB99' }}>Your AI Growth Coach</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 relative z-10">
                  {isPaidUser && sessions.length > 0 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setActiveTab(activeTab === 'history' ? 'chat' : 'history')}
                      className="h-8 w-8 rounded-full hover:bg-white/60"
                      style={{ color: '#9E5DAB' }}
                    >
                      <History className="w-4 h-4" />
                    </Button>
                  )}
                  {!isPaidUser && (
                    <Badge 
                      variant="secondary" 
                      className="shadow-sm"
                      style={{ 
                        backgroundColor: '#9E5DAB20',
                        color: '#9E5DAB',
                        border: '1.5px solid #9E5DAB40'
                      }}
                    >
                      {questionsRemaining} left
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleCloseChat}
                    className="h-8 w-8 rounded-full hover:bg-white/60"
                    style={{ color: '#9E5DAB' }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Pinned Messages */}
              {pinnedMessages.length > 0 && (
                <div 
                  className="px-4 py-2.5 border-b flex-shrink-0" 
                  style={{ 
                    background: 'linear-gradient(to right, #FFF9E6, #FFFEF9)',
                    borderColor: '#F4D03F50'
                  }}
                >
                  <p className="text-xs mb-1.5 flex items-center gap-1.5" style={{ color: '#9E5DAB' }}>
                    <motion.div
                      animate={{ rotate: [0, -10, 10, -10, 0] }}
                      transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                    >
                      <Pin className="w-3.5 h-3.5" />
                    </motion.div>
                    Pinned Advice ({pinnedMessages.length})
                  </p>
                  <div className="space-y-1">
                    {pinnedMessages.map(msg => (
                      <p key={msg.id} className="text-xs line-clamp-2" style={{ color: '#6b6b6b' }}>
                        {msg.content}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Messages with Tabs */}
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1 flex flex-col relative z-10 min-h-0">
                <TabsList className="w-full grid grid-cols-3 mx-4 mt-2 flex-shrink-0" style={{ backgroundColor: '#F8F3F9' }}>
                  <TabsTrigger value="chat" className="text-xs">Chat</TabsTrigger>
                  <TabsTrigger value="pinned" className="text-xs">
                    Pinned {pinnedMessages.length > 0 && `(${pinnedMessages.length})`}
                  </TabsTrigger>
                  <TabsTrigger value="history" className="text-xs" disabled={!isPaidUser}>
                    History {!isPaidUser && '🔒'}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="chat" className="flex-1 mt-0 min-h-0 overflow-hidden">
                  <ScrollArea className="h-full" ref={scrollAreaRef}>
                    <div className="p-4 space-y-4">
                      {messages.map((message, index) => (
                    <div key={message.id}>
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ type: "spring", bounce: 0.3 }}
                        className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                      >
                        {message.role === 'assistant' && (
                          <motion.div
                            whileHover={{ scale: 1.05 }}
                          >
                            <Avatar className="w-9 h-9 flex-shrink-0 shadow-sm" style={{ 
                              background: 'linear-gradient(135deg, #9E5DAB 0%, #B481C0 100%)',
                              border: '2px solid #EBD7DC'
                            }}>
                              <AvatarFallback className="text-white" style={{ background: 'transparent' }}>
                                <Bot className="w-4 h-4" />
                              </AvatarFallback>
                            </Avatar>
                          </motion.div>
                        )}
                      
                      <div className={`flex-1 group ${message.role === 'user' ? 'flex justify-end' : ''}`}>
                        <motion.div
                          whileHover={{ scale: 1.01 }}
                          className={`inline-block px-4 py-3 max-w-[85%] relative ${
                            message.role === 'user'
                              ? 'rounded-3xl shadow-sm'
                              : 'rounded-3xl shadow-sm'
                          }`}
                          style={
                            message.role === 'user'
                              ? {
                                  background: 'linear-gradient(135deg, #9E5DAB 0%, #B481C0 100%)',
                                  color: 'white'
                                }
                              : {
                                  background: '#F8F3F9',
                                  border: '1.5px solid #EBD7DC',
                                  color: '#2d2d2d'
                                }
                          }
                        >
                          {message.isThinking ? (
                            <div className="flex items-center gap-1.5">
                              {[0, 1, 2].map((dot) => (
                                <motion.span
                                  key={dot}
                                  className="inline-block w-2.5 h-2.5 rounded-full"
                                  style={{ backgroundColor: message.role === 'user' ? '#FFFFFF' : '#9E5DAB' }}
                                  animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
                                  transition={{ duration: 1, repeat: Infinity, delay: dot * 0.15, ease: 'easeInOut' }}
                                />
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm whitespace-pre-wrap">
                              {renderMessageContent(message.content, message.role)}
                            </p>
                          )}
                          
                          {/* Message Pin Button - Visible on hover, always visible when pinned */}
                          {message.role === 'assistant' && (
                            <motion.div
                              initial={{ opacity: message.isPinned ? 1 : 0, scale: message.isPinned ? 1 : 0.8 }}
                              animate={{ 
                                opacity: message.isPinned ? 1 : undefined,
                                scale: message.isPinned ? 1 : undefined
                              }}
                              whileHover={{ scale: 1.15 }}
                              whileTap={{ scale: 0.9 }}
                              className={`absolute -right-2 -top-2 z-10 ${message.isPinned ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity duration-200`}
                              title={message.isPinned ? '📌 Unpin this advice' : '📌 Pin to save this advice'}
                            >
                              <motion.div
                                animate={message.isPinned ? {
                                  rotate: [0, -10, 10, -10, 0],
                                } : {}}
                                transition={{ duration: 0.5 }}
                              >
                                <Button
                                  variant="secondary"
                                  size="icon"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    togglePin(message.id);
                                  }}
                                  className="h-8 w-8 rounded-full shadow-lg hover:shadow-xl transition-all"
                                  style={message.isPinned ? { 
                                    background: 'linear-gradient(135deg, #9E5DAB 0%, #B481C0 100%)',
                                    color: 'white',
                                    border: '2.5px solid white'
                                  } : {
                                    backgroundColor: 'white',
                                    border: '2.5px solid #EBD7DC',
                                    color: '#9E5DAB'
                                  }}
                                >
                                  <Pin className={`w-4 h-4 transition-transform ${message.isPinned ? 'fill-current rotate-45' : ''}`} />
                                </Button>
                              </motion.div>
                            </motion.div>
                          )}
                        </motion.div>
                        <p className="text-xs mt-1 px-2" style={{ color: '#9E5DAB99' }}>
                          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>

                        {message.role === 'user' && (
                          <motion.div
                            whileHover={{ scale: 1.05 }}
                          >
                            <Avatar className="w-9 h-9 flex-shrink-0 shadow-sm" style={{ 
                              background: 'linear-gradient(135deg, #8FD9FB 0%, #6BA3D1 100%)',
                              border: '2px solid #EBD7DC'
                            }}>
                              <AvatarFallback className="text-white" style={{ background: 'transparent' }}>
                                U
                              </AvatarFallback>
                            </Avatar>
                          </motion.div>
                        )}
                      </motion.div>

                      {/* AI Suggestion Buttons - appear after each assistant message */}
                      {message.role === 'assistant' && message.suggestions && message.suggestions.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.3 }}
                          className="ml-12 mt-2 flex flex-wrap gap-2"
                        >
                          {message.suggestions.map((suggestion, idx) => (
                            <motion.div
                              key={idx}
                              whileHover={{ scale: 1.03 }}
                              whileTap={{ scale: 0.97 }}
                            >
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => void handleSendMessage(suggestion)}
                                className="text-xs h-7 rounded-full shadow-sm"
                                style={{
                                  borderColor: '#EBD7DC',
                                  backgroundColor: '#FFFFFF',
                                  color: '#9E5DAB'
                                }}
                                disabled={(
                                  !isPaidUser && questionsUsed >= maxFreeQuestions
                                ) || isSending}
                              >
                                <Sparkles className="w-3 h-3 mr-1" />
                                {suggestion}
                              </Button>
                            </motion.div>
                          ))}
                        </motion.div>
                      )}
                    </div>
                  ))}

                      {/* Limit reached message */}
                      {!isPaidUser && questionsUsed >= maxFreeQuestions && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ type: "spring", bounce: 0.4 }}
                          className="p-5 rounded-3xl border-2 text-center"
                          style={{ 
                            borderColor: '#EBD7DC',
                            background: 'linear-gradient(135deg, #F8F3F9 0%, #FDF8FB 100%)'
                          }}
                        >
                          <motion.div
                            animate={{ rotate: [0, 360] }}
                            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                          >
                            <Sparkles className="w-10 h-10 mx-auto mb-3" style={{ color: '#9E5DAB' }} />
                          </motion.div>
                          <h4 className="mb-1.5" style={{ color: '#9E5DAB' }}>You've used your free questions!</h4>
                          <p className="text-sm mb-4" style={{ color: '#6b6b6b' }}>
                            Upgrade to AI Mentor for unlimited coaching + saved sessions
                          </p>
                          <motion.div
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                          >
                            <Button 
                              size="sm"
                              className="text-white rounded-full shadow-md"
                              style={{ background: 'linear-gradient(135deg, #9E5DAB 0%, #B481C0 100%)' }}
                              onClick={onUpgrade}
                              disabled={upgradeLoading || !onUpgrade}
                            >
                              {upgradeLoading ? 'Redirecting…' : '✨ Upgrade Now - $6/month'}
                            </Button>
                          </motion.div>
                          {upgradeError && (
                            <p className="text-xs text-destructive mt-3">
                              {upgradeError}
                            </p>
                          )}
                        </motion.div>
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="pinned" className="flex-1 mt-0 min-h-0 overflow-hidden">
                  <ScrollArea className="h-full">
                    <div className="p-4 space-y-4">
                      {pinnedMessages.length === 0 ? (
                        <div className="text-center py-12">
                          <Pin className="w-12 h-12 mx-auto mb-3 opacity-20" style={{ color: '#9E5DAB' }} />
                          <p className="text-sm" style={{ color: '#6b6b6b' }}>No pinned advice yet</p>
                          <p className="text-xs mt-1" style={{ color: '#9E5DAB99' }}>
                            Pin important advice from Vee to save it here
                          </p>
                        </div>
                      ) : (
                        pinnedMessages.map((message) => (
                          <motion.div
                            key={message.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-4 rounded-3xl border-2 relative group"
                            style={{ 
                              borderColor: '#EBD7DC',
                              background: '#F8F3F9'
                            }}
                          >
                            <div className="flex items-start gap-3">
                          <Bot className="w-5 h-5 flex-shrink-0" style={{ color: '#9E5DAB' }} />
                              <div className="flex-1">
                                <p className="text-sm" style={{ color: '#2d2d2d' }}>
                                  {renderMessageContent(message.content, 'assistant')}
                                </p>
                                <p className="text-xs mt-2" style={{ color: '#9E5DAB99' }}>
                                  {message.timestamp.toLocaleDateString()}
                                </p>
                              </div>
                              <motion.div
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.95 }}
                                title="Unpin this advice"
                              >
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => togglePin(message.id)}
                                  className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                  style={{
                                    backgroundColor: 'white',
                                    border: '2px solid #EBD7DC',
                                    color: '#9E5DAB'
                                  }}
                                >
                                  <Pin className="w-4 h-4 fill-current" />
                                </Button>
                              </motion.div>
                            </div>
                          </motion.div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="history" className="flex-1 mt-0 min-h-0 overflow-hidden">
                  <ScrollArea className="h-full">
                    <div className="p-4 space-y-3">
                      {sessions.length === 0 ? (
                        <div className="text-center py-12">
                          <History className="w-12 h-12 mx-auto mb-3 opacity-20" style={{ color: '#9E5DAB' }} />
                          <p className="text-sm" style={{ color: '#6b6b6b' }}>No past conversations yet</p>
                          <p className="text-xs mt-1" style={{ color: '#9E5DAB99' }}>
                            Your chat history will appear here
                          </p>
                        </div>
                      ) : (
                        <>
                          {messages.length > 1 && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={startNewChat}
                              className="w-full rounded-full mb-3"
                              style={{
                                borderColor: '#9E5DAB',
                                color: '#9E5DAB'
                              }}
                            >
                              <Sparkles className="w-4 h-4 mr-2" />
                              Start New Chat
                            </Button>
                          )}
                          <AnimatePresence initial={false}>
                            {sessions.map((session) => (
                              <motion.button
                                key={session.id}
                                onClick={() => loadSession(session)}
                                layout
                                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -10, scale: 0.96 }}
                                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className="w-full p-3 rounded-2xl border-2 text-left transition-all shadow-sm"
                                style={{
                                  borderColor: session.id === currentSessionId ? '#9E5DAB' : '#EBD7DC',
                                  background: session.id === currentSessionId ? '#F8F3F9' : '#FFFFFF',
                                  boxShadow: session.id === currentSessionId
                                    ? '0 10px 30px rgba(158, 93, 171, 0.18)'
                                    : '0 6px 18px rgba(235, 215, 220, 0.20)'
                                }}
                              >
                                <div className="flex items-start gap-3">
                                  <div
                                    className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                                    style={{
                                      background: session.id === currentSessionId ? '#9E5DAB' : '#EBD7DC'
                                    }}
                                  >
                                    <MessageCircle
                                      className="w-4 h-4"
                                      style={{ color: session.id === currentSessionId ? '#FFFFFF' : '#9E5DAB' }}
                                    />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm line-clamp-2 font-medium" style={{ color: '#2d2d2d' }}>
                                      {session.title}
                                    </p>
                                    <p className="text-xs mt-1" style={{ color: '#9E5DAB99' }}>
                                      {session.timestamp.toLocaleDateString()} • {session.messages.length} messages
                                    </p>
                                  </div>
                                </div>
                              </motion.button>
                            ))}
                          </AnimatePresence>
                        </>
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>
              </Tabs>

              {/* Input Area */}
              <div 
                className="p-4 border-t relative z-10 flex-shrink-0" 
                style={{ 
                  background: 'linear-gradient(to right, #F8F3F9, #FDF8FB)',
                  borderColor: '#EBD7DC',
                  borderBottomLeftRadius: '24px',
                  borderBottomRightRadius: '24px'
                }}
              >
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Input
                      ref={inputRef}
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          void handleSendMessage();
                        }
                      }}
                      placeholder={
                        !isPaidUser && questionsUsed >= maxFreeQuestions
                          ? "Upgrade to continue chatting..."
                          : "Ask Vee anything... ✨"
                      }
                      disabled={isSending || (!isPaidUser && questionsUsed >= maxFreeQuestions)}
                      className="pr-10 rounded-full border-2 shadow-sm"
                      style={{ 
                        borderColor: '#EBD7DC',
                        backgroundColor: '#FFFFFF'
                      }}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={toggleVoiceInput}
                      disabled={
                        !isSpeechSupported ||
                        (!isPaidUser && questionsUsed >= maxFreeQuestions) ||
                        isSending
                      }
                      className={`absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full transition-all duration-200 ease-out ${isListening ? 'text-red-400' : 'text-muted-foreground'} ${!isSpeechSupported || (!isPaidUser && questionsUsed >= maxFreeQuestions) || isSending ? '' : 'hover:bg-[#F6ECF3] active:bg-[#F1D8EC]'}`}
                      style={{
                        ...(isListening ? { backgroundColor: '#FFE5E5' } : {}),
                        transformOrigin: 'center'
                      }}
                      title={
                        !isSpeechSupported
                          ? 'Voice input is not supported in this browser'
                          : isListening
                            ? 'Stop voice input'
                            : 'Start voice input'
                      }
                    >
                      <Mic className="w-4 h-4" />
                    </Button>
                  </div>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button
                      onClick={() => { void handleSendMessage(); }}
                      disabled={
                        isSending ||
                        !inputValue.trim() ||
                        (!isPaidUser && questionsUsed >= maxFreeQuestions)
                      }
                      size="icon"
                      className="text-white shrink-0 rounded-full w-11 h-11 shadow-md"
                      style={{ background: 'linear-gradient(135deg, #9E5DAB 0%, #B481C0 100%)' }}
                    >
                      <Send className="w-4.5 h-4.5" />
                    </Button>
                  </motion.div>
                </div>
                {isListening && (
                  <motion.p
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-xs mt-2 flex items-center gap-1.5 justify-center"
                    style={{ color: '#9E5DAB' }}
                  >
                    <motion.span
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    >
                      🎤
                    </motion.span>
                    Listening...
                  </motion.p>
                )}
                {!isSpeechSupported && (
                  <p className="text-[11px] mt-2 text-center" style={{ color: '#9E5DAB99' }}>
                    Voice input works best in the latest Chrome or Edge browsers.
                  </p>
                )}
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
