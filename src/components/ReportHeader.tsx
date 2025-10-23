import { motion } from 'motion/react';
import { ArrowLeft, Sparkles, TrendingUp, Star } from 'lucide-react';
import { Button } from './ui/button';
import { Progress } from './ui/progress';

interface ReportHeaderProps {
  progress: number;
  onBackToAccount?: () => void;
}

export function ReportHeader({ progress, onBackToAccount }: ReportHeaderProps) {
  return (
    <div className="relative overflow-hidden rounded-3xl p-8 lg:p-12 mb-8" style={{ backgroundColor: '#EBD7DC30' }}>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Button 
          variant="outline" 
          size="icon" 
          className="rounded-full w-10 h-10 mb-6 hover:scale-105 transition-transform"
          style={{ borderColor: '#9E5DAB40' }}
          onClick={onBackToAccount}
        >
          <ArrowLeft className="w-5 h-5" style={{ color: '#9E5DAB' }} />
        </Button>

        <div className="text-center max-w-3xl mx-auto">
          {/* Floating icons */}
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, type: "spring" }}
            className="flex items-center justify-center gap-3 mb-4"
          >
            <motion.div
              animate={{ 
                y: [0, -10, 0],
                rotate: [0, 5, 0]
              }}
              transition={{ 
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <Sparkles className="w-8 h-8" style={{ color: '#D1A5DD' }} />
            </motion.div>
            <motion.div
              animate={{ 
                y: [0, -8, 0],
                rotate: [0, -5, 0]
              }}
              transition={{ 
                duration: 2.5,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 0.5
              }}
            >
              <Star className="w-7 h-7" style={{ color: '#9E5DAB' }} />
            </motion.div>
            <motion.div
              animate={{ 
                y: [0, -12, 0],
              }}
              transition={{ 
                duration: 2.8,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 0.2
              }}
            >
              <TrendingUp className="w-7 h-7" style={{ color: '#6BA3D1' }} />
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-3"
          >
            <h1 className="text-5xl lg:text-6xl inline-block pb-2" style={{ color: '#9E5DAB' }}>
              Your Growth Dashboard
            </h1>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mb-6"
          >
            <p className="text-xl lg:text-2xl text-foreground/80">
              Your path to <span style={{ color: '#B481C0' }}>social media fame</span> ✨
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-6"
          >
            <div className="flex items-center justify-between mb-2 text-sm text-muted-foreground">
              <span>Report Progress</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </motion.div>
        </div>
      </motion.div>

      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl -z-10" style={{ background: 'radial-gradient(circle, #9E5DAB20, #B481C020)' }} />
      <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full blur-3xl -z-10" style={{ background: 'radial-gradient(circle, #D1A5DD20, #EBD7DC20)' }} />
    </div>
  );
}
