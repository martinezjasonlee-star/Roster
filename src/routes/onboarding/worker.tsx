import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useAuth } from "@clerk/clerk-react";
import { useState, useEffect } from "react";

const saveWorker = createServerFn({ method: "POST" })
  .validator((data: {
    email: string;
    first_name: string;
    last_name: string;
    phone: string;
    role_type: string;
    years_experience: number;
    service_styles: string[];
    travel_radius: number;
    city: string;
    certs: string[];
    availability: { day: number; start: string; end: string }[];
  }) => data)
  .handler(async ({ data }) => {
    const { execSync } = await import("node:child_process");
    const workerId = crypto.randomUUID();

    execSync(`team-db "INSERT INTO workers (id, email, first_name, last_name, phone, role_type, years_experience, service_style, travel_radius, city, state, is_verified) VALUES ('${workerId}', '${data.email.replace(/'/g, "''")}', '${data.first_name.replace(/'/g, "''")}', '${data.last_name.replace(/'/g, "''")}', '${data.phone.replace(/'/g, "''")}', '${data.role_type}', ${data.years_experience}, '${data.service_styles.join(",")}', ${data.travel_radius}, '${data.city.replace(/'/g, "''")}', 'CO', 0)"`);

    for (const certId of data.certs) {
      const certId2 = crypto.randomUUID();
      execSync(`team-db "INSERT INTO worker_certifications (id, worker_id, certification_id, is_verified) VALUES ('${certId2}', '${workerId}', '${certId}', 0)"`);
    }

    for (const slot of data.availability) {
      const slotId = crypto.randomUUID();
      execSync(`team-db "INSERT INTO worker_availability (id, worker_id, day_of_week, start_time, end_time, is_available) VALUES ('${slotId}', '${workerId}', ${slot.day}, '${slot.start}', '${slot.end}', 1)"`);
    }

    return { success: true, workerId };
  });

