import { createFileRoute } from "@tanstack/react-router";
import { useAuth, useUser, useClerk } from "@clerk/clerk-react";
import { useState, useEffect } from "react";
import { getWorkerDashboard } from "~/lib/server";

export const Route = createFileRoute("/worker-dashboard")({
  component: WorkerDashboard,
});

function WorkerDashboard() {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const { signOut } = useClerk();

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Load worker dashboard data
  const loadData = async () => {
    if (!user?.emailAddresses?.[0]?.emailAddress) return;
    const email = user.emailAddresses[0].emailAddress;
    try {
      const res = await getWorkerDashboard({ data: email });
      setData(res);
    } catch (err) {
      console.error("Error loading worker dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      window.location.href = "/auth/sign-in";
    }
  }, [isLoaded, isSignedIn]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    window.location.href = "/";
  };

  if (!isLoaded || (isSignedIn && loading)) {
    return (
      <div className="min-h-screen bg-[#F8F6F3] flex items-center justify-center">
        <p className="text-[#0F172A] font-semibold">Loading your dashboard...</p>
      </div>
    );
  }

  if (!isSignedIn) return null;

  // Handle case where user is authenticated but not onboarded as a worker
  if (!data && !loading) {
    return (
      <div className="min-h-screen bg-[#F8F6F3] flex flex-col items-center justify-center p-6 text-center">
        <div className="text-5xl mb-4">👋</div>
        <h1 className="text-2xl font-bold text-[#0F172A] mb-2">Complete your worker profile</h1>
        <p className="text-slate-600 mb-6 max-w-md">It looks like you haven't completed onboarding for your worker profile yet. Finish setting it up to start browsing shifts.</p>
        <div className="flex gap-3">
          <a href="/onboarding/worker" className="bg-[#E8633B] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#d4552e] transition">Onboard as Worker</a>
          <button onClick={handleSignOut} className="border border-slate-300 text-[#0F172A] px-6 py-3 rounded-lg font-semibold hover:bg-slate-100 transition">Sign Out</button>
        </div>
      </div>
    );
  }

  const worker = data.worker;
  const bookings = data.bookings || [];
  const stats = data.stats || { upcoming: 0, completed: 0, applied: 0 };

  const activeBookings = bookings.filter((b: any) => ["pending", "confirmed"].includes(b.booking_status));
  const pastBookings = bookings.filter((b: any) => ["completed", "declined", "cancelled", "no_show"].includes(b.booking_status));

  const fmtRole = (role: string) => role?.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) || "";

  return (
    <div className="min-h-screen bg-[#F8F6F3]">
      {/* Navbar */}
      <nav className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg width="24" height="24" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="0" y="5" width="20" height="4" rx="2" fill="#0F172A"/>
              <rect x="0" y="12" width="16" height="4" rx="2" fill="#0F172A"/>
              <rect x="0" y="19" width="12" height="4" rx="2" fill="#E8633B"/>
            </svg>
            <span className="font-bold text-lg tracking-tight text-[#0F172A]">Roster</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 text-xs bg-slate-100 px-3 py-1.5 rounded-full text-slate-700 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]"></span>
              {worker.first_name} {worker.last_name}
            </div>
            <a href="/" className="text-sm text-slate-600 hover:text-[#0F172A] transition">← Landing Page</a>
            <button onClick={handleSignOut} className="text-sm text-slate-600 hover:text-[#E8633B] transition">Sign Out</button>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-[#0F172A]">My Shifts & Applications</h1>
            <p className="text-slate-600 mt-1">Manage your schedule, applied shifts, and chat with venues.</p>
          </div>
          <div className="flex gap-2 self-start md:self-auto">
            <a href="/messaging" className="border border-slate-200 text-[#0F172A] px-4 py-2.5 bg-white rounded-lg font-semibold text-sm hover:border-slate-300 transition">
              💬 Messages
            </a>
            <a href="/shifts/browse" className="bg-[#E8633B] text-white px-5 py-2.5 rounded-lg font-semibold text-sm hover:bg-[#d4552e] transition shadow-sm">
              Browse Available Shifts →
            </a>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            ["Upcoming Booked", stats.upcoming, "Confirmed shifts"],
            ["Applied Shifts", stats.applied, "Total submitted requests"],
            ["Completed shifts", stats.completed, "Shifts worked"],
          ].map(([label, value, sub], i) => (
            <div key={i} className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
              <p className="text-xs text-slate-500 font-medium mb-1">{label}</p>
              <p className="text-2xl font-bold text-[#0F172A]">{value}</p>
              <p className="text-xs text-slate-400 mt-1">{sub}</p>
            </div>
          ))}
        </div>

        {/* Connection flows: active applications list */}
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
              <h2 className="text-lg font-bold text-[#0F172A] mb-4 flex items-center gap-2">
                <span>🗓️</span> Active Shifts & Applications
              </h2>

              {activeBookings.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <p className="text-4xl mb-3">🔍</p>
                  <p className="font-semibold text-[#0F172A]">No active shifts yet</p>
                  <p className="text-sm mt-1 max-w-sm mx-auto mb-6">You haven't applied to any shifts in Denver-Boulder. Browse available shifts to get started.</p>
                  <a href="/shifts/browse" className="bg-[#E8633B] text-white px-6 py-2.5 rounded-lg font-semibold text-sm hover:bg-[#d4552e] transition shadow-sm">
                    Browse Available Shifts
                  </a>
                </div>
              ) : (
                <div className="space-y-4">
                  {activeBookings.map((b: any) => (
                    <div key={b.booking_id} className="border border-slate-100 rounded-xl p-5 hover:border-slate-200 transition">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2.5">
                            <span className="font-bold text-[#0F172A] text-lg">{fmtRole(b.role_type)}</span>
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
                              b.booking_status === "confirmed" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"
                            }`}>
                              {b.booking_status === "confirmed" ? "✓ Confirmed" : "⏳ Pending Approval"}
                            </span>
                          </div>
                          
                          <p className="text-sm font-semibold text-[#E8633B] mt-1">{b.business_name}</p>
                          
                          <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-y-1.5 gap-x-4 text-sm text-slate-600">
                            <div>📅 <strong>{new Date(b.date).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })}</strong></div>
                            <div>🕒 {b.start_time} - {b.end_time}</div>
                            <div>💰 <strong>${b.hourly_rate}/hr</strong></div>
                            {b.location_name && <div className="col-span-2 md:col-span-3">📍 {b.location_name}</div>}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end md:self-center border-t border-slate-50 pt-3 md:pt-0 md:border-0">
                          {b.booking_status === "confirmed" && (
                            <span className="text-xs bg-green-50 text-green-700 px-3 py-1.5 rounded-lg font-semibold">
                              Staffed!
                            </span>
                          )}
                          <a
                            href={`/messaging?contact=${b.business_id}`}
                            className="bg-slate-100 text-[#0F172A] px-4 py-2 rounded-lg font-semibold text-xs hover:bg-slate-200 transition text-center"
                          >
                            💬 Message Venue
                          </a>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Past shifts */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
              <h2 className="text-lg font-bold text-[#0F172A] mb-4">Past & Archived Applications</h2>
              {pastBookings.length === 0 ? (
                <p className="text-sm text-slate-500 py-4 text-center">No past shifts or closed applications yet.</p>
              ) : (
                <div className="divide-y divide-slate-50 text-sm">
                  {pastBookings.map((b: any) => (
                    <div key={b.booking_id} className="py-3 flex items-center justify-between gap-4">
                      <div>
                        <p className="font-bold text-[#0F172A]">{fmtRole(b.role_type)} at {b.business_name}</p>
                        <p className="text-xs text-slate-500">
                          {new Date(b.date).toLocaleDateString([], { month: "short", day: "numeric" })} • {b.start_time} - {b.end_time}
                        </p>
                      </div>
                      <div>
                        <span className={`inline-block px-2.5 py-0.5 rounded text-xs font-semibold capitalize ${
                          b.booking_status === "completed" ? "bg-slate-100 text-slate-700" :
                          b.booking_status === "declined" ? "bg-red-50 text-red-700" :
                          "bg-slate-50 text-slate-400"
                        }`}>
                          {b.booking_status?.replace(/_/g, " ")}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            {/* Vetting status / Profile details */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
              <h3 className="font-bold text-[#0F172A] text-lg mb-3">My Profile Status</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm pb-2 border-b border-slate-50">
                  <span className="text-slate-500 font-medium">Vetting Status</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                    worker.is_verified ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"
                  }`}>
                    {worker.is_verified ? "Vetted Pro" : "Pending Vetting"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm pb-2 border-b border-slate-50">
                  <span className="text-slate-500 font-medium">Reliability Score</span>
                  <span className="font-bold text-[#0F172A]">⭐ {worker.reliability_score || "5.0"} / 5.0</span>
                </div>
                <div className="flex items-center justify-between text-sm pb-2 border-b border-slate-50">
                  <span className="text-slate-500 font-medium">Shifts Completed</span>
                  <span className="font-bold text-[#0F172A]">{worker.total_shifts || 0}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500 font-medium">City Location</span>
                  <span className="font-bold text-[#0F172A]">{worker.city || "Denver"}, CO</span>
                </div>
              </div>
            </div>

            {/* Shift Rules */}
            <div className="bg-[#0F172A] text-white rounded-xl p-6">
              <h3 className="font-bold text-md mb-2">📋 Worker Code of Conduct</h3>
              <p className="text-slate-300 text-xs leading-relaxed space-y-2">
                Our venues demand absolute reliability. Late cancellations (within 24 hours of shift start) or no-shows severely hit your reliability score and can trigger temporary or permanent suspension from the platform. 
              </p>
              <p className="text-[#E8633B] text-xs font-semibold mt-3">Be on time. Do your best. Get hired back!</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
