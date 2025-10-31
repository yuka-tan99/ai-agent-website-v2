import type { ComponentType, ReactNode } from 'react';
import { motion } from 'motion/react';
import {
  BookOpen,
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

type CardIconKey = 'Target' | 'Sparkles' | 'TrendingUp' | 'Rocket' | 'Compass' | 'Zap' | 'User' | 'Heart' | 'FolderKanban';

const CARD_ICON_MAP: Record<CardIconKey, ComponentType<{ className?: string }>> = {
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

  const renderRichText = (text: string, color: string): ReactNode => {
    if (!text) return null;
    const tokens = text.split(new RegExp('(<<highlight>>|<</highlight>>)','g'));
    let isHighlight = false;
    return tokens
      .map((token, index) => {
        if (!token) return null;
        if (token === '<<highlight>>') {
          isHighlight = true;
          return null;
        }
        if (token === '<</highlight>>') {
          isHighlight = false;
          return null;
        }
        if (isHighlight) {
          return (
            <span
              key={`hl-${index}`}
              className="font-semibold"
              style={{ color }}
            >
              {token}
            </span>
          );
        }
        return <span key={`txt-${index}`}>{token}</span>;
      })
      .filter(Boolean);
  };

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
      <Card className="p-4 md:p-6 hover:shadow-lg transition-shadow duration-300 border-l-4" style={{ borderLeftColor: accentColor }}>
        <div className="flex flex-col sm:flex-row items-start gap-4">
          <div 
            className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${accentColor}20` }}
          >
            <div style={{ color: accentColor }}>
              {icon}
            </div>
          </div>
          
          <div className="flex-1 min-w-0 w-full">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2 gap-2">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <span className="text-muted-foreground text-sm">Section {sectionNumber}</span>
                <h3 className="break-words">{title}</h3>
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
                    {renderRichText(summaryText, accentColor)}
                  </p>
                )}

                {hasCards && (
                  <div className="grid gap-4 mb-6 sm:grid-cols-2 lg:grid-cols-3">
                    {cards!.map((card, idx) => {
                      const iconKey = card.icon ?? 'Sparkles';
                      const IconComponent = CARD_ICON_MAP[iconKey] ?? Sparkles;
                      return (
                        <motion.div
                          key={`${card.title}-${idx}`}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.08 }}
                          className="relative overflow-hidden rounded-2xl border p-5 shadow-sm"
                          style={{
                            borderColor: `${accentColor}30`,
                            background: 'linear-gradient(135deg, rgba(255,255,255,0.95), rgba(248,243,249,0.85))',
                          }}
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                              style={{ backgroundColor: `${accentColor}20` }}
                            >
                              <IconComponent className="w-5 h-5" style={{ color: accentColor }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold" style={{ color: accentColor }}>
                                {card.title}
                              </p>
                              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                                {renderRichText(card.content, accentColor)}
                              </p>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}

                {hasTips && personalizedTips && (
                  <div className="mb-6 space-y-3">
                    <p className="text-sm font-medium" style={{ color: accentColor }}>Your Action Tips:</p>
                    {personalizedTips.map((tip, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.08 }}
                        className="flex items-start gap-3"
                      >
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-xs"
                          style={{ backgroundColor: `${accentColor}20`, color: accentColor }}
                        >
                          {idx + 1}
                        </div>
                        <p className="flex-1 text-sm">{renderRichText(tip, accentColor)}</p>
                      </motion.div>
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLearnMore}
                    disabled={showPlaceholder}
                    className="rounded-full transition-all duration-200 hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed"
                    style={{ 
                      borderColor: `${accentColor}40`,
                      color: accentColor
                    }}
                  >
                    <BookOpen className="w-4 h-4 mr-1" />
                    Learn more
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
