import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/card")({
  component: BusinessCard,
});

function BusinessCard() {
  return (
    <div className="min-h-screen bg-[#F8F6F3] flex items-center justify-center p-8 print:p-0 print:bg-white">
      {/* Business Card */}
      <div className="max-w-4xl mx-auto">
        <h2 className="text-sm text-center text-slate-400 mb-6 print:hidden">Print this page — cards are 3.5" x 2" each</h2>
        
        <div className="grid grid-cols-2 gap-6 print:gap-0 max-w-3xl mx-auto">
          {/* Front of card */}
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 w-[350px] h-[200px] print:shadow-none print:border print:rounded-none print:break-inside-avoid flex flex-col justify-center items-center p-6">
            <div className="flex items-center gap-2 mb-2">
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <rect x="0" y="5" width="20" height="4" rx="2" fill="#0F172A"/>
                <rect x="0" y="12" width="16" height="4" rx="2" fill="#0F172A"/>
                <rect x="0" y="19" width="12" height="4" rx="2" fill="#E8633B"/>
              </svg>
              <span className="font-bold text-xl tracking-tight">Roster</span>
            </div>
            <p className="text-sm text-[#E8633B] font-semibold mb-3">Premium Staffing Network</p>
            <p className="text-xs text-slate-500 text-center leading-relaxed">
              Bartenders &amp; Servers<br/>
              Keep 100% of Your Wage<br/>
              Denver-Boulder
            </p>
            <p className="text-[10px] text-slate-400 mt-3">roster-work.com</p>
          </div>

          {/* Back of card — QR code */}
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 w-[350px] h-[200px] print:shadow-none print:border print:rounded-none print:break-inside-avoid flex flex-col items-center justify-center p-6">
            <p className="text-xs text-slate-500 font-semibold mb-2">Scan to join free</p>
            <img src="/worker_qr.svg" alt="Join Roster" className="w-28 h-28 mb-1"/>
            <p className="text-[10px] text-slate-400">roster-work.com/onboarding/worker</p>
          </div>
        </div>

        {/* Print instructions */}
        <div className="mt-8 text-center print:hidden space-y-3">
          <p className="text-sm text-slate-500">↑ Two cards per sheet. Print on card stock, cut along edges.</p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => window.print()} 
              className="bg-[#0F172A] text-white px-6 py-2.5 rounded-lg font-semibold text-sm hover:bg-opacity-80 transition">
              🖨️ Print Cards
            </button>
            <a href="/onboarding/worker" 
              className="bg-[#E8633B] text-white px-6 py-2.5 rounded-lg font-semibold text-sm hover:bg-[#d4552e] transition">
              Sign Up Now →
            </a>
          </div>
          <p className="text-xs text-slate-400">Prints at actual business card size (3.5" x 2"). Cut and distribute.</p>
        </div>
      </div>
    </div>
  );
}