export const Route = createFileRoute("/onboarding/worker")({
  component: WorkerOnboarding,
});

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function WorkerOnboarding() {
  const { userId, isLoaded, isSignedIn } = useAuth();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    role_type: "both",
    years_experience: 2,
    service_styles: [] as string[],
    travel_radius: 10,
    city: "Denver",
    certs: [] as string[],
    availability: [] as { day: number; start: string; end: string }[],
  });
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (isLoaded && !isSignedIn) window.location.href = "/auth/sign-up";
  }, [isLoaded, isSignedIn]);

  if (!isLoaded) return <div className="min-h-screen bg-[#F8F6F3] flex items-center justify-center"><p className="text-[#0F172A]">Loading...</p></div>;
  if (!isSignedIn) return null;

  if (done) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center px-4">
        <div className="bg-white rounded-xl p-8 shadow-lg max-w-lg w-full text-center">
          <div className="text-5xl mb-4">🎉</div>
          <h1 className="text-2xl font-bold text-[#0F172A] mb-2">You're on Roster!</h1>
          <p className="text-[#0F172A] mb-6">Your profile is live. Venues in Denver-Boulder can now find and book you.</p>
          <a href="/worker-dashboard" className="inline-block bg-[#E8633B] text-white px-8 py-3 rounded-lg font-semibold hover:bg-[#d4552e] transition">Browse Shifts →</a>
        </div>
      </div>
    );
  }

  const update = (field: string, value: any) => setForm(f => ({ ...f, [field]: value }));

  const toggleCert = (id: string) => {
    setForm(f => ({
      ...f,
      certs: f.certs.includes(id) ? f.certs.filter(c => c !== id) : [...f.certs, id]
    }));
  };

  const toggleDay = (day: number) => {
    setForm(f => {
      const exists = f.availability.find(a => a.day === day);
      if (exists) return { ...f, availability: f.availability.filter(a => a.day !== day) };
      return { ...f, availability: [...f.availability, { day, start: "17:00", end: "23:00" }] };
    });
  };

  const updateDay = (day: number, field: string, value: string) => {
    setForm(f => ({
      ...f,
      availability: f.availability.map(a => a.day === day ? { ...a, [field]: value } : a)
    }));
  };

  const toggleServiceStyle = (id: string) => {
    setForm(f => ({
      ...f,
      service_styles: f.service_styles.includes(id) ? f.service_styles.filter(s => s !== id) : [...f.service_styles, id]
    }));
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await saveWorker({ data: { ...form, email: userId || "" } });
      setDone(true);
    } catch (e) {
      alert("Something went wrong. Please try again.");
    }
    setSaving(false);
  };

  return (
    <div className="min-h-screen bg-[#F8F6F3]">
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-2">
          <svg width="24" height="24" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="0" y="5" width="20" height="4" rx="2" fill="#0F172A"/>
            <rect x="0" y="12" width="16" height="4" rx="2" fill="#0F172A"/>
            <rect x="0" y="19" width="12" height="4" rx="2" fill="#E8633B"/>
          </svg>
          <span className="font-bold text-lg tracking-tight">Roster</span>
          <span className="text-[#0F172A] mx-2">/</span>
          <span className="text-sm text-[#0F172A]">Join as a worker</span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="flex items-center justify-center gap-2 mb-10">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step >= s ? "bg-[#E8633B] text-white" : "bg-slate-200 text-[#0F172A]"}`}>{s}</div>
              <span className={`text-sm ${step >= s ? "text-[#0F172A] font-medium" : "text-[#0F172A]"}`}>
                {s === 1 ? "Profile" : s === 2 ? "Skills" : "Availability"}
              </span>
              {s < 3 && <div className="w-12 h-0.5 bg-slate-200 mx-2"/>}
            </div>
          ))}
        </div>

        {/* Step 1: Profile */}
        {step === 1 && (
          <div className="bg-white rounded-xl p-8 shadow-sm">
            <h1 className="text-2xl font-bold text-[#0F172A] mb-1">Tell us about yourself</h1>
            <p className="text-[#0F172A] mb-6">Bartenders and servers in Denver-Boulder trust Roster to find great shifts.</p>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#0F172A] mb-1">First Name *</label>
                  <input type="text" value={form.first_name} onChange={e => update("first_name", e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E8633B] text-[#0F172A]" placeholder="Jane" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#0F172A] mb-1">Last Name *</label>
                  <input type="text" value={form.last_name} onChange={e => update("last_name", e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E8633B] text-[#0F172A]" placeholder="Doe" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#0F172A] mb-1">Phone</label>
                <input type="tel" value={form.phone} onChange={e => update("phone", e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E8633B] text-[#0F172A]" placeholder="(303) 555-0123" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#0F172A] mb-1">City</label>
                <input type="text" value={form.city} onChange={e => update("city", e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E8633B] text-[#0F172A]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#0F172A] mb-1">What do you do? *</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: "bartender", label: "Bartender" },
                    { id: "server", label: "Server" },
                    { id: "both", label: "Both" },
                    { id: "barback", label: "Barback" },
                  ].map(r => (
                    <div key={r.id} onClick={() => update("role_type", r.id)}
                      className={`border-2 rounded-lg p-3 text-center cursor-pointer transition text-sm font-medium ${
                        form.role_type === r.id ? "border-[#E8633B] bg-[#E8633B]/5" : "border-slate-200 hover:border-slate-300"
                      }`}>{r.label}</div>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#0F172A] mb-1">Years of experience</label>
                <select value={form.years_experience} onChange={e => update("years_experience", parseInt(e.target.value))}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E8633B] text-[#0F172A]">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 20].map(y => (
                    <option key={y} value={y}>{y}+ years</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#0F172A] mb-1">Style of service (select all that apply)</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: "casual", label: "Casual / Neighborhood" },
                    { id: "fine_dining", label: "Fine Dining" },
                    { id: "craft_cocktail", label: "Craft Cocktail" },
                    { id: "high_volume", label: "High Volume" },
                    { id: "wine_focused", label: "Wine-Focused" },
                    { id: "craft_beer", label: "Craft Beer" },
                    { id: "banquet", label: "Banquets / Events" },
                  ].map(s => (
                    <div key={s.id} onClick={() => toggleServiceStyle(s.id)}
                      className={`border-2 rounded-lg p-3 text-center cursor-pointer transition text-sm font-medium ${
                        form.service_styles.includes(s.id) ? "border-[#E8633B] bg-[#E8633B]/5" : "border-slate-200 hover:border-slate-300"
                      }`}>{s.label}</div>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#0F172A] mb-1">Travel radius</label>
                <div className="flex items-center gap-3">
                  <input type="range" min={5} max={50} step={5} value={form.travel_radius}
                    onChange={e => update("travel_radius", parseInt(e.target.value))}
                    className="flex-1 accent-[#E8633B]" />
                  <span className="text-sm font-medium w-16">{form.travel_radius} miles</span>
                </div>
              </div>
            </div>
            <button onClick={() => setStep(2)} disabled={!form.first_name || !form.last_name}
              className="mt-6 w-full bg-[#E8633B] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#d4552e] transition disabled:opacity-50">
              Continue → Certifications
            </button>
          </div>
        )}

        {/* Step 2: Certifications */}
        {step === 2 && (
          <div className="bg-white rounded-xl p-8 shadow-sm">
            <h1 className="text-2xl font-bold text-[#0F172A] mb-1">Certifications</h1>
            <p className="text-[#0F172A] mb-6">Select any certifications you hold. You can add more later.</p>
            <div className="space-y-3">
              {[
                { id: "tips", name: "TIPS", desc: "Alcohol service certification" },
                { id: "servsafe_alcohol", name: "ServSafe Alcohol", desc: "Responsible alcohol service" },
                { id: "servsafe_food", name: "ServSafe Food Handler", desc: "Food safety certification" },
                { id: "cpr", name: "CPR / First Aid", desc: "Emergency response certified" },
                { id: "state_alcohol_co", name: "Colorado Alcohol Server", desc: "State-mandated CO certification" },
              ].map(cert => (
                <div key={cert.id} onClick={() => toggleCert(cert.id)}
                  className={`border-2 rounded-lg p-4 cursor-pointer transition flex items-center gap-3 ${
                    form.certs.includes(cert.id) ? "border-[#E8633B] bg-[#E8633B]/5" : "border-slate-200 hover:border-slate-300"
                  }`}>
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${
                    form.certs.includes(cert.id) ? "bg-[#E8633B] border-[#E8633B]" : "border-slate-300"
                  }`}>
                    {form.certs.includes(cert.id) && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{cert.name}</p>
                    <p className="text-xs text-[#0F172A]">{cert.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setStep(1)} className="flex-1 px-6 py-3 border-2 border-[#0F172A] text-[#0F172A] rounded-lg font-semibold hover:bg-[#0F172A] hover:text-white transition">← Back</button>
              <button onClick={() => setStep(3)} className="flex-[2] bg-[#E8633B] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#d4552e] transition">Continue → Availability</button>
            </div>
          </div>
        )}

        {/* Step 3: Availability */}
        {step === 3 && (
          <div className="bg-white rounded-xl p-8 shadow-sm">
            <h1 className="text-2xl font-bold text-[#0F172A] mb-1">When are you available?</h1>
            <p className="text-[#0F172A] mb-6">Toggle the days you typically work and set your hours.</p>
            <div className="space-y-2 mb-6">
              {DAYS.map((day, i) => {
                const slot = form.availability.find(a => a.day === i);
                return (
                  <div key={i} className={`border rounded-lg p-3 transition ${slot ? "border-[#E8633B] bg-[#E8633B]/5" : "border-slate-200"}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div onClick={() => toggleDay(i)} className={`w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer ${
                          slot ? "bg-[#E8633B] border-[#E8633B]" : "border-slate-300"
                        }`}>
                          {slot && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>}
                        </div>
                        <span className="font-medium text-sm">{day}</span>
                      </div>
                      {slot && (
                        <div className="flex items-center gap-2">
                          <input type="time" value={slot.start} onChange={e => updateDay(i, "start", e.target.value)}
                            className="border border-slate-300 rounded px-2 py-1 text-sm" />
                          <span className="text-[#0F172A] text-sm">to</span>
                          <input type="time" value={slot.end} onChange={e => updateDay(i, "end", e.target.value)}
                            className="border border-slate-300 rounded px-2 py-1 text-sm" />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep(2)} className="flex-1 px-6 py-3 border-2 border-[#0F172A] text-[#0F172A] rounded-lg font-semibold hover:bg-[#0F172A] hover:text-white transition">← Back</button>
              <button onClick={handleSubmit} disabled={saving || form.availability.length === 0}
                className="flex-[2] bg-[#E8633B] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#d4552e] transition disabled:opacity-50">
                {saving ? "Saving..." : "Join Roster Free →"}
              </button>
            </div>
            <p className="text-xs text-[#0F172A] text-center mt-4">Free to join. No membership fee. No commission.</p>
          </div>
        )}
      </div>
    </div>
  );
}