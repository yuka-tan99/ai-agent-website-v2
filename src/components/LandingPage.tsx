import { motion } from 'motion/react';
import { Button } from './ui/button';
import { BecomeFamousLogo } from './BecomeFamousLogo';
import { ArrowRight, Target, Sparkles, MessageSquare, Video, Mail, Send } from 'lucide-react';
import { useEffect, useState } from 'react';

interface LandingPageProps {
  onStartOnboarding: () => void;
  onSignIn: () => void;
  onNavigateToPricing: () => void;
  onNavigateToPrivacy?: () => void;
  onNavigateToTerms?: () => void;
  onNavigateToAbout?: () => void;
  onNavigateToBlog?: () => void;
  onNavigateToFAQ?: () => void;
  onNavigateToWhatsNew?: () => void;
}

// Newsletter Form Component
function NewsletterForm() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [isFocused, setIsFocused] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic email validation
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
      return;
    }

    // Mock newsletter subscription (in real app, this would call an API)
    console.log('Newsletter subscription:', email);
    setStatus('success');
    setEmail('');
    setTimeout(() => setStatus('idle'), 5000);
  };

  return (
    <form onSubmit={handleSubmit} className="relative">
      <div className="relative">
        <motion.div
          animate={{
            scale: isFocused ? 1.02 : 1,
            boxShadow: isFocused 
              ? '0 8px 30px rgba(158, 93, 171, 0.15)' 
              : '0 4px 15px rgba(158, 93, 171, 0.08)',
          }}
          transition={{ duration: 0.3 }}
          className="relative rounded-full overflow-hidden"
          style={{
            background: 'linear-gradient(white, white), linear-gradient(135deg, #EBD7DC 0%, #9E5DAB 100%)',
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
      </div>
    </form>
  );
}

export function LandingPage({ onStartOnboarding, onSignIn, onNavigateToPricing, onNavigateToPrivacy, onNavigateToTerms, onNavigateToAbout, onNavigateToBlog, onNavigateToFAQ, onNavigateToWhatsNew }: LandingPageProps) {

  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const features = [
    {
      icon: <Target className="w-6 h-6" />,
      title: "Personalized Report",
      description: "Get a comprehensive analysis of your content strategy with actionable insights tailored to your unique situation.",
      color: "#9E5DAB"
    },
    {
      icon: <MessageSquare className="w-6 h-6" />,
      title: "AI Mentor",
      description: "Get instant guidance and answers from our AI-powered mentor available 24/7 to support your journey.",
      color: "#B481C0"
    },
    {
      icon: <Video className="w-6 h-6" />,
      title: "1:1 Expert Session",
      description: "Book personalized coaching sessions with industry experts who understand your niche and goals.",
      color: "#D1A5DD"
    }
  ];

  const resources = [
    { name: "Blog", href: "#", onClick: onNavigateToBlog },
    { name: "FAQs", href: "#", onClick: onNavigateToFAQ },
    { name: "What's New", href: "#", onClick: onNavigateToWhatsNew },
    { name: "Privacy Policy", href: "#", onClick: onNavigateToPrivacy },
    { name: "Terms of Service", href: "#", onClick: onNavigateToTerms }
  ];

  const socialLinks = [
    { icon: "f", href: "#", label: "Facebook" },
    { icon: "ig", href: "#", label: "Instagram" },
    { icon: "TT", href: "#", label: "TikTok" },
    { icon: "𝕏", href: "#", label: "Twitter" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-gray-50/30 to-white overflow-hidden">
      {/* Animated Background Orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <motion.div
          animate={{
            x: [0, 100, 0],
            y: [0, -50, 0],
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
            x: [0, -80, 0],
            y: [0, 60, 0],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute bottom-20 left-10 w-[500px] h-[500px] rounded-full opacity-5 blur-3xl"
          style={{ backgroundColor: '#B481C0' }}
        />
        <motion.div
          animate={{
            x: [0, 50, 0],
            y: [0, -30, 0],
          }}
          transition={{
            duration: 18,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute top-1/2 left-1/4 w-64 h-64 rounded-full opacity-3 blur-3xl"
          style={{ backgroundColor: '#D1A5DD' }}
        />
      </div>

      {/* Header / Navigation */}
      <motion.header 
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 100, damping: 20 }}
        className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-border/50"
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-4 flex items-center justify-between">
          <BecomeFamousLogo size="md" />
          
          <div className="flex items-center gap-3">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                onClick={onSignIn}
                variant="ghost"
                className="hover:bg-transparent"
                style={{ color: '#6b6b6b' }}
              >
                Log In
              </Button>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                onClick={onSignIn}
                className="rounded-full px-6 shadow-sm hover:shadow-md transition-shadow"
                style={{ backgroundColor: '#9E5DAB' }}
              >
                Signup
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </motion.div>
          </div>
        </div>
      </motion.header>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center px-6 py-32">
        <div className="relative z-10 max-w-5xl mx-auto text-center">
          {/* Animated Decorative Element */}
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="relative mx-auto mb-16"
          >
            {/* Outer orbiting circles */}
            <div className="relative w-28 h-28 mx-auto">
              {[...Array(3)].map((_, i) => (
                <motion.div
                  key={i}
                  animate={{ 
                    rotate: 360,
                  }}
                  transition={{ 
                    duration: 10 + i * 5,
                    repeat: Infinity,
                    ease: "linear"
                  }}
                  className="absolute inset-0"
                >
                  <motion.div
                    animate={{
                      scale: [1, 1.1, 1],
                      opacity: [0.3, 0.5, 0.3]
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      delay: i * 0.5
                    }}
                    className="absolute rounded-full"
                    style={{
                      width: `${100 + i * 15}%`,
                      height: `${100 + i * 15}%`,
                      top: `${-7.5 * i}%`,
                      left: `${-7.5 * i}%`,
                      border: `2px solid rgba(158, 93, 171, ${0.2 - i * 0.05})`,
                    }}
                  />
                </motion.div>
              ))}

              {/* Center gradient orb */}
              <motion.div
                animate={{ 
                  scale: [1, 1.1, 1],
                  rotate: [0, 180, 360]
                }}
                transition={{ 
                  duration: 6,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 rounded-full"
                style={{ 
                  background: 'linear-gradient(135deg, #9E5DAB 0%, #D1A5DD 100%)',
                  boxShadow: '0 8px 30px rgba(158, 93, 171, 0.3)'
                }}
              />
              
              {/* Sparkle particles */}
              {[...Array(6)].map((_, i) => (
                <motion.div
                  key={`sparkle-${i}`}
                  animate={{
                    scale: [0, 1, 0],
                    opacity: [0, 1, 0],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    delay: i * 0.3,
                  }}
                  className="absolute w-1.5 h-1.5 rounded-full"
                  style={{
                    backgroundColor: '#9E5DAB',
                    top: `${50 + Math.cos(i * Math.PI / 3) * 50}%`,
                    left: `${50 + Math.sin(i * Math.PI / 3) * 50}%`,
                  }}
                />
              ))}
            </div>
          </motion.div>

          {/* Main Headline */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="mb-6"
          >
            <h1 
              className="mb-3"
              style={{ 
                fontSize: 'clamp(2.5rem, 6vw, 4rem)',
                lineHeight: '1.15',
                color: '#2d2d2d',
                letterSpacing: '-0.02em'
              }}
            >
              your go-to
            </h1>
            <motion.h1 
              animate={{
                backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
              }}
              transition={{
                duration: 5,
                repeat: Infinity,
                ease: "linear"
              }}
              style={{ 
                fontSize: 'clamp(2.5rem, 6vw, 4rem)',
                lineHeight: '1.15',
                background: 'linear-gradient(90deg, #9E5DAB 0%, #D1A5DD 50%, #9E5DAB 100%)',
                backgroundSize: '200% 100%',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                letterSpacing: '-0.02em'
              }}
            >
              marketing mentor
            </motion.h1>
          </motion.div>

          {/* Subheadline with typing effect */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9, duration: 0.8 }}
            className="mb-16"
          >
            <p 
              className="text-muted-foreground"
              style={{ fontSize: 'clamp(1.125rem, 2.5vw, 1.5rem)' }}
            >
              are you ready to become famous?
            </p>
          </motion.div>

          {/* CTA Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2, duration: 0.8 }}
          >
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                onClick={onStartOnboarding}
                size="lg"
                className="rounded-full px-14 py-7 shadow-lg hover:shadow-2xl transition-all relative overflow-hidden group"
                style={{ 
                  backgroundColor: '#9E5DAB',
                  fontSize: '1.25rem'
                }}
              >
                <motion.div
                  className="absolute inset-0 bg-white/20"
                  initial={{ x: '-100%' }}
                  whileHover={{ x: '100%' }}
                  transition={{ duration: 0.5 }}
                />
                <span className="relative">Let's Start</span>
              </Button>
            </motion.div>
          </motion.div>

          {/* Trust indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5, duration: 0.8 }}
            className="mt-12"
          >
            <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
              <motion.span
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                ✨
              </motion.span>
              Join thousands of creators growing their audience with AI-powered insights
            </p>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2, duration: 1, repeat: Infinity, repeatType: "reverse" }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2"
        >
          <div className="w-6 h-10 border-2 rounded-full flex items-start justify-center p-2" style={{ borderColor: '#9E5DAB40' }}>
            <motion.div
              animate={{ y: [0, 12, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: '#9E5DAB' }}
            />
          </div>
        </motion.div>
      </section>

      {/* Feature Highlights Section */}
      <section className="py-32 px-6 relative">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-20"
          >
            <motion.div
              initial={{ scale: 0 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
              className="inline-block mb-4"
            >
              <span 
                className="px-4 py-2 rounded-full text-sm"
                style={{ backgroundColor: '#EBD7DC40', color: '#9E5DAB' }}
              >
                Everything You Need
              </span>
            </motion.div>
            <h2 className="mb-4">Transform Your Creator Journey</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Everything you need to grow your social media presence and build a sustainable content business
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1, duration: 0.6 }}
                whileHover={{ 
                  y: -8,
                  transition: { duration: 0.3 }
                }}
              >
                <div
                  className="bg-white rounded-3xl p-8 hover:shadow-xl transition-all duration-300 border border-border/50 h-full relative overflow-hidden group"
                >
                  {/* Hover gradient effect */}
                  <motion.div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    style={{
                      background: `linear-gradient(135deg, ${feature.color}05 0%, ${feature.color}10 100%)`
                    }}
                  />
                  
                  <div className="relative">
                    <motion.div
                      whileHover={{ rotate: [0, -10, 10, -10, 0] }}
                      transition={{ duration: 0.5 }}
                      className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 shadow-sm"
                      style={{ backgroundColor: '#EBD7DC' }}
                    >
                      <div style={{ color: feature.color }}>
                        {feature.icon}
                      </div>
                    </motion.div>
                    <h3 className="mb-3">{feature.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                    <motion.button 
                      whileHover={{ x: 5 }}
                      className="mt-6 flex items-center gap-2 group/btn"
                      style={{ color: feature.color }}
                    >
                      <span>Learn More</span>
                      <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Resources Section */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="mb-4">Resources</h2>
            <p className="text-muted-foreground">
              Explore our library of helpful content and tools
            </p>
          </motion.div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 max-w-3xl mx-auto">
            {resources.map((resource, index) => (
              <motion.button
                key={index}
                onClick={resource.onClick || (() => {})}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1, duration: 0.5, type: "spring" }}
                whileHover={{ 
                  scale: 1.05,
                  y: -6,
                  transition: { duration: 0.3, type: "spring", stiffness: 400 }
                }}
                whileTap={{ scale: 0.95 }}
                className="relative p-6 rounded-full aspect-square flex items-center justify-center bg-white group w-full overflow-hidden shadow-md hover:shadow-xl transition-shadow"
                style={{
                  border: '2px solid transparent',
                  backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, #EBD7DC 0%, #9E5DAB 100%)',
                  backgroundOrigin: 'border-box',
                  backgroundClip: 'padding-box, border-box',
                }}
              >
                {/* Gradient overlay on hover */}
                <motion.div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-full"
                  style={{
                    background: 'linear-gradient(135deg, rgba(158, 93, 171, 0.05) 0%, rgba(235, 215, 220, 0.1) 100%)',
                  }}
                />
                
                {/* Sparkle effect on hover */}
                <motion.div
                  className="absolute top-2 right-2 w-2 h-2 rounded-full opacity-0 group-hover:opacity-100"
                  style={{ backgroundColor: '#9E5DAB' }}
                  animate={{
                    scale: [0, 1, 0],
                    opacity: [0, 1, 0],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    repeatDelay: 0.5,
                  }}
                />
                
                <p className="relative text-center group-hover:text-primary transition-colors z-10 text-sm">
                  {resource.name}
                </p>
              </motion.button>
            ))}
          </div>
        </div>
      </section>

      {/* Connect With Us Section */}
      <section className="py-24 px-6 relative">
        <div 
          className="absolute inset-0 opacity-30"
          style={{ 
            background: 'linear-gradient(135deg, #EBD7DC20 0%, #9E5DAB10 100%)'
          }}
        />
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="mb-8">Connect With Us</h2>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="flex justify-center gap-4 mb-10"
          >
            {socialLinks.map((social, index) => (
              <motion.a
                key={index}
                href={social.href}
                aria-label={social.label}
                initial={{ scale: 0 }}
                whileInView={{ scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 + index * 0.1, type: "spring", stiffness: 200 }}
                whileHover={{ 
                  scale: 1.1,
                  rotate: [0, -10, 10, 0],
                  transition: { duration: 0.3 }
                }}
                whileTap={{ scale: 0.95 }}
                className="w-14 h-14 rounded-full flex items-center justify-center hover:shadow-lg transition-shadow"
                style={{ backgroundColor: '#9E5DAB', color: 'white' }}
              >
                <span className="text-lg">{social.icon}</span>
              </motion.a>
            ))}
          </motion.div>

          {/* Newsletter Subscription */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="mb-10 max-w-md mx-auto"
          >
            <p className="mb-4 text-muted-foreground">
              ✨ Subscribe to our newsletter for exclusive tips & updates
            </p>
            <NewsletterForm />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.7, duration: 0.8 }}
          >
            <motion.a
              href="mailto:hello@becomefamous.ai"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-full border-2 hover:bg-white/50 transition-all shadow-sm hover:shadow-md"
              style={{ borderColor: '#9E5DAB', color: '#9E5DAB' }}
            >
              <Mail className="w-5 h-5" />
              <span>Email Us</span>
            </motion.a>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 px-6 bg-white border-t relative">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-16 mb-16">
            {/* Company Column */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h4 className="mb-6" style={{ color: '#9E5DAB' }}>Company</h4>
              <ul className="space-y-3">
                <motion.li
                  whileHover={{ x: 5 }}
                  transition={{ duration: 0.2 }}
                >
                  <button 
                    onClick={onNavigateToAbout}
                    className="text-muted-foreground hover:text-foreground transition-colors text-left"
                  >
                    About
                  </button>
                </motion.li>
                <motion.li
                  whileHover={{ x: 5 }}
                  transition={{ duration: 0.2 }}
                >
                  <button 
                    onClick={onNavigateToPricing}
                    className="text-muted-foreground hover:text-foreground transition-colors text-left"
                  >
                    Pricing
                  </button>
                </motion.li>
                <motion.li
                  whileHover={{ x: 5 }}
                  transition={{ duration: 0.2 }}
                >
                  <button 
                    onClick={onNavigateToPrivacy}
                    className="text-muted-foreground hover:text-foreground transition-colors text-left"
                  >
                    Privacy Policy
                  </button>
                </motion.li>
                <motion.li
                  whileHover={{ x: 5 }}
                  transition={{ duration: 0.2 }}
                >
                  <button 
                    onClick={onNavigateToTerms}
                    className="text-muted-foreground hover:text-foreground transition-colors text-left"
                  >
                    Terms of Service
                  </button>
                </motion.li>
              </ul>
            </motion.div>

            {/* Features Column */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1, duration: 0.6 }}
            >
              <h4 className="mb-6" style={{ color: '#9E5DAB' }}>Features</h4>
              <ul className="space-y-3">
                {features.map((feature, i) => (
                  <motion.li
                    key={i}
                    whileHover={{ x: 5 }}
                    transition={{ duration: 0.2 }}
                  >
                    <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                      {feature.title}
                    </a>
                  </motion.li>
                ))}
              </ul>
            </motion.div>

            {/* Resources & Connect Column */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2, duration: 0.6 }}
            >
              <h4 className="mb-6" style={{ color: '#9E5DAB' }}>Resources & Connect</h4>
              <ul className="space-y-3">
                {resources.map((resource, i) => (
                  <motion.li
                    key={i}
                    whileHover={{ x: 5 }}
                    transition={{ duration: 0.2 }}
                  >
                    <button 
                      onClick={resource.onClick || (() => {})}
                      className="text-muted-foreground hover:text-foreground transition-colors text-left"
                    >
                      {resource.name}
                    </button>
                  </motion.li>
                ))}
                <li className="pt-4">
                  <div className="space-y-3">
                    {socialLinks.map((social, i) => (
                      <motion.div
                        key={i}
                        whileHover={{ x: 5 }}
                        transition={{ duration: 0.2 }}
                      >
                        <a href={social.href} className="text-muted-foreground hover:text-foreground transition-colors block">
                          {social.label}
                        </a>
                      </motion.div>
                    ))}
                    <motion.div
                      whileHover={{ x: 5 }}
                      transition={{ duration: 0.2 }}
                    >
                      <a href="mailto:hello@becomefamous.ai" className="text-muted-foreground hover:text-foreground transition-colors block">
                        Email Us
                      </a>
                    </motion.div>
                  </div>
                </li>
              </ul>
            </motion.div>
          </div>

          {/* Bottom Bar */}
          <motion.div 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="pt-8 border-t text-center"
          >
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <p>© 2025 BecomeFamous.AI. All rights reserved.</p>
              <motion.span
                animate={{ rotate: [0, 20, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                ✨
              </motion.span>
            </div>
          </motion.div>
        </div>
      </footer>
    </div>
  );
}
