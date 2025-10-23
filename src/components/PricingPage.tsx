import { motion } from 'motion/react';
import { Button } from './ui/button';
import { BecomeFamousLogo } from './BecomeFamousLogo';
import { Check, Sparkles, MessageSquare, Video, ArrowRight, Star, ChevronLeft } from 'lucide-react';

interface PricingPageProps {
  onBack: () => void;
  onGetStarted: () => void;
}

export function PricingPage({ onBack, onGetStarted }: PricingPageProps) {
  const pricingPlans = [
    {
      icon: <Sparkles className="w-8 h-8" />,
      name: "Personalized Report",
      price: "$39",
      period: "one-time",
      description: "Your complete growth roadmap with personalized insights",
      highlight: "Most Popular",
      color: "#9E5DAB",
      features: [
        "Comprehensive 8-section action plan",
        "Your personal Fame Score & analytics",
        "Custom growth projections",
        "Action priority matrix",
        "Platform readiness assessment",
        "Bonus: 3 months free AI Mentor access"
      ],
      cta: "Get Your Report",
      badge: "✨ Best Value"
    },
    {
      icon: <MessageSquare className="w-8 h-8" />,
      name: "AI Mentor",
      price: "$6",
      period: "per month",
      description: "24/7 AI-powered guidance for your creator journey",
      highlight: null,
      color: "#B481C0",
      features: [
        "Unlimited AI mentor conversations",
        "Instant answers to your questions",
        "Strategic content advice",
        "Growth strategy recommendations",
        "Weekly progress check-ins",
        "Cancel anytime"
      ],
      cta: "Start Free Trial",
      badge: null
    },
    {
      icon: <Video className="w-8 h-8" />,
      name: "1:1 Expert Session",
      price: "$150",
      period: "per session",
      description: "Personal coaching with industry experts",
      highlight: null,
      color: "#D1A5DD",
      features: [
        "60-minute expert consultation",
        "Personalized strategy session",
        "Industry-specific insights",
        "Direct feedback on your content",
        "Custom action plan",
        "Follow-up email summary"
      ],
      cta: "Book Session",
      badge: null
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-gray-50/30 to-white">
      {/* Animated Background Orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <motion.div
          animate={{
            x: [0, 80, 0],
            y: [0, -40, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute top-20 right-10 w-96 h-96 rounded-full opacity-5 blur-3xl"
          style={{ backgroundColor: '#9E5DAB' }}
        />
        <motion.div
          animate={{
            x: [0, -60, 0],
            y: [0, 50, 0],
          }}
          transition={{
            duration: 22,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute bottom-20 left-10 w-[400px] h-[400px] rounded-full opacity-5 blur-3xl"
          style={{ backgroundColor: '#B481C0' }}
        />
      </div>

      {/* Header */}
      <motion.header 
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 100, damping: 20 }}
        className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-border/50"
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-4 flex items-center justify-between">
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button
              onClick={onBack}
              variant="outline"
              size="icon"
              className="rounded-full w-12 h-12"
            >
              <ChevronLeft className="w-6 h-6" />
            </Button>
          </motion.div>
          
          <BecomeFamousLogo size="md" />
          
          <div className="w-12" /> {/* Spacer for centering */}
        </div>
      </motion.header>

      {/* Hero Section */}
      <section className="relative px-6 py-20 lg:py-28">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-6"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
              className="inline-block mb-6"
            >
              <span 
                className="px-5 py-2 rounded-full text-sm inline-flex items-center gap-2"
                style={{ backgroundColor: '#EBD7DC', color: '#9E5DAB' }}
              >
                <Star className="w-4 h-4" />
                Choose Your Path to Fame
              </span>
            </motion.div>

            <h1 
              className="mb-4"
              style={{ 
                fontSize: 'clamp(2rem, 5vw, 3.5rem)',
                lineHeight: '1.2',
                color: '#2d2d2d'
              }}
            >
              Simple, Transparent Pricing
            </h1>
            
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.8 }}
              className="text-muted-foreground max-w-2xl mx-auto"
              style={{ fontSize: 'clamp(1rem, 2vw, 1.25rem)' }}
            >
              Everything you need to become a successful content creator. Start with a personalized report, get ongoing support, or book expert guidance.
            </motion.p>
          </motion.div>

          {/* Special Offer Banner */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="max-w-3xl mx-auto mb-16"
          >
            <div 
              className="p-4 rounded-2xl border-2 text-center"
              style={{ 
                backgroundColor: '#EBD7DC20',
                borderColor: '#9E5DAB40'
              }}
            >
              <p className="flex items-center justify-center gap-2">
                <Sparkles className="w-5 h-5" style={{ color: '#9E5DAB' }} />
                <span style={{ color: '#9E5DAB' }}>
                  <span className="font-medium">Limited Offer:</span> Get 3 months of AI Mentor FREE when you purchase a Personalized Report
                </span>
                <Sparkles className="w-5 h-5" style={{ color: '#9E5DAB' }} />
              </p>
            </div>
          </motion.div>

          {/* Pricing Cards */}
          <div className="grid lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {pricingPlans.map((plan, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + index * 0.1, duration: 0.6 }}
                whileHover={{ 
                  y: -12,
                  transition: { duration: 0.3 }
                }}
                className="relative"
              >
                {/* Badge */}
                {plan.badge && (
                  <motion.div
                    initial={{ scale: 0, rotate: -12 }}
                    animate={{ scale: 1, rotate: -12 }}
                    transition={{ delay: 0.8 + index * 0.1, type: "spring", stiffness: 200 }}
                    className="absolute -top-4 -right-4 z-10 px-4 py-2 rounded-full shadow-lg"
                    style={{ 
                      backgroundColor: '#9E5DAB',
                      color: 'white'
                    }}
                  >
                    <span className="text-sm">{plan.badge}</span>
                  </motion.div>
                )}

                <div
                  className={`bg-white rounded-3xl p-8 border-2 h-full flex flex-col relative overflow-hidden group transition-all duration-300 ${
                    plan.highlight ? 'shadow-xl' : 'shadow-lg hover:shadow-xl'
                  }`}
                  style={{
                    borderColor: plan.highlight ? plan.color : '#E8E8E8'
                  }}
                >
                  {/* Hover gradient effect */}
                  <motion.div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    style={{
                      background: `linear-gradient(135deg, ${plan.color}05 0%, ${plan.color}10 100%)`
                    }}
                  />

                  <div className="relative z-10">
                    {/* Icon */}
                    <motion.div
                      whileHover={{ rotate: [0, -10, 10, -10, 0], scale: 1.1 }}
                      transition={{ duration: 0.5 }}
                      className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 shadow-sm"
                      style={{ backgroundColor: '#EBD7DC' }}
                    >
                      <div style={{ color: plan.color }}>
                        {plan.icon}
                      </div>
                    </motion.div>

                    {/* Plan Name */}
                    <h3 className="mb-2">{plan.name}</h3>
                    
                    {/* Price */}
                    <div className="mb-4">
                      <span 
                        className="inline-block"
                        style={{ 
                          fontSize: 'clamp(2.5rem, 5vw, 3.5rem)',
                          lineHeight: '1',
                          color: plan.color
                        }}
                      >
                        {plan.price}
                      </span>
                      <span className="text-muted-foreground ml-2">
                        {plan.period}
                      </span>
                    </div>

                    {/* Description */}
                    <p className="text-muted-foreground mb-8">
                      {plan.description}
                    </p>

                    {/* Features */}
                    <ul className="space-y-4 mb-8 flex-grow">
                      {plan.features.map((feature, i) => (
                        <motion.li
                          key={i}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.4 + index * 0.1 + i * 0.05 }}
                          className="flex items-start gap-3"
                        >
                          <motion.div
                            whileHover={{ scale: 1.2, rotate: 360 }}
                            transition={{ duration: 0.5 }}
                            className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                            style={{ backgroundColor: `${plan.color}20` }}
                          >
                            <Check className="w-3 h-3" style={{ color: plan.color }} />
                          </motion.div>
                          <span className="text-sm">{feature}</span>
                        </motion.li>
                      ))}
                    </ul>

                    {/* CTA Button */}
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Button
                        onClick={onGetStarted}
                        className="w-full rounded-full py-6 relative overflow-hidden group/btn shadow-md hover:shadow-lg transition-all"
                        style={{ 
                          backgroundColor: plan.color,
                        }}
                      >
                        <motion.div
                          className="absolute inset-0 bg-white/20"
                          initial={{ x: '-100%' }}
                          whileHover={{ x: '100%' }}
                          transition={{ duration: 0.5 }}
                        />
                        <span className="relative flex items-center justify-center gap-2">
                          {plan.cta}
                          <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                        </span>
                      </Button>
                    </motion.div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* FAQ or Additional Info */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.8 }}
            className="mt-20 max-w-3xl mx-auto text-center"
          >
            <div className="p-8 rounded-3xl" style={{ backgroundColor: '#EBD7DC20' }}>
              <h3 className="mb-4">Questions about pricing?</h3>
              <p className="text-muted-foreground mb-6">
                We're here to help you choose the right path for your creator journey. All plans come with our satisfaction guarantee.
              </p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full border-2 hover:bg-white/50 transition-all"
                style={{ borderColor: '#9E5DAB', color: '#9E5DAB' }}
              >
                Contact Us
                <ArrowRight className="w-4 h-4" />
              </motion.button>
            </div>
          </motion.div>

          {/* Trust Indicators */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 0.8 }}
            className="mt-16 flex flex-wrap justify-center items-center gap-8 text-sm text-muted-foreground"
          >
            <div className="flex items-center gap-2">
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                ✓
              </motion.div>
              <span>30-day money back guarantee</span>
            </div>
            <div className="flex items-center gap-2">
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity, delay: 0.3 }}
              >
                🔒
              </motion.div>
              <span>Secure payment processing</span>
            </div>
            <div className="flex items-center gap-2">
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity, delay: 0.6 }}
              >
                ⚡
              </motion.div>
              <span>Instant access after purchase</span>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
