'use client';

import { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import { Progress } from './ui/progress';
import { BecomeFamousLogo } from './BecomeFamousLogo';

type PreparingStatus = 'idle' | 'pending' | 'in-progress' | 'complete';

interface PreparingDashboardProps {
  onComplete: () => void;
  progress: number;
  status: PreparingStatus;
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

export function PreparingDashboard({ onComplete, progress, status }: PreparingDashboardProps) {
  const [animatedProgress, setAnimatedProgress] = useState(progress);
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    // Message rotation
    const messageInterval = setInterval(() => {
      setMessageIndex(prev => (prev + 1) % motivationalMessages.length);
    }, 400);

    return () => {
      clearInterval(messageInterval);
    };
  }, []);

  useEffect(() => {
    const clamped = Math.max(0, Math.min(progress, 100));
    setAnimatedProgress(clamped);
  }, [progress]);

  useEffect(() => {
    if (status !== 'complete') return;
    const timeout = window.setTimeout(() => {
      onComplete();
    }, 600);
    return () => {
      window.clearTimeout(timeout);
    };
  }, [status, onComplete]);

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
          <Progress value={animatedProgress} className="h-3 transition-all duration-500" />
        </div>

        {/* Percentage */}
        <p className="text-muted-foreground">
          {Math.round(animatedProgress)}%
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
