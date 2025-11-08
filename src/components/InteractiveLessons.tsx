'use client';

import { useState, useMemo } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { Card } from './ui/card';
import { Progress } from './ui/progress';
import { renderHighlightedText } from '@/lib/renderHighlightedText';
import type { SectionData, SectionCard } from '@/types/report';
import { ArrowLeft, ArrowRight, CheckCircle2, Target, GraduationCap, BookOpen } from 'lucide-react';

interface InteractiveLessonsProps {
  isOpen: boolean;
  onClose: () => void;
  sections: SectionData[];
  completedSectionIds: number[];
  onToggleSectionComplete: (sectionId: number) => void;
}

const PLACEHOLDER = 'content is generating...';

function LessonCard({ card, accentColor, index }: { card: SectionCard; accentColor: string; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="p-4 rounded-2xl border bg-background/90"
      style={{ borderColor: `${accentColor}33` }}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-muted-foreground mb-1">{card.conceptualRole}</p>
      <h4 className="text-sm font-semibold mb-2" style={{ color: accentColor }}>{card.aiTitle}</h4>
      <p className="text-sm leading-relaxed">
        {renderHighlightedText(card.content, accentColor)}
      </p>
    </motion.div>
  );
}

export function InteractiveLessons({
  isOpen,
  onClose,
  sections,
  completedSectionIds,
  onToggleSectionComplete,
}: InteractiveLessonsProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const sanitizedSections = useMemo(() => sections.filter((section) => !section.isPlaceholder), [sections]);
  const totalLessons = sanitizedSections.length;
  const currentSection = sanitizedSections[currentIndex];
  const completedSet = useMemo(() => new Set(completedSectionIds), [completedSectionIds]);

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % totalLessons);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + totalLessons) % totalLessons);
  };

  const handleToggleLesson = () => {
    if (!currentSection) return;
    onToggleSectionComplete(currentSection.id);
  };

  if (!isOpen || totalLessons === 0 || !currentSection) {
    return null;
  }

  const accentColor = currentSection.accentColor;
  const actionTips = currentSection.reportLevel.actionTips;
  const tipsKey = `${currentSection.id}`;
  const progress = totalLessons === 0 ? 0 : ((completedSet.size + completedSteps.size) / totalLessons) * 100;

  return (
    <AnimatePresence>
      {isOpen && currentSection && (
        <motion.div
          key="interactive-lessons"
          className="fixed inset-0 z-40 bg-background"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="flex flex-col h-full">
            <div className="px-5 py-4 border-b bg-background/95 backdrop-blur flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                onClick={onClose}
                className="rounded-full"
                style={{ borderColor: `${accentColor}40`, color: accentColor }}
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Interactive Lessons</p>
                <h3 className="font-semibold truncate">{currentSection.title}</h3>
              </div>
              <div className="hidden sm:flex items-center gap-3 w-40">
                <Progress value={progress} className="h-2" />
                <span className="text-xs text-muted-foreground">{completedSet.size}/{totalLessons} done</span>
              </div>
            </div>

            <div className="px-5 py-3 flex items-center gap-2 overflow-x-auto border-b bg-muted/30">
              {sanitizedSections.map((section, idx) => (
                <button
                  key={section.id}
                  onClick={() => setCurrentIndex(idx)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${idx === currentIndex ? 'text-white' : 'text-muted-foreground'}`}
                  style={{ backgroundColor: idx === currentIndex ? accentColor : 'transparent', border: idx === currentIndex ? 'none' : `1px solid ${accentColor}33` }}
                >
                  {section.title.split('|')[0]?.trim() ?? section.title}
                </button>
              ))}
            </div>

            <ScrollArea className="flex-1">
              <div className="p-5 space-y-6">
                <Card className="p-5 border-l-4" style={{ borderLeftColor: accentColor }}>
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: `${accentColor}15` }}
                    >
                      <BookOpen className="w-5 h-5" style={{ color: accentColor }} />
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Report Level</p>
                      <h2 className="text-lg font-semibold">{currentSection.reportLevel.title}</h2>
                    </div>
                  </div>
                  <p className="mt-4 text-sm text-muted-foreground">
                    {renderHighlightedText(
                      hasRealContent(currentSection.reportLevel.cards)
                        ? currentSection.reportLevel.cards[0]?.content ?? PLACEHOLDER
                        : PLACEHOLDER,
                      accentColor,
                    )}
                  </p>
                </Card>

                <div className="space-y-3">
                  <p className="text-sm font-semibold" style={{ color: accentColor }}>
                    Your Action Tips
                  </p>
                  {actionTips.map((tip, idx) => {
                    const key = `${tipsKey}-${idx}`;
                    const isChecked = completedSteps.has(key);
                    return (
                      <Card
                        key={key}
                        className={`p-4 flex items-start gap-3 cursor-pointer transition-colors ${isChecked ? 'border-2' : ''}`}
                        style={isChecked ? { borderColor: accentColor } : {}}
                        onClick={() =>
                          setCompletedSteps((prev) => {
                            const next = new Set(prev);
                            if (next.has(key)) next.delete(key);
                            else next.add(key);
                            return next;
                          })
                        }
                      >
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold"
                          style={{ backgroundColor: isChecked ? accentColor : `${accentColor}15`, color: isChecked ? '#fff' : accentColor }}
                        >
                          {idx + 1}
                        </div>
                        <p className="text-sm leading-relaxed flex-1">
                          {renderHighlightedText(tip, accentColor)}
                        </p>
                      </Card>
                    );
                  })}
                </div>

                <div className="space-y-5">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4" style={{ color: accentColor }} />
                      <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Learn More Level</p>
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                      {currentSection.learnMoreLevel.cards.map((card, idx) => (
                        <LessonCard key={`learn-${card.conceptualRole}-${idx}`} card={card} accentColor={accentColor} index={idx} />
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="w-4 h-4" style={{ color: accentColor }} />
                      <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Unlock Mastery</p>
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                      {currentSection.unlockMasteryLevel.cards.map((card, idx) => (
                        <LessonCard key={`mastery-${card.conceptualRole}-${idx}`} card={card} accentColor={accentColor} index={idx} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>

            <div className="px-5 py-4 border-t flex items-center justify-between bg-background/95 backdrop-blur">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" onClick={handlePrev}>
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={handleNext}>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant={completedSet.has(currentSection.id) ? 'outline' : 'default'}
                  onClick={handleToggleLesson}
                  className="rounded-full"
                  style={
                    completedSet.has(currentSection.id)
                      ? { borderColor: `${accentColor}60`, color: accentColor }
                      : { backgroundColor: accentColor, color: '#fff' }
                  }
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  {completedSet.has(currentSection.id) ? 'Mark as incomplete' : 'Mark complete'}
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function hasRealContent(cards: SectionCard[]): boolean {
  return cards.some((card) => card.content.trim().toLowerCase() !== PLACEHOLDER);
}
