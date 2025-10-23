import { motion } from 'motion/react';
import { ArrowLeft, Plus, Minus } from 'lucide-react';
import { Button } from './ui/button';
import { BecomeFamousLogo } from './BecomeFamousLogo';
import { useState } from 'react';

interface FAQPageProps {
  onBack: () => void;
  onNavigateToSupport?: () => void;
}

interface FAQ {
  id: number;
  question: string;
  answer: string;
  category: string;
}

const faqs: FAQ[] = [
  {
    id: 1,
    question: "What is BecomeFamous.AI?",
    answer: "BecomeFamous.AI is your personal AI-powered marketing mentor that provides personalized analysis of your content strategy and gives you actionable insights to grow your social media presence. We analyze your unique situation and deliver a customized roadmap with specific steps tailored to your goals, niche, and current challenges.",
    category: "General"
  },
  {
    id: 2,
    question: "How does the Personalized Report work?",
    answer: "After completing our comprehensive 20-question onboarding flow, our AI analyzes your responses to understand your current situation, goals, challenges, and opportunities. We then generate a detailed report covering 8 key areas: niche discovery, execution strategy, focus development, personal branding, marketing tactics, organizational systems, mental health sustainability, and advanced growth strategies. Each section includes personalized insights and actionable tips specific to your situation.",
    category: "Products"
  },
  {
    id: 3,
    question: "What's included in the AI Mentor subscription?",
    answer: "The AI Mentor gives you 24/7 access to personalized guidance and support. You can ask questions about your content strategy, get feedback on specific posts, receive advice on handling challenges, and get strategic recommendations anytime you need them. It's like having a marketing expert available whenever you need help, powered by AI that understands your specific situation and goals.",
    category: "Products"
  },
  {
    id: 4,
    question: "Do I need to purchase a report to use the AI Mentor?",
    answer: "While the AI Mentor is available as a standalone subscription at $6/month, purchasing a Personalized Report ($39) gives you 3 months of AI Mentor access for free. This is the best value option because the AI Mentor will have deep context from your report to provide even more personalized guidance.",
    category: "Pricing"
  },
  {
    id: 5,
    question: "What happens during a 1:1 Expert Session?",
    answer: "During your 60-minute 1:1 Expert Session, you'll work directly with an industry expert who specializes in your niche. They'll review your content, analyze your strategy, identify specific opportunities, answer your questions, and create a customized action plan for your next 30-90 days. Sessions are conducted via video call and you'll receive a follow-up summary with key recommendations and next steps.",
    category: "Products"
  },
  {
    id: 6,
    question: "How quickly will I see results?",
    answer: "Most creators who implement our recommendations see noticeable improvements within 2-4 weeks. However, sustainable growth is a marathon, not a sprint. Our strategies focus on building strong foundations that compound over time. You'll start seeing early wins quickly (better content clarity, more consistent posting, improved engagement), while larger growth metrics (follower count, monetization) typically accelerate over 2-6 months of consistent implementation.",
    category: "Results"
  },
  {
    id: 7,
    question: "What platforms does BecomeFamous.AI support?",
    answer: "Our strategies and insights work across all major social media platforms including TikTok, Instagram, YouTube, Twitter/X, LinkedIn, and emerging platforms. While platform-specific tactics may vary, the core principles of content strategy, audience building, and personal branding apply universally. We provide platform-specific guidance where relevant in your personalized report.",
    category: "General"
  },
  {
    id: 8,
    question: "I'm a complete beginner. Is this for me?",
    answer: "Absolutely! BecomeFamous.AI is designed for creators at all stages, from complete beginners to those with existing audiences looking to scale. Our personalized approach means you get advice tailored to your current level. If you're just starting, we'll focus on fundamentals like finding your niche and creating your first content. If you're more advanced, we'll dive into growth optimization and monetization strategies.",
    category: "General"
  },
  {
    id: 9,
    question: "What if I'm not satisfied with my report?",
    answer: "We're confident you'll love your personalized report, but if you're not satisfied within 7 days of purchase, contact our support team and we'll issue a full refund, no questions asked. Your success is our priority, and we stand behind the quality of our analysis and recommendations.",
    category: "Pricing"
  },
  {
    id: 10,
    question: "How is this different from other creator courses?",
    answer: "Unlike generic courses that give everyone the same information, BecomeFamous.AI provides truly personalized analysis and recommendations based on YOUR specific situation, goals, challenges, and niche. You're not watching hours of generic videos—you're getting a customized strategic roadmap designed specifically for you. Plus, with the AI Mentor, you have ongoing support to answer your specific questions as they come up.",
    category: "General"
  },
  {
    id: 11,
    question: "Can I upgrade or downgrade my plan?",
    answer: "Yes! You can upgrade from the report to add AI Mentor access or book a 1:1 Expert Session anytime. AI Mentor subscriptions can be canceled anytime with no long-term commitment. If you purchase a Personalized Report, your 3 free months of AI Mentor will automatically activate, and you can choose to continue the subscription after that period.",
    category: "Pricing"
  },
  {
    id: 12,
    question: "How long does it take to receive my report?",
    answer: "Your personalized report is generated immediately after you complete the onboarding questionnaire and process payment. The entire experience from starting onboarding to accessing your full dashboard typically takes 20-30 minutes. You'll have instant access to your Fame Score, personalized insights, action plans, and analytics dashboard.",
    category: "Products"
  }
];

