import { createFileRoute } from "@tanstack/react-router";
import { SignUp } from "@clerk/clerk-react";

export const Route = createFileRoute("/auth/sign-up")({
  component: SignUpPage,
});

function SignUpPage() {
  return (
    <div className="min-h-screen bg-[#0F172A] flex items-center justify-center px-4">
      <div className="bg-white rounded-xl p-8 shadow-lg max-w-md w-full">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-[#0F172A]">Join Roster</h1>
          <p className="text-slate-500 mt-1">Create your account</p>
        </div>
        <SignUp routing="hash" signInUrl="/auth/sign-in" />
      </div>
    </div>
  );
}