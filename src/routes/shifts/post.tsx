import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useAuth } from "@clerk/clerk-react";
import { useState, useEffect } from "react";

const saveShift = createServerFn({ method: "POST" })
  .validator((data: any) => data)
  .handler(async ({ data }) => {
    const { execSync } = await import("node:child_process");
    const id = crypto.randomUUID();
    execSync(`/home/agent-lead/.local/bin/team-db "INSERT INTO shifts (id, business_id, role_type, status, shift_type, date, start_time, end_time, workers_needed, hourly_rate, tips_included, pay_type, dress_code, certifications_required, notes, location_name) VALUES ('${id}', '${data.business_id}', '${data.role_type}', 'open', '${data.shift_type}', '${data.date}', '${data.start_time}', '${data.end_time}', ${data.workers_needed}, ${data.hourly_rate}, 1, 'hourly_plus_tips', '${data.dress_code}', '${data.certs_required}', '${data.notes.replace(/'/g, "''")}', '${data.location_name.replace(/'/g, "''")}')"`);
    return { success: true, shiftId: id };
  });

export const Route = createFileRoute("/shifts/post")({
  component: PostShift,
});

const ROLE_TYPES = [
  "bartender", "server", "barback", "service_bartender",
  "banquet_server", "event_bartender", "wine_steward", "mixologist", "cocktail_server"
];
const SHIFT_TYPES = ["opening", "closing", "brunch", "lunch", "dinner", "private_event", "banquet", "festival", "holiday"];
const DRESS_CODES = ["all_black", "uniform_provided", "black_on_black", "business_casual", "theme_costume", "any"];

function PostShift() {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const [form, setForm] = useState({
    role_type: "bartender",
    shift_type: "dinner",
    date: new Date().toISOString().split("T")[0],
    start_time: "16:00",
    end_time: "23:00",
    workers_needed: 1,
    hourly_rate: 20,
    dress_code: "all_black",
    certs_required: "",
    notes: "",
    location_name: "",
    business_id: "",
  });
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [shiftId, setShiftId] = useState("");

  useEffect(() => {
    if (isLoaded && !isSignedIn) window.location.href = "/auth/sign-in";
  }, [isLoaded, isSignedIn]);

  const update = (field: string, value: any) => setForm(f => ({ ...f, [field]: value }));

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const result = await saveShift({ data: { ...form, business_id: userId || "demo-business" } });
      setShiftId(result.shiftId);
      setDone(true);
    } catch (e) { alert("Failed to post shift. Try again."); }
    setSaving(false);
  };

  if (!isLoaded) return <div className="min-h-screen bg-[#F8F6F3] flex items-center justify-center"><p className="text-[#0F172A]">Loading...</p></div>;
  if (!isSignedIn) return null;

  if (done) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center px-4">
        <div className="bg-white rounded-xl p-8 shadow-lg max-w-lg w-full text-center">
          <div className="text-5xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-[#0F172A] mb-2">Shift posted!</h1>
          <p className="text-[#0F172A] mb-2">Your shift is now live in the marketplace.</p>
          <p className="text-xs text-[#0F172A] mb-6">ID: {shiftId.slice(0, 8)}...</p>
          <div className="flex gap-3 justify-center">
            <a href="/shifts/post" className="bg-[#E8633B] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#d4552e] transition">Post Another →</a>
            <a href="/dashboard" className="border-2 border-[#0F172A] text-[#0F172A] px-6 py-3 rounded-lg font-semibold hover:bg-[#0F172A] hover:text-white transition">Dashboard</a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F6F3]">
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg width="24" height="24" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="0" y="5" width="20" height="4" rx="2" fill="#0F172A"/>
              <rect x="0" y="12" width="16" height="4" rx="2" fill="#0F172A"/>
              <rect x="0" y="19" width="12" height="4" rx="2" fill="#E8633B"/>
            </svg>
            <span className="font-bold text-lg">Roster</span>
            <span className="text-[#0F172A] mx-2">/</span>
            <span className="text-sm text-[#0F172A]">Post a Shift</span>
          </div>
          <a href="/dashboard" className="text-sm text-[#0F172A] hover:text-[#0F172A]">← Dashboard</a>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="bg-white rounded-xl p-8 shadow-sm">
          <h1 className="text-2xl font-bold text-[#0F172A] mb-1">Post a Shift</h1>
          <p className="text-[#0F172A] mb-6">Fill in the details and get matched with vetted local pros.</p>

          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-[#0F172A] mb-1">Role Type *</label>
              <select value={form.role_type} onChange={e => update("role_type", e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#E8633B] focus:border-transparent">
                {ROLE_TYPES.map(r => <option key={r} value={r}>{r.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#0F172A] mb-1">Shift Type</label>
              <select value={form.shift_type} onChange={e => update("shift_type", e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#E8633B]">
                {SHIFT_TYPES.map(s => <option key={s} value={s}>{s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#0F172A] mb-1">Date *</label>
              <input type="date" value={form.date} onChange={e => update("date", e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#E8633B]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#0F172A] mb-1">Workers Needed</label>
              <input type="number" min={1} max={20} value={form.workers_needed} onChange={e => update("workers_needed", parseInt(e.target.value))}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#E8633B]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#0F172A] mb-1">Start Time</label>
              <input type="time" value={form.start_time} onChange={e => update("start_time", e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#E8633B]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#0F172A] mb-1">End Time</label>
              <input type="time" value={form.end_time} onChange={e => update("end_time", e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#E8633B]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#0F172A] mb-1">Hourly Rate ($/hr + tips)</label>
              <input type="number" min={10} max={100} step={5} value={form.hourly_rate} onChange={e => update("hourly_rate", parseInt(e.target.value))}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#E8633B]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#0F172A] mb-1">Dress Code</label>
              <select value={form.dress_code} onChange={e => update("dress_code", e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#E8633B]">
                {DRESS_CODES.map(d => <option key={d} value={d}>{d.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-[#0F172A] mb-1">Location Name</label>
              <input type="text" value={form.location_name} onChange={e => update("location_name", e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#E8633B]" placeholder="e.g. The Corner Bar" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#0F172A] mb-1">Required Certifications (optional)</label>
              <div className="flex flex-wrap gap-2">
                {["tips", "servsafe_alcohol", "servsafe_food", "cpr", "state_alcohol_co"].map(c => (
                  <div key={c} onClick={() => {
                    const current = form.certs_required.split(",").filter(Boolean);
                    update("certs_required", current.includes(c) ? current.filter(x => x !== c).join(",") : [...current, c].join(","));
                  }}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer border ${
                      form.certs_required.includes(c) ? "bg-[#E8633B] text-white border-[#E8633B]" : "border-slate-300 text-[#0F172A] hover:border-slate-400"
                    }`}>
                    {c.replace(/_/g, " ").replace(/\b\w/g, x => x.toUpperCase())}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#0F172A] mb-1">Notes for Workers</label>
              <textarea value={form.notes} onChange={e => update("notes", e.target.value)} rows={3}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#E8633B]"
                placeholder="Parking info, door code, menu details, anything they should know..." />
            </div>
          </div>

          <button onClick={handleSubmit} disabled={saving}
            className="w-full bg-[#E8633B] text-white px-6 py-3 rounded-lg font-semibold text-lg hover:bg-[#d4552e] transition disabled:opacity-50">
            {saving ? "Posting..." : "Post Shift →"}
          </button>
        </div>
      </div>
    </div>
  );
}