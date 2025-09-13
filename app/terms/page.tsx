export const dynamic = 'force-dynamic'

import DesignStyles from '@/components/DesignStyles'
import FooterReveal from '@/components/FooterReveal'

export default function TermsPage() {
  return (
    <div data-mentor-ui>
      <DesignStyles />
      <main className="landing-orchid-bg min-h-screen">
        <div className="max-w-3xl mx-auto px-6 pt-14 pb-20 fade-in">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900">Terms of Service</h1>
          <p className="mt-2 text-gray-600">Last Updated: September 13, 2025</p>

          <p className="mt-6 text-[17px] leading-relaxed text-gray-800">
            These Terms of Service ("Terms") govern your use of the AI chat mentor service (the "Service") operated by
            BecomeFamous.AI ("we," "our," or "us"). By accessing or using the Service, you agree to these Terms.
          </p>

          <section className="mt-10 space-y-6 text-gray-800">
            <div>
              <h2 className="text-2xl font-bold">1. Description of Service</h2>
              <p className="mt-2">Our Service provides AI‑powered social media marketing advice and mentorship via Claude AI.</p>
              <ul className="list-disc ml-6 mt-2 space-y-2">
                <li>Personalized strategy recommendations</li>
                <li>Content creation guidance</li>
                <li>Optimization advice and insights</li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-bold">2. Account Registration and Eligibility</h2>
              <ul className="list-disc ml-6 mt-2 space-y-2">
                <li>You must be at least 18 years old and provide accurate information.</li>
                <li>You are responsible for safeguarding your credentials and all activity on your account.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-bold">3. Subscription and Payment Terms</h2>
              <ul className="list-disc ml-6 mt-2 space-y-2">
                <li>Subscriptions renew automatically unless cancelled.</li>
                <li>Payments are processed securely through Stripe; keep your payment info current.</li>
                <li>Promotions and trials may change or end at any time.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-bold">4. Acceptable Use Policy</h2>
              <ul className="list-disc ml-6 mt-2 space-y-2">
                <li>Use the Service lawfully and respectfully.</li>
                <li>No harassment, harmful code, scraping, or attempts to bypass security.</li>
                <li>Do not share confidential third‑party data without permission.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-bold">5. Intellectual Property</h2>
              <ul className="list-disc ml-6 mt-2 space-y-2">
                <li>The Service’s design and technology are our property.</li>
                <li>You own content you submit; you grant us a license to operate and improve the Service.</li>
                <li>AI‑generated content is provided "as is" and may not be unique.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-bold">6. Privacy</h2>
              <p className="mt-2">Our <a href="/privacy" className="text-[var(--accent-grape)] underline">Privacy Policy</a> explains how we collect and use data.</p>
            </div>

            <div>
              <h2 className="text-2xl font-bold">7. Disclaimers and Limitation of Liability</h2>
              <ul className="list-disc ml-6 mt-2 space-y-2">
                <li>The Service is provided "as is" without warranties of any kind.</li>
                <li>We are not liable for indirect or consequential damages.</li>
                <li>Our maximum liability is limited to fees paid in the prior 12 months.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-bold">8. Termination</h2>
              <p className="mt-2">We may suspend or terminate accounts that violate these Terms. You may cancel anytime in account settings.</p>
            </div>

            <div>
              <h2 className="text-2xl font-bold">9. Modifications</h2>
              <p className="mt-2">We may update the Service or these Terms; material changes will be communicated via the Service or email.</p>
            </div>

            <div>
              <h2 className="text-2xl font-bold">10. Governing Law and Disputes</h2>
              <p className="mt-2">These Terms are governed by U.S. law. We encourage informal resolution first.</p>
            </div>

            <div>
              <h2 className="text-2xl font-bold">11. Contact</h2>
              <p className="mt-2">Email: <a className="text-[var(--accent-grape)] underline" href="mailto:support@becomefamous.ai">support@becomefamous.ai</a></p>
              <p className="mt-1">Address: business address</p>
            </div>
          </section>
        </div>
      </main>
      <FooterReveal breadcrumb={{ currentLabel: 'Terms of Service' }} />
    </div>
  )
}
