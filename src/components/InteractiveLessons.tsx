'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { AnimatePresence, motion, type PanInfo } from 'motion/react';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Card } from './ui/card';
import { renderHighlightedText } from '@/lib/renderHighlightedText';
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Compass,
  FolderKanban,
  Heart,
  Menu,
  Rocket,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  User,
  X,
  Zap,
} from 'lucide-react';

type CardIconKey =
  | 'Target'
  | 'Sparkles'
  | 'TrendingUp'
  | 'Rocket'
  | 'Compass'
  | 'Zap'
  | 'User'
  | 'Heart'
  | 'FolderKanban';

type SectionCard = {
  title: string;
  content: string;
  icon?: CardIconKey;
};

export type LessonSection = {
  id: number;
  title: string;
  icon: React.ReactNode;
  summary: string;
  cards?: SectionCard[];
  personalizedSummary?: string;
  personalizedTips?: string[];
  keyInsights?: string[];
  learnMoreContent?: {
    description: string;
    actionSteps: string[];
    tips: string[];
  };
  accentColor: string;
};

type SlideDescriptor =
  | {
      type: 'card';
      key: string;
      card: SectionCard;
      index: number;
      summary?: string;
      personalizedSummary?: string;
    }
  | {
      type: 'insights';
      key: string;
      insights: string[];
    }
  | {
      type: 'tips';
      key: string;
      tips: string[];
    }
  | {
      type: 'learnMore';
      key: string;
      learn: NonNullable<LessonSection['learnMoreContent']>;
    }
  | {
      type: 'complete';
      key: string;
    };

type InteractiveLessonsProps = {
  isOpen: boolean;
  onClose: () => void;
  sections: LessonSection[];
  completedLessonIds: number[];
  onMarkLessonComplete: (lessonId: number) => void;
};

const DEFAULT_ACCENT = '#9E5DAB';

const LESSON_TITLES: Record<number, string> = {
  1: 'Discover Your Magic',
  2: 'Ship & Shine',
  3: 'Find Your Focus',
  4: 'Know Your People',
  5: 'Pick Your Stage',
  6: 'Grow Your Garden',
  7: 'Protect Your Energy',
  8: 'Make It Rain',
  9: 'Level Up Advanced',
};

const LESSON_MISSIONS: Record<number, string> = {
  1: 'Start your creative exploration and find what makes you unique',
  2: 'Break free from perfection and start creating consistently',
  3: 'Narrow your niche and dominate a specific audience',
  4: 'Understand and connect deeply with your ideal audience',
  5: 'Choose the right platform for your content and goals',
  6: 'Build sustainable systems for consistent growth',
  7: 'Build sustainable creator habits and avoid burnout',
  8: 'Turn your passion into a profitable creator business',
  9: 'Master advanced strategies to accelerate your success',
};

const CARD_ICON_COMPONENTS: Record<CardIconKey, typeof Target> = {
  Target,
  Sparkles,
  TrendingUp,
  Rocket,
  Compass,
  Zap,
  User,
  Heart,
  FolderKanban,
};

const SWIPE_THRESHOLD = 60;

