import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return (
    <div className="min-h-screen bg-white font-sans text-[#0F172A]">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="0" y="5" width="20" height="4" rx="2" fill="#0F172A"/>
            <rect x="0" y="12" width="16" height="4" rx="2" fill="#0F172A"/>
            <rect x="0" y="19" width="12" height="4" rx="2" fill="#E8633B"/>
          </svg>
          <span className="font-bold text-xl tracking-tight">Roster</span>
        </div>
        <div className="flex items-center gap-4">
          <a href="#" className="text-sm font-medium text-slate-600 hover:text-[#0F172A] transition">For Venues</a>
          <a href="#" className="text-sm font-medium text-slate-600 hover:text-[#0F172A] transition">For Workers</a>
          <a href="#" className="bg-[#E8633B] text-white px-5 py-2 rounded-lg font-semibold text-sm hover:bg-[#d4552e] transition">
            Join as a Venue
          </a>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="px-6 py-20 md:py-28 max-w-5xl mx-auto text-center">
        <span className="inline-block rounded-full bg-[#0F172A]/5 px-4 py-1.5 text-sm font-medium text-[#0F172A] mb-6">
          Denver-Boulder's newest hospitality staffing network
        </span>
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-tight mb-6 text-[#0F172A]">
          Staff your shifts in minutes —{" "}
          <span className="text-[#E8633B]">without the agency markup.</span>
        </h1>
        <p className="text-lg md:text-xl text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed">
          Roster is the subscription-based network of vetted local bartenders and servers. 
          Post a shift, get matched with pros who already know their craft, and pay a flat 
          monthly fee — zero commission per booking.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a href="#" className="inline-block bg-[#E8633B] text-white px-8 py-3.5 rounded-lg font-semibold text-lg hover:bg-[#d4552e] transition shadow-lg shadow-[#E8633B]/25">
            Join as a Venue →
          </a>
          <a href="#" className="inline-block border-2 border-[#0F172A] text-[#0F172A] px-8 py-3.5 rounded-lg font-semibold text-lg hover:bg-[#0F172A] hover:text-white transition">
            I'm a Bartender or Server →
          </a>
        </div>
      </section>

      {/* How It Works — Businesses */}
      <section className="bg-[#F8F6F3] px-6 py-20">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4 text-[#0F172A]">Three taps to a full bar.</h2>
          <p className="text-center text-slate-600 mb-12 max-w-xl mx-auto">Post a shift and get back to running your venue. It's that simple.</p>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white rounded-xl p-8 shadow-sm">
              <div className="w-10 h-10 rounded-full bg-[#E8633B] text-white flex items-center justify-center font-bold text-lg mb-4">1</div>
              <h3 className="text-xl font-bold mb-2">Post</h3>
              <p className="text-slate-600">Tell us what you need — role, date, time, location. Takes 60 seconds.</p>
            </div>
            <div className="bg-white rounded-xl p-8 shadow-sm">
              <div className="w-10 h-10 rounded-full bg-[#E8633B] text-white flex items-center justify-center font-bold text-lg mb-4">2</div>
              <h3 className="text-xl font-bold mb-2">Match</h3>
              <p className="text-slate-600">Our network of pre-vetted local pros sees your shift and applies, or invite the right ones directly.</p>
            </div>
            <div className="bg-white rounded-xl p-8 shadow-sm">
              <div className="w-10 h-10 rounded-full bg-[#E8633B] text-white flex items-center justify-center font-bold text-lg mb-4">3</div>
              <h3 className="text-xl font-bold mb-2">Pour</h3>
              <p className="text-slate-600">Your shift is covered. No phone tag, no agency coordinator, no surprise markup.</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works — Workers */}
      <section className="px-6 py-20">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4 text-[#0F172A]">Your calendar. Your rates. Your roster.</h2>
          <p className="text-center text-slate-600 mb-12 max-w-xl mx-auto">Work when you want, where you want, and keep 100% of what you earn.</p>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="border border-slate-200 rounded-xl p-8">
              <div className="w-10 h-10 rounded-full bg-[#0F172A] text-white flex items-center justify-center font-bold text-lg mb-4">1</div>
              <h3 className="text-xl font-bold mb-2">Create your profile</h3>
              <p className="text-slate-600">Show your experience, certifications (TIPS, ServSafe), venue preferences, and availability.</p>
            </div>
            <div className="border border-slate-200 rounded-xl p-8">
              <div className="w-10 h-10 rounded-full bg-[#0F172A] text-white flex items-center justify-center font-bold text-lg mb-4">2</div>
              <h3 className="text-xl font-bold mb-2">Browse or accept</h3>
              <p className="text-slate-600">Shifts appear that match your skills, location, and schedule. Accept with one tap.</p>
            </div>
            <div className="border border-slate-200 rounded-xl p-8">
              <div className="w-10 h-10 rounded-full bg-[#0F172A] text-white flex items-center justify-center font-bold text-lg mb-4">3</div>
              <h3 className="text-xl font-bold mb-2">Work and earn</h3>
              <p className="text-slate-600">Show up, do what you do best, get paid directly. No agency taking a cut. Build relationships.</p>
            </div>
          </div>
          <div className="text-center mt-8">
            <a href="#" className="inline-block border-2 border-[#0F172A] text-[#0F172A] px-8 py-3 rounded-lg font-semibold hover:bg-[#0F172A] hover:text-white transition">
              Join Free as a Bartender or Server →
            </a>
          </div>
        </div>
      </section>

      {/* Value Propositions */}
      <section className="bg-[#0F172A] px-6 py-20">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4 text-white">Built for hospitality.</h2>
          <p className="text-center text-slate-300 mb-12 max-w-xl mx-auto">Every feature designed around how venues and staff actually work.</p>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white/10 rounded-xl p-6 backdrop-blur-sm">
              <div className="text-[#E8633B] text-2xl mb-3">💰</div>
              <h3 className="text-white font-bold mb-2">Predictable costs</h3>
              <p className="text-slate-300 text-sm">One flat membership fee. No 30% per-shift markup. You know your labor budget before you post.</p>
            </div>
            <div className="bg-white/10 rounded-xl p-6 backdrop-blur-sm">
              <div className="text-[#E8633B] text-2xl mb-3">✅</div>
              <h3 className="text-white font-bold mb-2">Vetted, not random</h3>
              <p className="text-slate-300 text-sm">Every worker has verified experience, real references, and a reputation score from actual shifts on Roster.</p>
            </div>
            <div className="bg-white/10 rounded-xl p-6 backdrop-blur-sm">
              <div className="text-[#E8633B] text-2xl mb-3">🍸</div>
              <h3 className="text-white font-bold mb-2">Built for hospitality</h3>
              <p className="text-slate-300 text-sm">Role types, certifications, dress codes, shift types, pay ranges — we speak your language.</p>
            </div>
            <div className="bg-white/10 rounded-xl p-6 backdrop-blur-sm">
              <div className="text-[#E8633B] text-2xl mb-3">🔄</div>
              <h3 className="text-white font-bold mb-2">Relationships, not transactions</h3>
              <p className="text-slate-300 text-sm">The same great bartender who crushed your Friday rush can cover your Saturday brunch. Repeat booking built in.</p>
            </div>
            <div className="bg-white/10 rounded-xl p-6 backdrop-blur-sm">
              <div className="text-[#E8633B] text-2xl mb-3">✂️</div>
              <h3 className="text-white font-bold mb-2">Cancel anytime</h3>
              <p className="text-slate-300 text-sm">No long-term contracts. Month-to-month or save with annual. Your membership scales with your needs.</p>
            </div>
            <div className="bg-white/10 rounded-xl p-6 backdrop-blur-sm">
              <div className="text-[#E8633B] text-2xl mb-3">🏆</div>
              <h3 className="text-white font-bold mb-2">Workers keep 100%</h3>
              <p className="text-slate-300 text-sm">No agency taking a cut of your wage. Free to join, free to work, free to book your next shift.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="px-6 py-20">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4 text-[#0F172A]">Why Roster beats agencies</h2>
          <p className="text-center text-slate-600 mb-12 max-w-xl mx-auto">The old model is broken. Here's how we fixed it.</p>
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#F8F6F3] border-b border-slate-200">
                  <th className="text-left px-6 py-4 font-semibold text-[#0F172A]"></th>
                  <th className="text-left px-6 py-4 font-semibold text-slate-500">Traditional Agency</th>
                  <th className="text-left px-6 py-4 font-semibold text-[#E8633B]">Roster</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Pricing", "30–50% markup on every shift", "Flat monthly membership"],
                  ["Contracts", "Annual agreements, cancellation fees", "Month-to-month, cancel anytime"],
                  ["Staff quality", "Temporary, often unknown", "Repeat, vetted, rated"],
                  ["Booking process", "Call/email coordinator, wait for callback", "Post in-app, see matches instantly"],
                  ["Worker pay", "Agency takes big cut of wage", "Worker keeps 100% of their rate"],
                ].map(([feature, agency, roster], i) => (
                  <tr key={i} className="border-b border-slate-100">
                    <td className="px-6 py-4 font-semibold text-[#0F172A]">{feature}</td>
                    <td className="px-6 py-4 text-slate-500">{agency}</td>
                    <td className="px-6 py-4 text-[#E8633B] font-medium">{roster}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Trust & Verification */}
      <section className="bg-[#F8F6F3] px-6 py-20">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4 text-[#0F172A]">Every shift. Every pro. Verified.</h2>
          <p className="text-center text-slate-600 mb-12 max-w-xl mx-auto">Trust isn't optional in hospitality. Here's how we build it.</p>
          <div className="grid md:grid-cols-5 gap-4">
            {[
              ["🪪", "ID & Background Verified", "Every worker completes identity verification before their first shift."],
              ["📋", "Experience-Checked", "Minimum 2 years of verified on-the-floor experience with references."],
              ["🏅", "Certification-Tracked", "TIPS, ServSafe, and state-mandated alcohol training verified and stored."],
              ["⭐", "Two-Sided Ratings", "After every shift, venues rate workers and workers rate venues."],
              ["📊", "Reliability Scoring", "No-shows and late cancellations hit a worker's score. Venues see it before booking."],
            ].map(([icon, title, desc], i) => (
              <div key={i} className="bg-white rounded-xl p-6 shadow-sm text-center">
                <div className="text-3xl mb-3">{icon}</div>
                <h3 className="font-bold text-sm mb-1 text-[#0F172A]">{title}</h3>
                <p className="text-xs text-slate-500">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Teaser */}
      <section className="px-6 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-[#0F172A]">Transparent pricing. One flat fee.</h2>
          <p className="text-slate-600 mb-10">No per-booking commissions. No hidden fees. No surprise invoices.</p>
          <div className="grid md:grid-cols-3 gap-6 max-w-3xl mx-auto">
            <div className="border border-slate-200 rounded-xl p-8 text-center">
              <h3 className="font-bold text-xl mb-2">Starter</h3>
              <p className="text-slate-500 text-sm mb-4">For small venues filling 1–5 shifts/mo</p>
              <p className="text-4xl font-bold text-[#0F172A] mb-2">$99<span className="text-lg text-slate-400 font-normal">/mo</span></p>
              <p className="text-sm text-slate-400 mb-6">or $79/mo billed annually</p>
              <a href="#" className="block w-full border-2 border-[#0F172A] text-[#0F172A] px-4 py-2 rounded-lg font-semibold text-sm hover:bg-[#0F172A] hover:text-white transition">Get Started</a>
            </div>
            <div className="border-2 border-[#E8633B] rounded-xl p-8 text-center relative">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#E8633B] text-white px-4 py-0.5 rounded-full text-xs font-semibold">Most Popular</span>
              <h3 className="font-bold text-xl mb-2">Pro</h3>
              <p className="text-slate-500 text-sm mb-4">For busy venues filling 5–20 shifts/mo</p>
              <p className="text-4xl font-bold text-[#0F172A] mb-2">$249<span className="text-lg text-slate-400 font-normal">/mo</span></p>
              <p className="text-sm text-slate-400 mb-6">or $199/mo billed annually</p>
              <a href="#" className="block w-full bg-[#E8633B] text-white px-4 py-2 rounded-lg font-semibold text-sm hover:bg-[#d4552e] transition">Get Started</a>
            </div>
            <div className="border border-slate-200 rounded-xl p-8 text-center">
              <h3 className="font-bold text-xl mb-2">Enterprise</h3>
              <p className="text-slate-500 text-sm mb-4">For multi-location & high-volume</p>
              <p className="text-4xl font-bold text-[#0F172A] mb-2">Custom</p>
              <p className="text-sm text-slate-400 mb-6">Contact us for pricing</p>
              <a href="#" className="block w-full border-2 border-[#0F172A] text-[#0F172A] px-4 py-2 rounded-lg font-semibold text-sm hover:bg-[#0F172A] hover:text-white transition">Contact Sales</a>
            </div>
          </div>
          <p className="mt-8 text-sm text-slate-500">Workers join free. Always. No membership fee, no commission.</p>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-[#F8F6F3] px-6 py-20">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-10 text-[#0F172A]">Frequently asked questions</h2>
          <div className="space-y-4">
            {[
              ["How is Roster different from a temp agency?", "Temp agencies charge 30–50% per shift. Roster charges a flat monthly membership. You post as many shifts as your plan allows, and workers keep 100% of their wage. No markup. No middleman taking a cut every time."],
              ["What if a worker doesn't show up?", "It happens rarely (our reliability scoring discourages it), but when it does, we immediately alert the nearest available workers on Roster to rebook. Persistent no-shows are removed from the platform."],
              ["Can we book the same worker repeatedly?", "Absolutely — that's the whole point. Roster is built for repeat relationships. Your favorite bartender can cover your regular shifts, request time off, and come back. It's like having a bench of part-time staff you actually trust."],
              ["Is there a minimum commitment?", "Nope. All business plans are month-to-month. Annual pricing saves you money but isn't required. Cancel anytime with 30 days' notice."],
              ["What types of shifts can I post?", "Any front-of-house shift — bartender, server, barback, service bartender, banquet server, event bartender. Specify shift type, dress code, and required certifications."],
              ["What cities do you serve?", "We're launching in the Denver-Boulder metro area first. If you're outside our launch market, join the waitlist and we'll let you know when Roster arrives."],
              ["Do I pay the worker directly or does Roster handle it?", "You pay the worker directly — cash, Venmo, or payroll — whatever works for your operation. Roster handles the match, not the wage processing (for now). We're building integrated payment for a future version."],
            ].map(([q, a], i) => (
              <details key={i} className="bg-white rounded-xl p-6 shadow-sm group">
                <summary className="font-semibold text-[#0F172A] cursor-pointer list-none flex justify-between items-center">
                  {q}
                  <span className="text-[#E8633B] text-xl group-open:rotate-45 transition-transform">+</span>
                </summary>
                <p className="mt-3 text-slate-600 text-sm leading-relaxed">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-[#0F172A] px-6 py-20 text-center">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Stop overpaying for staffing. Start building your roster.</h2>
          <p className="text-slate-300 mb-8 max-w-lg mx-auto">Join hundreds of venues that have replaced their staffing agency with a flat monthly membership.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="#" className="inline-block bg-[#E8633B] text-white px-10 py-3.5 rounded-lg font-bold text-lg hover:bg-[#d4552e] transition shadow-lg shadow-[#E8633B]/25">
              Get Started →
            </a>
            <a href="#" className="inline-block border-2 border-white text-white px-10 py-3.5 rounded-lg font-semibold hover:bg-white/10 transition">
              Workers: Join Free →
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 px-6 py-8">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <svg width="20" height="20" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="0" y="5" width="20" height="4" rx="2" fill="#0F172A"/>
              <rect x="0" y="12" width="16" height="4" rx="2" fill="#0F172A"/>
              <rect x="0" y="19" width="12" height="4" rx="2" fill="#E8633B"/>
            </svg>
            <span className="font-bold text-sm tracking-tight">Roster</span>
          </div>
          <p className="text-xs text-slate-400">© 2025 Roster. All rights reserved.</p>
          <div className="flex gap-4 text-xs text-slate-400">
            <a href="#" className="hover:text-[#0F172A] transition">Privacy</a>
            <a href="#" className="hover:text-[#0F172A] transition">Terms</a>
            <a href="#" className="hover:text-[#0F172A] transition">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}