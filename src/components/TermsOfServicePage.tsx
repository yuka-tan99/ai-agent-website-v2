import { motion } from 'motion/react';
import { Button } from './ui/button';
import { BecomeFamousLogo } from './BecomeFamousLogo';
import { ChevronLeft, FileText } from 'lucide-react';

interface TermsOfServicePageProps {
  onBack: () => void;
}

export function TermsOfServicePage({ onBack }: TermsOfServicePageProps) {
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
              <FileText className="w-10 h-10" style={{ color: '#9E5DAB' }} />
            </motion.div>
            <h1 className="mb-4" style={{ color: '#9E5DAB' }}>Terms of Service</h1>
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
                Welcome to BecomeFamous.AI. By accessing or using our platform, you agree to the following Terms of Service.
              </p>

              <div className="space-y-8">
                <section>
                  <h3 style={{ color: '#9E5DAB' }}>1. Use of Services</h3>
                  <p className="text-muted-foreground mb-3">
                    You may use our platform to access personalized reports, learning modules, and mentorship tools. You agree to:
                  </p>
                  <ul className="space-y-2 text-muted-foreground">
                    <li>Provide accurate onboarding responses</li>
                    <li>Use the platform for lawful purposes</li>
                    <li>Not share or resell your dashboard or learning content</li>
                  </ul>
                </section>

                <section>
                  <h3 style={{ color: '#9E5DAB' }}>2. Account & Access</h3>
                  <p className="text-muted-foreground">
                    You are responsible for maintaining the confidentiality of your login credentials. You may not impersonate others or create accounts for unauthorized use.
                  </p>
                </section>

                <section>
                  <h3 style={{ color: '#9E5DAB' }}>3. Payments & Subscriptions</h3>
                  <p className="text-muted-foreground">
                    Access to personalized dashboards and advanced features may require payment. All transactions are securely processed via Stripe. Refunds are subject to our Refund Policy.
                  </p>
                </section>

                <section>
                  <h3 style={{ color: '#9E5DAB' }}>4. Intellectual Property</h3>
                  <p className="text-muted-foreground">
                    All content, designs, and AI-generated materials are owned by BecomeFamous.AI. You may not reproduce, distribute, or modify our content without permission.
                  </p>
                </section>

                <section>
                  <h3 style={{ color: '#9E5DAB' }}>5. Data Use Disclaimer</h3>
                  <p className="text-muted-foreground mb-3">
                    By using our services, you agree that:
                  </p>
                  <ul className="space-y-2 text-muted-foreground">
                    <li>Your onboarding responses and usage behavior may be processed by our AI systems to personalize your experience.</li>
                    <li>We may use anonymized and aggregated data to improve our platform and train our models.</li>
                    <li>We do not sell your personal data. Data is only shared with trusted service providers under strict confidentiality.</li>
                    <li>You retain control over your personal data and may request deletion or export at any time.</li>
                  </ul>
                </section>

                <section>
                  <h3 style={{ color: '#9E5DAB' }}>6. Termination</h3>
                  <p className="text-muted-foreground">
                    We reserve the right to suspend or terminate accounts that violate these terms or misuse the platform.
                  </p>
                </section>

                <section>
                  <h3 style={{ color: '#9E5DAB' }}>7. Limitation of Liability</h3>
                  <p className="text-muted-foreground">
                    We provide our services "as is." We are not liable for any indirect or consequential damages arising from your use of the platform.
                  </p>
                </section>

                <section>
                  <h3 style={{ color: '#9E5DAB' }}>8. Changes to Terms</h3>
                  <p className="text-muted-foreground">
                    We may update these Terms of Service. Continued use of the platform after changes constitutes acceptance.
                  </p>
                </section>
              </div>
            </motion.div>

            {/* Disclaimer Box */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-2xl p-8 border-2"
              style={{ borderColor: '#9E5DAB20' }}
            >
              <h3 className="mb-3 text-center">Important Notice</h3>
              <p className="text-muted-foreground text-center mb-4">
                BecomeFamous.AI is designed to help content creators grow their presence. We are not meant for collecting personally identifiable information (PII) or securing highly sensitive data. Please use our platform responsibly and in accordance with these terms.
              </p>
            </motion.div>

            {/* Contact Information */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="text-center"
            >
              <h3 className="mb-3">Questions About These Terms?</h3>
              <p className="text-muted-foreground mb-4">
                If you have any questions or concerns about our Terms of Service, please contact us.
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
