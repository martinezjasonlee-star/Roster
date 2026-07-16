import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useAuth, useUser } from "@clerk/clerk-react";
import { useState, useEffect } from "react";

const saveBusiness = createServerFn({ method: "POST" })
  .validator((data: {
    name: string;
    venue_type: string;
    description: string;
    address: string;
    city: string;
    phone: string;
    plan: string;
    email: string;
    photo_url: string;
  }) => data)
  .handler(async ({ data }) => {
    const { execSync } = await import("node:child_process");
    const id = crypto.randomUUID();
    const result = execSync(
              `sqlite3 /home/team/.data/agent-team-cc229006.db "INSERT INTO businesses (id, name, email, phone, venue_type, description, address, city, state, membership_tier, membership_status, photo_url) VALUES ('${id}', '${data.name.replace(/'/g, "''")}', '${data.email.replace(/'/g, "''")}', '${data.phone.replace(/'/g, "''")}', '${data.venue_type}', '${data.description.replace(/'/g, "''")}', '${data.address.replace(/'/g, "''")}', '${data.city}', 'CO', '${data.plan}', 'trial', '${data.photo_url}')"`
            ).toString();
    return { success: true, businessId: id };
  });

export const Route = createFileRoute("/onboarding/business")({
  component: BusinessOnboarding,
});

