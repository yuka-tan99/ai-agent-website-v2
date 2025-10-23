import { motion } from 'motion/react';
import { ArrowLeft, Sparkles, Zap, Rocket, Star, Heart, TrendingUp, Send } from 'lucide-react';
import { Button } from './ui/button';
import { BecomeFamousLogo } from './BecomeFamousLogo';
import { useState } from 'react';

interface WhatsNewPageProps {
  onBack: () => void;
}

interface Update {
  id: number;
  version: string;
  date: string;
  title: string;
  description: string;
  items: {
    type: 'new' | 'improved' | 'fixed';
    text: string;
  }[];
  icon: React.ReactNode;
  gradient: string;
}

const updates: Update[] = [
  {
    id: 1,
    version: "2.1.0",
    date: "January 20, 2025",
    title: "Enhanced AI Mentor Intelligence",
    description: "Major upgrades to our AI Mentor to provide even more personalized and context-aware guidance.",
    items: [
      { type: 'new', text: 'AI Mentor now remembers your past conversations for better context' },
      { type: 'new', text: 'Smart content analysis - upload screenshots for instant feedback' },
      { type: 'improved', text: 'Faster response times and more detailed recommendations' },
      { type: 'improved', text: 'Better understanding of platform-specific strategies' }
    ],
    icon: <Sparkles className="w-5 h-5" />,
    gradient: 'linear-gradient(135deg, #9E5DAB 0%, #D1A5DD 100%)'
  },
  {
    id: 2,
    version: "2.0.5",
    date: "January 15, 2025",
    title: "New Analytics Dashboard Features",
    description: "Track your progress with enhanced visualizations and deeper insights into your growth metrics.",
    items: [
      { type: 'new', text: 'Weekly progress reports delivered to your email' },
      { type: 'new', text: 'Competitor benchmarking to see how you stack up' },
      { type: 'improved', text: 'More granular Fame Score breakdown by category' },
      { type: 'fixed', text: 'Chart rendering issues on mobile devices' }
    ],
    icon: <TrendingUp className="w-5 h-5" />,
    gradient: 'linear-gradient(135deg, #B481C0 0%, #EBD7DC 100%)'
  },
  {
    id: 3,
    version: "2.0.0",
    date: "January 8, 2025",
    title: "Introducing the Personalized Report 2.0",
    description: "Complete redesign of our flagship product with 8 comprehensive sections and advanced learning modules.",
    items: [
      { type: 'new', text: 'Advanced Learning Modules with in-depth strategies' },
      { type: 'new', text: 'Personalized tips section based on your onboarding responses' },
      { type: 'new', text: 'Case studies and expert resources for each section' },
      { type: 'improved', text: 'More detailed action priority matrix' },
      { type: 'improved', text: 'Enhanced visual design with brand-consistent styling' }
    ],
    icon: <Rocket className="w-5 h-5" />,
    gradient: 'linear-gradient(135deg, #D1A5DD 0%, #8FD9FB 100%)'
  },
  {
    id: 4,
    version: "1.9.0",
    date: "December 28, 2024",
    title: "Community Features & Referral Program",
    description: "Connect with other creators and earn rewards by sharing BecomeFamous.AI with your network.",
    items: [
      { type: 'new', text: 'Referral program - earn free months of AI Mentor' },
      { type: 'new', text: 'Creator community Discord server access' },
      { type: 'new', text: 'Success stories showcase on your account page' },
      { type: 'improved', text: 'Enhanced account dashboard with usage statistics' }
    ],
    icon: <Heart className="w-5 h-5" />,
    gradient: 'linear-gradient(135deg, #8FD9FB 0%, #9E5DAB 100%)'
  },
  {
    id: 5,
    version: "1.8.5",
    date: "December 15, 2024",
    title: "Platform Optimization & Bug Fixes",
    description: "Performance improvements and quality of life updates across the platform.",
    items: [
      { type: 'improved', text: '40% faster page load times across the board' },
      { type: 'improved', text: 'Better mobile responsiveness for all pages' },
      { type: 'fixed', text: 'Onboarding flow not saving progress on page refresh' },
      { type: 'fixed', text: 'Newsletter subscription email validation issues' },
      { type: 'fixed', text: 'Dashboard section cards not expanding on some browsers' }
    ],
    icon: <Zap className="w-5 h-5" />,
    gradient: 'linear-gradient(135deg, #EBD7DC 0%, #B481C0 100%)'
  },
  {
    id: 6,
    version: "1.8.0",
    date: "December 1, 2024",
    title: "1:1 Expert Sessions Launch",
    description: "Book personalized coaching sessions with industry experts who understand your niche.",
    items: [
      { type: 'new', text: 'Direct booking system for 1:1 Expert Sessions' },
      { type: 'new', text: 'Expert matching based on your niche and goals' },
      { type: 'new', text: 'Post-session action plan and summary notes' },
      { type: 'new', text: 'Integrated calendar scheduling with email confirmations' }
    ],
    icon: <Star className="w-5 h-5" />,
    gradient: 'linear-gradient(135deg, #9E5DAB 0%, #8FD9FB 100%)'
  }
];

