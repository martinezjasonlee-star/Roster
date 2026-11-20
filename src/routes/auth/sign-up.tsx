import { createFileRoute } from "@tanstack/react-router";
import { SignUp } from "@clerk/clerk-react";

export const Route = createFileRoute("/auth/sign-up")({
  component: SignUpPage,
});

// Brand styling for the Clerk card so it matches Roster instead of Clerk's
// defaults. Clerk's own "Development mode" footer is left untouched.
const appearance = {
  variables: {
    colorPrimary: "#E8633B",
    colorText: "#0F172A",
    colorTextSecondary: "#475569",
    colorBackground: "#FFFFFF",
    colorInputBackground: "#FFFFFF",
    colorInputText: "#0F172A",
    borderRadius: "0.75rem",
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
  },
  elements: {
    cardBox:
      "w-full overflow-hidden rounded-xl border border-slate-200 shadow-lg",
    card: "shadow-none border-0 rounded-none",
    headerTitle: "text-[#0F172A]",
    headerSubtitle: "text-slate-500",
    footerActionLink: "text-[#E8633B] hover:text-[#d4552e]",
  },
};

function SignUpPage() {
  return (
    <div className="min-h-screen bg-[#0F172A] flex flex-col items-center justify-center gap-6 px-4 py-10">
      <a href="/" className="flex items-center gap-2 text-white" aria-label="Roster home">
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="0" y="5" width="20" height="4" rx="2" fill="#FFFFFF" />
          <rect x="0" y="12" width="16" height="4" rx="2" fill="#FFFFFF" />
          <rect x="0" y="19" width="12" height="4" rx="2" fill="#E8633B" />
        </svg>
        <span className="font-bold text-xl tracking-tight">Roster</span>
      </a>

      <div className="w-full max-w-[400px]">
        <SignUp
          routing="hash"
          signInUrl="/auth/sign-in"
          fallbackRedirectUrl="/onboarding/worker"
          appearance={appearance}
        />
      </div>

      <a href="/" className="text-sm text-slate-300 hover:text-white transition">
        ← Back to Roster
      </a>
    </div>
  );
}
