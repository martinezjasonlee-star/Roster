import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#F8F6F3] font-sans text-[#0F172A]">
      <nav className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <a href="/" className="flex items-center gap-2">
            <svg width="24" height="24" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="0" y="5" width="20" height="4" rx="2" fill="#0F172A"/>
              <rect x="0" y="12" width="16" height="4" rx="2" fill="#0F172A"/>
              <rect x="0" y="19" width="12" height="4" rx="2" fill="#E8633B"/>
            </svg>
            <span className="font-bold text-lg">Roster</span>
          </a>
          <a href="/" className="text-sm text-[#0F172A] hover:text-[#0F172A] transition">← Back to site</a>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="bg-white rounded-xl p-8 md:p-12 shadow-sm prose prose-slate max-w-none">
          <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
          <p className="text-sm text-[#0F172A] mb-8">
            <strong>Effective Date:</strong> July 9, 2026<br/>
            <strong>Jurisdiction:</strong> Colorado, USA (Denver-Boulder Metro)
          </p>

          <h2 className="text-xl font-bold mt-8 mb-3">1. Introduction</h2>
          <p className="text-[#0F172A] leading-relaxed mb-4">
            Roster ("we," "our," "us") operates a membership-based marketplace platform (the "Platform") that connects hospitality venues ("Businesses") with bartenders, servers, and other front-of-house hospitality workers ("Workers"). This Privacy Policy explains how we collect, use, store, share, and protect your personal information when you visit our website at <strong>https://roster-work.com</strong> or use our services.
          </p>
          <p className="text-[#0F172A] leading-relaxed mb-4">
            By using Roster, you agree to the data practices described in this policy. If you do not agree, please do not use the Platform.
          </p>

          <h2 className="text-xl font-bold mt-8 mb-3">2. Information We Collect</h2>
          <h3 className="text-lg font-semibold mt-4 mb-2">2.1 Information You Provide</h3>
          <p className="text-[#0F172A] leading-relaxed mb-2"><strong>All Users:</strong></p>
          <ul className="list-disc pl-6 text-[#0F172A] mb-3">
            <li>Name, email address, phone number</li>
            <li>Account credentials (handled via Clerk authentication)</li>
            <li>Communication preferences</li>
            <li>Messages sent through the Platform's in-app messaging system</li>
          </ul>
          <p className="text-[#0F172A] leading-relaxed mb-2"><strong>Businesses:</strong></p>
          <ul className="list-disc pl-6 text-[#0F172A] mb-3">
            <li>Business name, address, venue type, website URL</li>
            <li>Business description and photos</li>
            <li>Billing information (processed through Stripe — we do not store full card numbers)</li>
          </ul>
          <p className="text-[#0F172A] leading-relaxed mb-2"><strong>Workers:</strong></p>
          <ul className="list-disc pl-6 text-[#0F172A] mb-3">
            <li>Work history, experience level, certifications (TIPS, ServSafe, etc.)</li>
            <li>Availability preferences (days, times, shift types)</li>
            <li>Venue preferences and skill specializations</li>
            <li>Background verification information if provided</li>
          </ul>

          <h2 className="text-xl font-bold mt-8 mb-3">3. How We Use Your Information</h2>
          <ul className="list-disc pl-6 text-[#0F172A] mb-4">
            <li><strong>To operate the Platform:</strong> Create accounts, post shifts, process bookings, facilitate messaging between Businesses and Workers</li>
            <li><strong>To process payments:</strong> Handle membership subscriptions via Stripe</li>
            <li><strong>To verify credentials:</strong> Confirm Worker experience and certifications</li>
            <li><strong>To maintain trust:</strong> Operate our two-sided rating system and reliability scoring</li>
            <li><strong>To communicate:</strong> Send service updates, shift notifications, and support responses</li>
            <li><strong>To improve:</strong> Analyze usage to improve the Platform</li>
            <li><strong>To comply:</strong> Meet legal obligations and enforce our Terms of Service</li>
          </ul>

          <h2 className="text-xl font-bold mt-8 mb-3">4. Information Sharing</h2>
          <p className="text-[#0F172A] leading-relaxed mb-4">
            We share information only in these circumstances:
          </p>
          <ul className="list-disc pl-6 text-[#0F172A] mb-4">
            <li><strong>Between Users:</strong> Worker profiles (experience, certifications, ratings) are visible to Businesses. Business profiles are visible to Workers.</li>
            <li><strong>Service Providers:</strong> Clerk (authentication), Stripe (payment processing), Turso (database hosting), Cloudflare (domain and security)</li>
            <li><strong>Legal:</strong> When required by law or to protect our rights</li>
            <li><strong>Business Transfer:</strong> In connection with a merger, sale, or acquisition</li>
          </ul>
          <p className="text-[#0F172A] leading-relaxed mb-4">
            We do <strong>not</strong> sell your personal information to third parties.
          </p>

          <h2 className="text-xl font-bold mt-8 mb-3">5. Your Rights (Colorado Residents)</h2>
          <p className="text-[#0F172A] leading-relaxed mb-4">
            Under the Colorado Privacy Act (CPA), Colorado residents have:
          </p>
          <ul className="list-disc pl-6 text-[#0F172A] mb-4">
            <li><strong>Right to Know:</strong> What personal data we collect and how we use it</li>
            <li><strong>Right to Access:</strong> Request a copy of your personal data</li>
            <li><strong>Right to Correct:</strong> Request correction of inaccurate data</li>
            <li><strong>Right to Delete:</strong> Request deletion of your personal data</li>
            <li><strong>Right to Portability:</strong> Request a portable copy of your data</li>
            <li><strong>Right to Opt Out:</strong> Opt out of the sale of personal data (we do not sell data)</li>
          </ul>
          <p className="text-[#0F172A] leading-relaxed mb-4">
            To exercise your rights, contact us at <strong>roster-f145134e@ctomail.io</strong>. We will respond within 45 days as required by the CPA.
          </p>

          <h2 className="text-xl font-bold mt-8 mb-3">6. Data Security</h2>
          <p className="text-[#0F172A] leading-relaxed mb-4">
            We implement industry-standard security measures including encryption in transit (TLS), secure authentication (Clerk), and tokenized payment processing (Stripe). However, no method of transmission or storage is 100% secure.
          </p>

          <h2 className="text-xl font-bold mt-8 mb-3">7. Data Retention</h2>
          <p className="text-[#0F172A] leading-relaxed mb-4">
            We retain your information as long as your account is active. Deleted accounts have data anonymized within 90 days. Ratings and reviews are retained to preserve platform integrity.
          </p>

          <h2 className="text-xl font-bold mt-8 mb-3">8. Cookies</h2>
          <p className="text-[#0F172A] leading-relaxed mb-4">
            We use essential cookies for authentication (Clerk) and session management. We do not use tracking cookies or third-party advertising cookies.
          </p>

          <h2 className="text-xl font-bold mt-8 mb-3">9. Third-Party Services</h2>
          <p className="text-[#0F172A] leading-relaxed mb-4">
            Roster integrates with:
          </p>
          <ul className="list-disc pl-6 text-[#0F172A] mb-4">
            <li><strong>Clerk</strong> — Authentication. See <a href="https://clerk.com/legal/privacy" className="text-[#E8633B] hover:underline">Clerk Privacy Policy</a></li>
            <li><strong>Stripe</strong> — Payment processing. See <a href="https://stripe.com/privacy" className="text-[#E8633B] hover:underline">Stripe Privacy Policy</a></li>
            <li><strong>Turso (SQLite)</strong> — Database hosting</li>
            <li><strong>Cloudflare</strong> — DNS and security</li>
          </ul>

          <h2 className="text-xl font-bold mt-8 mb-3">10. Changes to This Policy</h2>
          <p className="text-[#0F172A] leading-relaxed mb-4">
            We may update this Privacy Policy. Material changes will be notified via email or platform notice.
          </p>

          <h2 className="text-xl font-bold mt-8 mb-3">11. Contact</h2>
          <p className="text-[#0F172A] leading-relaxed mb-4">
            For privacy inquiries or data requests:<br/>
            Email: <strong>roster-f145134e@ctomail.io</strong>
          </p>
        </div>
      </div>

      <footer className="border-t border-slate-200 px-6 py-8">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-[#0F172A]">© 2026 Roster. All rights reserved.</p>
          <div className="flex gap-4 text-xs text-[#0F172A]">
            <a href="/privacy" className="hover:text-[#0F172A] transition font-semibold text-[#0F172A]">Privacy</a>
            <a href="/terms" className="hover:text-[#0F172A] transition">Terms</a>
            <a href="/" className="hover:text-[#0F172A] transition">Home</a>
          </div>
        </div>
      </footer>
    </div>
  );
}