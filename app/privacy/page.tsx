export const dynamic = 'force-dynamic'

import DesignStyles from '@/components/DesignStyles'
import FooterReveal from '@/components/FooterReveal'

export default function PrivacyPage() {
  return (
    <div data-mentor-ui>
      <DesignStyles />
      <main className="landing-orchid-bg min-h-screen">
        <div className="max-w-3xl mx-auto px-6 pt-14 pb-20 fade-in">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900">Privacy Policy</h1>
          <p className="mt-2 text-gray-600">Last Updated: September 13, 2025</p>

          <p className="mt-6 text-[17px] leading-relaxed text-gray-800">
            This Privacy Policy describes how BecomeFamous.AI ("we," "our," or "us") collects, uses, and shares
            information when you use our AI chat mentor service (the "Service") available at becomefamous.ai.
          </p>

          <section className="mt-10 space-y-6 text-gray-800">
            <div>
              <h2 className="text-2xl font-bold">1. Information We Collect</h2>
              <h3 className="mt-4 text-lg font-semibold">1.1 Information You Provide</h3>
              <ul className="list-disc ml-6 mt-2 space-y-2">
                <li><strong>Account Information:</strong> Name, email address, username, and password when you create an account.</li>
                <li><strong>Profile Information:</strong> Optional profile details such as business type, marketing goals, and preferences.</li>
                <li><strong>Payment Information:</strong> Billing details processed through Stripe (we do not store credit card information).</li>
                <li><strong>Communications:</strong> Messages, chat conversations, and feedback you provide through our Service.</li>
              </ul>

              <h3 className="mt-6 text-lg font-semibold">1.2 Information Automatically Collected</h3>
              <ul className="list-disc ml-6 mt-2 space-y-2">
                <li><strong>Usage Data:</strong> Information about how you interact with our Service, including features used, time spent, and session frequency.</li>
                <li><strong>Device Information:</strong> IP address, browser type, device type, operating system, and unique device identifiers.</li>
                <li><strong>Cookies and Similar Technologies:</strong> Cookies, web beacons, and similar tracking technologies to enhance your experience.</li>
              </ul>

              <h3 className="mt-6 text-lg font-semibold">1.3 AI-Generated Content</h3>
              <ul className="list-disc ml-6 mt-2 space-y-2">
                <li><strong>Chat Conversations:</strong> Your interactions with our AI mentor, including questions asked and advice received.</li>
                <li><strong>Analysis Data:</strong> Insights and recommendations generated based on your inputs.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-bold">2. How We Use Your Information</h2>
              <ul className="list-disc ml-6 mt-2 space-y-2">
                <li>Provide, maintain, and improve our Service.</li>
                <li>Process payments and manage subscriptions through Stripe.</li>
                <li>Personalize your experience and provide relevant social media marketing advice.</li>
                <li>Communicate about your account, updates, and promotional offers.</li>
                <li>Analyze usage patterns to enhance functionality.</li>
                <li>Ensure security and prevent fraud or abuse.</li>
                <li>Comply with legal obligations and resolve disputes.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-bold">3. Information Sharing and Disclosure</h2>
              <h3 className="mt-4 text-lg font-semibold">3.1 Service Providers</h3>
              <ul className="list-disc ml-6 mt-2 space-y-2">
                <li><strong>Anthropic (Claude AI):</strong> Chat messages are processed through Claude's API to generate responses.</li>
                <li><strong>Stripe:</strong> Payment processing and subscription management.</li>
                <li><strong>Cloud Hosting Providers:</strong> Data storage and infrastructure.</li>
                <li><strong>Analytics Providers:</strong> Understanding usage and performance.</li>
              </ul>
              <h3 className="mt-6 text-lg font-semibold">3.2 Legal Requirements</h3>
              <p className="mt-2">We may disclose information to comply with laws, court orders, or to protect rights, property, or safety.</p>
              <h3 className="mt-6 text-lg font-semibold">3.3 Business Transfers</h3>
              <p className="mt-2">In a merger, acquisition, or sale of assets, information may be transferred as part of that transaction.</p>
            </div>

            <div>
              <h2 className="text-2xl font-bold">4. Data Processing with Claude AI</h2>
              <h3 className="mt-4 text-lg font-semibold">4.1 AI Processing</h3>
              <p className="mt-2">Your chat messages are sent to Anthropic's Claude API for processing and response generation.</p>
              <h3 className="mt-6 text-lg font-semibold">4.2 Data Retention for AI</h3>
              <p className="mt-2">Conversations may be retained to improve quality and personalization. You can request deletion at any time.</p>
            </div>

            <div>
              <h2 className="text-2xl font-bold">5. Data Security</h2>
              <ul className="list-disc ml-6 mt-2 space-y-2">
                <li>Encryption of data in transit and at rest</li>
                <li>Regular security audits and monitoring</li>
                <li>Access controls and authentication</li>
                <li>Secure payment processing through Stripe</li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-bold">6. Your Rights and Choices</h2>
              <h3 className="mt-4 text-lg font-semibold">6.1 Account Management</h3>
              <ul className="list-disc ml-6 mt-2 space-y-2">
                <li>Access, update, or delete your account information</li>
                <li>Manage subscription and billing preferences</li>
                <li>Control communication preferences</li>
              </ul>
              <h3 className="mt-6 text-lg font-semibold">6.2 Data Rights</h3>
              <p className="mt-2">Depending on your location, you may have additional rights to access, rectify, delete, port, or object.</p>
              <h3 className="mt-6 text-lg font-semibold">6.3 Cookie Controls</h3>
              <p className="mt-2">Manage cookie preferences in your browser settings (may affect functionality).</p>
            </div>

            <div>
              <h2 className="text-2xl font-bold">7. Data Retention</h2>
              <p className="mt-2">We retain information as long as necessary to provide the Service, comply with law, resolve disputes, and improve features.</p>
            </div>

            <div>
              <h2 className="text-2xl font-bold">8. International Data Transfers</h2>
              <p className="mt-2">Your information may be processed in other countries with appropriate safeguards (e.g., SCCs, adequacy decisions).</p>
            </div>

            <div>
              <h2 className="text-2xl font-bold">9. Children's Privacy</h2>
              <p className="mt-2">The Service is not intended for children under 13. If we learn of collection from a child, we will delete it.</p>
            </div>

            <div>
              <h2 className="text-2xl font-bold">10. Third-Party Links and Services</h2>
              <p className="mt-2">Our Service may contain links to third-party websites or services. Their policies apply to those sites.</p>
            </div>

            <div>
              <h2 className="text-2xl font-bold">11. Changes to This Privacy Policy</h2>
              <p className="mt-2">We may update this Policy periodically. We will notify you of material changes via prominent notice or email.</p>
            </div>

            <div>
              <h2 className="text-2xl font-bold">12. Contact Information</h2>
              <p className="mt-2">Email: <a className="text-[var(--accent-grape)] underline" href="mailto:support@becomefamous.ai">support@becomefamous.ai</a></p>
              <p className="mt-1">Address: business address</p>
            </div>

            <div>
              <h2 className="text-2xl font-bold">13. State-Specific Rights</h2>
              <p className="mt-2">Residents of certain states (e.g., California CCPA) may have additional rights. Contact us to learn more.</p>
            </div>
          </section>
        </div>
      </main>
      <FooterReveal breadcrumb={{ currentLabel: 'Privacy Policy' }} />
    </div>
  )
}
