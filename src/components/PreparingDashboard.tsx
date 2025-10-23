import { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import { Progress } from './ui/progress';
import { BecomeFamousLogo } from './BecomeFamousLogo';

interface PreparingDashboardProps {
  onComplete: () => void;
}

const motivationalMessages = [
  "Analyzing your responses...",
  "Identifying your unique strengths...",
  "Mapping your growth opportunities...",
  "Creating your personalized action plan...",
  "Calculating your Fame Score...",
  "Building your analytics dashboard...",
  "Preparing your strategic roadmap...",
  "Finalizing your custom report..."
];

export function PreparingDashboard({ onComplete }: PreparingDashboardProps) {
  const [progress, setProgress] = useState(0);
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    // Progress bar animation
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          setTimeout(() => {
            onComplete();
          }, 500);
          return 100;
        }
        return prev + 1;
      });
    }, 30); // 3 seconds total

    // Message rotation
    const messageInterval = setInterval(() => {
      setMessageIndex(prev => (prev + 1) % motivationalMessages.length);
    }, 400);

    return () => {
      clearInterval(progressInterval);
      clearInterval(messageInterval);
    };
  }, [onComplete]);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-6">
      <div className="max-w-2xl w-full text-center">
        {/* Logo */}
        <div className="flex justify-center mb-12">
          <BecomeFamousLogo size="lg" />
        </div>

        {/* Animated Icon */}
        <div className="flex justify-center mb-8">
          <div 
            className="w-24 h-24 rounded-full flex items-center justify-center animate-pulse"
            style={{ backgroundColor: '#EBD7DC' }}
          >
            <Sparkles className="w-12 h-12 animate-spin" style={{ color: '#9E5DAB' }} />
          </div>
        </div>

        {/* Headline */}
        <h2 className="mb-4">Preparing Your Dashboard</h2>
        
        {/* Motivational Message */}
        <p 
          className="mb-8 min-h-[2em] transition-opacity duration-300"
          style={{ color: '#9E5DAB' }}
        >
          {motivationalMessages[messageIndex]}
        </p>

        {/* Progress Bar */}
        <div className="mb-4">
          <Progress value={progress} className="h-3" />
        </div>

        {/* Percentage */}
        <p className="text-muted-foreground">
          {progress}%
        </p>

        {/* Additional Info */}
        <div className="mt-12 p-6 rounded-2xl" style={{ backgroundColor: '#EBD7DC20' }}>
          <p className="text-sm text-muted-foreground">
            We're creating a comprehensive report based on your unique situation. This will only take a moment...
          </p>
        </div>
      </div>
    </div>
  );
}