function BusinessOnboarding() {
  const { userId, isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    name: "",
    venue_type: "restaurant",
    description: "",
    address: "",
    city: "Denver",
    phone: "",
    plan: "starter",
    email: "",
    photo_url: "",
  });
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (user?.emailAddresses?.[0]?.emailAddress) {
      setForm(f => ({ ...f, email: user.emailAddresses[0].emailAddress }));
    }
  }, [user]);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      window.location.href = "/auth/sign-up";
    }
  }, [isLoaded, isSignedIn]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("Photo must be smaller than 2MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        update("photo_url", reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  if (!isLoaded) return <div className="min-h-screen bg-[#F8F6F3] flex items-center justify-center"><p className="text-[#0F172A]">Loading...</p></div>;
  if (!isSignedIn) return null;
  if (done) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center px-4">
        <div className="bg-white rounded-xl p-8 shadow-lg max-w-lg w-full text-center">
          <div className="text-5xl mb-4">🎉</div>
          <h1 className="text-2xl font-bold text-[#0F172A] mb-2">Your venue is set up!</h1>
          <p className="text-[#0F172A] mb-6">Your 14-day free trial has started. You're on the <strong className="text-[#0F172A] capitalize">{form.plan}</strong> plan.</p>
          <a href="/dashboard" className="inline-block bg-[#E8633B] text-white px-8 py-3 rounded-lg font-semibold hover:bg-[#d4552e] transition">Go to Dashboard →</a>
        </div>
      </div>
    );
  }

  const update = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }));

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await saveBusiness({ data: { ...form, email: form.email } });
      // Redirect to Stripe checkout for the selected plan
      const stripeLinks: Record<string, string> = {
        starter: "https://buy.stripe.com/fZudR9aKrb4W4EacGTbZe00",
        pro: "https://buy.stripe.com/5kQ3cv2dVgpg9YueP1bZe02",
      };
      window.location.href = stripeLinks[form.plan] || stripeLinks.starter;
    } catch (e) {
      alert("Something went wrong. Please try again.");
    }
    setSaving(false);
  };

  return (
    <div className="min-h-screen bg-[#F8F6F3]">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-2">
          <svg width="24" height="24" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="0" y="5" width="20" height="4" rx="2" fill="#0F172A"/>
            <rect x="0" y="12" width="16" height="4" rx="2" fill="#0F172A"/>
            <rect x="0" y="19" width="12" height="4" rx="2" fill="#E8633B"/>
          </svg>
          <span className="font-bold text-lg tracking-tight">Roster</span>
          <span className="text-[#0F172A] mx-2">/</span>
          <span className="text-sm text-[#0F172A]">Set up your venue</span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-12">
        {/* Steps indicator */}
        <div className="flex items-center justify-center gap-2 mb-10">
          {[1, 2].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                step >= s ? "bg-[#E8633B] text-white" : "bg-slate-200 text-[#0F172A]"
              }`}>{s}</div>
              <span className={`text-sm ${step >= s ? "text-[#0F172A] font-medium" : "text-[#0F172A]"}`}>
                {s === 1 ? "Venue Details" : "Plan & Confirm"}
              </span>
              {s < 2 && <div className="w-12 h-0.5 bg-slate-200 mx-2"/>}
            </div>
          ))}
        </div>

        {/* Step 1: Venue Details */}
        {step === 1 && (
          <div className="bg-white rounded-xl p-8 shadow-sm">
            <h1 className="text-2xl font-bold text-[#0F172A] mb-1">Tell us about your venue</h1>
            <p className="text-[#0F172A] mb-6 font-medium">Set up your Roster profile so workers know who they're working with.</p>
            
            <div className="space-y-4">
              {/* Mandatory Photo Upload */}
              <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/50 mb-6">
                <label className="block text-sm font-bold text-[#0F172A] mb-2">Venue Face Photo *</label>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-xl bg-white border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden flex-shrink-0 relative shadow-inner">
                    {form.photo_url ? (
                      <img src={form.photo_url} alt="Venue Preview" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-3xl text-slate-300">📸</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <input type="file" accept="image/*" onChange={handlePhotoChange} id="venue-photo-input" className="hidden" />
                    <label htmlFor="venue-photo-input" className="cursor-pointer inline-block bg-[#0F172A] text-white px-4 py-2 rounded-lg font-semibold text-xs hover:bg-slate-800 transition">
                      {form.photo_url ? "Change Photo" : "Upload Face Photo"}
                    </label>
                    <p className="text-[11px] text-slate-500 mt-1">Required to proceed. JPG, PNG, or WebP. Max 2MB.</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#0F172A] mb-1">Venue Name *</label>
                <input type="text" value={form.name} onChange={e => update("name", e.target.value)} 
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#E8633B] focus:border-transparent" 
                  placeholder="e.g. The Corner Bar" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#0F172A] mb-1">Venue Type *</label>
                <select value={form.venue_type} onChange={e => update("venue_type", e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#E8633B] focus:border-transparent">
                  <option value="restaurant">Restaurant</option>
                  <option value="bar">Bar / Pub</option>
                  <option value="country_club">Country Club</option>
                  <option value="caterer">Catering Company</option>
                  <option value="event_venue">Event Venue</option>
                  <option value="hotel">Hotel FOH</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#0F172A] mb-1">Description</label>
                <textarea value={form.description} onChange={e => update("description", e.target.value)} rows={3}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#E8633B] focus:border-transparent"
                  placeholder="Tell workers about your venue — vibe, size, what makes it special..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#0F172A] mb-1">Address *</label>
                <input type="text" value={form.address} onChange={e => update("address", e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#E8633B] focus:border-transparent"
                  placeholder="Street address" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#0F172A] mb-1">City</label>
                  <input type="text" value={form.city} onChange={e => update("city", e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#E8633B] focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#0F172A] mb-1">Phone</label>
                  <input type="tel" value={form.phone} onChange={e => update("phone", e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#E8633B] focus:border-transparent"
                    placeholder="(303) 555-0123" />
                </div>
              </div>
            </div>

            <button onClick={() => setStep(2)} disabled={!form.name || !form.address || !form.photo_url}
              className="mt-6 w-full bg-[#E8633B] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#d4552e] transition disabled:opacity-50 disabled:cursor-not-allowed">
              Continue → Choose Your Plan
            </button>
          </div>
        )}

        {/* Step 2: Plan Selection */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-8 shadow-sm">
              <h1 className="text-2xl font-bold text-[#0F172A] mb-1">Choose your plan</h1>
              <p className="text-[#0F172A] mb-6">Start with a 14-day free trial. No credit card needed for the first 7 days.</p>

              <div className="grid md:grid-cols-2 gap-4 mb-6">
                {[
                  { id: "starter", name: "Starter", price: "$99", desc: "For small venues filling 1–5 shifts/mo" },
                  { id: "pro", name: "Pro", price: "$249", desc: "For busy venues filling 5–20 shifts/mo", popular: true },
                ].map((plan) => (
                  <div key={plan.id} onClick={() => update("plan", plan.id)}
                    className={`relative border-2 rounded-xl p-6 cursor-pointer transition text-[#0F172A] ${
                      form.plan === plan.id ? "border-[#E8633B]" : "border-slate-200 hover:border-slate-300"
                    }`}>
                    {plan.popular && (
                      <span className="absolute -top-3 right-4 bg-[#E8633B] text-white px-3 py-0.5 rounded-full text-xs font-semibold">Popular</span>
                    )}
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        form.plan === plan.id ? "border-[#E8633B]" : "border-slate-300"
                      }`}>
                        {form.plan === plan.id && <div className="w-3 h-3 rounded-full bg-[#E8633B]"/>}
                      </div>
                      <h3 className="font-bold text-lg">{plan.name}</h3>
                    </div>
                    <p className="text-3xl font-bold text-[#0F172A] mb-1">{plan.price}<span className="text-base text-[#0F172A] font-normal">/mo</span></p>
                    <p className="text-sm text-[#0F172A]">{plan.desc}</p>
                    <p className="text-xs text-[#0F172A] mt-2">or {(parseInt(plan.price) * 0.8).toFixed(0)}/mo billed annually</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl p-8 shadow-sm">
              <h2 className="font-bold text-[#0F172A] mb-4">Summary</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-[#0F172A]">Venue</span><span className="font-medium">{form.name || "—"}</span></div>
                <div className="flex justify-between"><span className="text-[#0F172A]">Plan</span><span className="font-medium capitalize">{form.plan} — {form.plan === "starter" ? "$99/mo" : "$249/mo"}</span></div>
                <div className="flex justify-between"><span className="text-[#0F172A]">Trial</span><span className="font-medium">14 days free</span></div>
                <div className="border-t border-slate-100 pt-2 mt-2 flex justify-between">
                  <span className="text-[#0F172A]">First charge</span>
                  <span className="font-bold">Day 15 — ${form.plan === "starter" ? "99" : "249"}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="flex-1 px-6 py-3 border-2 border-[#0F172A] text-[#0F172A] rounded-lg font-semibold hover:bg-[#0F172A] hover:text-white transition">
                ← Back
              </button>
              <button onClick={handleSubmit} disabled={saving}
                className="flex-[2] bg-[#E8633B] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#d4552e] transition disabled:opacity-50">
                {saving ? "Setting up..." : "Start 14-Day Free Trial →"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