const typeConfig = {
  new: {
    label: 'New',
    color: '#9E5DAB',
    bg: '#9E5DAB15'
  },
  improved: {
    label: 'Improved',
    color: '#8FD9FB',
    bg: '#8FD9FB15'
  },
  fixed: {
    label: 'Fixed',
    color: '#B481C0',
    bg: '#B481C015'
  }
};

export function WhatsNewPage({ onBack }: WhatsNewPageProps) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [isFocused, setIsFocused] = useState(false);

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateEmail(email)) {
      // Simulate successful subscription
      console.log('Newsletter subscription:', email);
      setStatus('success');
      setEmail('');
      
      // Reset status after 3 seconds
      setTimeout(() => {
        setStatus('idle');
      }, 3000);
    } else {
      setStatus('error');
      setTimeout(() => {
        setStatus('idle');
      }, 2000);
    }
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Floating Background Orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <motion.div
          animate={{
            x: [0, 100, 0],
            y: [0, -100, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute top-20 left-10 w-96 h-96 rounded-full opacity-20 blur-3xl"
          style={{ background: 'linear-gradient(135deg, #9E5DAB 0%, #D1A5DD 100%)' }}
        />
        <motion.div
          animate={{
            x: [0, -100, 0],
            y: [0, 100, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute bottom-20 right-10 w-96 h-96 rounded-full opacity-20 blur-3xl"
          style={{ background: 'linear-gradient(135deg, #EBD7DC 0%, #8FD9FB 100%)' }}
        />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md border-b border-border/50 bg-background/80">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Button 
            variant="ghost" 
            onClick={onBack}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          
          <BecomeFamousLogo size="sm" />
          
          <div className="w-20" /> {/* Spacer for centering */}
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-5xl mx-auto px-6 py-12">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <motion.div
            animate={{
              backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
            }}
            transition={{
              duration: 5,
              repeat: Infinity,
              ease: "linear"
            }}
            className="inline-block mb-4"
            style={{ 
              background: 'linear-gradient(90deg, #9E5DAB 0%, #D1A5DD 50%, #9E5DAB 100%)',
              backgroundSize: '200% 100%',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            <h1>What&apos;s New</h1>
          </motion.div>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Stay up to date with the latest features, improvements, and updates to BecomeFamous.AI
          </p>
        </motion.div>

        {/* Timeline */}
        <div className="relative">
          {/* Timeline Line */}
          <div 
            className="absolute left-8 top-0 bottom-0 w-0.5"
            style={{ background: 'linear-gradient(to bottom, #9E5DAB, #D1A5DD, #9E5DAB)' }}
          />

          <div className="space-y-12">
            {updates.map((update, index) => (
              <motion.div
                key={update.id}
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.15, duration: 0.6 }}
                className="relative pl-20"
              >
                {/* Timeline Icon */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: index * 0.15 + 0.3, type: "spring", stiffness: 200 }}
                  className="absolute left-0 w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-lg"
                  style={{ background: update.gradient }}
                >
                  {update.icon}
                </motion.div>

                {/* Content Card */}
                <div className="rounded-2xl border border-border/50 overflow-hidden bg-card/50 backdrop-blur-sm hover:shadow-xl transition-shadow">
                  {/* Header */}
                  <div 
                    className="p-6 relative overflow-hidden"
                    style={{ background: `${update.gradient}15` }}
                  >
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <span 
                            className="px-3 py-1 rounded-full text-xs"
                            style={{ 
                              background: update.gradient,
                              color: 'white'
                            }}
                          >
                            v{update.version}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {update.date}
                          </span>
                        </div>
                        <h2 className="mb-2">{update.title}</h2>
                        <p className="text-sm text-muted-foreground">
                          {update.description}
                        </p>
                      </div>
                    </div>

                    {/* Sparkle Animation */}
                    <motion.div
                      animate={{
                        scale: [0, 1, 0],
                        opacity: [0, 1, 0],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        delay: index * 0.3,
                      }}
                      className="absolute top-4 right-4 w-2 h-2 rounded-full"
                      style={{ background: update.gradient }}
                    />
                  </div>

                  {/* Items List */}
                  <div className="p-6 space-y-3">
                    {update.items.map((item, itemIndex) => (
                      <motion.div
                        key={itemIndex}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.15 + itemIndex * 0.05 }}
                        className="flex items-start gap-3"
                      >
                        <span
                          className="px-2 py-0.5 rounded text-xs flex-shrink-0 mt-0.5"
                          style={{
                            color: typeConfig[item.type].color,
                            background: typeConfig[item.type].bg
                          }}
                        >
                          {typeConfig[item.type].label}
                        </span>
                        <p className="text-sm text-muted-foreground flex-1">
                          {item.text}
                        </p>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Subscribe CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
          className="mt-16 p-8 rounded-2xl text-center"
          style={{ background: 'linear-gradient(135deg, #EBD7DC20 0%, #9E5DAB10 100%)' }}
        >
          <h2 className="mb-3">Never miss an update</h2>
          <p className="text-muted-foreground mb-6">
            Subscribe to our newsletter to get notified about new features and improvements
          </p>
          
          {/* Newsletter Subscription Form */}
          <form onSubmit={handleSubscribe} className="max-w-md mx-auto relative">
            <motion.div
              animate={{
                boxShadow: isFocused 
                  ? '0 0 0 3px rgba(158, 93, 171, 0.1)' 
                  : '0 4px 6px rgba(0, 0, 0, 0.05)',
              }}
              transition={{ duration: 0.2 }}
              className="relative rounded-full"
              style={{
                background: 'linear-gradient(white, white) padding-box, linear-gradient(135deg, #9E5DAB, #D1A5DD) border-box',
                backgroundOrigin: 'border-box',
                backgroundClip: 'padding-box, border-box',
                border: '2px solid transparent',
              }}
            >
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder="Enter your email"
                className="w-full px-6 py-4 pr-14 rounded-full bg-white focus:outline-none transition-all"
                style={{ color: '#2d2d2d' }}
              />
              
              <motion.button
                type="submit"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center"
                style={{ backgroundColor: '#9E5DAB' }}
              >
                <Send className="w-4 h-4 text-white" />
              </motion.button>
            </motion.div>

            {/* Success/Error Messages */}
            {status === 'success' && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="absolute -bottom-8 left-0 right-0 text-center text-sm"
                style={{ color: '#9E5DAB' }}
              >
                ✨ Thanks for subscribing!
              </motion.div>
            )}
            
            {status === 'error' && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="absolute -bottom-8 left-0 right-0 text-center text-sm text-destructive"
              >
                Please enter a valid email
              </motion.div>
            )}
          </form>
        </motion.div>
      </main>
    </div>
  );
}
