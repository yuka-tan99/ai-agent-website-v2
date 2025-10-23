import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from './ui/dialog';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  CheckCircle2, 
  Circle, 
  Zap, 
  Target,
  Clock,
  Sparkles,
  TrendingUp,
  Calendar,
  Filter,
  RotateCcw
} from 'lucide-react';

interface ActionItem {
  id: string;
  title: string;
  description: string;
  section: string;
  sectionNumber: number;
  priority: 'quick-win' | 'major' | 'fill-in';
  estimatedTime: string;
  completed: boolean;
}

interface ActionTrackerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ActionTrackerDialog({ open, onOpenChange }: ActionTrackerDialogProps) {
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [filter, setFilter] = useState<'all' | 'todo' | 'done'>('all');
  const [sortBy, setSortBy] = useState<'priority' | 'section'>('priority');

  // Initialize actions from localStorage or default
  useEffect(() => {
    const savedActions = localStorage.getItem('becomefamous_actions');
    if (savedActions) {
      setActions(JSON.parse(savedActions));
    } else {
      setActions(defaultActions);
    }
  }, []);

  // Save to localStorage whenever actions change
  useEffect(() => {
    if (actions.length > 0) {
      localStorage.setItem('becomefamous_actions', JSON.stringify(actions));
    }
  }, [actions]);

  const toggleAction = (id: string) => {
    setActions(actions.map(action => 
      action.id === id 
        ? { ...action, completed: !action.completed }
        : action
    ));
  };

  const resetAllActions = () => {
    if (confirm('Reset all actions? This will mark everything as incomplete.')) {
      setActions(actions.map(action => ({ ...action, completed: false })));
    }
  };

  // Calculate stats
  const totalActions = actions.length;
  const completedCount = actions.filter(a => a.completed).length;
  const progressPercent = Math.round((completedCount / totalActions) * 100);
  const quickWinsCompleted = actions.filter(a => a.priority === 'quick-win' && a.completed).length;
  const quickWinsTotal = actions.filter(a => a.priority === 'quick-win').length;

  // Filter and sort actions
  let filteredActions = actions;
  if (filter === 'todo') {
    filteredActions = actions.filter(a => !a.completed);
  } else if (filter === 'done') {
    filteredActions = actions.filter(a => a.completed);
  }

