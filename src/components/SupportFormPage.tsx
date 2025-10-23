import { motion } from 'motion/react';
import { ArrowLeft, Mail, User, MessageSquare, Send, CheckCircle } from 'lucide-react';
import { Button } from './ui/button';
import { BecomeFamousLogo } from './BecomeFamousLogo';
import { useState } from 'react';

interface SupportFormPageProps {
  onBack: () => void;
}

export function SupportFormPage({ onBack }: SupportFormPageProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errors, setErrors] = useState<{[key: string]: string}>({});

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!formData.subject.trim()) {
      newErrors.subject = 'Subject is required';
    }

    if (!formData.message.trim()) {
      newErrors.message = 'Message is required';
    } else if (formData.message.trim().length < 10) {
      newErrors.message = 'Message must be at least 10 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      // Simulate form submission
      console.log('Support form submitted:', formData);
      setStatus('success');
      
      // Reset form after 3 seconds
      setTimeout(() => {
        setFormData({ name: '', email: '', subject: '', message: '' });
        setStatus('idle');
      }, 3000);
    } else {
      setStatus('error');
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
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
      <main className="relative z-10 max-w-3xl mx-auto px-6 py-12">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
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
            <h1>Contact Support</h1>
          </motion.div>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Have a question or need help? We&apos;re here for you. Fill out the form below and we&apos;ll get back to you within 24 hours.
          </p>
        </motion.div>

        {/* Success Message */}
        {status === 'success' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-8 p-6 rounded-2xl text-center"
            style={{ background: 'linear-gradient(135deg, #9E5DAB15 0%, #D1A5DD15 100%)', border: '2px solid #9E5DAB30' }}
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            >
              <CheckCircle className="w-16 h-16 mx-auto mb-4" style={{ color: '#9E5DAB' }} />
            </motion.div>
            <h3 className="mb-2" style={{ color: '#9E5DAB' }}>Message Sent Successfully!</h3>
            <p className="text-muted-foreground">
              Thank you for reaching out. Our support team will get back to you within 24 hours.
            </p>
          </motion.div>
        )}

        {/* Support Form */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="rounded-2xl border border-border/50 overflow-hidden bg-card/50 backdrop-blur-sm"
        >
          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            {/* Name Field */}
            <div>
              <label htmlFor="name" className="flex items-center gap-2 mb-2 text-sm">
                <User className="w-4 h-4" style={{ color: '#9E5DAB' }} />
                Your Name
              </label>
              <input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="Enter your name"
                className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              />
              {errors.name && (
                <motion.p
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-sm text-destructive mt-1"
                >
                  {errors.name}
                </motion.p>
              )}
            </div>

            {/* Email Field */}
            <div>
              <label htmlFor="email" className="flex items-center gap-2 mb-2 text-sm">
                <Mail className="w-4 h-4" style={{ color: '#9E5DAB' }} />
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="your@email.com"
                className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              />
              {errors.email && (
                <motion.p
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-sm text-destructive mt-1"
                >
                  {errors.email}
                </motion.p>
              )}
            </div>

            {/* Subject Field */}
            <div>
              <label htmlFor="subject" className="flex items-center gap-2 mb-2 text-sm">
                <MessageSquare className="w-4 h-4" style={{ color: '#9E5DAB' }} />
                Subject
              </label>
              <input
                id="subject"
                type="text"
                value={formData.subject}
                onChange={(e) => handleChange('subject', e.target.value)}
                placeholder="How can we help?"
                className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              />
              {errors.subject && (
                <motion.p
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-sm text-destructive mt-1"
                >
                  {errors.subject}
                </motion.p>
              )}
            </div>

            {/* Message Field */}
            <div>
              <label htmlFor="message" className="mb-2 block text-sm">
                Your Message
              </label>
              <textarea
                id="message"
                value={formData.message}
                onChange={(e) => handleChange('message', e.target.value)}
                placeholder="Tell us more about your question or issue..."
                rows={6}
                className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-none"
              />
              {errors.message && (
                <motion.p
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-sm text-destructive mt-1"
                >
                  {errors.message}
                </motion.p>
              )}
            </div>

            {/* Submit Button */}
            <motion.button
              type="submit"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-4 rounded-full text-white flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all"
              style={{ background: 'linear-gradient(135deg, #9E5DAB 0%, #D1A5DD 100%)' }}
            >
              <span>Send Message</span>
              <Send className="w-4 h-4" />
            </motion.button>
          </form>
        </motion.div>

        {/* Additional Support Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-12 grid md:grid-cols-2 gap-6"
        >
          <div className="p-6 rounded-2xl bg-card/50 backdrop-blur-sm border border-border/50">
            <h3 className="mb-2">Response Time</h3>
            <p className="text-sm text-muted-foreground">
              We aim to respond to all inquiries within 24 hours during business days.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-card/50 backdrop-blur-sm border border-border/50">
            <h3 className="mb-2">Email Support</h3>
            <p className="text-sm text-muted-foreground">
              You can also reach us directly at{' '}
              <a href="mailto:support@becomefamous.ai" className="underline" style={{ color: '#9E5DAB' }}>
                support@becomefamous.ai
              </a>
            </p>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
