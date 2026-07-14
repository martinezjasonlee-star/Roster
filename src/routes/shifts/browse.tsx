import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useAuth } from "@clerk/clerk-react";
import { useState, useEffect } from "react";

const getShifts = createServerFn({ method: "GET" }).handler(async () => {
  const { execSync } = await import("node:child_process");
  const result = execSync(`sqlite3 -json /home/team/.data/agent-team-cc229006.db "SELECT id, business_id, role_type, shift_type, date, start_time, end_time, hourly_rate, dress_code, notes, location_name, workers_needed, created_at FROM shifts WHERE status='open' ORDER BY date ASC LIMIT 50"`);
  return JSON.parse(result.toString());
});

const applyToShift = createServerFn({ method: "POST" })
  .validator((data: { shiftId: string; workerId: string; businessId?: string }) => data)
  .handler(async ({ data }) => {
    const { execSync } = await import("node:child_process");
    const id = crypto.randomUUID();
    execSync(`sqlite3 /home/team/.data/agent-team-cc229006.db "INSERT INTO bookings (id, shift_id, worker_id, business_id, status) VALUES ('${id}', '${data.shiftId}', '${data.workerId}', '${data.businessId || "pending"}', 'pending')"`);
    return { success: true, bookingId: id };
  });

export const Route = createFileRoute("/shifts/browse")({
  component: BrowseShifts,
  loader: () => getShifts(),
});

function BrowseShifts() {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const shifts = Route.useLoaderData() as any[];
  const [applying, setApplying] = useState<string | null>(null);
  const [applied, setApplied] = useState<string[]>([]);
  const [roleFilter, setRoleFilter] = useState("all");

  useEffect(() => {
    if (isLoaded && !isSignedIn) window.location.href = "/auth/sign-in";
  }, [isLoaded, isSignedIn]);

  if (!isLoaded) return <div className="min-h-screen bg-[#F8F6F3] flex items-center justify-center"><p className="text-[#0F172A]">Loading...</p></div>;
  if (!isSignedIn) return null;

  const filtered = roleFilter === "all" ? shifts : shifts.filter((s: any) => s.role_type === roleFilter);

  const handleApply = async (shift: any) => {
    setApplying(shift.id);
    try {
      await applyToShift({ data: { shiftId: shift.id, workerId: userId || "demo-worker", businessId: shift.business_id || "demo-business" } });
      setApplied([...applied, shift.id]);
    } catch (e) { alert("Failed to apply."); }
    setApplying(null);
  };

  const fmt = (s: string) => s?.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()) || "";

  return (
    <div className="min-h-screen bg-[#F8F6F3]">
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg width="24" height="24" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="0" y="5" width="20" height="4" rx="2" fill="#0F172A"/>
              <rect x="0" y="12" width="16" height="4" rx="2" fill="#0F172A"/>
              <rect x="0" y="19" width="12" height="4" rx="2" fill="#E8633B"/>
            </svg>
            <span className="font-bold text-lg">Roster</span>
            <span className="text-[#0F172A] mx-2">/</span>
            <span className="text-sm text-[#0F172A]">Browse Shifts</span>
          </div>
          <a href="/worker-dashboard" className="text-sm text-[#0F172A] hover:text-[#0F172A]">← My Dashboard</a>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#0F172A]">Available Shifts</h1>
            <p className="text-[#0F172A]">{filtered.length} shifts in Denver-Boulder</p>
          </div>
          <div className="flex gap-2">
            {["all", "bartender", "server", "barback"].map(r => (
              <button key={r} onClick={() => setRoleFilter(r)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  roleFilter === r ? "bg-[#E8633B] text-white" : "bg-white border border-slate-200 text-[#0F172A] hover:border-slate-300"
                }`}>
                {r === "all" ? "All Roles" : fmt(r)}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl">
            <div className="text-4xl mb-4">🔍</div>
            <h2 className="text-xl font-bold text-[#0F172A] mb-2">No shifts available right now</h2>
            <p className="text-[#0F172A]">Check back soon or set your notifications.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((shift: any) => (
              <div key={shift.id} className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="bg-[#E8633B]/10 text-[#E8633B] px-3 py-0.5 rounded-full text-xs font-semibold">{fmt(shift.role_type)}</span>
                      <span className="bg-[#0F172A]/5 text-[#0F172A] px-3 py-0.5 rounded-full text-xs font-medium">{fmt(shift.shift_type)}</span>
                      {shift.dress_code && <span className="text-xs text-[#0F172A]">{fmt(shift.dress_code)}</span>}
                    </div>
                    <h3 className="font-bold text-lg text-[#0F172A]">{shift.location_name || "Venue in Denver"}</h3>
                    <div className="flex items-center gap-4 mt-2 text-sm text-[#0F172A]">
                      <span>📅 {shift.date}</span>
                      <span>🕐 {shift.start_time} - {shift.end_time}</span>
                      <span>💰 ${shift.hourly_rate}/hr + tips</span>
                      <span>👤 {shift.workers_needed} needed</span>
                    </div>
                    {shift.notes && <p className="text-xs text-[#0F172A] mt-2 line-clamp-1">{shift.notes}</p>}
                  </div>
                  <button onClick={() => handleApply(shift)} disabled={applying === shift.id || applied.includes(shift.id)}
                    className={`shrink-0 px-6 py-2.5 rounded-lg font-semibold text-sm transition ${
                      applied.includes(shift.id)
                        ? "bg-green-100 text-green-700"
                        : "bg-[#E8633B] text-white hover:bg-[#d4552e] disabled:opacity-50"
                    }`}>
                    {applying === shift.id ? "Applying..." : applied.includes(shift.id) ? "✅ Applied" : "Apply →"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}