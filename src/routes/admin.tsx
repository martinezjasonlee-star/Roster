import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useState } from "react";

const getStats = createServerFn({ method: "GET" }).handler(async () => {
  const { execSync } = await import("node:child_process");
  const businesses = JSON.parse(execSync(`/home/agent-lead/.local/bin/team-db "SELECT COUNT(*) as count FROM businesses"`).toString());
  const workers = JSON.parse(execSync(`/home/agent-lead/.local/bin/team-db "SELECT COUNT(*) as count FROM workers"`).toString());
  const shifts = JSON.parse(execSync(`/home/agent-lead/.local/bin/team-db "SELECT COUNT(*) as count FROM shifts"`).toString());
  const bookings = JSON.parse(execSync(`/home/agent-lead/.local/bin/team-db "SELECT COUNT(*) as count FROM bookings"`).toString());
  const messages = JSON.parse(execSync(`/home/agent-lead/.local/bin/team-db "SELECT COUNT(*) as count FROM messages"`).toString());
  const recentShifts = JSON.parse(execSync(`/home/agent-lead/.local/bin/team-db "SELECT id, role_type, date, status, created_at FROM shifts ORDER BY created_at DESC LIMIT 10"`).toString());
  const recentWorkers = JSON.parse(execSync(`/home/agent-lead/.local/bin/team-db "SELECT id, first_name, last_name, role_type, is_verified FROM workers ORDER BY created_at DESC LIMIT 10"`).toString());
  const recentBusinesses = JSON.parse(execSync(`/home/agent-lead/.local/bin/team-db "SELECT id, name, venue_type, membership_tier, membership_status FROM businesses ORDER BY created_at DESC LIMIT 10"`).toString());
  return { stats: { businesses, workers, shifts, bookings, messages }, recentShifts, recentWorkers, recentBusinesses };
});

const verifyWorker = createServerFn({ method: "POST" })
  .validator((data: { workerId: string }) => data)
  .handler(async ({ data }) => {
    const { execSync } = await import("node:child_process");
    execSync(`/home/agent-lead/.local/bin/team-db "UPDATE workers SET is_verified=1 WHERE id='${data.workerId}'"`);
    return { success: true };
  });

export const Route = createFileRoute("/admin")({
  component: AdminDashboard,
  loader: () => getStats(),
});

