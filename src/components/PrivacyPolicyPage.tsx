import { motion } from 'motion/react';
import { Button } from './ui/button';
import { BecomeFamousLogo } from './BecomeFamousLogo';
import { ChevronLeft, Shield } from 'lucide-react';

interface PrivacyPolicyPageProps {
  onBack: () => void;
}

export function PrivacyPolicyPage({ onBack }: PrivacyPolicyPageProps) {
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

      {/* Main Content */}
      <div className="relative z-10 max-w-4xl mx-auto px-6 py-16 lg:py-24">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          {/* Header */}
          <div className="text-center mb-12">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
              className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-6"
              style={{ backgroundColor: '#EBD7DC' }}
            >
              <Shield className="w-10 h-10" style={{ color: '#9E5DAB' }} />
            </motion.div>
            <h1 className="mb-4" style={{ color: '#9E5DAB' }}>Privacy Policy</h1>
            <p className="text-muted-foreground">
              Effective Date: October 19, 2025
            </p>
          </div>

          {/* Content */}
          <div className="prose prose-lg max-w-none space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-2xl p-8 shadow-sm border border-border"
            >
              <p className="text-muted-foreground mb-6">
                BecomeFamous.AI ("we," "our," or "us") is committed to protecting your privacy and ensuring transparency in how your data is used. This Privacy Notice explains what information we collect, how we use it, and your rights regarding your personal data.
              </p>

              <div className="space-y-8">
                <section>
                  <h3 style={{ color: '#9E5DAB' }}>1. Information We Collect</h3>
                  <p className="text-muted-foreground mb-3">
                    We collect the following types of information:
                  </p>
                  <ul className="space-y-2 text-muted-foreground">
                    <li><strong>Account Information:</strong> Name, email, password, and profile details.</li>
                    <li><strong>Onboarding Responses:</strong> Answers to personalized questions used to generate your growth report and learning plan.</li>
                    <li><strong>Usage Data:</strong> Interactions with dashboards, lessons, referrals, and other features.</li>
                    <li><strong>Payment Information:</strong> Processed securely via Stripe; we do not store full payment details.</li>
                    <li><strong>Device & Analytics Data:</strong> IP address, browser type, device identifiers, and usage patterns.</li>
                  </ul>
                </section>

                <section>
                  <h3 style={{ color: '#9E5DAB' }}>2. How Your Data Is Used</h3>
                  <p className="text-muted-foreground mb-3">
                    We use your data to:
                  </p>
                  <ul className="space-y-2 text-muted-foreground">
                    <li>Generate personalized reports, learning plans, and mentorship recommendations</li>
                    <li>Improve our AI algorithms and platform features</li>
                    <li>Communicate updates, offers, and support messages</li>
                    <li>Process payments and manage subscriptions</li>
                    <li>Monitor platform performance and detect misuse</li>
                  </ul>
                </section>

                <section>
                  <h3 style={{ color: '#9E5DAB' }}>3. Data Use Disclaimer</h3>
                  <p className="text-muted-foreground mb-3">
                    By using BecomeFamous.AI, you acknowledge and agree that:
                  </p>
                  <ul className="space-y-2 text-muted-foreground">
                    <li>Your onboarding responses and usage patterns may be analyzed by our AI systems to personalize your experience.</li>
                    <li>Aggregated and anonymized data may be used to improve platform performance, train models, and develop new features.</li>
                    <li>We do not sell your personal data to third parties.</li>
                    <li>We may share limited data with trusted service providers (e.g., hosting, analytics, payment processors) under strict confidentiality agreements.</li>
                  </ul>
                </section>

                <section>
                  <h3 style={{ color: '#9E5DAB' }}>4. Your Rights</h3>
                  <p className="text-muted-foreground mb-3">
                    You may:
                  </p>
                  <ul className="space-y-2 text-muted-foreground">
                    <li>Access, update, or delete your account information</li>
                    <li>Request a copy of your data</li>
                    <li>Opt out of marketing communications</li>
                    <li>Request deletion of your onboarding responses or learning history</li>
                  </ul>
                </section>

                <section>
                  <h3 style={{ color: '#9E5DAB' }}>5. Data Security</h3>
                  <p className="text-muted-foreground">
                    We use encryption, secure servers, and access controls to protect your data. Stripe handles all payment data securely.
                  </p>
                </section>

                <section>
                  <h3 style={{ color: '#9E5DAB' }}>6. Children's Privacy</h3>
                  <p className="text-muted-foreground">
                    Our services are not intended for users under 13 years of age.
                  </p>
                </section>

                <section>
                  <h3 style={{ color: '#9E5DAB' }}>7. Changes to This Notice</h3>
                  <p className="text-muted-foreground">
                    We may update this Privacy Notice. Changes will be posted on this page with a revised effective date.
                  </p>
                </section>
              </div>
            </motion.div>

            {/* Contact Information */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-2xl p-8 text-center"
            >
              <h3 className="mb-3">Questions About Your Privacy?</h3>
              <p className="text-muted-foreground mb-4">
                If you have any questions or concerns about this Privacy Policy, please contact us.
              </p>
              <Button
                variant="outline"
                className="rounded-full"
                style={{ borderColor: '#9E5DAB', color: '#9E5DAB' }}
              >
                Contact Support
              </Button>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
