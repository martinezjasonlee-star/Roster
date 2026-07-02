import { createFileRoute } from "@tanstack/react-router";
import { SignIn } from "@clerk/clerk-react";

export const Route = createFileRoute("/auth/sign-in")({
  component: SignInPage,
});

function SignInPage() {
  return (
    <div className="min-h-screen bg-[#0F172A] flex items-center justify-center px-4">
      <div className="bg-white rounded-xl p-8 shadow-lg max-w-md w-full">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-[#0F172A]">Welcome back</h1>
          <p className="text-slate-500 mt-1">Sign in to Roster</p>
        </div>
        <SignIn routing="hash" signUpUrl="/auth/sign-up" />
      </div>
    </div>
  );
}