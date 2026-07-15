import { createFileRoute } from "@tanstack/react-router";
import { useAuth, useUser, useClerk } from "@clerk/clerk-react";
import { useState, useEffect } from "react";
import { getBusinessDashboard, updateBookingStatus } from "~/lib/server";

export const Route = createFileRoute("/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const { signOut } = useClerk();

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Load business dashboard data
  const loadData = async () => {
    if (!user?.emailAddresses?.[0]?.emailAddress) return;
    const email = user.emailAddresses[0].emailAddress;
    try {
      const res = await getBusinessDashboard({ data: email });
      setData(res);
    } catch (err) {
      console.error("Error loading dashboard data:", err);
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

  const handleUpdateStatus = async (bookingId: string, status: "confirmed" | "declined") => {
    setActionLoading(bookingId);
    try {
      const res = await updateBookingStatus({ data: { bookingId, status } });
      if (res.success) {
        await loadData();
      } else {
        alert("Failed to update status.");
      }
    } catch (err) {
      alert("Error occurred.");
    } finally {
      setActionLoading(null);
    }
  };

  if (!isLoaded || (isSignedIn && loading)) {
    return (
      <div className="min-h-screen bg-[#F8F6F3] flex items-center justify-center">
        <p className="text-[#0F172A] font-semibold">Loading your dashboard...</p>
      </div>
    );
  }

  if (!isSignedIn) return null;

  // Handle case where user is authenticated but not onboarded as a business
  if (!data && !loading) {
    return (
      <div className="min-h-screen bg-[#F8F6F3] flex flex-col items-center justify-center p-6 text-center">
        <div className="text-5xl mb-4">🏠</div>
        <h1 className="text-2xl font-bold text-[#0F172A] mb-2">Finish setting up your profile</h1>
        <p className="text-slate-600 mb-6 max-w-md">It looks like you haven't completed onboarding for your business venue yet.</p>
        <div className="flex gap-3">
          <a href="/onboarding/business" className="bg-[#E8633B] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#d4552e] transition">Onboard as Business</a>
          <button onClick={handleSignOut} className="border border-slate-300 text-[#0F172A] px-6 py-3 rounded-lg font-semibold hover:bg-slate-100 transition">Sign Out</button>
        </div>
      </div>
    );
  }

  const business = data.business;
  const shifts = data.shifts || [];
  const bookings = data.bookings || [];
  const stats = data.stats || { openShifts: 0, confirmedShifts: 0, pendingApplicants: 0 };

  const pendingBookings = bookings.filter((b: any) => b.booking_status === "pending");
  const otherBookings = bookings.filter((b: any) => b.booking_status !== "pending");

  const fmtRole = (role: string) => role?.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) || "";

  return (
    <div className="min-h-screen bg-[#F8F6F3]">
      {/* Top nav */}
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
            <div className="hidden md:flex items-center gap-1.5 text-xs bg-slate-100 px-3 py-1.5 rounded-full text-slate-700 font-medium">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              {business.name}
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
            <h1 className="text-2xl font-bold text-[#0F172A] flex items-center gap-2">
              Welcome, {business.name}
            </h1>
            <p className="text-slate-600 mt-1 capitalize">{business.venue_type} • {business.address}, {business.city}</p>
          </div>
          <div className="flex gap-2 self-start md:self-auto">
            <a href="/messaging" className="border border-slate-200 text-[#0F172A] px-4 py-2.5 rounded-lg font-semibold text-sm hover:border-slate-300 bg-white transition">
              💬 Messages
            </a>
            <a href="/admin" className="border border-slate-200 text-[#0F172A] px-4 py-2.5 rounded-lg font-semibold text-sm hover:border-slate-300 bg-white transition">
              🛡️ Admin
            </a>
            <a href="/shifts/post" className="bg-[#E8633B] text-white px-5 py-2.5 rounded-lg font-semibold text-sm hover:bg-[#d4552e] transition shadow-sm">
              + Post a Shift
            </a>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            ["Active Shifts", stats.openShifts, "Open on marketplace"],
            ["Confirmed Shifts", stats.confirmedShifts, "Workers booked"],
            ["Pending Applicants", stats.pendingApplicants, "Awaiting approval"],
            ["Membership", business.membership_tier, "Starter trial"],
          ].map(([label, value, sub], i) => (
            <div key={i} className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
              <p className="text-xs text-slate-500 font-medium mb-1">{label}</p>
              <p className="text-2xl font-bold text-[#0F172A] capitalize">{value}</p>
              <p className="text-xs text-slate-400 mt-1">{sub}</p>
            </div>
          ))}
        </div>

        {/* Pending Applicants / Shift Staffing requests */}
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {/* Section 1: Pending Applicants */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
              <h2 className="text-lg font-bold text-[#0F172A] mb-4 flex items-center gap-2">
                <span>📋</span> Pending Shift Applicants
                {pendingBookings.length > 0 && (
                  <span className="bg-amber-100 text-amber-800 text-xs font-semibold px-2 py-0.5 rounded-full">
                    {pendingBookings.length}
                  </span>
                )}
              </h2>

              {pendingBookings.length === 0 ? (
                <div className="text-center py-10 text-slate-500">
                  <p className="text-3xl mb-2">✨</p>
                  <p className="font-semibold">All caught up!</p>
                  <p className="text-sm mt-1">New applications for your posted shifts will appear here.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {pendingBookings.map((b: any) => (
                    <div key={b.booking_id} className="py-5 first:pt-0 last:pb-0 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-full bg-slate-200 overflow-hidden flex items-center justify-center text-slate-600 font-bold text-lg flex-shrink-0">
                          {b.photo_url ? (
                            <img src={b.photo_url} alt="Profile" className="w-full h-full object-cover" />
                          ) : (
                            <span>{b.first_name[0]}{b.last_name[0]}</span>
                          )}
                        </div>
                        <div>
                          <h3 className="font-bold text-[#0F172A]">
                            {b.first_name} {b.last_name}
                          </h3>
                          <p className="text-sm text-slate-500 flex items-center gap-2 mt-0.5">
                            <span className="font-medium text-[#E8633B]">{fmtRole(b.role_type)}</span>
                            <span>•</span>
                            <span>{b.years_experience} yrs exp</span>
                            <span>•</span>
                            <span className="flex items-center text-amber-600">★ {b.reliability_score || "5.0"}</span>
                          </p>
                          <div className="mt-2 bg-slate-50 border border-slate-100 rounded px-2.5 py-1.5 text-xs text-slate-600">
                            Applied for <strong className="text-slate-800">{fmtRole(b.role_type)}</strong> shift on{" "}
                            <strong>{new Date(b.date).toLocaleDateString([], { month: "short", day: "numeric" })}</strong> (
                            {b.start_time} - {b.end_time})
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end md:self-center">
                        <button
                          onClick={() => handleUpdateStatus(b.booking_id, "confirmed")}
                          disabled={actionLoading !== null}
                          className="bg-[#16A34A] text-white px-4 py-2 rounded-lg font-semibold text-xs hover:bg-green-700 transition disabled:opacity-50"
                        >
                          {actionLoading === b.booking_id ? "..." : "Accept"}
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(b.booking_id, "declined")}
                          disabled={actionLoading !== null}
                          className="border border-red-200 text-red-600 px-4 py-2 rounded-lg font-semibold text-xs hover:bg-red-50 transition disabled:opacity-50"
                        >
                          Decline
                        </button>
                        <a
                          href={`/messaging?contact=${b.worker_id}`}
                          className="border border-slate-200 text-slate-600 px-3 py-2 rounded-lg font-semibold text-xs hover:bg-slate-50 transition"
                        >
                          Message
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Section 2: Shift History / Upcoming */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
              <h2 className="text-lg font-bold text-[#0F172A] mb-4">My Posted Shifts</h2>

              {shifts.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <p className="text-3xl mb-2">📝</p>
                  <p className="font-semibold">No shifts posted yet</p>
                  <a href="/shifts/post" className="text-sm text-[#E8633B] font-bold mt-2 inline-block underline">Post your first shift now →</a>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 text-xs font-semibold uppercase">
                        <th className="pb-3">Role</th>
                        <th className="pb-3">Date / Time</th>
                        <th className="pb-3">Rate</th>
                        <th className="pb-3">Workers</th>
                        <th className="pb-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-sm">
                      {shifts.map((s: any) => (
                        <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3.5 font-bold text-[#0F172A]">{fmtRole(s.role_type)}</td>
                          <td className="py-3.5">
                            <p className="text-[#0F172A] font-medium">
                              {new Date(s.date).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })}
                            </p>
                            <p className="text-xs text-slate-500">{s.start_time} - {s.end_time}</p>
                          </td>
                          <td className="py-3.5 font-semibold text-[#0F172A]">${s.hourly_rate}/hr</td>
                          <td className="py-3.5 text-slate-600">{s.workers_needed} needed</td>
                          <td className="py-3.5 text-right">
                            <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
                              s.status === "open" ? "bg-green-100 text-green-800" :
                              s.status === "filled" ? "bg-blue-100 text-blue-800" :
                              "bg-slate-100 text-slate-600"
                            }`}>
                              {s.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            {/* Confirmed / Booked Workers */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
              <h2 className="text-lg font-bold text-[#0F172A] mb-4">Confirmed Staff</h2>
              
              {otherBookings.length === 0 ? (
                <div className="text-center py-6 text-slate-500">
                  <p className="text-sm">No confirmed bookings yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {otherBookings.map((b: any) => (
                    <div key={b.booking_id} className="flex items-center justify-between border-b border-slate-50 pb-3 last:border-0 last:pb-0">
                      <div>
                        <p className="font-semibold text-[#0F172A]">{b.first_name} {b.last_name}</p>
                        <p className="text-xs text-slate-500">{fmtRole(b.role_type)} on {new Date(b.date).toLocaleDateString([], { month: "short", day: "numeric" })}</p>
                      </div>
                      <div className="text-right">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold capitalize ${
                          b.booking_status === "confirmed" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                        }`}>
                          {b.booking_status}
                        </span>
                        <a href={`/messaging?contact=${b.worker_id}`} className="block text-xs text-[#E8633B] font-semibold mt-1 hover:underline">
                          Send Message
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Shift Posting Tip */}
            <div className="bg-[#0F172A] text-white rounded-xl p-6">
              <h3 className="font-bold text-md mb-2">💡 Quick Staffing Tip</h3>
              <p className="text-slate-300 text-sm leading-relaxed mb-4">
                Workers in Denver-Boulder apply fast! Confirm applications promptly to secure top-tier talent. Once you confirm, an in-app chat automatically opens with the worker to align on parking, attire, and menu logistics.
              </p>
              <a href="/shifts/post" className="inline-block bg-[#E8633B] hover:bg-[#d4552e] text-white text-xs font-semibold px-4 py-2 rounded transition">
                Post Another Shift
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
