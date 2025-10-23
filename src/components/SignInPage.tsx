import { motion, AnimatePresence } from 'motion/react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { BecomeFamousLogo } from './BecomeFamousLogo';
import { ChevronLeft, Mail, Lock, Phone, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

interface SignInPageProps {
  onBack: () => void;
  onSignIn: () => void;
  onNavigateToSignUp: () => void;
}

export function SignInPage({ onBack, onSignIn, onNavigateToSignUp }: SignInPageProps) {
  const [loginMethod, setLoginMethod] = useState<'email' | 'phone'>('email');
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let message: string | null = null;

    const resetFlag = sessionStorage.getItem('becomefamous_password_reset_success');
    if (resetFlag) {
      message = 'Password updated successfully. Please sign in with your new password.';
      sessionStorage.removeItem('becomefamous_password_reset_success');
    }

    const signupFlag = sessionStorage.getItem('becomefamous_signup_success');
    if (signupFlag) {
      message =
        signupFlag === 'phone'
          ? 'Account created! Confirm the SMS code we sent, then sign in.'
          : 'Account created! Confirm the link we emailed you, then sign in.';
      sessionStorage.removeItem('becomefamous_signup_success');
    }

    if (message) {
      setInfoMessage(message);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    setInfoMessage(null);

    try {
      if (!emailOrPhone || !password) {
        throw new Error('Enter your credentials to continue.');
      }

      const { error } = await supabase.auth.signInWithPassword(
        loginMethod === 'email'
          ? { email: emailOrPhone, password }
          : { phone: emailOrPhone, password },
      );

      if (error) {
        throw error;
      }

      setEmailOrPhone('');
      setPassword('');
      onSignIn();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to sign in. Please try again.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialSignIn = (provider: string) => {
    // In a real app, this would trigger OAuth flow
    console.log(`Sign in with ${provider}`);
    onSignIn();
  };

  const handleForgotPassword = async () => {
    setErrorMessage(null);
    setInfoMessage(null);

    if (loginMethod !== 'email') {
      setErrorMessage('Password resets are currently available via email only.');
      return;
    }

    if (!emailOrPhone) {
      setErrorMessage('Enter the email associated with your account first.');
      return;
    }

    setResetLoading(true);
    try {
      const redirectTo = typeof window !== 'undefined' ? window.location.origin : undefined;
      const { error } = await supabase.auth.resetPasswordForEmail(emailOrPhone, {
        redirectTo,
      });

      if (error) {
        throw error;
      }

      setInfoMessage('Check your email for a password reset link.');
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to start password reset. Please try again.',
      );
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-purple-50/20 to-pink-50/30 relative overflow-hidden">
      {/* Animated Background Orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <motion.div
          animate={{
            x: [0, 100, 0],
            y: [0, -50, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute top-10 right-10 w-[500px] h-[500px] rounded-full opacity-10 blur-3xl"
          style={{ 
            background: 'radial-gradient(circle, #9E5DAB 0%, transparent 70%)'
          }}
        />
        <motion.div
          animate={{
            x: [0, -80, 0],
            y: [0, 60, 0],
            scale: [1, 1.15, 1],
          }}
          transition={{
            duration: 28,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute bottom-10 left-10 w-[600px] h-[600px] rounded-full opacity-10 blur-3xl"
          style={{ 
            background: 'radial-gradient(circle, #B481C0 0%, transparent 70%)'
          }}
        />
        <motion.div
          animate={{
            x: [0, 50, 0],
            y: [0, -30, 0],
            scale: [1, 1.05, 1],
          }}
          transition={{
            duration: 22,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full opacity-5 blur-3xl"
          style={{ 
            background: 'radial-gradient(circle, #EBD7DC 0%, transparent 70%)'
          }}
        />
      </div>

      {/* Floating Sparkles */}
      <div className="fixed inset-0 pointer-events-none">
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -30, 0],
              opacity: [0.3, 0.6, 0.3],
              scale: [0.8, 1.2, 0.8],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
              ease: "easeInOut"
            }}
          >
            <Sparkles className="w-4 h-4" style={{ color: '#9E5DAB' }} />
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
              onClick={onNavigateToSignUp}
              className="rounded-full px-8 shadow-lg hover:shadow-xl transition-all"
              style={{ backgroundColor: '#9E5DAB' }}
            >
              Signup →
            </Button>
          </motion.div>
        </div>
      </motion.header>

      {/* Main Content */}
      <div className="relative z-10 max-w-lg mx-auto px-6 py-12 lg:py-20">
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
            <div className="text-center mb-10">
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
                Sign In
              </motion.h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-muted-foreground"
              >
                Welcome back to your creator journey ✨
              </motion.p>
            </div>

            {/* Social Sign In Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="space-y-3 mb-8"
            >
              <motion.div whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }}>
                <Button
                  onClick={() => handleSocialSignIn('Google')}
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
                  onClick={() => handleSocialSignIn('Microsoft')}
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
                  onClick={() => handleSocialSignIn('Apple')}
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
              className="relative mb-8"
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

            {/* Other ways to log in */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="text-center mb-6"
            >
              <p className="text-sm text-muted-foreground">
                Other ways to log in or{' '}
                <button
                  onClick={onNavigateToSignUp}
                  className="text-primary hover:underline"
                  style={{ color: '#9E5DAB' }}
                >
                  Create Account
                </button>
              </p>
            </motion.div>

            {/* Email/Phone Toggle */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="flex gap-2 mb-6"
            >
              <motion.button
                type="button"
                onClick={() => setLoginMethod('email')}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex-1 h-12 rounded-2xl transition-all flex items-center justify-center"
                style={{
                  backgroundColor: loginMethod === 'email' ? '#9E5DAB' : 'white',
                  color: loginMethod === 'email' ? 'white' : '#6b6b6b',
                  border: loginMethod === 'email' ? 'none' : '2px solid #E8E8E8'
                }}
              >
                Email
              </motion.button>
              <motion.button
                type="button"
                onClick={() => setLoginMethod('phone')}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex-1 h-12 rounded-2xl transition-all flex items-center justify-center"
                style={{
                  backgroundColor: loginMethod === 'phone' ? '#9E5DAB' : 'white',
                  color: loginMethod === 'phone' ? 'white' : '#6b6b6b',
                  border: loginMethod === 'phone' ? 'none' : '2px solid #E8E8E8'
                }}
              >
                Phone
              </motion.button>
            </motion.div>

            {/* Login Form */}
            <motion.form
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
              onSubmit={handleSubmit}
              className="space-y-4"
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={loginMethod}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                  className="relative"
                >
                  {loginMethod === 'email' ? (
                    <>
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground z-10" />
                      <Input
                        type="email"
                        placeholder="yuka.tan@outlook.com"
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

              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground z-10" />
                <Input
                  type="password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-12 h-14 rounded-2xl border-0 transition-all bg-[#EBF3FC] focus:bg-white focus:shadow-md"
                  required
                />
              </div>

              <motion.div
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  type="submit"
                  className="w-full h-14 rounded-2xl shadow-lg hover:shadow-2xl transition-all mt-6"
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
                      Signing in...
                    </motion.div>
                  ) : (
                    'Log In'
                  )}
                </Button>
              </motion.div>
            </motion.form>

            {/* Forgot Password */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="mt-6 text-center"
            >
              {errorMessage && (
                <div className="mb-4 bg-destructive/10 text-destructive text-sm rounded-2xl px-4 py-3">
                  {errorMessage}
                </div>
              )}
              {infoMessage && !errorMessage && (
                <div className="mb-4 bg-emerald-100/70 text-emerald-600 text-sm rounded-2xl px-4 py-3">
                  {infoMessage}
                </div>
              )}
              <button
                type="button"
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
                style={{ color: '#9E5DAB' }}
                onClick={handleForgotPassword}
                disabled={resetLoading || isLoading}
              >
                {resetLoading ? 'Sending reset link...' : 'Forgot password?'}
              </button>
            </motion.div>
          </motion.div>

          {/* Footer Text */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.1 }}
            className="mt-8 text-center"
          >
            <p className="text-sm text-muted-foreground">
              Don't have an account?{' '}
              <button
                onClick={onNavigateToSignUp}
                className="hover:underline"
                style={{ color: '#9E5DAB' }}
              >
                Sign up now
              </button>
            </p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
