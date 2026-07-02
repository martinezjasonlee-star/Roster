import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@clerk/clerk-react";
import { useEffect } from "react";

export const Route = createFileRoute("/worker-dashboard")({
  component: WorkerDashboard,
});

function WorkerDashboard() {
  const { isSignedIn } = useAuth();
  useEffect(() => { if (!isSignedIn) window.location.href = "/auth/sign-in"; }, [isSignedIn]);
  if (!isSignedIn) return null;

  return (
    <div className="min-h-screen bg-[#F8F6F3]">
      <nav className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg width="24" height="24" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="0" y="5" width="20" height="4" rx="2" fill="#0F172A"/>
              <rect x="0" y="12" width="16" height="4" rx="2" fill="#0F172A"/>
              <rect x="0" y="19" width="12" height="4" rx="2" fill="#E8633B"/>
            </svg>
            <span className="font-bold text-lg tracking-tight">Roster</span>
          </div>
          <a href="/" className="text-sm text-slate-500 hover:text-[#0F172A] transition">← Back to site</a>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-[#0F172A]">My Shifts</h1>
            <p className="text-slate-500">Find and manage your shifts.</p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4 mb-8">
          {[
            ["Upcoming Shifts", "0", "No shifts booked yet"],
            ["Available Near You", "0", "Check back soon"],
            ["Completed", "0", "Your shift history"],
          ].map(([label, value, sub], i) => (
            <div key={i} className="bg-white rounded-xl p-6 shadow-sm">
              <p className="text-xs text-slate-400 font-medium mb-1">{label}</p>
              <p className="text-2xl font-bold text-[#0F172A]">{value}</p>
              <p className="text-xs text-slate-400 mt-1">{sub}</p>
            </div>
          ))}
        </div>

        <div className="bg-[#0F172A] rounded-xl p-8 text-center">
          <h2 className="text-xl font-bold text-white mb-2">Your profile is live</h2>
          <p className="text-slate-300 mb-6">Venues in Denver-Boulder can now find you. Shifts will appear here when venues post them.</p>
          <div className="flex gap-3 justify-center">
            <a href="#" className="inline-block bg-[#E8633B] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#d4552e] transition">Browse Shifts</a>
            <a href="#" className="inline-block border-2 border-white text-white px-6 py-3 rounded-lg font-semibold hover:bg-white/10 transition">Edit Profile</a>
          </div>
        </div>
      </div>
    </div>
  );
}