  if (sortBy === 'priority') {
    const priorityOrder = { 'quick-win': 1, 'major': 2, 'fill-in': 3 };
    filteredActions = [...filteredActions].sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  } else {
    filteredActions = [...filteredActions].sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      return a.sectionNumber - b.sectionNumber;
    });
  }

  const getPriorityConfig = (priority: string) => {
    switch (priority) {
      case 'quick-win':
        return {
          label: 'Quick Win',
          icon: <Zap className="w-3 h-3" />,
          color: '#6BA3D1',
          bgColor: '#6BA3D120'
        };
      case 'major':
        return {
          label: 'Major',
          icon: <Target className="w-3 h-3" />,
          color: '#9E5DAB',
          bgColor: '#9E5DAB20'
        };
      case 'fill-in':
        return {
          label: 'Fill-in',
          icon: <Clock className="w-3 h-3" />,
          color: '#B481C0',
          bgColor: '#EBD7DC40'
        };
      default:
        return {
          label: '',
          icon: null,
          color: '#9E5DAB',
          bgColor: '#9E5DAB20'
        };
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        {/* Header Section */}
        <div className="p-6 pb-4" style={{ backgroundColor: '#9E5DAB10' }}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" style={{ color: '#9E5DAB' }} />
              Your Action Plan
            </DialogTitle>
            <DialogDescription>
              Track your progress and stay organized
            </DialogDescription>
          </DialogHeader>

          {/* Progress Overview */}
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" style={{ color: '#9E5DAB' }} />
                <span className="text-sm">Overall Progress</span>
              </div>
              <span className="text-sm" style={{ color: '#9E5DAB' }}>
                {completedCount} of {totalActions} completed
              </span>
            </div>
            <Progress value={progressPercent} className="h-2" />
            
            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-3 mt-4">
              <div className="p-3 rounded-lg bg-white dark:bg-card">
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="w-4 h-4" style={{ color: '#6BA3D1' }} />
                  <span className="text-xs text-muted-foreground">Quick Wins</span>
                </div>
                <p>{quickWinsCompleted}/{quickWinsTotal}</p>
              </div>
              <div className="p-3 rounded-lg bg-white dark:bg-card">
                <div className="flex items-center gap-2 mb-1">
                  <Target className="w-4 h-4" style={{ color: '#9E5DAB' }} />
                  <span className="text-xs text-muted-foreground">To Do</span>
                </div>
                <p>{totalActions - completedCount}</p>
              </div>
              <div className="p-3 rounded-lg bg-white dark:bg-card">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 className="w-4 h-4" style={{ color: '#6BA3D1' }} />
                  <span className="text-xs text-muted-foreground">Completed</span>
                </div>
                <p>{completedCount}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters & Sort */}
        <div className="px-6 py-3 border-b flex items-center justify-between bg-muted/30">
          <Tabs value={filter} onValueChange={(v) => setFilter(v as any)} className="w-auto">
            <TabsList className="h-8">
              <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
              <TabsTrigger value="todo" className="text-xs">To Do</TabsTrigger>
              <TabsTrigger value="done" className="text-xs">Done</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSortBy(sortBy === 'priority' ? 'section' : 'priority')}
              className="h-8 text-xs gap-2"
            >
              <Filter className="w-3 h-3" />
              {sortBy === 'priority' ? 'By Priority' : 'By Section'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={resetAllActions}
              className="h-8 text-xs gap-2"
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </Button>
          </div>
        </div>

        {/* Action List - Scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {filteredActions.map((action, index) => {
                const config = getPriorityConfig(action.priority);
                return (
                  <motion.div
                    key={action.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2, delay: index * 0.02 }}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      action.completed 
                        ? 'opacity-60 bg-muted/30' 
                        : 'bg-white dark:bg-card hover:shadow-md'
                    }`}
                    style={{
                      borderColor: action.completed ? '#E8E8E8' : config.color + '40'
                    }}
                  >
                    <div className="flex items-start gap-3">
                      {/* Checkbox */}
                      <button
                        onClick={() => toggleAction(action.id)}
                        className="mt-0.5 focus:outline-none focus:ring-2 focus:ring-primary rounded"
                      >
                        {action.completed ? (
                          <motion.div
                            initial={{ scale: 0.8 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                          >
                            <CheckCircle2 
                              className="w-5 h-5" 
                              style={{ color: config.color }}
                            />
                          </motion.div>
                        ) : (
                          <Circle className="w-5 h-5 text-muted-foreground" />
                        )}
                      </button>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <h4 className={action.completed ? 'line-through' : ''}>
                            {action.title}
                          </h4>
                          <Badge 
                            variant="secondary" 
                            className="shrink-0 text-xs gap-1"
                            style={{ 
                              backgroundColor: config.bgColor,
                              color: config.color,
                              borderColor: config.color + '40'
                            }}
                          >
                            {config.icon}
                            {config.label}
                          </Badge>
                        </div>

                        <p className={`text-sm text-muted-foreground mb-3 ${
                          action.completed ? 'line-through' : ''
                        }`}>
                          {action.description}
                        </p>

                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Target className="w-3 h-3" />
                            {action.section}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {action.estimatedTime}
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {filteredActions.length === 0 && (
              <div className="text-center py-12">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-3" style={{ color: '#6BA3D1' }} />
                <h4 className="mb-2">All done!</h4>
                <p className="text-sm text-muted-foreground">
                  {filter === 'done' 
                    ? "You haven't completed any actions yet. Start checking them off!"
                    : "You've completed everything in this category! 🎉"
                  }
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        {completedCount > 0 && completedCount === totalActions && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 border-t text-center"
            style={{ backgroundColor: '#6BA3D110' }}
          >
            <div className="flex items-center justify-center gap-2 mb-1">
              <Sparkles className="w-5 h-5" style={{ color: '#6BA3D1' }} />
              <h4 style={{ color: '#6BA3D1' }}>Congratulations!</h4>
            </div>
            <p className="text-sm text-muted-foreground">
              You've completed all actions! Keep up the momentum! 🚀
            </p>
          </motion.div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Default actions data
const defaultActions: ActionItem[] = [
  // SECTION 1: Main Problem | First Advice
  {
    id: 'action-1-1',
    title: 'Create 3 experimental videos (different topics)',
    description: 'Post three 15-30 second videos on different subtopics within your interests to see what resonates',
    section: 'Section 1: Main Problem',
    sectionNumber: 1,
    priority: 'quick-win',
    estimatedTime: '1 hour',
    completed: false
  },
  {
    id: 'action-1-2',
    title: 'Set up content energy tracker',
    description: 'Rate 1-10 how energized vs. drained you felt after creating each piece this week',
    section: 'Section 1: Main Problem',
    sectionNumber: 1,
    priority: 'quick-win',
    estimatedTime: '10 mins',
    completed: false
  },
  {
    id: 'action-1-3',
    title: 'Track audience questions for 7 days',
    description: 'Use notes app to record every question people ask you—these reveal what you\'re naturally seen as expert in',
    section: 'Section 1: Main Problem',
    sectionNumber: 1,
    priority: 'fill-in',
    estimatedTime: '15 mins/day',
    completed: false
  },

  // SECTION 2: Imperfectionism | Execution
  {
    id: 'action-2-1',
    title: 'Post one drafted video TODAY',
    description: 'Choose one of your drafted videos, spend max 10 minutes on it, and post it right now',
    section: 'Section 2: Execution',
    sectionNumber: 2,
    priority: 'quick-win',
    estimatedTime: '10 mins',
    completed: false
  },
  {
    id: 'action-2-2',
    title: 'Create "good enough" checklist',
    description: 'Define your 3 objective criteria for shipping content (e.g., clear audio, one valuable takeaway, authentic energy)',
    section: 'Section 2: Execution',
    sectionNumber: 2,
    priority: 'quick-win',
    estimatedTime: '15 mins',
    completed: false
  },
  {
    id: 'action-2-3',
    title: 'Do 3x "20-minute content sprints" this week',
    description: 'Set timer for 20 mins, create content start to finish, must post within 5 minutes when timer ends',
    section: 'Section 2: Execution',
    sectionNumber: 2,
    priority: 'major',
    estimatedTime: '20 mins each',
    completed: false
  },

  // SECTION 3: Niche | Focus Discovery
  {
    id: 'action-3-1',
    title: 'Write your one-sentence positioning',
    description: 'Complete: "I help [specific audience] who struggle with [problem] achieve [outcome]"',
    section: 'Section 3: Niche',
    sectionNumber: 3,
    priority: 'quick-win',
    estimatedTime: '20 mins',
    completed: false
  },
  {
    id: 'action-3-2',
    title: 'Audit last 20 posts by audience',
    description: 'Delete or archive anything that doesn\'t serve your newly defined niche',
    section: 'Section 3: Niche',
    sectionNumber: 3,
    priority: 'major',
    estimatedTime: '45 mins',
    completed: false
  },
  {
    id: 'action-3-3',
    title: 'Create 7-day niche-specific content series',
    description: 'Design a weekly series specifically for your target audience (e.g., "7 productivity systems for creative brains")',
    section: 'Section 3: Niche',
    sectionNumber: 3,
    priority: 'major',
    estimatedTime: '2 hours',
    completed: false
  },

  // SECTION 4: Personal Brand Development
  {
    id: 'action-4-1',
    title: 'Write your brand story document',
    description: 'Document your journey, three core values, and the transformation you help people achieve',
    section: 'Section 4: Brand',
    sectionNumber: 4,
    priority: 'major',
    estimatedTime: '1 hour',
    completed: false
  },
  {
    id: 'action-4-2',
    title: 'Design 3 content templates',
    description: 'Create simple templates in Canva with your brand colors and fonts for consistent visual identity',
    section: 'Section 4: Brand',
    sectionNumber: 4,
    priority: 'major',
    estimatedTime: '1 hour',
    completed: false
  },
  {
    id: 'action-4-3',
    title: 'Film "this is me" video',
    description: 'Create 60-second video sharing your story and pin it to your profile',
    section: 'Section 4: Brand',
    sectionNumber: 4,
    priority: 'fill-in',
    estimatedTime: '30 mins',
    completed: false
  },

  // SECTION 5: Marketing Strategy
  {
    id: 'action-5-1',
    title: 'Implement "10-10-10 rule" before posting',
    description: '10 mins engaging with others, 10 mins researching hashtags, 10 mins planning repurposing',
    section: 'Section 5: Marketing',
    sectionNumber: 5,
    priority: 'quick-win',
    estimatedTime: '30 mins',
    completed: false
  },
  {
    id: 'action-5-2',
    title: 'Join 3 niche communities',
    description: 'Find Discord servers, Facebook groups, or Reddit communities where your audience hangs out',
    section: 'Section 5: Marketing',
    sectionNumber: 5,
    priority: 'fill-in',
    estimatedTime: '30 mins',
    completed: false
  },
  {
    id: 'action-5-3',
    title: 'Reach out to 5 creators for collaboration',
    description: 'Message creators in your niche with genuine compliments and collaboration ideas',
    section: 'Section 5: Marketing',
    sectionNumber: 5,
    priority: 'major',
    estimatedTime: '1 hour',
    completed: false
  },
  {
    id: 'action-5-4',
    title: 'Set up analytics tracking sheet',
    description: 'Create simple spreadsheet to track posting time, engagement rate, best hashtags, and content types',
    section: 'Section 5: Marketing',
    sectionNumber: 5,
    priority: 'fill-in',
    estimatedTime: '30 mins',
    completed: false
  },

  // SECTION 6: Platform Organization & Systems
  {
    id: 'action-6-1',
    title: 'Set up Notion/Trello board',
    description: 'Create four columns: Content Ideas, In Production, Ready to Post, Published',
    section: 'Section 6: Systems',
    sectionNumber: 6,
    priority: 'quick-win',
    estimatedTime: '20 mins',
    completed: false
  },
  {
    id: 'action-6-2',
    title: 'Build 30-day content bank',
    description: 'Brainstorm 30 content ideas and add them to your Ideas column',
    section: 'Section 6: Systems',
    sectionNumber: 6,
    priority: 'major',
    estimatedTime: '2 hours',
    completed: false
  },
  {
    id: 'action-6-3',
    title: 'Batch create this Sunday',
    description: 'Block 90 minutes to film 3-4 pieces back-to-back, then 30 mins Monday to edit',
    section: 'Section 6: Systems',
    sectionNumber: 6,
    priority: 'major',
    estimatedTime: '2 hours',
    completed: false
  },
  {
    id: 'action-6-4',
    title: 'Create content creation kit',
    description: 'Google Doc with go-to hooks, caption templates, hashtag sets, and posting checklist',
    section: 'Section 6: Systems',
    sectionNumber: 6,
    priority: 'fill-in',
    estimatedTime: '45 mins',
    completed: false
  },

  // SECTION 7: Mental Health & Sustainability
  {
    id: 'action-7-1',
    title: 'Set up "analytics blackout windows"',
    description: 'Only check stats twice per week (Sunday & Wednesday) for exactly 15 minutes',
    section: 'Section 7: Mental Health',
    sectionNumber: 7,
    priority: 'quick-win',
    estimatedTime: '5 mins setup',
    completed: false
  },
  {
    id: 'action-7-2',
    title: 'Schedule "no-phone hours" daily',
    description: 'Pick 2-3 hours where phone is in another room and you\'re completely offline',
    section: 'Section 7: Mental Health',
    sectionNumber: 7,
    priority: 'quick-win',
    estimatedTime: 'Ongoing',
    completed: false
  },
  {
    id: 'action-7-3',
    title: 'Find creator accountability partners',
    description: 'Connect with 2-3 creators at similar stages for weekly check-ins and support',
    section: 'Section 7: Mental Health',
    sectionNumber: 7,
    priority: 'fill-in',
    estimatedTime: '1 hour',
    completed: false
  },

  // SECTION 8: Advanced Marketing Types
  {
    id: 'action-8-1',
    title: 'Create success swipe file',
    description: 'Analyze top 10 posts from 5 successful creators in your niche, document patterns',
    section: 'Section 8: Advanced Marketing',
    sectionNumber: 8,
    priority: 'major',
    estimatedTime: '2 hours',
    completed: false
  },
  {
    id: 'action-8-2',
    title: 'Test strategic trend participation',
    description: 'Create your unique spin on one trending format adapted to your niche',
    section: 'Section 8: Advanced Marketing',
    sectionNumber: 8,
    priority: 'fill-in',
    estimatedTime: '45 mins',
    completed: false
  },
  {
    id: 'action-8-3',
    title: 'Study one viral post daily for 30 days',
    description: 'Screenshot, analyze why it went viral, brainstorm how to adapt to your content',
    section: 'Section 8: Advanced Marketing',
    sectionNumber: 8,
    priority: 'fill-in',
    estimatedTime: '15 mins/day',
    completed: false
  }
];
