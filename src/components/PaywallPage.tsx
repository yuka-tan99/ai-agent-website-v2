import { Button } from './ui/button';
import { ChevronLeft, Lock, Sparkles, TrendingUp, Target } from 'lucide-react';
import { BecomeFamousLogo } from './BecomeFamousLogo';

interface PaywallPageProps {
  onUnlock: () => void;
  onBack: () => void;
  isProcessing?: boolean;
  errorMessage?: string | null;
}

export function PaywallPage({ onUnlock, onBack, isProcessing = false, errorMessage }: PaywallPageProps) {
  return (
    <div className="min-h-screen bg-white relative overflow-hidden">
      {/* Blurred Background Preview */}
      <div className="absolute inset-0 blur-xl opacity-30 pointer-events-none">
        <div className="max-w-7xl mx-auto p-8">
          {/* Simulated dashboard content */}
          <div className="space-y-6">
            <div className="h-20 bg-gray-200 rounded-xl" />
            <div className="h-48 bg-gray-200 rounded-xl" />
            <div className="grid grid-cols-2 gap-6">
              <div className="h-64 bg-gray-200 rounded-xl" />
              <div className="h-64 bg-gray-200 rounded-xl" />
            </div>
            <div className="h-96 bg-gray-200 rounded-xl" />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-6 py-12">
        {/* Header with Logo and Back Button */}
        <div className="absolute top-8 left-0 right-0 flex items-center justify-between px-8">
          <Button
            onClick={onBack}
            variant="outline"
            size="icon"
            className="rounded-full w-12 h-12"
          >
            <ChevronLeft className="w-6 h-6" />
          </Button>
          <BecomeFamousLogo size="md" />
          <div className="w-12" /> {/* Spacer for centering */}
        </div>

        {/* Paywall Card */}
        <div className="max-w-2xl w-full bg-white rounded-3xl shadow-2xl p-8 md:p-12 border-2" style={{ borderColor: '#9E5DAB' }}>
          {/* Lock Icon */}
          <div className="flex justify-center mb-6">
            <div 
              className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{ backgroundColor: '#EBD7DC' }}
            >
              <Lock className="w-10 h-10" style={{ color: '#9E5DAB' }} />
            </div>
          </div>

          {/* Headline */}
          <div className="text-center mb-8">
            <h2 className="mb-4">Your Personalized Report is Ready!</h2>
            <p className="text-muted-foreground">
              We've analyzed your responses and created a comprehensive growth plan tailored specifically for you
            </p>
          </div>

          {/* Features Preview */}
          <div className="space-y-4 mb-8">
            <div className="flex items-start gap-4 p-4 rounded-xl" style={{ backgroundColor: '#EBD7DC20' }}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#9E5DAB' }}>
                <Target className="w-5 h-5 text-white" />
              </div>
              <div>
                <h4 className="mb-1">9 Personalized Action Sections</h4>
                <p className="text-sm text-muted-foreground">
                  From identifying your main problem to advanced marketing strategies
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 rounded-xl" style={{ backgroundColor: '#EBD7DC20' }}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#9E5DAB' }}>
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h4 className="mb-1">Fame Score & Growth Projections</h4>
                <p className="text-sm text-muted-foreground">
                  Track your progress with real-time analytics and benchmarks
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 rounded-xl" style={{ backgroundColor: '#EBD7DC20' }}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#9E5DAB' }}>
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <h4 className="mb-1">Priority Action Matrix</h4>
                <p className="text-sm text-muted-foreground">
                  Know exactly what to focus on for maximum impact
                </p>
              </div>
            </div>
          </div>

          {/* Motivational Copy */}
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-6 mb-8 border" style={{ borderColor: '#EBD7DC' }}>
            <p className="text-center">
              <span style={{ color: '#9E5DAB' }}>Your path to fame starts here.</span> Join thousands of creators who've transformed their social media presence with data-driven insights and personalized strategies.
            </p>
          </div>

          {/* CTA Button */}
          <div className="text-center">
            <Button
              onClick={onUnlock}
              disabled={isProcessing}
              className="px-12 py-6 rounded-full w-full md:w-auto"
              style={{ backgroundColor: '#9E5DAB' }}
            >
              {isProcessing ? 'Redirecting...' : 'Unlock Your Dashboard'}
            </Button>
            {errorMessage && (
              <p className="text-sm text-destructive mt-3">
                {errorMessage}
              </p>
            )}
            <p className="text-sm text-muted-foreground mt-4">
              One-time payment • Lifetime access • 30-day money-back guarantee
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
