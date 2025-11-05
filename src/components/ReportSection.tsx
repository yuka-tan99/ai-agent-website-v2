'use client';

import type { ComponentType, ReactNode } from 'react';
import { motion } from 'motion/react';
import {
  BookOpen,
  ChevronRight,
  Target,
  Sparkles,
  TrendingUp,
  Rocket,
  Compass,
  Zap,
  User,
  Heart,
  FolderKanban,
} from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Skeleton } from './ui/skeleton';
import { renderHighlightedText } from '@/lib/renderHighlightedText';

type CardIconKey = 'Target' | 'Sparkles' | 'TrendingUp' | 'Rocket' | 'Compass' | 'Zap' | 'User' | 'Heart' | 'FolderKanban';

const CARD_ICON_MAP: Record<CardIconKey, ComponentType<any>> = {
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

interface ReportSectionProps {
  sectionNumber: number;
  title: string;
  icon: React.ReactNode;
  summary: string;
  cards?: Array<{
    title: string;
    content: string;
    icon?: CardIconKey;
  }>;
  personalizedSummary?: string;
  personalizedTips?: string[];
  keyInsights: string[];
  learnMoreContent?: {
    description: string;
    actionSteps: string[];
    tips: string[];
  };
  elaborateContent?: unknown;
  accentColor: string;
  isPlaceholder?: boolean;
  onLearnMore: () => void;
}

export function ReportSection({
  sectionNumber,
  title,
  icon,
  summary,
  cards,
  personalizedSummary,
  personalizedTips,
  keyInsights,
  learnMoreContent,
  elaborateContent,
  accentColor,
  isPlaceholder,
  onLearnMore
}: ReportSectionProps) {

  const showPlaceholder = Boolean(isPlaceholder);
  const summaryText = personalizedSummary?.trim() ? personalizedSummary : summary;
  const hasTips = Array.isArray(personalizedTips) && personalizedTips.length > 0;

  const hasCards = Array.isArray(cards) && cards.length > 0;

  const handleLearnMore = () => {
    if (showPlaceholder) return;
    onLearnMore();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card
        className="p-6 md:p-8 hover:shadow-lg transition-shadow duration-300 border-l-[6px]"
        style={{ borderLeftColor: accentColor }}
      >
        <div className="flex flex-col sm:flex-row items-start gap-4 md:gap-6">
          <div
            className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${accentColor}20` }}
          >
            <div style={{ color: accentColor }}>{icon}</div>
          </div>

          <div className="flex-1 min-w-0 w-full">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-2">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 min-w-0 flex-1">
                <span className="text-muted-foreground shrink-0" style={{ fontSize: '0.9375rem' }}>
                  Section {sectionNumber}
                </span>
                <h3 className="break-words" style={{ fontSize: '1.125rem' }}>
                  {title}
                </h3>
              </div>
            </div>

            {showPlaceholder ? (
              <div className="space-y-4">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-5 w-5/6" />
                <div className="space-y-3 pt-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-11/12" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
                <div className="pt-4">
                  <Skeleton className="h-8 w-28 rounded-full" />
                </div>
              </div>
            ) : (
              <>
                {summaryText && (
                  <p className="text-muted-foreground text-base md:text-lg leading-relaxed mb-6">
                    {renderHighlightedText(summaryText, accentColor)}
                  </p>
                )}

                {hasCards && cards && (
                  <div className="mb-6">
                    {(() => {
                      const getTheme = (boxIndex: number) => {
                        const themes = [
                          { bg: '#6BA3D108', border: '#6BA3D130', iconBg: '#6BA3D1' },
                          { bg: '#9E5DAB08', border: '#9E5DAB30', iconBg: '#9E5DAB' },
                          { bg: '#B481C008', border: '#B481C030', iconBg: '#B481C0' },
                        ];
                        return themes[boxIndex % themes.length];
                      };

                      const boxes = cards.map((card, idx) => {
                        const iconKey = card.icon ?? 'Sparkles';
                        const IconComponent = CARD_ICON_MAP[iconKey] ?? Sparkles;
                        const theme = getTheme(idx);
                        return {
                          title: card.title,
                          content: card.content,
                          IconComponent,
                          theme,
                        };
                      });

                      return (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
                          {boxes.map((box, idx) => (
                            <motion.div
                              key={`${box.title}-${idx}`}
                              initial={{ opacity: 0, scale: 0.9, y: 20 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              transition={{
                                delay: idx * 0.08,
                                duration: 0.4,
                                type: 'spring',
                                stiffness: 100,
                              }}
                              whileHover={{
                                scale: 1.03,
                                y: -6,
                                transition: { duration: 0.2 },
                              }}
                              className="group relative p-6 md:p-7 rounded-2xl border-2 backdrop-blur-sm hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden"
                              style={{
                                backgroundColor: box.theme.bg,
                                borderColor: box.theme.border,
                                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                              }}
                            >
                              <div
                                className="absolute -top-6 -right-6 w-20 h-20 rounded-full opacity-0 group-hover:opacity-10 blur-2xl transition-all duration-500"
                                style={{
                                  background: `radial-gradient(circle, ${box.theme.iconBg}, transparent)`,
                                }}
                              />
                              <div
                                className="absolute top-0 right-0 w-0 h-0 group-hover:w-12 group-hover:h-12 transition-all duration-300 rounded-bl-2xl opacity-10"
                                style={{ backgroundColor: box.theme.iconBg }}
                              />
                              <div className="mb-4 flex items-center gap-3">
                                <motion.div
                                  whileHover={{
                                    rotate: [0, -10, 10, -10, 0],
                                    scale: 1.15,
                                  }}
                                  transition={{ duration: 0.6, ease: 'easeInOut' }}
                                  className="relative w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-2xl transition-all duration-300"
                                  style={{ backgroundColor: box.theme.iconBg }}
                                >
                                  <motion.div
                                    className="absolute inset-0 rounded-2xl"
                                    animate={{
                                      boxShadow: [
                                        `0 0 0 0px ${box.theme.iconBg}40`,
                                        `0 0 0 4px ${box.theme.iconBg}20`,
                                        `0 0 0 0px ${box.theme.iconBg}40`,
                                      ],
                                    }}
                                    transition={{
                                      duration: 2,
                                      repeat: Infinity,
                                      ease: 'easeInOut',
                                    }}
                                  />
                                  <div
                                    className="absolute inset-0 rounded-2xl opacity-20"
                                    style={{
                                      background: `linear-gradient(135deg, transparent 0%, ${box.theme.iconBg} 100%)`,
                                    }}
                                  />
                                  <motion.div
                                    animate={{ y: [0, -2, 0] }}
                                    transition={{
                                      duration: 2,
                                      repeat: Infinity,
                                      ease: 'easeInOut',
                                      delay: idx * 0.2,
                                    }}
                                    className="relative z-10"
                                  >
                                    <box.IconComponent className="w-7 h-7 text-white" strokeWidth={2.5} />
                                  </motion.div>
                                  <motion.div
                                    className="absolute -top-1 -right-1 w-3 h-3 rounded-full opacity-0 group-hover:opacity-100"
                                    style={{ backgroundColor: '#ffffff' }}
                                    animate={{
                                      scale: [1, 1.5, 1],
                                      opacity: [0.8, 1, 0.8],
                                    }}
                                    transition={{
                                      duration: 1.5,
                                      repeat: Infinity,
                                    }}
                                  />
                                </motion.div>
                                <div className="flex-1 min-w-0">
                                  <h4
                                    className="break-words group-hover:scale-105 transition-transform duration-200 origin-left"
                                    style={{ color: box.theme.iconBg, fontSize: '1.0625rem', fontWeight: 600 }}
                                  >
                                    {box.title}
                                  </h4>
                                  <motion.div
                                    className="h-0.5 rounded-full mt-1"
                                    initial={{ width: 0 }}
                                    animate={{ width: '0%' }}
                                    whileHover={{ width: '100%' }}
                                    transition={{ duration: 0.5 }}
                                    style={{ backgroundColor: box.theme.iconBg }}
                                  />
                                </div>
                              </div>
                              <div className="relative">
                                <p
                                  className="text-sm md:text-base text-foreground/80 group-hover:text-foreground transition-colors duration-200"
                                  style={{ lineHeight: '1.7' }}
                                >
                                  {renderHighlightedText(box.content, box.theme.iconBg)}
                                </p>
                              </div>
                              <motion.div
                                className="absolute bottom-0 left-0 right-0 h-1 rounded-b-2xl"
                                initial={{ scaleX: 0 }}
                                animate={{ scaleX: 1 }}
                                transition={{ delay: idx * 0.1 + 0.3, duration: 0.6 }}
                                style={{
                                  backgroundColor: `${box.theme.iconBg}40`,
                                  transformOrigin: 'left',
                                }}
                              />
                              <div
                                className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                                style={{
                                  boxShadow: `inset 0 0 20px ${box.theme.iconBg}15`,
                                }}
                              />
                            </motion.div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                )}

                {hasTips && personalizedTips && (
                  <div className="mb-6 space-y-4 md:space-y-5">
                    <p className="text-base font-semibold" style={{ color: accentColor }}>
                      Your Action Tips:
                    </p>
                    {personalizedTips.map((tip, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.08 }}
                        className="flex items-start gap-3 p-4 rounded-xl transition-colors duration-200 hover:bg-muted/30"
                        style={{ backgroundColor: idx % 2 === 0 ? 'transparent' : `${accentColor}05` }}
                      >
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-sm shadow-sm"
                          style={{ backgroundColor: accentColor, color: 'white', fontWeight: 600 }}
                        >
                          {idx + 1}
                        </div>
                        <p className="flex-1 text-sm md:text-base" style={{ lineHeight: '1.7' }}>
                          {renderHighlightedText(tip, accentColor)}
                        </p>
                      </motion.div>
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap gap-3 mt-2">
                  <Button
                    variant="outline"
                    size="default"
                    onClick={handleLearnMore}
                    disabled={showPlaceholder}
                    className="rounded-full transition-all duration-200 hover:scale-105 shadow-sm hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
                    style={{
                      borderColor: `${accentColor}60`,
                      color: accentColor,
                      borderWidth: '2px',
                      paddingLeft: '1.5rem',
                      paddingRight: '1.5rem',
                      height: '2.5rem',
                      fontWeight: 500,
                    }}
                  >
                    <BookOpen className="w-4 h-4 mr-2" />
                    Learn more
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
