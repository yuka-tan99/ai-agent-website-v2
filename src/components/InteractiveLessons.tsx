import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { AnimatePresence, motion, type PanInfo } from 'motion/react';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from './ui/accordion';
import { Card } from './ui/card';
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Menu,
  Sparkles,
  Star,
  X,
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
  accentColor: string;
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
  }, [currentIndex]);

  const currentSection = sanitizedSections[currentIndex];
  const accentColor = currentSection?.accentColor ?? DEFAULT_ACCENT;

  const goTo = useCallback(
    (index: number) => {
      if (index < 0 || index >= totalLessons) return;
      setDirection(index > currentIndex ? 1 : -1);
      setCurrentIndex(index);
      setIsMenuOpen(false);
    },
    [currentIndex, totalLessons],
  );

  const nextLesson = useCallback(() => {
    if (currentIndex < totalLessons - 1) {
      goTo(currentIndex + 1);
    }
  }, [currentIndex, goTo, totalLessons]);

  const previousLesson = useCallback(() => {
    if (currentIndex > 0) {
      goTo(currentIndex - 1);
    }
  }, [currentIndex, goTo]);

  const handleDragEnd = useCallback(
    (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      if (info.offset.x > SWIPE_THRESHOLD) {
        previousLesson();
      } else if (info.offset.x < -SWIPE_THRESHOLD) {
        nextLesson();
      }
    },
    [nextLesson, previousLesson],
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
  const tips = currentSection.personalizedTips ?? [];
  const cards = currentSection.cards ?? [];
  const progressValue = ((currentIndex + 1) / totalLessons) * 100;
  const checkedCount = insights.filter((_, idx) => checkedInsights.has(`${currentIndex}-${idx}`)).length;
  const isLessonComplete = currentSection
    ? completedLessonIdsSet.has(currentSection.id)
    : false;

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
                          onClick={() => goTo(index)}
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
          <motion.div
            key={currentSection.id}
            custom={direction}
            initial={{ x: direction > 0 ? 320 : -320, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: direction < 0 ? 320 : -320, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 30, opacity: { duration: 0.18 } }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.15}
            onDragEnd={handleDragEnd}
            className="space-y-5"
          >
            <Card className="border-none bg-gradient-to-br from-background/80 to-background/40 p-6 shadow-xl">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Lesson {currentIndex + 1} of {totalLessons}
                  </p>
                  <h1 className="mt-2 text-xl font-semibold" style={{ color: accentColor }}>
                    {LESSON_TITLES[currentSection.id] ?? currentSection.title}
                  </h1>
                </div>
                <Sparkles className="h-6 w-6" style={{ color: accentColor }} />
              </div>
              {LESSON_MISSIONS[currentSection.id] && (
                <p className="mt-4 text-sm text-muted-foreground">{LESSON_MISSIONS[currentSection.id]}</p>
              )}
            </Card>

            <Card className="border-none bg-background/90 p-6 shadow-xl">
              <h2 className="mb-3 text-base font-semibold" style={{ color: accentColor }}>
                The Big Insight
              </h2>
              <p className="text-sm leading-relaxed text-foreground/90">{currentSection.summary}</p>
            </Card>

            {cards.length > 0 && (
              <div className="grid gap-3">
                {cards.map((card, idx) => (
                  <Card key={`${card.title}-${idx}`} className="border-none bg-background/90 p-5 shadow-lg">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-sm font-semibold" style={{ color: accentColor }}>
                        {card.title}
                      </h3>
                      {card.icon && <Sparkles className="h-4 w-4" style={{ color: accentColor }} />}
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{card.content}</p>
                  </Card>
                ))}
              </div>
            )}

            {currentSection.personalizedSummary && (
              <Card className="border-none bg-background/90 p-6 shadow-xl">
                <h2 className="mb-3 text-base font-semibold" style={{ color: accentColor }}>
                  Your Personal Story
                </h2>
                <p className="text-sm leading-relaxed text-foreground/90">
                  {currentSection.personalizedSummary}
                </p>
              </Card>
            )}

            {insights.length > 0 && (
              <Card className="border-none bg-background/90 p-6 shadow-xl">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-semibold" style={{ color: accentColor }}>
                    Quick Wins
                  </h2>
                  <span className="text-xs text-muted-foreground">
                    {checkedCount} / {insights.length}
                  </span>
                </div>
                <div className="mt-4 space-y-3">
                  {insights.map((insight, idx) => {
                    const id = `${currentIndex}-${idx}`;
                    const checked = checkedInsights.has(id);
                    return (
                      <button
                        key={id}
                        onClick={() => toggleInsight(id)}
                        className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                          checked ? 'border-transparent bg-emerald-500/10 text-emerald-700' : 'border-muted'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`mt-1 h-5 w-5 rounded-full ${checked ? 'bg-emerald-500' : 'bg-muted'} flex items-center justify-center text-xs text-white`}>
                            {checked ? <CheckCircle2 className="h-3.5 w-3.5" /> : idx + 1}
                          </div>
                          <p className={`text-sm leading-relaxed ${checked ? 'line-through opacity-70' : ''}`}>{insight}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </Card>
            )}

            {tips.length > 0 && (
              <Card className="border-none bg-background/90 p-6 shadow-xl">
                <Accordion type="single" collapsible>
                  <AccordionItem value="tips" className="border-none">
                    <AccordionTrigger className="text-base font-semibold" style={{ color: accentColor }}>
                      Personalized tips
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="mt-3 space-y-3">
                        {tips.map((tip, idx) => (
                          <div key={idx} className="rounded-xl bg-muted/60 px-4 py-3 text-sm text-foreground/80">
                            {tip}
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </Card>
            )}

            <Card className="border-none bg-background/90 p-6 shadow-xl">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5" style={{ color: accentColor }} />
                <p className="text-sm font-semibold" style={{ color: accentColor }}>
                  {isLessonComplete ? 'Lesson complete!' : 'Ready to move forward?'}
                </p>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                {isLessonComplete
                  ? 'Great job! Keep the momentum going with the next lesson.'
                  : 'Mark this lesson complete to track your progress.'}
              </p>
              {!isLessonComplete && (
                <Button
                  onClick={markComplete}
                  className="mt-4 w-full rounded-full"
                  style={{ backgroundColor: accentColor, color: 'white' }}
                >
                  Mark lesson complete
                </Button>
              )}
            </Card>

            {currentIndex === totalLessons - 1 && isLessonComplete && (
              <Card className="border-none bg-gradient-to-br from-[#9E5DAB20] to-[#8FD9FB20] p-6 text-center shadow-xl">
                <div className="flex items-center justify-center gap-3">
                  <Star className="h-6 w-6" style={{ color: accentColor }} />
                  <h2 className="text-lg font-semibold" style={{ color: accentColor }}>
                    You did it!
                  </h2>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  You&apos;ve completed every lesson. Jump back in anytime to revisit your action plan.
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
          </motion.div>
        </AnimatePresence>
      </div>

          <div className="relative z-10 border-t bg-background/95 backdrop-blur">
            <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
              <Button
                variant="outline"
                className="flex-1 rounded-full"
                onClick={previousLesson}
                disabled={currentIndex === 0}
              >
                <ChevronLeft className="mr-2 h-4 w-4" /> Previous
              </Button>
              <div className="rounded-full bg-muted px-4 py-2 text-xs text-muted-foreground">
                {currentIndex + 1} / {totalLessons}
              </div>
              <Button
                className="flex-1 rounded-full"
                style={{ backgroundColor: accentColor, color: 'white' }}
                onClick={nextLesson}
                disabled={currentIndex === totalLessons - 1}
              >
                Next <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
