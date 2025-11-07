'use client';

import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Lock,
  Unlock,
  Star,
  Heart,
  Zap,
  CheckCircle2,
} from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Progress } from './ui/progress';
import { Separator } from './ui/separator';

interface MainCard {
  title: string;
  content: string;
}

interface LearnMoreSubpage {
  title: string;
  content: string;
}

interface UnlockMasterySubpage {
  title: string;
  content: string;
}

interface SectionDetailViewProps {
  sectionNumber: number;
  totalSections: number;
  title: string;
  icon: React.ComponentType<any> | React.ReactNode;
  accentColor: string;
  mainCards: MainCard[];
  actionTips: string[];
  learnMoreSubpages: LearnMoreSubpage[];
  unlockMasterySubpages: UnlockMasterySubpage[];
  onBack: () => void;
  onNextSection?: () => void;
  onPreviousSection?: () => void;
  completedStepKeys: string[];
  onCompleteStep: (stepKey: string) => void;
}

export function SectionDetailView({
  sectionNumber,
  totalSections,
  title,
  icon,
  accentColor,
  mainCards,
  actionTips,
  learnMoreSubpages,
  unlockMasterySubpages,
  onBack,
  onNextSection,
  onPreviousSection,
  completedStepKeys,
  onCompleteStep,
}: SectionDetailViewProps) {
  const [isLearnMoreExpanded, setIsLearnMoreExpanded] = useState(false);
  const [learnMorePageIndex, setLearnMorePageIndex] = useState(0);
  const [isMasteryExpanded, setIsMasteryExpanded] = useState(false);
  const [isMasteryUnlocked, setIsMasteryUnlocked] = useState(false);
  const [masteryPageIndex, setMasteryPageIndex] = useState(0);

  const PLACEHOLDER = 'content is generating...';
  const reportStepKeys = useMemo(
    () => mainCards.map((_, idx) => `report-${idx}`),
    [mainCards],
  );
  const completedStepsSet = useMemo(
    () => new Set(completedStepKeys),
    [completedStepKeys],
  );
  const completedStepCount = reportStepKeys.filter((key) => completedStepsSet.has(key)).length;
  const totalStepCount = reportStepKeys.length;
  const cardProgress = totalStepCount
    ? Math.round((completedStepCount / totalStepCount) * 100)
    : 0;

  const getCardColorByIndex = (index: number) => {
    const colors = ['#d4183d', '#6BA3D1', '#9E5DAB', '#00CC66', '#FF6B9D'];
    return colors[index] || accentColor;
  };

  const floatingIcons = [
    { Icon: Star, delay: 0, position: 'top-6 right-6' },
    { Icon: Sparkles, delay: 1, position: 'bottom-8 left-8' },
    { Icon: Heart, delay: 2, position: 'top-12 left-12' },
    { Icon: Zap, delay: 1.5, position: 'top-8 right-8' },
    { Icon: Star, delay: 0.5, position: 'bottom-6 right-6' },
  ];

  const renderIcon = () => {
    if (React.isValidElement(icon)) {
      return React.cloneElement(icon, { key: `section-detail-icon-${sectionNumber}` });
    }
    if (typeof icon === 'function') {
      const IconComponent = icon as React.ComponentType<any>;
      return <IconComponent className="w-5 h-5" style={{ color: accentColor }} />;
    }
    return null;
  };

  const nextLearnMorePage = () => {
    if (learnMorePageIndex < learnMoreSubpages.length - 1) {
      setLearnMorePageIndex((index) => index + 1);
    }
  };

  const prevLearnMorePage = () => {
    if (learnMorePageIndex > 0) {
      setLearnMorePageIndex((index) => index - 1);
    }
  };

  const nextMasteryPage = () => {
    if (masteryPageIndex < unlockMasterySubpages.length - 1) {
      setMasteryPageIndex((index) => index + 1);
    }
  };

  const prevMasteryPage = () => {
    if (masteryPageIndex > 0) {
      setMasteryPageIndex((index) => index - 1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-4">
          <div className="flex items-center justify-between mb-3">
            <Button
              variant="outline"
              size="icon"
              onClick={onBack}
              className="rounded-full w-10 h-10 hover:scale-105 transition-transform"
              style={{ borderColor: `${accentColor}40`, color: accentColor }}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>

            <div className="flex items-center gap-3 flex-1 px-4 min-w-0">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${accentColor}20` }}
              >
                {renderIcon()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-muted-foreground">
                  Section {sectionNumber} of {totalSections}
                </div>
                <h2 className="truncate">{title}</h2>
              </div>
            </div>

            <div className="hidden sm:flex items-center gap-3">
              {onPreviousSection && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={onPreviousSection}
                  className="rounded-full"
                  aria-label="Previous section"
                >
                  <ChevronLeft className="w-5 h-5" />
                </Button>
              )}
              {onNextSection && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={onNextSection}
                  className="rounded-full"
                  aria-label="Next section"
                >
                  <ChevronRight className="w-5 h-5" />
                </Button>
              )}
            </div>
          </div>

          <Progress value={(sectionNumber / totalSections) * 100} className="h-2" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-8">
          <div>
            <motion.div
              className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div>
                <p className="text-sm text-muted-foreground">Dive into your personalized insight</p>
                <h3 style={{ color: accentColor }}>Your 5-Part Understanding</h3>
              </div>
              <div className="w-full md:w-64">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                  <span>{cardProgress}% explored</span>
                  <span>
                    {completedStepCount}/{totalStepCount} cards
                  </span>
                </div>
                <Progress value={cardProgress} className="h-2" />
              </div>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 md:gap-4 lg:gap-3">
              {mainCards.map((card, idx) => {
                const cardColor = getCardColorByIndex(idx);
                const accentIcon = floatingIcons[idx];
                const stepKey = reportStepKeys[idx];
                const isCompleted = completedStepsSet.has(stepKey);

                const handleActivate = () => {
                  onCompleteStep(stepKey);
                };

                return (
                  <motion.div
                    key={`${card.title}-${idx}`}
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: idx * 0.15, duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
                    whileHover={{ y: -8, scale: 1.02, transition: { duration: 0.3 } }}
                    className="relative"
                  >
                    <Card
                      role="button"
                      tabIndex={0}
                      onClick={handleActivate}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          handleActivate();
                        }
                      }}
                      className={`p-4 lg:p-5 relative overflow-hidden h-full transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2`}
                      style={{
                        borderWidth: '4px',
                        borderStyle: 'solid',
                        borderColor: cardColor,
                        backgroundColor: `${cardColor}0d`,
                        borderRadius: '24px',
                        boxShadow: `0 10px 40px -10px ${cardColor}40`,
                        cursor: 'pointer',
                        outline: 'none',
                      }}
                      aria-pressed={isCompleted}
                      data-completed={isCompleted}
                    >
                      {isCompleted && (
                        <div className="absolute top-3 right-3 z-20">
                          <CheckCircle2 className="w-5 h-5 text-white drop-shadow" style={{ color: cardColor }} />
                        </div>
                      )}

                      <motion.div
                        className="absolute inset-0 rounded-[20px] pointer-events-none"
                        style={{ boxShadow: `inset 0 0 20px ${cardColor}20, 0 0 30px ${cardColor}30` }}
                        animate={{ opacity: [0.5, 0.8, 0.5] }}
                        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: idx * 0.4 }}
                      />

                      <motion.div
                        className="absolute inset-0 opacity-10 pointer-events-none rounded-[20px]"
                        style={{
                          background: `radial-gradient(circle at ${idx % 2 === 0 ? '80% 20%' : '20% 80%'}, ${cardColor} 0%, transparent 60%)`,
                        }}
                        animate={{ scale: [1, 1.15, 1], opacity: [0.1, 0.2, 0.1] }}
                        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: idx * 0.5 }}
                      />

                      {accentIcon && (
                        <motion.div
                          className={`absolute ${accentIcon.position} opacity-15`}
                          animate={{ y: [0, -10, 0], rotate: idx % 2 === 0 ? [0, 15, -15, 0] : [0, 180, 360], scale: [1, 1.1, 1] }}
                          transition={{ duration: 3 + idx * 0.5, repeat: Infinity, ease: 'easeInOut', delay: accentIcon.delay }}
                        >
                          <accentIcon.Icon
                            className="w-6 h-6 lg:w-7 lg:h-7"
                            style={{ color: cardColor, fill: idx % 2 === 0 ? cardColor : 'none' }}
                          />
                        </motion.div>
                      )}

                      <motion.div className="absolute top-2 right-2 opacity-20" animate={{ scale: [1, 1.3, 1], rotate: [0, 90, 0] }} transition={{ duration: 2, repeat: Infinity, delay: idx * 0.3 }}>
                        <Sparkles className="w-3 h-3" style={{ color: cardColor }} />
                      </motion.div>

                      <div className="space-y-3 relative z-10">
                        <h3 className="text-sm lg:text-base leading-tight" style={{ color: cardColor }}>
                          {card.title}
                        </h3>
                        <p className="text-xs lg:text-sm leading-relaxed text-muted-foreground">{card.content}</p>
                      </div>

                      <motion.div className="absolute bottom-0 left-0 right-0 h-1 rounded-b-[20px]" style={{ backgroundColor: cardColor }} animate={{ opacity: [0.3, 0.6, 0.3] }} transition={{ duration: 2, repeat: Infinity, delay: idx * 0.4 }} />
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="mb-4" style={{ color: accentColor }}>
              Your Action Tips
            </h3>
            <div className="space-y-3">
              {actionTips.map((tip, idx) => {
                const isPlaceholderTip = tip.trim().toLowerCase() === PLACEHOLDER;
                return (
                <motion.div
                  key={`${tip}-${idx}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05, duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                  whileHover={{ x: 4, transition: { duration: 0.2 } }}
                  className="flex items-start gap-3 p-4 rounded-xl transition-all duration-300 hover:shadow-md relative overflow-hidden cursor-default"
                  style={{ backgroundColor: idx % 2 === 0 ? 'transparent' : `${accentColor}05` }}
                >
                  <motion.div
                    className="absolute inset-0 opacity-0 pointer-events-none"
                    style={{ background: `linear-gradient(90deg, ${accentColor}08 0%, transparent 100%)` }}
                    whileHover={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                  />

                  <motion.div
                    className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-sm shadow-md relative z-10"
                    style={{ backgroundColor: accentColor, color: 'white', boxShadow: `0 2px 8px ${accentColor}40` }}
                    whileHover={{ scale: 1.1, boxShadow: `0 4px 12px ${accentColor}60` }}
                  >
                    {idx + 1}
                  </motion.div>
                    {isPlaceholderTip ? (
                      <div className="flex-1 relative z-10">
                        <div className="h-4 w-3/4 rounded-full bg-muted animate-pulse" />
                      </div>
                    ) : (
                      <p className="flex-1 text-sm md:text-base relative z-10">{tip}</p>
                    )}
                </motion.div>
                );
              })}
            </div>
          </div>

          <Separator />

          <div>
            <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
              <Button
                variant="outline"
                onClick={() => setIsLearnMoreExpanded(!isLearnMoreExpanded)}
                className="w-full justify-between rounded-xl p-6 h-auto border-2 transition-all duration-300 relative overflow-hidden"
                style={{ borderColor: `${accentColor}40`, backgroundColor: isLearnMoreExpanded ? `${accentColor}08` : 'transparent', boxShadow: isLearnMoreExpanded ? `0 4px 20px ${accentColor}15` : 'none' }}
                disabled={!learnMoreSubpages.length}
              >
                <motion.div
                  className="absolute inset-0 opacity-0 pointer-events-none"
                  style={{ background: `linear-gradient(135deg, ${accentColor}05 0%, transparent 100%)` }}
                  whileHover={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                />

                <div className="flex items-center gap-3 relative z-10">
                  <motion.div
                    className="w-10 h-10 rounded-full flex items-center justify-center shadow-sm"
                    style={{ backgroundColor: `${accentColor}20` }}
                    animate={isLearnMoreExpanded ? { rotate: [0, 5, -5, 0] } : {}}
                    transition={{ duration: 0.5 }}
                  >
                    <Sparkles className="w-5 h-5" style={{ color: accentColor }} />
                  </motion.div>
                  <div className="text-left">
                    <div style={{ color: accentColor }}>Learn More: How This Works</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {learnMoreSubpages.length
                        ? `${learnMoreSubpages.length} lessons to deepen understanding`
                        : 'Content is generating...'}
                    </div>
                  </div>
                </div>
                <motion.div animate={{ rotate: isLearnMoreExpanded ? 90 : 0 }} transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }} className="relative z-10">
                  <ChevronRight className="w-5 h-5" style={{ color: accentColor }} />
                </motion.div>
              </Button>
            </motion.div>

            <AnimatePresence>
              {isLearnMoreExpanded && learnMoreSubpages.length > 0 && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3 }} className="mt-4">
                  <Card className="p-6 md:p-8" style={{ backgroundColor: `${accentColor}05` }}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-sm text-muted-foreground">
                        Lesson {learnMorePageIndex + 1} of {learnMoreSubpages.length}
                      </div>
                      <div className="flex items-center gap-2">
                        {learnMoreSubpages.map((_, idx) => (
                          <button key={idx} onClick={() => setLearnMorePageIndex(idx)} className="transition-all">
                            <div
                              className={`rounded-full transition-all ${idx === learnMorePageIndex ? 'w-3 h-3' : 'w-2 h-2 opacity-40'}`}
                              style={{ backgroundColor: accentColor }}
                            />
                          </button>
                        ))}
                      </div>
                    </div>

                    <AnimatePresence mode="wait">
                      <motion.div
                        key={learnMorePageIndex}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.3 }}
                        className="space-y-4"
                      >
                        <h4 className="text-lg md:text-xl" style={{ color: accentColor }}>
                          {learnMoreSubpages[learnMorePageIndex].title}
                        </h4>
                        <p className="text-base leading-relaxed text-muted-foreground">
                          {learnMoreSubpages[learnMorePageIndex].content}
                        </p>
                      </motion.div>
                    </AnimatePresence>

                    <div className="flex items-center justify-between mt-6 gap-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={prevLearnMorePage}
                        disabled={learnMorePageIndex === 0}
                        className="rounded-full"
                      >
                        <ChevronLeft className="w-4 h-4 mr-1" />
                        Previous
                      </Button>

                      <Button
                        size="sm"
                        onClick={nextLearnMorePage}
                        disabled={learnMorePageIndex === learnMoreSubpages.length - 1}
                        className="rounded-full"
                        style={{ backgroundColor: accentColor, color: 'white' }}
                      >
                        Next
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>

            {!learnMoreSubpages.length && (
              <div className="mt-4">
                <Card className="p-6 md:p-8" style={{ backgroundColor: `${accentColor}05` }}>
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, idx) => (
                      <div key={idx} className="space-y-2">
                        <div className="h-4 w-1/2 rounded-full bg-muted animate-pulse" />
                        <div className="h-3 w-full rounded-full bg-muted/70 animate-pulse" />
                        <div className="h-3 w-5/6 rounded-full bg-muted/50 animate-pulse" />
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            )}
          </div>

          <Separator />

          <div>
            <Button
              variant="outline"
              onClick={() => {
                if (!unlockMasterySubpages.length) return;
                if (isMasteryUnlocked) {
                  setIsMasteryExpanded(!isMasteryExpanded);
                } else {
                  setIsMasteryUnlocked(true);
                  setIsMasteryExpanded(true);
                }
              }}
              className="w-full justify-between rounded-xl p-6 h-auto"
              style={{ borderColor: isMasteryUnlocked ? `${accentColor}40` : '#6b6b6b40', backgroundColor: isMasteryExpanded ? `${accentColor}08` : 'transparent' }}
              disabled={!unlockMasterySubpages.length}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: isMasteryUnlocked ? `${accentColor}20` : '#6b6b6b20' }}
                >
                  {isMasteryUnlocked ? (
                    <Unlock className="w-5 h-5" style={{ color: accentColor }} />
                  ) : (
                    <Lock className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                <div className="text-left">
                  <div style={{ color: isMasteryUnlocked ? accentColor : 'var(--muted-foreground)' }}>
                    {isMasteryUnlocked ? 'Mastery Level: Expert Thinking' : 'Unlock Mastery Level'}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {unlockMasterySubpages.length
                      ? isMasteryUnlocked
                        ? `${unlockMasterySubpages.length} advanced lessons available`
                        : `Tap to unlock ${unlockMasterySubpages.length} expert insights`
                      : 'Content is generating...'}
                  </div>
                </div>
              </div>
              <ChevronRight
                className={`w-5 h-5 transition-transform ${isMasteryExpanded ? 'rotate-90' : ''}`}
                style={{ color: isMasteryUnlocked ? accentColor : 'var(--muted-foreground)' }}
              />
            </Button>

            <AnimatePresence>
              {isMasteryExpanded && isMasteryUnlocked && unlockMasterySubpages.length > 0 && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3 }} className="mt-4">
                  <Card
                    className="p-6 md:p-8 border-2"
                    style={{ backgroundColor: `${accentColor}05`, borderColor: `${accentColor}40` }}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-sm text-muted-foreground">
                        Mastery Lesson {masteryPageIndex + 1} of {unlockMasterySubpages.length}
                      </div>
                      <div className="flex items-center gap-2">
                        {unlockMasterySubpages.map((_, idx) => (
                          <button key={idx} onClick={() => setMasteryPageIndex(idx)} className="transition-all">
                            <div
                              className={`rounded-full transition-all ${idx === masteryPageIndex ? 'w-3 h-3' : 'w-2 h-2 opacity-40'}`}
                              style={{ backgroundColor: accentColor }}
                            />
                          </button>
                        ))}
                      </div>
                    </div>

                    <AnimatePresence mode="wait">
                      <motion.div
                        key={masteryPageIndex}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.3 }}
                        className="space-y-4"
                      >
                        <h4 className="text-lg md:text-xl" style={{ color: accentColor }}>
                          {unlockMasterySubpages[masteryPageIndex].title}
                        </h4>
                        <p className="text-base leading-relaxed text-muted-foreground">
                          {unlockMasterySubpages[masteryPageIndex].content}
                        </p>
                      </motion.div>
                    </AnimatePresence>

                    <div className="flex items-center justify-between mt-6 gap-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={prevMasteryPage}
                        disabled={masteryPageIndex === 0}
                        className="rounded-full"
                      >
                        <ChevronLeft className="w-4 h-4 mr-1" />
                        Previous
                      </Button>

                      <Button
                        size="sm"
                        onClick={nextMasteryPage}
                        disabled={masteryPageIndex === unlockMasterySubpages.length - 1}
                        className="rounded-full"
                        style={{ backgroundColor: accentColor, color: 'white' }}
                      >
                        Next
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>

            {!unlockMasterySubpages.length && (
              <div className="mt-4">
                <Card className="p-6 md:p-8 border-2" style={{ backgroundColor: `${accentColor}05`, borderColor: `${accentColor}20` }}>
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, idx) => (
                      <div key={idx} className="space-y-2">
                        <div className="h-4 w-2/3 rounded-full bg-muted animate-pulse" />
                        <div className="h-3 w-full rounded-full bg-muted/70 animate-pulse" />
                        <div className="h-3 w-4/5 rounded-full bg-muted/50 animate-pulse" />
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            )}
          </div>

          {/* Section Navigation */}
          <div className="pt-8 border-t">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <Button
                variant="outline"
                onClick={onPreviousSection}
                disabled={!onPreviousSection}
                className="rounded-full px-6"
                style={{ borderColor: !onPreviousSection ? undefined : `${accentColor}40`, color: !onPreviousSection ? undefined : accentColor }}
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Previous Section
              </Button>

              <div className="text-sm text-muted-foreground">
                Section {sectionNumber} of {totalSections}
              </div>

              <Button
                onClick={onNextSection}
                disabled={!onNextSection}
                className="rounded-full px-6"
                style={{ backgroundColor: !onNextSection ? undefined : accentColor, color: !onNextSection ? undefined : 'white' }}
              >
                Next Section
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
