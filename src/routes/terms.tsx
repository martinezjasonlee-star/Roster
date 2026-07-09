import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/terms")({
  component: TermsPage,
});

function TermsPage() {
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
          <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
          <p className="text-sm text-[#0F172A] mb-8">
            <strong>Effective Date:</strong> July 9, 2026<br/>
            <strong>Jurisdiction:</strong> Colorado, USA
          </p>

          <h2 className="text-xl font-bold mt-8 mb-3">1. Acceptance of Terms</h2>
          <p className="text-[#0F172A] leading-relaxed mb-4">
            By accessing or using Roster ("the Platform"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree, do not use the Platform.
          </p>
          <p className="text-[#0F172A] leading-relaxed mb-4">
            Roster operates a membership-based marketplace connecting hospitality venues ("Businesses") with bartenders, servers, and front-of-house workers ("Workers"). Collectively, Businesses and Workers are "Users."
          </p>

          <h2 className="text-xl font-bold mt-8 mb-3">2. Definitions</h2>
          <div className="overflow-x-auto mb-4">
            <table className="w-full text-sm">
              <thead><tr className="border-b"><th className="text-left py-2 pr-4 font-semibold">Term</th><th className="text-left py-2 font-semibold">Definition</th></tr></thead>
              <tbody>
                <tr className="border-b"><td className="py-2 pr-4 text-[#0F172A]"><strong>Platform</strong></td><td className="py-2 text-[#0F172A]">Roster's website and related services at https://roster-work.com</td></tr>
                <tr className="border-b"><td className="py-2 pr-4 text-[#0F172A]"><strong>Business</strong></td><td className="py-2 text-[#0F172A]">A venue or operator using the Platform to find and book Workers</td></tr>
                <tr className="border-b"><td className="py-2 pr-4 text-[#0F172A]"><strong>Worker</strong></td><td className="py-2 text-[#0F172A]">A hospitality professional using the Platform to find shift work</td></tr>
                <tr className="border-b"><td className="py-2 pr-4 text-[#0F172A]"><strong>Shift</strong></td><td className="py-2 text-[#0F172A]">A work assignment posted by a Business and accepted by a Worker</td></tr>
                <tr className="border-b"><td className="py-2 pr-4 text-[#0F172A]"><strong>Membership</strong></td><td className="py-2 text-[#0F172A]">A paid subscription plan for Businesses</td></tr>
              </tbody>
            </table>
          </div>

          <h2 className="text-xl font-bold mt-8 mb-3">3. Account Registration</h2>
          <p className="text-[#0F172A] leading-relaxed mb-4">
            You must create an account to use the Platform. You agree to provide accurate information and keep your credentials secure. You are responsible for all activity under your account.
          </p>

          <h2 className="text-xl font-bold mt-8 mb-3">4. Business Memberships</h2>
          <p className="text-[#0F172A] leading-relaxed mb-4">
            Businesses pay a recurring membership fee for Platform access. Plans are month-to-month unless annual billing is selected. Cancellation takes effect at the end of the current billing period. No refunds for partial months.
          </p>

          <h2 className="text-xl font-bold mt-8 mb-3">5. Marketplace — No Employment Relationship</h2>
          <p className="text-[#0F172A] leading-relaxed mb-4">
            Roster is a <strong>marketplace platform</strong>, not an employer, staffing agency, or temporary help service. Businesses and Workers are independent parties. Roster does not:
          </p>
          <ul className="list-disc pl-6 text-[#0F172A] mb-4">
            <li>Supervise, direct, or control how Workers perform their shifts</li>
            <li>Set wages, working conditions, or employment terms</li>
            <li>Withhold taxes or provide benefits, workers' compensation, or unemployment insurance</li>
            <li>Guarantee shift fulfillment or Worker performance</li>
          </ul>

          <h2 className="text-xl font-bold mt-8 mb-3">6. Worker Classification</h2>
          <p className="text-[#0F172A] leading-relaxed mb-4">
            Workers are independent contractors. Businesses are solely responsible for compliance with all applicable laws regarding worker classification, wage and hour requirements, tip reporting, and employment taxes.
          </p>

          <h2 className="text-xl font-bold mt-8 mb-3">7. Shift Postings and Bookings</h2>
          <p className="text-[#0F172A] leading-relaxed mb-4">
            Businesses are responsible for accurate shift details. Workers are responsible for fulfilling accepted shifts. No-shows or late cancellations may affect Worker reliability scores. Businesses pay Workers directly.
          </p>

          <h2 className="text-xl font-bold mt-8 mb-3">8. Payments</h2>
          <p className="text-[#0F172A] leading-relaxed mb-4">
            <strong>Membership fees</strong> are processed via Stripe. Businesses provide valid payment information. Failed payments may result in account suspension.<br/><br/>
            <strong>Shift wages</strong> are paid by Businesses directly to Workers. Roster does not process or guarantee wage payments.
          </p>

          <h2 className="text-xl font-bold mt-8 mb-3">9. Ratings and Reviews</h2>
          <p className="text-[#0F172A] leading-relaxed mb-4">
            After shifts, Businesses and Workers rate each other. Ratings are visible to other Users. We reserve the right to remove ratings that are fraudulent, abusive, or in violation of these Terms.
          </p>

          <h2 className="text-xl font-bold mt-8 mb-3">10. Reliability Standards</h2>
          <p className="text-[#0F172A] leading-relaxed mb-4">
            Workers with repeated no-shows or late cancellations may have their accounts suspended or removed. This is at Roster's sole discretion.
          </p>

          <h2 className="text-xl font-bold mt-8 mb-3">11. Prohibited Conduct</h2>
          <ul className="list-disc pl-6 text-[#0F172A] mb-4">
            <li>Creating fake accounts or misrepresenting identity or experience</li>
            <li>Contacting Users outside the Platform before a confirmed booking</li>
            <li>Posting inaccurate or misleading shift information</li>
            <li>Harassing, discriminating against, or defrauding other Users</li>
            <li>Using the Platform for any illegal purpose</li>
            <li>Circumventing the membership model by arranging off-platform bookings with Users met through Roster</li>
          </ul>

          <h2 className="text-xl font-bold mt-8 mb-3">12. Anti-Poaching</h2>
          <p className="text-[#0F172A] leading-relaxed mb-4">
            Businesses agree not to hire Workers met through Roster as direct W-2 employees or regular part-time staff without maintaining an active membership. This protects the platform's network value for all members.
          </p>

          <h2 className="text-xl font-bold mt-8 mb-3">13. Intellectual Property</h2>
          <p className="text-[#0F172A] leading-relaxed mb-4">
            Roster's name, logo, and platform design are our intellectual property. User content (ratings, reviews, profile information) is owned by the User with a license granted to Roster to display on the Platform.
          </p>

          <h2 className="text-xl font-bold mt-8 mb-3">14. Limitation of Liability</h2>
          <p className="text-[#0F172A] leading-relaxed mb-4">
            Roster is provided "as is" without warranties. To the maximum extent permitted by law, Roster's liability is limited to the total membership fees paid in the 12 months preceding a claim. We are not liable for:
          </p>
          <ul className="list-disc pl-6 text-[#0F172A] mb-4">
            <li>Worker no-shows, late arrivals, or performance issues</li>
            <li>Disputes between Businesses and Workers regarding wages or working conditions</li>
            <li>Losses from unauthorized account access</li>
            <li>Service interruptions or data loss</li>
          </ul>

          <h2 className="text-xl font-bold mt-8 mb-3">15. Termination</h2>
          <p className="text-[#0F172A] leading-relaxed mb-4">
            Either party may terminate at any time. Roster may suspend or terminate accounts for violations of these Terms. Upon termination, your access to the Platform ends.
          </p>

          <h2 className="text-xl font-bold mt-8 mb-3">16. Governing Law and Dispute Resolution</h2>
          <p className="text-[#0F172A] leading-relaxed mb-4">
            These Terms are governed by Colorado law. Disputes shall be resolved through binding arbitration in Boulder County, Colorado. Class actions are waived.
          </p>

          <h2 className="text-xl font-bold mt-8 mb-3">17. Changes to Terms</h2>
          <p className="text-[#0F172A] leading-relaxed mb-4">
            We may update these Terms. Material changes will be notified via email or platform notice. Continued use after changes constitutes acceptance.
          </p>

          <h2 className="text-xl font-bold mt-8 mb-3">18. Contact</h2>
          <p className="text-[#0F172A] leading-relaxed mb-4">
            Email: <strong>roster-f145134e@ctomail.io</strong>
          </p>
        </div>
      </div>

      <footer className="border-t border-slate-200 px-6 py-8">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-[#0F172A]">© 2026 Roster. All rights reserved.</p>
          <div className="flex gap-4 text-xs text-[#0F172A]">
            <a href="/privacy" className="hover:text-[#0F172A] transition">Privacy</a>
            <a href="/terms" className="hover:text-[#0F172A] transition font-semibold text-[#0F172A]">Terms</a>
            <a href="/" className="hover:text-[#0F172A] transition">Home</a>
          </div>
        </div>
      </footer>
    </div>
  );
}