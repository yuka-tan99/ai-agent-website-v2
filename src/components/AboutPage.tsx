import { motion } from 'motion/react';
import { Button } from './ui/button';
import { BecomeFamousLogo } from './BecomeFamousLogo';
import { ArrowLeft, Target, Sparkles, Brain, Heart, Users, Shield } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';

interface AboutPageProps {
  onBack: () => void;
}

export function AboutPage({ onBack }: AboutPageProps) {
  return (
    <div className="min-h-screen bg-white relative overflow-hidden">
      {/* Floating Background Orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <motion.div
          animate={{
            y: [0, -30, 0],
            x: [0, 20, 0],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute top-20 left-10 w-64 h-64 rounded-full opacity-20"
          style={{
            background: 'linear-gradient(135deg, #9E5DAB 0%, #D1A5DD 100%)',
            filter: 'blur(60px)',
          }}
        />
        <motion.div
          animate={{
            y: [0, 40, 0],
            x: [0, -30, 0],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute top-40 right-20 w-80 h-80 rounded-full opacity-15"
          style={{
            background: 'linear-gradient(135deg, #8FD9FB 0%, #B481C0 100%)',
            filter: 'blur(70px)',
          }}
        />
        <motion.div
          animate={{
            y: [0, -20, 0],
            x: [0, 15, 0],
          }}
          transition={{
            duration: 7,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute bottom-32 left-1/3 w-72 h-72 rounded-full opacity-10"
          style={{
            background: 'linear-gradient(135deg, #EBD7DC 0%, #9E5DAB 100%)',
            filter: 'blur(65px)',
          }}
        />
      </div>

      {/* Floating Sparkles */}
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={i}
          animate={{
            y: [0, -20, 0],
            opacity: [0.3, 0.8, 0.3],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 3 + i * 0.5,
            repeat: Infinity,
            delay: i * 0.4,
          }}
          className="fixed w-1 h-1 rounded-full pointer-events-none"
          style={{
            backgroundColor: '#9E5DAB',
            top: `${15 + i * 10}%`,
            left: `${10 + i * 11}%`,
          }}
        />
      ))}

      <ScrollArea className="h-screen">
        <div className="relative z-10 max-w-4xl mx-auto px-6 py-8">
          {/* Header with Logo */}
          <div className="flex items-center justify-between mb-8">
            <Button
              onClick={onBack}
              variant="outline"
              size="icon"
              className="rounded-full w-12 h-12 border-2"
              style={{ borderColor: '#9E5DAB' }}
            >
              <ArrowLeft className="w-5 h-5" style={{ color: '#9E5DAB' }} />
            </Button>
            <BecomeFamousLogo size="md" />
            <div className="w-12" /> {/* Spacer for centering */}
          </div>

          {/* Main Content */}
          <div className="space-y-12">
            {/* Hero Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center"
            >
              <h1 
                className="mb-4 text-3xl"
                style={{ color: '#9E5DAB' }}
              >
                About BecomeFamous.AI
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Your go-to marketing mentor — powered by AI, built for creators.
              </p>
            </motion.div>

            {/* Mission Statement */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="rounded-3xl p-8"
              style={{
                background: 'linear-gradient(135deg, rgba(158, 93, 171, 0.05) 0%, rgba(235, 215, 220, 0.1) 100%)',
                border: '1px solid rgba(158, 93, 171, 0.1)',
              }}
            >
              <p className="text-lg leading-relaxed">
                At BecomeFamous.AI, we believe every content creator deserves the tools, insights, and support to grow their audience and unlock their full potential. Whether you're just starting out or scaling your influence, our platform is designed to meet you where you are — and take you further.
              </p>
            </motion.div>

            {/* What We Do Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <div className="flex items-center gap-3 mb-6">
                <div 
                  className="w-12 h-12 rounded-2xl flex items-center justify-center"
                  style={{ backgroundColor: '#EBD7DC' }}
                >
                  <Target className="w-6 h-6" style={{ color: '#9E5DAB' }} />
                </div>
                <h2 style={{ color: '#9E5DAB' }}>What We Do</h2>
              </div>
              
              <div className="space-y-4 ml-15">
                <p className="leading-relaxed">
                  We combine the power of AI with creator psychology to deliver:
                </p>
                
                <div className="grid md:grid-cols-2 gap-4">
                  {[
                    {
                      icon: <Sparkles className="w-5 h-5" />,
                      title: 'Personalized Growth Reports',
                      desc: 'Based on your unique goals and content style'
                    },
                    {
                      icon: <Brain className="w-5 h-5" />,
                      title: 'Interactive Learning Plans',
                      desc: 'Tailored to your strengths and challenges'
                    },
                    {
                      icon: <Users className="w-5 h-5" />,
                      title: 'Mentorship Tools',
                      desc: 'Including AI guidance and 1:1 expert sessions'
                    },
                    {
                      icon: <Target className="w-5 h-5" />,
                      title: 'Performance Dashboards',
                      desc: 'Track progress and surface actionable insights'
                    }
                  ].map((feature, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.5, delay: 0.3 + idx * 0.1 }}
                      className="rounded-2xl p-5 border-2 transition-all hover:shadow-lg"
                      style={{
                        backgroundColor: 'rgba(235, 215, 220, 0.15)',
                        borderColor: 'rgba(158, 93, 171, 0.2)',
                      }}
                    >
                      <div 
                        className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                        style={{ backgroundColor: '#9E5DAB' }}
                      >
                        <span style={{ color: 'white' }}>{feature.icon}</span>
                      </div>
                      <h4 className="mb-1">{feature.title}</h4>
                      <p className="text-sm text-muted-foreground">{feature.desc}</p>
                    </motion.div>
                  ))}
                </div>

                <p className="leading-relaxed mt-6">
                  Everything starts with a simple onboarding session — where you tell us about your creator journey. From there, our AI builds a custom roadmap to help you grow faster, smarter, and more authentically.
                </p>
              </div>
            </motion.div>

            {/* Why AI Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="rounded-3xl p-8"
              style={{
                background: 'linear-gradient(135deg, rgba(143, 217, 251, 0.1) 0%, rgba(158, 93, 171, 0.05) 100%)',
                border: '1px solid rgba(143, 217, 251, 0.2)',
              }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div 
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: '#8FD9FB' }}
                >
                  <Brain className="w-5 h-5" style={{ color: '#fff' }} />
                </div>
                <h3 style={{ color: '#9E5DAB' }}>Why AI?</h3>
              </div>
              <p className="leading-relaxed">
                Our AI doesn't just crunch numbers — it understands creators. It adapts to your content type, audience behavior, and personal aspirations to deliver recommendations that feel human, not robotic. Think of it as your backstage strategist, helping you shine in the spotlight.
              </p>
            </motion.div>

            {/* Our Mission */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div 
                  className="w-12 h-12 rounded-2xl flex items-center justify-center"
                  style={{ backgroundColor: '#EBD7DC' }}
                >
                  <Heart className="w-6 h-6" style={{ color: '#9E5DAB' }} />
                </div>
                <h2 style={{ color: '#9E5DAB' }}>Our Mission</h2>
              </div>
              <p className="leading-relaxed ml-15">
                To empower creators of all kinds — artists, educators, entertainers, entrepreneurs — with the tools they need to become famous on their own terms. Fame isn't just about followers; it's about impact, growth, and creative freedom.
              </p>
            </motion.div>

            {/* Who We're For */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="rounded-3xl p-8"
              style={{
                background: 'linear-gradient(135deg, rgba(158, 93, 171, 0.08) 0%, rgba(235, 215, 220, 0.12) 100%)',
                border: '1px solid rgba(158, 93, 171, 0.15)',
              }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div 
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: '#9E5DAB' }}
                >
                  <Users className="w-5 h-5" style={{ color: '#fff' }} />
                </div>
                <h3 style={{ color: '#9E5DAB' }}>Who We're For</h3>
              </div>
              <ul className="space-y-3">
                {[
                  'TikTokers, YouTubers, Instagram creators, podcasters, streamers',
                  'Coaches, educators, and digital entrepreneurs',
                  'Anyone building a brand, audience, or creative business online'
                ].map((item, idx) => (
                  <motion.li
                    key={idx}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.7 + idx * 0.1 }}
                    className="flex items-start gap-3"
                  >
                    <div 
                      className="w-2 h-2 rounded-full mt-2 flex-shrink-0"
                      style={{ backgroundColor: '#9E5DAB' }}
                    />
                    <span className="leading-relaxed">{item}</span>
                  </motion.li>
                ))}
              </ul>
            </motion.div>

            {/* Built with Trust */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.7 }}
              className="rounded-3xl p-8"
              style={{
                background: 'linear-gradient(135deg, rgba(158, 93, 171, 0.05) 0%, rgba(143, 217, 251, 0.08) 100%)',
                border: '1px solid rgba(158, 93, 171, 0.2)',
              }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div 
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: '#9E5DAB' }}
                >
                  <Shield className="w-5 h-5" style={{ color: '#fff' }} />
                </div>
                <h3 style={{ color: '#9E5DAB' }}>Built with Trust</h3>
              </div>
              <p className="leading-relaxed">
                We respect your data, your voice, and your creative journey. Your onboarding answers and usage patterns are used only to personalize your experience. We never sell your data, and you're always in control.
              </p>
            </motion.div>

            {/* CTA Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.8 }}
              className="text-center py-12"
            >
              <div className="inline-block">
                <motion.div
                  animate={{
                    scale: [1, 1.02, 1],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                >
                  <Button
                    onClick={onBack}
                    size="lg"
                    className="rounded-full px-8 py-6 text-lg shadow-lg"
                    style={{
                      background: 'linear-gradient(135deg, #9E5DAB 0%, #B481C0 100%)',
                      color: 'white',
                    }}
                  >
                    Back to Home
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
