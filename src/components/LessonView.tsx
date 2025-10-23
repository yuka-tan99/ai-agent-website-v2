import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Sparkles, CheckCircle2, Lightbulb, BookOpen, Target, Circle, Zap, AlertTriangle, TrendingUp, GraduationCap } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { Progress } from './ui/progress';
import { Checkbox } from './ui/checkbox';
import { useState } from 'react';

interface LessonViewProps {
  isOpen: boolean;
  onClose: () => void;
  sectionNumber: number;
  title: string;
  icon: React.ReactNode;
  summary: string;
  learnMoreContent: {
    description: string;
    actionSteps: string[];
    tips: string[];
  };
  elaborateContent?: {
    overview: string;
    advancedTechniques: {
      title: string;
      items: string[];
    };
    troubleshooting: {
      title: string;
      items: string[];
    };
    longTermStrategy: {
      title: string;
      items: string[];
    };
    expertResources?: string[];
  };
  accentColor: string;
}

export function LessonView({
  isOpen,
  onClose,
  sectionNumber,
  title,
  icon,
  summary,
  learnMoreContent,
  elaborateContent,
  accentColor
}: LessonViewProps) {
  const [isElaborateOpen, setIsElaborateOpen] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  const toggleStep = (index: number) => {
    const newCompleted = new Set(completedSteps);
    if (newCompleted.has(index)) {
      newCompleted.delete(index);
    } else {
      newCompleted.add(index);
    }
    setCompletedSteps(newCompleted);
  };

  const progressPercentage = (completedSteps.size / learnMoreContent.actionSteps.length) * 100;

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
          {/* Header with Back Button */}
          <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b">
            <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={onClose}
                className="rounded-full w-10 h-10 flex-shrink-0 hover:scale-105 transition-transform"
                style={{
                  borderColor: `${accentColor}40`,
                  color: accentColor
                }}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${accentColor}20` }}
                >
                  <div style={{ color: accentColor }}>
                    {icon}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>Section {sectionNumber}</span>
                    <Circle className="w-1 h-1 fill-current" />
                    <span>Lesson</span>
                  </div>
                  <h3 className="truncate">{title}</h3>
                </div>
              </div>

              {/* Progress indicator */}
              <div className="hidden md:flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {completedSteps.size}/{learnMoreContent.actionSteps.length} steps
                </span>
                <div className="w-24">
                  <Progress value={progressPercentage} className="h-2" />
                </div>
              </div>
            </div>
          </div>

          {/* Lesson Content */}
          <ScrollArea className="h-[calc(100vh-73px)]">
            <div className="max-w-5xl mx-auto px-6 py-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="space-y-8"
              >
                {/* Hero Section */}
                <Card className="p-8 border-l-4" style={{ borderLeftColor: accentColor }}>
                  <div className="space-y-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm" style={{ backgroundColor: `${accentColor}15`, color: accentColor }}>
                      <BookOpen className="w-4 h-4" />
                      <span>Deep Dive Lesson</span>
                    </div>
                    <h1>{title}</h1>
                    <p className="text-muted-foreground text-lg">{summary}</p>
                  </div>
                </Card>

                {/* Overview */}
                <Card className="p-6 rounded-2xl" style={{ backgroundColor: `${accentColor}08` }}>
                  <div className="flex items-start gap-3 mb-4">
                    <div 
                      className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: accentColor }}
                    >
                      <Target className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2>What You'll Learn</h2>
                      <p className="text-muted-foreground mt-2 leading-relaxed">
                        {learnMoreContent.description}
                      </p>
                    </div>
                  </div>
                </Card>

                {/* Action Steps with Checkboxes */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-10 h-10 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: `${accentColor}20` }}
                      >
                        <CheckCircle2 className="w-5 h-5" style={{ color: accentColor }} />
                      </div>
                      <h2>Action Steps</h2>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {completedSteps.size} of {learnMoreContent.actionSteps.length} complete
                    </div>
                  </div>

                  <div className="space-y-3">
                    {learnMoreContent.actionSteps.map((step, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 + idx * 0.05 }}
                      >
                        <Card 
                          className={`p-5 cursor-pointer transition-all duration-200 hover:shadow-md ${
                            completedSteps.has(idx) ? 'bg-muted/50 border-2' : 'hover:border-current'
                          }`}
                          style={completedSteps.has(idx) ? { borderColor: accentColor } : {}}
                          onClick={() => toggleStep(idx)}
                        >
                          <div className="flex items-start gap-4">
                            <div className="flex items-center gap-3 flex-shrink-0">
                              <Checkbox
                                checked={completedSteps.has(idx)}
                                onCheckedChange={() => toggleStep(idx)}
                                className="mt-1"
                                style={completedSteps.has(idx) ? { 
                                  backgroundColor: accentColor,
                                  borderColor: accentColor 
                                } : {}}
                              />
                              <div 
                                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition-colors ${
                                  completedSteps.has(idx) ? 'text-white' : ''
                                }`}
                                style={{ 
                                  backgroundColor: completedSteps.has(idx) ? accentColor : `${accentColor}20`,
                                  color: completedSteps.has(idx) ? 'white' : accentColor
                                }}
                              >
                                {idx + 1}
                              </div>
                            </div>
                            <p className={`flex-1 pt-1 ${completedSteps.has(idx) ? 'line-through text-muted-foreground' : ''}`}>
                              {step}
                            </p>
                          </div>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Pro Tips */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: `${accentColor}20` }}
                    >
                      <Lightbulb className="w-5 h-5" style={{ color: accentColor }} />
                    </div>
                    <h2>Pro Tips & Best Practices</h2>
                  </div>

                  <div className="grid gap-4">
                    {learnMoreContent.tips.map((tip, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 + idx * 0.05 }}
                      >
                        <Card className="p-5 bg-gradient-to-br from-card to-muted/20 hover:shadow-md transition-shadow">
                          <div className="flex items-start gap-3">
                            <div className="w-2 h-2 rounded-full mt-2 flex-shrink-0" style={{ backgroundColor: accentColor }} />
                            <p className="flex-1 leading-relaxed">{tip}</p>
                          </div>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Elaborate Section */}
                {elaborateContent && (
                  <div className="space-y-4">
                    <Separator />
                    
                    <div className="flex justify-center py-4">
                      <Button
                        variant="outline"
                        size="lg"
                        onClick={() => setIsElaborateOpen(!isElaborateOpen)}
                        className="rounded-full gap-2 px-8 transition-all duration-200 hover:scale-105"
                        style={{ 
                          borderColor: isElaborateOpen ? accentColor : undefined,
                          backgroundColor: isElaborateOpen ? `${accentColor}15` : undefined,
                          color: isElaborateOpen ? accentColor : undefined,
                          boxShadow: isElaborateOpen ? `0 0 30px ${accentColor}30` : undefined
                        }}
                      >
                        <Sparkles className="w-5 h-5" />
                        {isElaborateOpen ? 'Hide Mastery Content' : 'Unlock Mastery Level'}
                        <Sparkles className="w-5 h-5" />
                      </Button>
                    </div>

                    <AnimatePresence>
                      {isElaborateOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          transition={{ duration: 0.4 }}
                          className="space-y-6"
                        >
                          {/* Mastery Header Card */}
                          <Card 
                            className="p-8 border-2 relative overflow-hidden"
                            style={{ 
                              borderColor: accentColor,
                              backgroundColor: `${accentColor}08`
                            }}
                          >
                            {/* Decorative elements */}
                            <div className="absolute top-4 right-4 opacity-10">
                              <Sparkles className="w-12 h-12" style={{ color: accentColor }} />
                            </div>
                            <div className="absolute bottom-4 left-4 opacity-10">
                              <Sparkles className="w-12 h-12" style={{ color: accentColor }} />
                            </div>

                            <div className="relative space-y-4">
                              <div className="flex items-center gap-3">
                                <div 
                                  className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg"
                                  style={{ backgroundColor: accentColor }}
                                >
                                  <GraduationCap className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                  <h2>Mastery Level Content</h2>
                                  <p className="text-muted-foreground">Advanced strategies for expert-level growth</p>
                                </div>
                              </div>

                              <p className="text-muted-foreground leading-relaxed">
                                {elaborateContent.overview}
                              </p>
                              
                              <div className="flex items-start gap-2 p-4 rounded-lg bg-background/40">
                                <Sparkles className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: accentColor }} />
                                <p className="text-sm text-muted-foreground">
                                  <strong>AI-Powered Personalization:</strong> This content will be dynamically generated based on your onboarding answers and current progress to provide hyper-personalized advanced strategies.
                                </p>
                              </div>
                            </div>
                          </Card>

                          {/* Advanced Techniques Section */}
                          <Card className="p-6 border-l-4 hover:shadow-lg transition-shadow" style={{ borderLeftColor: `${accentColor}` }}>
                            <div className="space-y-4">
                              <div className="flex items-center gap-3">
                                <div 
                                  className="w-10 h-10 rounded-full flex items-center justify-center"
                                  style={{ backgroundColor: `${accentColor}20` }}
                                >
                                  <Zap className="w-5 h-5" style={{ color: accentColor }} />
                                </div>
                                <div>
                                  <h3>{elaborateContent.advancedTechniques.title}</h3>
                                  <p className="text-sm text-muted-foreground">Expert-level tactics and uncommon approaches</p>
                                </div>
                              </div>

                              <div className="space-y-3">
                                {elaborateContent.advancedTechniques.items.map((item, idx) => (
                                  <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.1 + idx * 0.05 }}
                                  >
                                    <Card className="p-4 bg-gradient-to-br from-background to-muted/10 hover:shadow-md transition-all">
                                      <div className="flex items-start gap-3">
                                        <div 
                                          className="w-6 h-6 rounded-full flex items-center justify-center text-xs flex-shrink-0 mt-0.5"
                                          style={{ backgroundColor: `${accentColor}20`, color: accentColor }}
                                        >
                                          {idx + 1}
                                        </div>
                                        <p className="flex-1 text-sm leading-relaxed">{item}</p>
                                      </div>
                                    </Card>
                                  </motion.div>
                                ))}
                              </div>
                            </div>
                          </Card>

                          {/* Troubleshooting Section */}
                          <Card className="p-6 border-l-4 hover:shadow-lg transition-shadow" style={{ borderLeftColor: '#d4183d' }}>
                            <div className="space-y-4">
                              <div className="flex items-center gap-3">
                                <div 
                                  className="w-10 h-10 rounded-full flex items-center justify-center"
                                  style={{ backgroundColor: '#d4183d20' }}
                                >
                                  <AlertTriangle className="w-5 h-5" style={{ color: '#d4183d' }} />
                                </div>
                                <div>
                                  <h3>{elaborateContent.troubleshooting.title}</h3>
                                  <p className="text-sm text-muted-foreground">Solutions to obstacles you'll likely encounter</p>
                                </div>
                              </div>

                              <div className="space-y-3">
                                {elaborateContent.troubleshooting.items.map((item, idx) => (
                                  <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.1 + idx * 0.05 }}
                                  >
                                    <Card className="p-4 bg-gradient-to-br from-background to-destructive/5 hover:shadow-md transition-all border-destructive/20">
                                      <div className="flex items-start gap-3">
                                        <div 
                                          className="w-6 h-6 rounded-full flex items-center justify-center text-xs flex-shrink-0 mt-0.5"
                                          style={{ backgroundColor: '#d4183d20', color: '#d4183d' }}
                                        >
                                          !
                                        </div>
                                        <p className="flex-1 text-sm leading-relaxed">{item}</p>
                                      </div>
                                    </Card>
                                  </motion.div>
                                ))}
                              </div>
                            </div>
                          </Card>

                          {/* Long-Term Strategy Section */}
                          <Card className="p-6 border-l-4 hover:shadow-lg transition-shadow" style={{ borderLeftColor: '#6BA3D1' }}>
                            <div className="space-y-4">
                              <div className="flex items-center gap-3">
                                <div 
                                  className="w-10 h-10 rounded-full flex items-center justify-center"
                                  style={{ backgroundColor: '#6BA3D120' }}
                                >
                                  <TrendingUp className="w-5 h-5" style={{ color: '#6BA3D1' }} />
                                </div>
                                <div>
                                  <h3>{elaborateContent.longTermStrategy.title}</h3>
                                  <p className="text-sm text-muted-foreground">Building sustainable systems for long-term success</p>
                                </div>
                              </div>

                              <div className="space-y-3">
                                {elaborateContent.longTermStrategy.items.map((item, idx) => (
                                  <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.1 + idx * 0.05 }}
                                  >
                                    <Card className="p-4 bg-gradient-to-br from-background to-chart-2/10 hover:shadow-md transition-all border-chart-2/20">
                                      <div className="flex items-start gap-3">
                                        <div 
                                          className="w-6 h-6 rounded-full flex items-center justify-center text-xs flex-shrink-0 mt-0.5"
                                          style={{ backgroundColor: '#6BA3D120', color: '#6BA3D1' }}
                                        >
                                          {idx + 1}
                                        </div>
                                        <p className="flex-1 text-sm leading-relaxed">{item}</p>
                                      </div>
                                    </Card>
                                  </motion.div>
                                ))}
                              </div>
                            </div>
                          </Card>

                          {/* Expert Resources Section */}
                          {elaborateContent.expertResources && elaborateContent.expertResources.length > 0 && (
                            <Card className="p-6 bg-gradient-to-br from-muted/30 to-muted/10">
                              <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                  <div 
                                    className="w-10 h-10 rounded-full flex items-center justify-center"
                                    style={{ backgroundColor: `${accentColor}20` }}
                                  >
                                    <BookOpen className="w-5 h-5" style={{ color: accentColor }} />
                                  </div>
                                  <div>
                                    <h3>Expert Resources & Templates</h3>
                                    <p className="text-sm text-muted-foreground">Downloadable frameworks and case studies</p>
                                  </div>
                                </div>

                                <div className="space-y-3">
                                  {elaborateContent.expertResources.map((resource, idx) => (
                                    <motion.div
                                      key={idx}
                                      initial={{ opacity: 0, x: -10 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      transition={{ delay: 0.1 + idx * 0.05 }}
                                    >
                                      <Card className="p-4 bg-background/80 backdrop-blur-sm border hover:bg-background transition-all duration-200 hover:shadow-md">
                                        <div className="flex items-start gap-3">
                                          <div className="w-2 h-2 rounded-full mt-2 flex-shrink-0" style={{ backgroundColor: accentColor }} />
                                          <p className="flex-1 text-sm">{resource}</p>
                                        </div>
                                      </Card>
                                    </motion.div>
                                  ))}
                                </div>
                              </div>
                            </Card>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* Bottom CTA */}
                <Card className="p-6 text-center bg-gradient-to-br from-muted/50 to-muted/20">
                  <h3 className="mb-2">Ready to put this into action?</h3>
                  <p className="text-muted-foreground mb-4">
                    Complete the steps above and track your progress
                  </p>
                  <Button
                    variant="outline"
                    onClick={onClose}
                    className="rounded-full px-6"
                    style={{ borderColor: accentColor, color: accentColor }}
                  >
                    Back to Dashboard
                  </Button>
                </Card>
              </motion.div>
            </div>
          </ScrollArea>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