const categories = ["All", "General", "Products", "Pricing", "Results"];

export function FAQPage({ onBack, onNavigateToSupport }: FAQPageProps) {
  const [activeCategory, setActiveCategory] = useState("All");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const filteredFaqs = activeCategory === "All" 
    ? faqs 
    : faqs.filter(faq => faq.category === activeCategory);

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
      <main className="relative z-10 max-w-4xl mx-auto px-6 py-12">
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
            <h1>Frequently Asked Questions</h1>
          </motion.div>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Got questions? We've got answers. Find everything you need to know about BecomeFamous.AI
          </p>
        </motion.div>

        {/* Category Filter */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="flex flex-wrap justify-center gap-3 mb-12"
        >
          {categories.map((category, index) => (
            <motion.button
              key={category}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 + index * 0.05 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setActiveCategory(category)}
              className="px-6 py-2 rounded-full transition-all relative group"
              style={{
                background: activeCategory === category 
                  ? 'linear-gradient(135deg, #9E5DAB 0%, #D1A5DD 100%)'
                  : 'white',
                color: activeCategory === category ? 'white' : '#2d2d2d',
                border: activeCategory === category ? 'none' : '2px solid #E8E8E8'
              }}
            >
              <span className="relative z-10">{category}</span>
              {activeCategory !== category && (
                <motion.div
                  className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ background: 'linear-gradient(135deg, #9E5DAB10 0%, #D1A5DD10 100%)' }}
                />
              )}
            </motion.button>
          ))}
        </motion.div>

        {/* FAQ Accordion */}
        <div className="space-y-4">
          {filteredFaqs.map((faq, index) => (
            <motion.div
              key={faq.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + index * 0.05, duration: 0.4 }}
              className="rounded-2xl border border-border/50 overflow-hidden bg-card/50 backdrop-blur-sm"
            >
              <button
                onClick={() => setExpandedId(expandedId === faq.id ? null : faq.id)}
                className="w-full px-6 py-5 flex items-center justify-between gap-4 hover:bg-muted/50 transition-colors text-left"
              >
                <div className="flex-1">
                  <h3 className="text-base">{faq.question}</h3>
                </div>
                
                <motion.div
                  animate={{ rotate: expandedId === faq.id ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                  className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ 
                    background: expandedId === faq.id 
                      ? 'linear-gradient(135deg, #9E5DAB 0%, #D1A5DD 100%)' 
                      : '#F5F5F5'
                  }}
                >
                  {expandedId === faq.id ? (
                    <Minus className="w-4 h-4 text-white" />
                  ) : (
                    <Plus className="w-4 h-4" style={{ color: '#9E5DAB' }} />
                  )}
                </motion.div>
              </button>

              <motion.div
                initial={false}
                animate={{
                  height: expandedId === faq.id ? 'auto' : 0,
                  opacity: expandedId === faq.id ? 1 : 0
                }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="px-6 pb-5 pt-2">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              </motion.div>
            </motion.div>
          ))}
        </div>

        {/* Still Have Questions CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
          className="mt-16 p-8 rounded-2xl text-center"
          style={{ background: 'linear-gradient(135deg, #EBD7DC20 0%, #9E5DAB10 100%)' }}
        >
          <h2 className="mb-3">Still have questions?</h2>
          <p className="text-muted-foreground mb-6">
            We're here to help! Reach out to our support team and we'll get back to you within 24 hours.
          </p>
          <Button
            size="lg"
            className="rounded-full px-8"
            style={{ backgroundColor: '#9E5DAB' }}
            onClick={onNavigateToSupport}
          >
            Contact Support
          </Button>
        </motion.div>
      </main>
    </div>
  );
}
