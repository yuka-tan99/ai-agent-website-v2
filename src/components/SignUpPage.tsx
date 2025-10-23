import { motion, AnimatePresence } from 'motion/react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { BecomeFamousLogo } from './BecomeFamousLogo';
import { ChevronLeft, Mail, Lock, Phone, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { ScrollArea } from './ui/scroll-area';
import { supabase } from '../lib/supabaseClient';

interface SignUpPageProps {
  onBack: () => void;
  onSignUp: () => void;
  onNavigateToSignIn: () => void;
}

export function SignUpPage({ onBack, onSignUp, onNavigateToSignIn }: SignUpPageProps) {
  const [signupMethod, setSignupMethod] = useState<'email' | 'phone'>('email');
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedLegal, setExpandedLegal] = useState<'terms' | 'privacy' | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      alert("Passwords don't match!");
      return;
    }

    if (!agreeToTerms) {
      alert("Please agree to the Terms of Service and Privacy Policy");
      return;
    }
    
    setIsLoading(true);
    setErrorMessage(null);
    setInfoMessage(null);

    try {
      if (!emailOrPhone) {
        throw new Error('Enter your email or phone number to continue.');
      }

      if (signupMethod === 'email') {
        const { error } = await supabase.auth.signUp({
          email: emailOrPhone,
          password,
        });

        if (error) {
          throw error;
        }

        setInfoMessage('Check your email to confirm your account, then sign in.');
      } else {
        if (!emailOrPhone.startsWith('+')) {
          throw new Error('Include your country code (e.g., +1) for SMS sign up.');
        }
        const { error } = await supabase.auth.signUp({
          phone: emailOrPhone,
          password,
        });

        if (error) {
          throw error;
        }

        setInfoMessage('We just sent you an SMS to confirm your phone number.');
      }

      setEmailOrPhone('');
      setPassword('');
      setConfirmPassword('');
      setAgreeToTerms(false);

      if (typeof window !== 'undefined') {
        sessionStorage.setItem(
          'becomefamous_signup_success',
          signupMethod === 'email' ? 'email' : 'phone',
        );
      }

      setTimeout(() => {
        onSignUp();
      }, 300);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to sign up. Please try again.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialSignUp = (provider: string) => {
    // In a real app, this would trigger OAuth flow
    console.log(`Sign up with ${provider}`);
    onSignUp();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-purple-50/20 to-pink-50/30 relative overflow-hidden">
      {/* Animated Background Orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <motion.div
          animate={{
            x: [0, 120, 0],
            y: [0, -60, 0],
            scale: [1, 1.15, 1],
          }}
          transition={{
            duration: 26,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute top-10 right-10 w-[550px] h-[550px] rounded-full opacity-10 blur-3xl"
          style={{ 
            background: 'radial-gradient(circle, #9E5DAB 0%, transparent 70%)'
          }}
        />
        <motion.div
          animate={{
            x: [0, -90, 0],
            y: [0, 70, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 30,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute bottom-10 left-10 w-[650px] h-[650px] rounded-full opacity-10 blur-3xl"
          style={{ 
            background: 'radial-gradient(circle, #B481C0 0%, transparent 70%)'
          }}
        />
        <motion.div
          animate={{
            x: [0, 60, 0],
            y: [0, -40, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 24,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] h-[450px] rounded-full opacity-5 blur-3xl"
          style={{ 
            background: 'radial-gradient(circle, #EBD7DC 0%, transparent 70%)'
          }}
        />
      </div>

      {/* Floating Sparkles */}
      <div className="fixed inset-0 pointer-events-none">
        {[...Array(10)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -40, 0],
              opacity: [0.2, 0.7, 0.2],
              scale: [0.7, 1.3, 0.7],
            }}
            transition={{
              duration: 3.5 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
              ease: "easeInOut"
            }}
          >
            <Sparkles className="w-4 h-4" style={{ color: '#B481C0' }} />
          </motion.div>
        ))}
      </div>

      {/* Header */}
      <motion.header 
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 100, damping: 20 }}
        className="sticky top-0 z-50 bg-white/70 backdrop-blur-xl border-b border-border/50 shadow-sm"
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
              className="rounded-full w-12 h-12 border-2 hover:border-primary/50 transition-all"
            >
              <ChevronLeft className="w-6 h-6" />
            </Button>
          </motion.div>
          
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          >
            <BecomeFamousLogo size="md" />
          </motion.div>
          
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <Button
              onClick={onNavigateToSignIn}
              variant="outline"
              className="rounded-full px-8 border-2 hover:bg-primary/5 transition-all"
              style={{ borderColor: '#9E5DAB', color: '#9E5DAB' }}
            >
              Log In
            </Button>
          </motion.div>
        </div>
      </motion.header>

      {/* Main Content */}
      <div className="relative z-10 max-w-lg mx-auto px-6 py-8 lg:py-16">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          {/* Glassmorphic Card */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="bg-white/60 backdrop-blur-2xl rounded-3xl p-10 shadow-2xl border border-white/50"
            style={{
              boxShadow: '0 8px 32px rgba(158, 93, 171, 0.12)'
            }}
          >
            {/* Title */}
            <div className="text-center mb-8">
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mb-3"
                style={{ 
                  background: 'linear-gradient(135deg, #9E5DAB 0%, #B481C0 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}
              >
                Create Account
              </motion.h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-muted-foreground"
              >
                Start your journey to becoming famous ✨
              </motion.p>
            </div>

            {/* Social Sign Up Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="space-y-3 mb-7"
            >
              <motion.div whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }}>
                <Button
                  onClick={() => handleSocialSignUp('Google')}
                  variant="outline"
                  className="w-full h-14 rounded-2xl border-2 hover:border-primary/50 transition-all bg-white/50 backdrop-blur-sm hover:bg-white/80 shadow-sm hover:shadow-md"
                >
                  <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continue with Google
                </Button>
              </motion.div>

              <motion.div whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }}>
                <Button
                  onClick={() => handleSocialSignUp('Microsoft')}
                  variant="outline"
                  className="w-full h-14 rounded-2xl border-2 hover:border-primary/50 transition-all bg-white/50 backdrop-blur-sm hover:bg-white/80 shadow-sm hover:shadow-md"
                >
                  <svg className="w-5 h-5 mr-3" viewBox="0 0 23 23">
                    <path fill="#f35325" d="M1 1h10v10H1z"/>
                    <path fill="#81bc06" d="M12 1h10v10H12z"/>
                    <path fill="#05a6f0" d="M1 12h10v10H1z"/>
                    <path fill="#ffba08" d="M12 12h10v10H12z"/>
                  </svg>
                  Continue with Microsoft
                </Button>
              </motion.div>

              <motion.div whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }}>
                <Button
                  onClick={() => handleSocialSignUp('Apple')}
                  variant="outline"
                  className="w-full h-14 rounded-2xl border-2 hover:border-primary/50 transition-all bg-white/50 backdrop-blur-sm hover:bg-white/80 shadow-sm hover:shadow-md"
                >
                  <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                  </svg>
                  Continue with Apple
                </Button>
              </motion.div>
            </motion.div>

            {/* Divider */}
            <motion.div
              initial={{ opacity: 0, scaleX: 0 }}
              animate={{ opacity: 1, scaleX: 1 }}
              transition={{ delay: 0.6, duration: 0.5 }}
              className="relative mb-7"
            >
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t-2 border-border/50"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="px-4 bg-white/60 text-muted-foreground backdrop-blur-sm rounded-full">
                  OR
                </span>
              </div>
            </motion.div>

            {/* Other ways to sign up */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="text-center mb-5"
            >
              <p className="text-sm text-muted-foreground">
                Other ways to sign up or{' '}
                <button
                  onClick={onNavigateToSignIn}
                  className="text-primary hover:underline"
                  style={{ color: '#9E5DAB' }}
                >
                  Log In
                </button>
              </p>
            </motion.div>

            {/* Email/Phone Toggle */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="flex gap-2 mb-5"
            >
              <motion.button
                type="button"
                onClick={() => setSignupMethod('email')}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex-1 h-12 rounded-2xl transition-all flex items-center justify-center"
                style={{
                  backgroundColor: signupMethod === 'email' ? '#9E5DAB' : 'white',
                  color: signupMethod === 'email' ? 'white' : '#6b6b6b',
                  border: signupMethod === 'email' ? 'none' : '2px solid #E8E8E8'
                }}
              >
                Email
              </motion.button>
              <motion.button
                type="button"
                onClick={() => setSignupMethod('phone')}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex-1 h-12 rounded-2xl transition-all flex items-center justify-center"
                style={{
                  backgroundColor: signupMethod === 'phone' ? '#9E5DAB' : 'white',
                  color: signupMethod === 'phone' ? 'white' : '#6b6b6b',
                  border: signupMethod === 'phone' ? 'none' : '2px solid #E8E8E8'
                }}
              >
                Phone
              </motion.button>
            </motion.div>

            {/* Sign Up Form */}
            <motion.form
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
              onSubmit={handleSubmit}
              className="space-y-4"
            >
              {/* Email or Phone Field */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={signupMethod}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                  className="relative"
                >
                  {signupMethod === 'email' ? (
                    <>
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground z-10" />
                      <Input
                        type="email"
                        placeholder="you@example.com"
                        value={emailOrPhone}
                        onChange={(e) => setEmailOrPhone(e.target.value)}
                        className="pl-12 h-14 rounded-2xl border-0 transition-all bg-[#EBF3FC] focus:bg-white focus:shadow-md"
                        required
                      />
                    </>
                  ) : (
                    <>
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground z-10" />
                      <Input
                        type="tel"
                        placeholder="+1 (555) 123-4567"
                        value={emailOrPhone}
                        onChange={(e) => setEmailOrPhone(e.target.value)}
                        className="pl-12 h-14 rounded-2xl border-0 transition-all bg-[#EBF3FC] focus:bg-white focus:shadow-md"
                        required
                      />
                    </>
                  )}
                </motion.div>
              </AnimatePresence>

              {/* Password Field */}
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground z-10" />
                <Input
                  type="password"
                  placeholder="Create password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-12 h-14 rounded-2xl border-0 transition-all bg-[#EBF3FC] focus:bg-white focus:shadow-md"
                  required
                />
              </div>

              {/* Confirm Password Field */}
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground z-10" />
                <Input
                  type="password"
                  placeholder="Confirm password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-12 h-14 rounded-2xl border-0 transition-all bg-[#EBF3FC] focus:bg-white focus:shadow-md"
                  required
                />
              </div>

              {/* Terms Agreement */}
              <div className="pt-2 space-y-3">
                <div className="flex items-start gap-3">
                  <input 
                    type="checkbox" 
                    id="terms"
                    checked={agreeToTerms}
                    onChange={(e) => setAgreeToTerms(e.target.checked)}
                    className="mt-1 rounded w-4 h-4 cursor-pointer flex-shrink-0"
                    style={{ accentColor: '#9E5DAB' }}
                  />
                  <div className="text-sm text-muted-foreground">
                    <label htmlFor="terms" className="cursor-pointer">
                      I agree to the{' '}
                    </label>
                    <button 
                      type="button" 
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setExpandedLegal(expandedLegal === 'terms' ? null : 'terms');
                      }}
                      className="hover:underline inline-flex items-center gap-1" 
                      style={{ color: '#9E5DAB' }}
                    >
                      Terms of Service
                      {expandedLegal === 'terms' ? (
                        <ChevronUp className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      )}
                    </button>
                    <label htmlFor="terms" className="cursor-pointer">
                      {' '}and{' '}
                    </label>
                    <button 
                      type="button" 
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setExpandedLegal(expandedLegal === 'privacy' ? null : 'privacy');
                      }}
                      className="hover:underline inline-flex items-center gap-1" 
                      style={{ color: '#9E5DAB' }}
                    >
                      Privacy Policy
                      {expandedLegal === 'privacy' ? (
                        <ChevronUp className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Expandable Legal Documents */}
                <AnimatePresence>
                  {expandedLegal && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="rounded-xl border-2 border-border bg-white/80 backdrop-blur-sm p-4">
                        <ScrollArea className="h-64">
                          <div className="pr-4 space-y-4 text-sm">
                            {expandedLegal === 'terms' ? (
                              <>
                                <div>
                                  <h4 className="mb-2" style={{ color: '#9E5DAB' }}>Terms of Service</h4>
                                  <p className="text-muted-foreground text-xs mb-3">Last updated: October 20, 2025</p>
                                </div>

                                <div>
                                  <h5 className="mb-1">1. Acceptance of Terms</h5>
                                  <p className="text-muted-foreground text-xs">
                                    By accessing and using BecomeFamous.AI, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to these terms, please do not use our service.
                                  </p>
                                </div>

                                <div>
                                  <h5 className="mb-1">2. Use License</h5>
                                  <p className="text-muted-foreground text-xs">
                                    Permission is granted to temporarily access the materials on BecomeFamous.AI for personal, non-commercial use only. This is the grant of a license, not a transfer of title. Under this license you may not: modify or copy the materials, use the materials for any commercial purpose, attempt to decompile or reverse engineer any software, remove any copyright or proprietary notations, or transfer the materials to another person.
                                  </p>
                                </div>

                                <div>
                                  <h5 className="mb-1">3. User Account</h5>
                                  <p className="text-muted-foreground text-xs">
                                    You are responsible for maintaining the confidentiality of your account and password. You agree to accept responsibility for all activities that occur under your account. We reserve the right to refuse service, terminate accounts, or remove content at our sole discretion.
                                  </p>
                                </div>

                                <div>
                                  <h5 className="mb-1">4. Payment Terms</h5>
                                  <p className="text-muted-foreground text-xs">
                                    Certain features of our service require payment. You agree to provide current, complete, and accurate purchase information. Subscription fees are billed in advance on a recurring basis. You can cancel your subscription at any time, but refunds are only provided as specified in our refund policy.
                                  </p>
                                </div>

                                <div>
                                  <h5 className="mb-1">5. Content and Conduct</h5>
                                  <p className="text-muted-foreground text-xs">
                                    You retain ownership of any content you submit. By posting content, you grant us a worldwide, non-exclusive, royalty-free license to use, reproduce, and display such content. You agree not to post content that is illegal, offensive, or infringes on others' rights.
                                  </p>
                                </div>

                                <div>
                                  <h5 className="mb-1">6. Disclaimer</h5>
                                  <p className="text-muted-foreground text-xs">
                                    The materials on BecomeFamous.AI are provided on an 'as is' basis. We make no warranties, expressed or implied, and hereby disclaim all other warranties including, without limitation, implied warranties of merchantability, fitness for a particular purpose, or non-infringement.
                                  </p>
                                </div>

                                <div>
                                  <h5 className="mb-1">7. Limitations</h5>
                                  <p className="text-muted-foreground text-xs">
                                    In no event shall BecomeFamous.AI or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use our service.
                                  </p>
                                </div>

                                <div>
                                  <h5 className="mb-1">8. Modifications</h5>
                                  <p className="text-muted-foreground text-xs">
                                    We reserve the right to revise these terms at any time without notice. By using this service, you agree to be bound by the current version of these terms.
                                  </p>
                                </div>
                              </>
                            ) : (
                              <>
                                <div>
                                  <h4 className="mb-2" style={{ color: '#9E5DAB' }}>Privacy Policy</h4>
                                  <p className="text-muted-foreground text-xs mb-3">Last updated: October 20, 2025</p>
                                </div>

                                <div>
                                  <h5 className="mb-1">1. Information We Collect</h5>
                                  <p className="text-muted-foreground text-xs">
                                    We collect information you provide directly to us, including name, email address, and payment information. We also collect usage data, device information, and analytics about how you interact with our service.
                                  </p>
                                </div>

                                <div>
                                  <h5 className="mb-1">2. How We Use Your Information</h5>
                                  <p className="text-muted-foreground text-xs">
                                    We use the information we collect to: provide and improve our services, process transactions, send you updates and marketing communications (which you can opt out of), respond to your requests, and protect against fraud and abuse.
                                  </p>
                                </div>

                                <div>
                                  <h5 className="mb-1">3. Information Sharing</h5>
                                  <p className="text-muted-foreground text-xs">
                                    We do not sell your personal information. We may share your information with service providers who assist us in operating our platform, partners who help deliver services, and as required by law or to protect our rights.
                                  </p>
                                </div>

                                <div>
                                  <h5 className="mb-1">4. Data Security</h5>
                                  <p className="text-muted-foreground text-xs">
                                    We implement appropriate technical and organizational measures to protect your personal information. However, no method of transmission over the Internet is 100% secure, and we cannot guarantee absolute security.
                                  </p>
                                </div>

                                <div>
                                  <h5 className="mb-1">5. Cookies and Tracking</h5>
                                  <p className="text-muted-foreground text-xs">
                                    We use cookies and similar tracking technologies to track activity on our service and hold certain information. You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent.
                                  </p>
                                </div>

                                <div>
                                  <h5 className="mb-1">6. Your Rights</h5>
                                  <p className="text-muted-foreground text-xs">
                                    You have the right to access, update, or delete your personal information. You can also object to processing, request data portability, and withdraw consent. Contact us to exercise these rights.
                                  </p>
                                </div>

                                <div>
                                  <h5 className="mb-1">7. Data Retention</h5>
                                  <p className="text-muted-foreground text-xs">
                                    We retain your personal information only for as long as necessary to fulfill the purposes outlined in this policy, unless a longer retention period is required by law.
                                  </p>
                                </div>

                                <div>
                                  <h5 className="mb-1">8. Children's Privacy</h5>
                                  <p className="text-muted-foreground text-xs">
                                    Our service is not intended for children under 13. We do not knowingly collect personal information from children under 13. If you are a parent and believe your child has provided us with personal information, please contact us.
                                  </p>
                                </div>

                                <div>
                                  <h5 className="mb-1">9. Changes to Privacy Policy</h5>
                                  <p className="text-muted-foreground text-xs">
                                    We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date.
                                  </p>
                                </div>

                                <div>
                                  <h5 className="mb-1">10. Contact Us</h5>
                                  <p className="text-muted-foreground text-xs">
                                    If you have any questions about this Privacy Policy, please contact us at privacy@becomefamous.ai
                                  </p>
                                </div>
                              </>
                            )}
                          </div>
                        </ScrollArea>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {errorMessage && (
                <div className="bg-destructive/10 text-destructive text-sm rounded-2xl px-4 py-3">
                  {errorMessage}
                </div>
              )}

              {infoMessage && !errorMessage && (
                <div className="bg-emerald-100/70 text-emerald-600 text-sm rounded-2xl px-4 py-3">
                  {infoMessage}
                </div>
              )}

              {/* Submit Button */}
              <motion.div
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  type="submit"
                  className="w-full h-14 rounded-2xl shadow-lg hover:shadow-2xl transition-all mt-4"
                  style={{ 
                    backgroundColor: '#9E5DAB',
                    background: 'linear-gradient(135deg, #9E5DAB 0%, #B481C0 100%)'
                  }}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <motion.div
                      className="flex items-center gap-2"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      >
                        <Sparkles className="w-5 h-5" />
                      </motion.div>
                      Creating account...
                    </motion.div>
                  ) : (
                    'Create Account'
                  )}
                </Button>
              </motion.div>
            </motion.form>
          </motion.div>

          {/* Footer Text */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="mt-8 text-center"
          >
            <p className="text-sm text-muted-foreground">
              Already have an account?{' '}
              <button
                onClick={onNavigateToSignIn}
                className="hover:underline"
                style={{ color: '#9E5DAB' }}
              >
                Sign in here
              </button>
            </p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