function AdminDashboard() {
  const data = Route.useLoaderData() as any;
  const [activeTab, setActiveTab] = useState<"overview" | "workers" | "businesses">("overview");
  const [verifying, setVerifying] = useState<string | null>(null);

  const handleVerify = async (workerId: string) => {
    setVerifying(workerId);
    await verifyWorker({ data: { workerId } });
    setVerifying(null);
    window.location.reload();
  };

  const s = data.stats;

  return (
    <div className="min-h-screen bg-[#F8F6F3]">
      <div className="bg-[#0F172A] px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center gap-2">
          <svg width="24" height="24" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="0" y="5" width="20" height="4" rx="2" fill="white"/>
            <rect x="0" y="12" width="16" height="4" rx="2" fill="white"/>
            <rect x="0" y="19" width="12" height="4" rx="2" fill="#E8633B"/>
          </svg>
          <span className="font-bold text-lg text-white">Roster Admin</span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid md:grid-cols-5 gap-4 mb-8">
          {[
            ["Businesses", s.businesses?.[0]?.count || 0, "Registered venues"],
            ["Workers", s.workers?.[0]?.count || 0, "Bartenders & servers"],
            ["Shifts", s.shifts?.[0]?.count || 0, "Posted shifts"],
            ["Bookings", s.bookings?.[0]?.count || 0, "Applications"],
            ["Messages", s.messages?.[0]?.count || 0, "Sent"],
          ].map(([label, value, sub], i) => (
            <div key={i} className="bg-white rounded-xl p-5 shadow-sm">
              <p className="text-xs text-[#0F172A] font-medium">{label}</p>
              <p className="text-3xl font-bold text-[#0F172A]">{value as number}</p>
              <p className="text-xs text-[#0F172A]">{sub as string}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-2 mb-6">
          {(["overview", "workers", "businesses"] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                activeTab === tab ? "bg-[#0F172A] text-white" : "bg-white border border-slate-200 text-[#0F172A]"
              }`}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {activeTab === "overview" && (
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="font-bold text-lg text-[#0F172A] mb-4">Recent Shifts</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b text-left text-[#0F172A] text-xs">
                  <th className="pb-2 pr-4">ID</th><th className="pb-2 pr-4">Role</th><th className="pb-2 pr-4">Date</th><th className="pb-2 pr-4">Status</th><th className="pb-2">Created</th>
                </tr></thead>
                <tbody>
                  {(data.recentShifts || []).map((s: any) => (
                    <tr key={s.id} className="border-b border-slate-50">
                      <td className="py-2 pr-4 text-xs text-[#0F172A]">{s.id.slice(0, 8)}</td>
                      <td className="py-2 pr-4 font-medium capitalize">{s.role_type}</td>
                      <td className="py-2 pr-4 text-[#0F172A]">{s.date}</td>
                      <td className="py-2 pr-4"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        s.status === "open" ? "bg-green-100 text-green-700" : s.status === "filled" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-[#0F172A]"
                      }`}>{s.status}</span></td>
                      <td className="py-2 text-xs text-[#0F172A]">{new Date(s.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "workers" && (
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="font-bold text-lg text-[#0F172A] mb-4">Worker Verification Queue</h2>
            {data.recentWorkers?.length === 0 ? (
              <p className="text-[#0F172A] text-sm">No workers registered yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b text-left text-[#0F172A] text-xs">
                    <th className="pb-2 pr-4">Name</th><th className="pb-2 pr-4">Role</th><th className="pb-2 pr-4">Verified</th><th className="pb-2">Action</th>
                  </tr></thead>
                  <tbody>
                    {(data.recentWorkers || []).map((w: any) => (
                      <tr key={w.id} className="border-b border-slate-50">
                        <td className="py-2 pr-4 font-medium">{w.first_name} {w.last_name}</td>
                        <td className="py-2 pr-4 capitalize text-[#0F172A]">{w.role_type}</td>
                        <td className="py-2 pr-4">{w.is_verified ? <span className="text-green-600 font-medium">✅</span> : <span className="text-[#0F172A]">—</span>}</td>
                        <td className="py-2">
                          {!w.is_verified && (
                            <button onClick={() => handleVerify(w.id)} disabled={verifying === w.id}
                              className="bg-[#0F172A] text-white px-3 py-1 rounded text-xs font-medium hover:bg-opacity-80 transition disabled:opacity-50">
                              {verifying === w.id ? "..." : "Verify"}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === "businesses" && (
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="font-bold text-lg text-[#0F172A] mb-4">Registered Venues</h2>
            {data.recentBusinesses?.length === 0 ? (
              <p className="text-[#0F172A] text-sm">No businesses registered yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b text-left text-[#0F172A] text-xs">
                    <th className="pb-2 pr-4">Name</th><th className="pb-2 pr-4">Type</th><th className="pb-2 pr-4">Plan</th><th className="pb-2">Status</th>
                  </tr></thead>
                  <tbody>
                    {(data.recentBusinesses || []).map((b: any) => (
                      <tr key={b.id} className="border-b border-slate-50">
                        <td className="py-2 pr-4 font-medium">{b.name}</td>
                        <td className="py-2 pr-4 capitalize text-[#0F172A]">{b.venue_type}</td>
                        <td className="py-2 pr-4 capitalize">{b.membership_tier}</td>
                        <td className="py-2">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            b.membership_status === "active" ? "bg-green-100 text-green-700" :
                            b.membership_status === "trial" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-[#0F172A]"
                          }`}>{b.membership_status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}