export function InteractiveLessons({
  isOpen,
  onClose,
  sections,
  completedLessonIds,
  onMarkLessonComplete,
}: InteractiveLessonsProps) {
  const sanitizedSections = useMemo(
    () => sections.filter((section) => section && section.summary),
    [sections],
  );

  const totalLessons = sanitizedSections.length;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [checkedInsights, setCheckedInsights] = useState<Set<string>>(new Set());
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const initialSlideIndexRef = useRef(0);
  const completedLessonIdsSet = useMemo(
    () => new Set(completedLessonIds),
    [completedLessonIds],
  );

  useEffect(() => {
    if (!isOpen) return;
    setCurrentIndex(0);
    setDirection(0);
    setCheckedInsights(new Set());
    setIsMenuOpen(false);
    setCurrentSlideIndex(0);
    initialSlideIndexRef.current = 0;
  }, [isOpen, totalLessons]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const onScroll = () => {
      setScrolled(container.scrollTop > 32);
    };
    container.addEventListener('scroll', onScroll);
    return () => container.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [currentIndex, currentSlideIndex]);

  useEffect(() => {
    if (!isOpen) return;
    setCurrentSlideIndex(initialSlideIndexRef.current);
    initialSlideIndexRef.current = 0;
  }, [currentIndex, isOpen]);

  const currentSection = sanitizedSections[currentIndex];
  const accentColor = currentSection?.accentColor ?? DEFAULT_ACCENT;

  const buildSlidesForSection = useCallback(
    (section?: LessonSection): SlideDescriptor[] => {
      if (!section) return [];
      const slides: SlideDescriptor[] = [];
      const sectionCards = section.cards ?? [];
      sectionCards.forEach((card, idx) => {
        slides.push({
          type: 'card',
          key: `section-${section.id}-card-${idx}`,
          card,
          index: idx,
          summary: idx === 0 ? section.summary : undefined,
          personalizedSummary: idx === 0 ? section.personalizedSummary : undefined,
        });
      });
      const sectionInsights = section.keyInsights ?? [];
      if (sectionInsights.length > 0) {
        slides.push({
          type: 'insights',
          key: `section-${section.id}-insights`,
          insights: sectionInsights,
        });
      }
      const sectionTips = section.personalizedTips ?? [];
      if (sectionTips.length > 0) {
        slides.push({
          type: 'tips',
          key: `section-${section.id}-tips`,
          tips: sectionTips,
        });
      }
      if (section.learnMoreContent) {
        slides.push({
          type: 'learnMore',
          key: `section-${section.id}-learn`,
          learn: section.learnMoreContent,
        });
      }
      slides.push({
        type: 'complete',
        key: `section-${section.id}-complete`,
      });
      return slides;
    },
    [],
  );

  const slidesMap = useMemo(
    () => sanitizedSections.map((section) => buildSlidesForSection(section)),
    [sanitizedSections, buildSlidesForSection],
  );

  const getSlidesForSection = useCallback(
    (index: number) => slidesMap[index] ?? [],
    [slidesMap],
  );

  const currentSlides = getSlidesForSection(currentIndex);
  const cardSlideCount = useMemo(
    () => currentSlides.filter((slide) => slide.type === 'card').length,
    [currentSlides],
  );
  const totalSlides = currentSlides.length;
  const currentSlide = currentSlides[currentSlideIndex] ?? null;

  useEffect(() => {
    if (totalSlides === 0) {
      setCurrentSlideIndex(0);
    } else if (currentSlideIndex >= totalSlides) {
      setCurrentSlideIndex(totalSlides - 1);
    }
  }, [currentSlideIndex, totalSlides]);

  const goToLesson = useCallback(
    (index: number, initialSlide = 0) => {
      if (index < 0 || index >= totalLessons) return;
      initialSlideIndexRef.current = initialSlide;
      setDirection(index > currentIndex ? 1 : index < currentIndex ? -1 : 0);
      setCurrentIndex(index);
      setIsMenuOpen(false);
    },
    [currentIndex, totalLessons],
  );

  const nextLesson = useCallback(() => {
    if (currentIndex < totalLessons - 1) {
      goToLesson(currentIndex + 1, 0);
    }
  }, [currentIndex, goToLesson, totalLessons]);

  const previousLesson = useCallback(() => {
    if (currentIndex > 0) {
      const targetIndex = currentIndex - 1;
      const previousSlides = getSlidesForSection(targetIndex);
      const lastSlideIndex =
        previousSlides.length > 0 ? previousSlides.length - 1 : 0;
      goToLesson(targetIndex, lastSlideIndex);
    }
  }, [currentIndex, getSlidesForSection, goToLesson]);

  const advanceSlide = useCallback(() => {
    if (totalSlides === 0) return;
    if (currentSlideIndex < totalSlides - 1) {
      setDirection(1);
      setCurrentSlideIndex((prev) => prev + 1);
    } else {
      nextLesson();
    }
  }, [currentSlideIndex, nextLesson, totalSlides]);

  const retreatSlide = useCallback(() => {
    if (totalSlides === 0) return;
    if (currentSlideIndex > 0) {
      setDirection(-1);
      setCurrentSlideIndex((prev) => prev - 1);
    } else {
      previousLesson();
    }
  }, [currentSlideIndex, previousLesson, totalSlides]);

  const handleDragEnd = useCallback(
    (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      if (info.offset.x > SWIPE_THRESHOLD) {
        retreatSlide();
      } else if (info.offset.x < -SWIPE_THRESHOLD) {
        advanceSlide();
      }
    },
    [advanceSlide, retreatSlide],
  );

  const toggleInsight = useCallback((id: string) => {
    setCheckedInsights((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const markComplete = useCallback(() => {
    const section = sanitizedSections[currentIndex];
    if (!section) return;
    if (completedLessonIdsSet.has(section.id)) return;
    if (typeof onMarkLessonComplete !== 'function') return;
    onMarkLessonComplete(section.id);
  }, [
    completedLessonIdsSet,
    currentIndex,
    onMarkLessonComplete,
    sanitizedSections,
  ]);

  if (totalLessons === 0 || !currentSection) {
    return null;
  }

  const insights = currentSection.keyInsights ?? [];
  const progressValue = totalLessons === 0
    ? 0
    : totalSlides === 0
      ? ((currentIndex + 1) / totalLessons) * 100
      : ((currentIndex + (currentSlideIndex + 1) / totalSlides) / totalLessons) * 100;
  const checkedCount = insights.filter((_, idx) => checkedInsights.has(`${currentIndex}-${idx}`)).length;
  const isLessonComplete = currentSection
    ? completedLessonIdsSet.has(currentSection.id)
    : false;
  const isFinalLesson = currentIndex === totalLessons - 1;
  const isOnLastSlide = totalSlides > 0 && currentSlideIndex >= totalSlides - 1;
  const isAtBeginning = currentIndex === 0 && currentSlideIndex === 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="interactive-lessons-overlay"
          className="fixed inset-0 z-50 flex flex-col bg-background"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <motion.div
              className="absolute -left-[10%] -top-[20%] h-72 w-72 rounded-full blur-3xl opacity-20"
              style={{ backgroundColor: accentColor }}
              animate={{ x: [0, 25, 0], y: [0, 20, 0] }}
              transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
              className="absolute right-[-15%] top-[30%] h-64 w-64 rounded-full blur-3xl opacity-15"
              style={{ backgroundColor: '#8FD9FB' }}
              animate={{ x: [0, -20, 0], y: [0, 30, 0] }}
              transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>

          <motion.header
            className="relative z-10 border-b bg-background/95 backdrop-blur"
            animate={{ paddingTop: scrolled ? 8 : 16, paddingBottom: scrolled ? 8 : 16 }}
          >
            <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <motion.div
                  className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl shadow-xl"
                  style={{ background: 'linear-gradient(135deg, #E5D4F1 0%, #F8E8F5 50%, #D4E5F9 100%)' }}
                  animate={{ rotate: [0, 8, -8, 0], scale: [1, 1.05, 1] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <BookOpen className="h-5 w-5" style={{ color: accentColor }} />
                </motion.div>
                <div className="min-w-0 flex-1">
                  <h2 className="flex items-center gap-2 text-base font-semibold">
                    <span className="truncate">Lesson {currentIndex + 1}</span>
                    <Sparkles className="h-4 w-4" style={{ color: accentColor }} />
                  </h2>
                  <p className="text-xs text-muted-foreground">{LESSON_TITLES[currentSection.id] ?? currentSection.title}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" onClick={() => setIsMenuOpen((prev) => !prev)} className="rounded-full">
                  <Menu className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="mx-auto mt-3 hidden max-w-5xl px-4 sm:block">
              <Progress value={progressValue} className="h-2 rounded-full" />
            </div>
          </motion.header>

          <AnimatePresence>
            {isMenuOpen && (
              <motion.div className="absolute inset-0 z-40 flex flex-col" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="flex-1 bg-black/50" onClick={() => setIsMenuOpen(false)} />
                <motion.div
                  className="max-h-[65vh] overflow-y-auto rounded-t-3xl border-t bg-background shadow-2xl"
                  initial={{ y: '100%' }}
                  animate={{ y: 0 }}
                  exit={{ y: '100%' }}
                  transition={{ type: 'spring', stiffness: 260, damping: 30 }}
                >
                  <div className="sticky top-0 flex items-center justify-between border-b px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
                        <BookOpen className="h-5 w-5" style={{ color: accentColor }} />
                      </div>
                      <p className="font-semibold">All lessons</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setIsMenuOpen(false)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="space-y-3 px-4 py-4">
                    {sanitizedSections.map((section, index) => {
                      const isActive = index === currentIndex;
                      const isDone = completedLessonIdsSet.has(section.id);
                      return (
                        <button
                          key={section.id}
                      onClick={() => goToLesson(index, 0)}
                          className={`w-full rounded-2xl border p-4 text-left transition ${
                            isActive ? 'border-transparent shadow-lg' : 'border-transparent bg-muted/40'
                          }`}
                          style={{
                            backgroundColor: isActive ? `${section.accentColor ?? accentColor}20` : undefined,
                          }}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold" style={{ color: section.accentColor ?? accentColor }}>
                                Lesson {section.id}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {LESSON_TITLES[section.id] ?? section.title}
                              </p>
                            </div>
                            {isDone && <Star className="h-4 w-4" style={{ color: accentColor }} />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          <div ref={scrollRef} className="relative flex-1 overflow-y-auto px-4 pb-24 pt-6">
            <AnimatePresence initial={false} custom={direction} mode="wait">
              {currentSlide ? (
                <motion.div
                  key={`${currentSection.id}-${currentSlide.key}`}
                  custom={direction}
                  initial={{ x: direction >= 0 ? 320 : -320, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: direction >= 0 ? -320 : 320, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 30, opacity: { duration: 0.18 } }}
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.15}
                  onDragEnd={handleDragEnd}
                  className="space-y-5"
                >
                  {(() => {
                    switch (currentSlide.type) {
                      case 'card': {
                        const IconComponent = currentSlide.card.icon
                          ? CARD_ICON_COMPONENTS[currentSlide.card.icon]
                          : null;
                        return (
                          <Card className="space-y-5 border-none bg-background/90 p-6 shadow-xl">
                            <div className="flex items-center gap-3">
                              <div
                                className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl shadow-xl"
                                style={{ backgroundColor: `${accentColor}25` }}
                              >
                                {IconComponent ? (
                                  <IconComponent className="h-6 w-6" style={{ color: accentColor }} />
                                ) : (
                                  <Sparkles className="h-6 w-6" style={{ color: accentColor }} />
                                )}
                              </div>
                              <div>
                                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                                  Lesson {currentSection.id} · Card {currentSlide.index + 1}/{cardSlideCount || 1}
                                </p>
                                <h2 className="text-lg font-semibold" style={{ color: accentColor }}>
                                  {currentSlide.card.title}
                                </h2>
                              </div>
                            </div>
                            {currentSlide.summary && (
                              <p className="text-sm leading-relaxed text-muted-foreground">
                                {renderHighlightedText(currentSlide.summary, accentColor)}
                              </p>
                            )}
                            <p className="text-sm leading-relaxed text-foreground/90">
                              {renderHighlightedText(currentSlide.card.content, accentColor)}
                            </p>
                            {currentSlide.index === 0 && currentSlide.personalizedSummary && (
                              <div className="rounded-2xl bg-muted/60 p-4 text-sm text-foreground/80">
                                {renderHighlightedText(currentSlide.personalizedSummary, accentColor)}
                              </div>
                            )}
                            {currentSlide.index === 0 && LESSON_MISSIONS[currentSection.id] && (
                              <div className="rounded-2xl border border-dashed border-muted-foreground/30 p-4 text-sm text-muted-foreground">
                                {LESSON_MISSIONS[currentSection.id]}
                              </div>
                            )}
                          </Card>
                        );
                      }
                      case 'insights':
                        return (
                          <Card className="border-none bg-background/90 p-6 shadow-xl">
                            <div className="flex items-center justify-between">
                              <h2 className="text-base font-semibold" style={{ color: accentColor }}>
                                Quick Wins
                              </h2>
                              <span className="text-xs text-muted-foreground">
                                {checkedCount} / {currentSlide.insights.length}
                              </span>
                            </div>
                            <div className="mt-4 space-y-3">
                              {currentSlide.insights.map((insight, idx) => {
                                const id = `${currentIndex}-${idx}`;
                                const checked = checkedInsights.has(id);
                                return (
                                  <button
                                    key={id}
                                    onClick={() => toggleInsight(id)}
                                    className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                                      checked
                                        ? 'border-transparent bg-emerald-500/10 text-emerald-700'
                                        : 'border-muted'
                                    }`}
                                  >
                                    <div className="flex items-start gap-3">
                                      <div
                                        className={`mt-1 flex h-5 w-5 items-center justify-center rounded-full text-xs ${
                                          checked ? 'bg-emerald-500 text-white' : 'bg-muted text-foreground'
                                        }`}
                                      >
                                        {checked ? <CheckCircle2 className="h-3.5 w-3.5" /> : idx + 1}
                                      </div>
                                      <p className={`text-sm leading-relaxed ${checked ? 'line-through opacity-70' : ''}`}>
                                        {renderHighlightedText(insight, accentColor)}
                                      </p>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </Card>
                        );
                      case 'tips':
                        return (
                          <Card className="space-y-4 border-none bg-background/90 p-6 shadow-xl">
                            <h2 className="text-base font-semibold" style={{ color: accentColor }}>
                              Your Action Tips
                            </h2>
                            <div className="space-y-3">
                              {currentSlide.tips.map((tip, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-start gap-3 rounded-2xl border border-dashed border-muted-foreground/40 bg-background px-4 py-3 text-sm"
                                >
                                  <span
                                    className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold"
                                    style={{ backgroundColor: `${accentColor}15`, color: accentColor }}
                                  >
                                    {idx + 1}
                                  </span>
                                  <p className="leading-relaxed text-foreground/85">
                                    {renderHighlightedText(tip, accentColor)}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </Card>
                        );
                      case 'learnMore': {
                        const { description, actionSteps = [], tips: learnTips = [] } = currentSlide.learn;
                        return (
                          <Card className="space-y-5 border-none bg-background/90 p-6 shadow-xl">
                            <div>
                              <h2 className="text-base font-semibold" style={{ color: accentColor }}>
                                Learn More
                              </h2>
                              <p className="mt-3 text-sm leading-relaxed text-foreground/90">
                                {renderHighlightedText(description, accentColor)}
                              </p>
                            </div>
                            {actionSteps.length > 0 && (
                              <div>
                                <p className="text-sm font-semibold" style={{ color: accentColor }}>
                                  Action Steps
                                </p>
                                <div className="mt-3 space-y-3">
                                  {actionSteps.map((step, idx) => (
                                    <div
                                      key={idx}
                                      className="flex items-start gap-3 rounded-2xl bg-muted/60 px-4 py-3 text-sm text-foreground/85"
                                    >
                                      <span className="mt-0.5 text-xs font-semibold" style={{ color: accentColor }}>
                                        {idx + 1}
                                      </span>
                                      <p className="leading-relaxed">
                                        {renderHighlightedText(step, accentColor)}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            {learnTips.length > 0 && (
                              <div>
                                <p className="text-sm font-semibold" style={{ color: accentColor }}>
                                  Pro Tips
                                </p>
                                <div className="mt-3 space-y-2 rounded-2xl border border-muted-foreground/30 bg-background/80 p-4 text-sm text-foreground/80">
                                  {learnTips.map((tip, idx) => (
                                    <p key={idx} className="leading-relaxed">
                                      • {renderHighlightedText(tip, accentColor)}
                                    </p>
                                  ))}
                                </div>
                              </div>
                            )}
                          </Card>
                        );
                      }
                      case 'complete':
                        return (
                          <div className="space-y-4">
                            <Card className="border-none bg-background/90 p-6 shadow-xl">
                              <div className="flex items-center gap-3">
                                <AlertCircle className="h-5 w-5" style={{ color: accentColor }} />
                                <div>
                                  <p className="text-sm font-semibold" style={{ color: accentColor }}>
                                    {isLessonComplete ? 'Lesson complete!' : 'Ready to move forward?'}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {isLessonComplete
                                      ? 'Great job! Keep the momentum going with the next lesson.'
                                      : 'Mark this lesson complete to track your progress.'}
                                  </p>
                                </div>
                              </div>
                              {!isLessonComplete && (
                                <Button
                                  onClick={markComplete}
                                  className="mt-4 w-full rounded-full"
                                  style={{ backgroundColor: accentColor, color: 'white' }}
                                >
                                  Mark lesson complete
                                </Button>
                              )}
                              {isLessonComplete && !isFinalLesson && (
                                <p className="mt-4 text-sm text-muted-foreground">
                                  Swipe to continue or use the navigation below to move to the next lesson.
                                </p>
                              )}
                            </Card>
                            {isLessonComplete && isFinalLesson && (
                              <Card className="border-none bg-gradient-to-br from-[#9E5DAB20] to-[#8FD9FB20] p-6 text-center shadow-xl">
                                <div className="flex items-center justify-center gap-3">
                                  <Star className="h-6 w-6" style={{ color: accentColor }} />
                                  <h2 className="text-lg font-semibold" style={{ color: accentColor }}>
                                    You did it!
                                  </h2>
                                </div>
                                <p className="mt-3 text-sm text-muted-foreground">
                                  You&apos;ve completed every lesson. Come back anytime to revisit your action plan.
                                </p>
                                <Button
                                  onClick={onClose}
                                  className="mt-4 w-full rounded-full"
                                  style={{ backgroundColor: accentColor, color: 'white' }}
                                >
                                  Close lessons
                                </Button>
                              </Card>
                            )}
                          </div>
                        );
                      default:
                        return null;
                    }
                  })()}
                </motion.div>
              ) : (
                <motion.div
                  key="empty-slide"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex h-full items-center justify-center text-sm text-muted-foreground"
                >
                  Content is generating...
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="relative z-10 border-t bg-background/95 backdrop-blur">
            <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
              <Button
                variant="outline"
                className="flex-1 rounded-full"
                onClick={retreatSlide}
                disabled={isAtBeginning}
              >
                <ChevronLeft className="mr-2 h-4 w-4" /> Previous
              </Button>
              <div className="rounded-full bg-muted px-4 py-2 text-xs text-muted-foreground">
                Lesson {currentIndex + 1} · Card {Math.min(currentSlideIndex + 1, Math.max(totalSlides, 1))}/{Math.max(totalSlides, 1)}
              </div>
              <Button
                className="flex-1 rounded-full"
                style={{ backgroundColor: accentColor, color: 'white' }}
                onClick={advanceSlide}
                disabled={isFinalLesson && isOnLastSlide}
              >
                {isFinalLesson && isOnLastSlide ? 'Completed' : <>Next <ChevronRight className="ml-2 h-4 w-4" /></>}
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
