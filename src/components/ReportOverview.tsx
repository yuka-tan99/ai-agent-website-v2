'use client';

import React, { type ReactNode } from 'react';
import { motion } from 'motion/react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { ChevronRight, CheckCircle2, Circle } from 'lucide-react';

export interface SectionOverview {
  id: number;
  title: string;
  icon: ReactNode;
  accentColor: string;
  completed: boolean;
  progress: number; // 0-100
}

interface ReportOverviewProps {
  sections: SectionOverview[];
  onViewSection: (sectionId: number) => void;
}

export function ReportOverview({ sections, onViewSection }: ReportOverviewProps) {
  return (
    <div className="space-y-8">
      <div>
        <h3 className="mb-6">Your Personalized Report</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {sections.map((section, idx) => (
            <motion.div
              key={section.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.5,
                delay: 0.15 + idx * 0.05,
                ease: [0.23, 1, 0.32, 1],
              }}
              whileHover={{
                y: -8,
                transition: { duration: 0.3, ease: 'easeOut' },
              }}
            >
              <Card
                className="p-6 transition-all duration-500 cursor-pointer group relative overflow-hidden border-2"
                style={{
                  borderColor: `${section.accentColor}30`,
                  boxShadow: `0 4px 20px -2px ${section.accentColor}10`,
                }}
                onClick={() => onViewSection(section.id)}
              >
                <div
                  className="absolute left-0 top-0 bottom-0 w-1 group-hover:w-1.5 transition-all duration-300"
                  style={{
                    background: `linear-gradient(to bottom, ${section.accentColor}, ${section.accentColor}80)`,
                    boxShadow: `0 0 20px ${section.accentColor}40`,
                  }}
                />

                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                  style={{
                    background: `radial-gradient(circle at top right, ${section.accentColor}08 0%, transparent 70%)`,
                  }}
                />

                <div className="space-y-4 relative z-10">
                  <div className="flex items-start justify-between gap-3">
                    <motion.div
                      className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300 group-hover:shadow-lg"
                      style={{
                        backgroundColor: `${section.accentColor}20`,
                        boxShadow: `0 0 0 0px ${section.accentColor}20`,
                      }}
                      whileHover={{
                        scale: 1.15,
                        boxShadow: `0 0 0 4px ${section.accentColor}10`,
                        transition: { duration: 0.2 },
                      }}
                    >
                      {React.isValidElement(section.icon)
                        ? React.cloneElement(section.icon, {
                            key: `overview-icon-${section.id}`,
                          })
                        : section.icon}
                    </motion.div>

                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.3 + idx * 0.05, type: 'spring', stiffness: 200 }}
                    >
                      {section.completed ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 drop-shadow-sm" />
                      ) : (
                        <Circle className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                      )}
                    </motion.div>
                  </div>

                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Section {section.id}</div>
                    <h4 className="text-base leading-tight mb-3 group-hover:translate-x-0.5 transition-transform duration-300">
                      {section.title}
                    </h4>

                    <div className="space-y-2">
                      <Progress value={section.progress} className="h-1.5" />
                      <div className="text-xs text-muted-foreground">{section.progress}% explored</div>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full rounded-full group-hover:scale-[1.02] group-hover:shadow-md transition-all duration-300"
                    style={{
                      borderColor: `${section.accentColor}40`,
                      color: section.accentColor,
                    }}
                  >
                    View Details
                    <ChevronRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform duration-300" />
                  </Button>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
