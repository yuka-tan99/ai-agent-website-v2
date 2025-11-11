import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, BookOpen, CheckCircle2, Target, Sparkles, Layers3, GraduationCap } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import { Progress } from './ui/progress';
import type { SectionData, SectionCard } from '@/types/report';
import { renderHighlightedText } from '@/lib/renderHighlightedText';
import { useMemo, useState } from 'react';

interface LessonViewProps {
  isOpen: boolean;
  onClose: () => void;
  section: SectionData;
}

const PLACEHOLDER = 'content is generating...';

function LessonCard({ card, accentColor, index }: { card: SectionCard; accentColor: string; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="p-5 rounded-2xl border bg-background/90 shadow-sm"
      style={{ borderColor: `${accentColor}33` }}
    >
      <h4 className="text-sm font-semibold mb-2" style={{ color: accentColor }}>{card.aiTitle}</h4>
      <p className="text-sm leading-relaxed text-foreground/85">
        {renderHighlightedText(card.content, accentColor)}
      </p>
    </motion.div>
  );
}

export function LessonView({ isOpen, onClose, section }: LessonViewProps) {
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const actionSteps = section.reportLevel.actionTips;
  const accentColor = section.accentColor;
  const totalSteps = actionSteps.length;
  const progress = totalSteps ? (completedSteps.size / totalSteps) * 100 : 0;

  const toggleStep = (index: number) => {
    setCompletedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const levelBlocks = useMemo(
    () => [
      {
        title: section.reportLevel.title,
        subtitle: 'Report Level • Why & What',
        cards: section.reportLevel.cards,
        icon: <Target className="w-5 h-5" />,
      },
      {
        title: section.learnMoreLevel.title,
        subtitle: 'Learn More • How it works',
        cards: section.learnMoreLevel.cards,
        icon: <Sparkles className="w-5 h-5" />,
      },
      {
        title: section.unlockMasteryLevel.title,
        subtitle: 'Unlock Mastery • Advanced plays',
        cards: section.unlockMasteryLevel.cards,
        icon: <GraduationCap className="w-5 h-5" />,
      },
    ],
    [section.learnMoreLevel.cards, section.learnMoreLevel.title, section.reportLevel.cards, section.reportLevel.title, section.unlockMasteryLevel.cards, section.unlockMasteryLevel.title],
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-50 bg-background"
        >
          <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
            <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={onClose}
                className="rounded-full w-10 h-10 flex-shrink-0 hover:scale-105 transition-transform"
                style={{ borderColor: `${accentColor}40`, color: accentColor }}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: `${accentColor}15` }}
                >
                  <div style={{ color: accentColor }}>{section.icon}</div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Section {section.id}</p>
                  <h3 className="truncate">{section.title}</h3>
                </div>
              </div>
              {totalSteps > 0 && (
                <div className="hidden md:flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">
                    {completedSteps.size}/{totalSteps} tips tracked
                  </span>
                  <div className="w-32">
                    <Progress value={progress} className="h-2" />
                  </div>
                </div>
              )}
            </div>
          </div>

          <ScrollArea className="h-[calc(100vh-73px)]">
            <div className="max-w-5xl mx-auto px-6 py-8 space-y-10">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="space-y-8"
              >
                <Card className="p-6 border-l-4" style={{ borderLeftColor: accentColor }}>
                  <div className="flex flex-col gap-3">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm" style={{ backgroundColor: `${accentColor}15`, color: accentColor }}>
                      <BookOpen className="w-4 h-4" />
                      Deep Dive Lesson
                    </div>
                    <h1>{section.title}</h1>
                    <p className="text-muted-foreground text-base">
                      {hasRealContent(section.reportLevel.cards)
                        ? renderHighlightedText(section.reportLevel.cards[0]?.content ?? '', accentColor)
                        : 'Content is generating...'}
                    </p>
                  </div>
                </Card>

                {levelBlocks.map((block, blockIdx) => (
                  <div key={block.title} className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: `${accentColor}15`, color: accentColor }}
                      >
                        {block.icon}
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{block.subtitle}</p>
                        <h2>{block.title}</h2>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {block.cards.map((card, idx) => (
                          <LessonCard key={`${blockIdx}-${card.aiTitle}-${idx}`} card={card} accentColor={accentColor} index={idx} />
                        ))}
                    </div>
                  </div>
                ))}

                {totalSteps > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-12 h-12 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: `${accentColor}15`, color: accentColor }}
                        >
                          <CheckCircle2 className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Action Practice</p>
                          <h2>Your Action Tips Tracker</h2>
                        </div>
                      </div>
                      <div className="hidden md:flex gap-2 text-sm text-muted-foreground">
                        {completedSteps.size}/{totalSteps} complete
                      </div>
                    </div>
                    <div className="space-y-3">
                      {actionSteps.map((tip, idx) => (
                        <Card
                          key={idx}
                          className={`p-4 flex items-start gap-3 cursor-pointer transition-all ${completedSteps.has(idx) ? 'border-2' : ''}`}
                          style={completedSteps.has(idx) ? { borderColor: accentColor } : {}}
                          onClick={() => toggleStep(idx)}
                        >
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold"
                            style={{ backgroundColor: completedSteps.has(idx) ? accentColor : `${accentColor}20`, color: completedSteps.has(idx) ? '#fff' : accentColor }}
                          >
                            {idx + 1}
                          </div>
                          <p className="text-sm leading-relaxed flex-1">
                            {renderHighlightedText(tip, accentColor)}
                          </p>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            </div>
          </ScrollArea>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function hasRealContent(cards: SectionCard[]): boolean {
  return cards.some((card) => card.content.trim().toLowerCase() !== PLACEHOLDER);
}
