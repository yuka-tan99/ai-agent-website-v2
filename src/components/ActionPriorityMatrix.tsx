import { useState } from 'react';
import { motion } from 'motion/react';
import { Card } from './ui/card';
import { ArrowRight, Zap, Clock, AlertTriangle } from 'lucide-react';
import { Button } from './ui/button';
import { ActionTrackerDialog } from './ActionTrackerDialog';

interface ActionItem {
  title: string;
  impact: 'high' | 'medium' | 'low';
  effort: 'high' | 'medium' | 'low';
  section: string;
}

export function ActionPriorityMatrix() {
  const [trackerOpen, setTrackerOpen] = useState(false);
  const actions: ActionItem[] = [
    { title: 'Create first TikTok today', impact: 'high', effort: 'low', section: 'Section 1' },
    { title: 'Define content calendar', impact: 'high', effort: 'medium', section: 'Section 6' },
    { title: 'Set up idea bank', impact: 'medium', effort: 'low', section: 'Section 6' },
    { title: 'Write brand story', impact: 'high', effort: 'medium', section: 'Section 4' },
    { title: 'Study 3 creators in niche', impact: 'medium', effort: 'medium', section: 'Section 8' },
    { title: 'Set posting boundaries', impact: 'medium', effort: 'low', section: 'Section 7' }
  ];

  // Categorize actions
  const quickWins = actions.filter(a => a.impact === 'high' && a.effort === 'low');
  const majorProjects = actions.filter(a => a.impact === 'high' && (a.effort === 'medium' || a.effort === 'high'));
  const fillIns = actions.filter(a => a.impact !== 'high' && a.effort === 'low');

  return (
    <Card className="p-6">
      <h3 className="mb-2">Action Priority Matrix</h3>
      <p className="text-sm text-muted-foreground mb-6">Focus on quick wins first for immediate momentum</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Quick Wins */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="p-4 rounded-xl border-2"
          style={{ 
            backgroundColor: '#6BA3D115', 
            borderColor: '#6BA3D160'
          }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-5 h-5" style={{ color: '#6BA3D1' }} />
            <h4 style={{ color: '#6BA3D1' }}>Quick Wins</h4>
          </div>
          <p className="text-sm mb-4" style={{ color: '#6BA3D1B0' }}>High Impact, Low Effort</p>
          <div className="space-y-3">
            {quickWins.map((action, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="p-3 bg-white dark:bg-card rounded-lg"
              >
                <p className="text-sm mb-1">{action.title}</p>
                <p className="text-xs text-muted-foreground">{action.section}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Major Projects */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="p-4 rounded-xl border-2"
          style={{ 
            backgroundColor: '#9E5DAB15', 
            borderColor: '#9E5DAB60'
          }}
        >
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5" style={{ color: '#9E5DAB' }} />
            <h4 style={{ color: '#9E5DAB' }}>Major Projects</h4>
          </div>
          <p className="text-sm mb-4" style={{ color: '#9E5DABB0' }}>High Impact, More Effort</p>
          <div className="space-y-3">
            {majorProjects.map((action, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + idx * 0.1 }}
                className="p-3 bg-white dark:bg-card rounded-lg"
              >
                <p className="text-sm mb-1">{action.title}</p>
                <p className="text-xs text-muted-foreground">{action.section}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Fill-ins */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="p-4 rounded-xl border-2"
          style={{ 
            backgroundColor: '#EBD7DC40', 
            borderColor: '#D1A5DD60'
          }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5" style={{ color: '#B481C0' }} />
            <h4 style={{ color: '#9E5DAB' }}>Fill-ins</h4>
          </div>
          <p className="text-sm mb-4" style={{ color: '#9E5DABB0' }}>Do when you have time</p>
          <div className="space-y-3">
            {fillIns.map((action, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + idx * 0.1 }}
                className="p-3 bg-white dark:bg-card rounded-lg"
              >
                <p className="text-sm mb-1">{action.title}</p>
                <p className="text-xs text-muted-foreground">{action.section}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      <div className="mt-6 pt-6 border-t flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Start with Quick Wins to build momentum</p>
        <Button size="sm" className="gap-2" onClick={() => setTrackerOpen(true)}>
          View All Actions
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Action Tracker Dialog */}
      <ActionTrackerDialog open={trackerOpen} onOpenChange={setTrackerOpen} />
    </Card>
  );
}
