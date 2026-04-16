"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { ArrowLeft, Info } from "@/lib/icons";

const MESSAGES: Record<string, string> = {
  Configuration: "Auth is not configured correctly on the server.",
  AccessDenied: "Access denied. Please try signing in again.",
  Verification: "That sign-in link has expired or was already used.",
  Default: "Something went wrong while signing in. Please try again.",
  CredentialsSignin: "Incorrect email or password. Please try again.",
};

export default function AuthErrorPage() {
  return (
    <Suspense fallback={null}>
      <AuthErrorInner />
    </Suspense>
  );
}

function AuthErrorInner() {
  const params = useSearchParams();
  const code = params.get("error") || "Default";
  const message = MESSAGES[code] || MESSAGES.Default;

  return (
    <main className="min-h-screen bg-gradient-to-br from-warm-50 via-white to-sage-50 flex items-center justify-center px-4 py-10">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-warm-100 p-8 text-center">
        <div className="inline-flex p-3 rounded-full bg-red-50 text-red-600 mb-4">
          <Info className="w-8 h-8" />
        </div>
        <h1 className="font-display text-2xl font-bold text-earth-900">
          Sign-in issue
        </h1>
        <p className="mt-2 text-earth-600">{message}</p>
        <p className="mt-2 text-xs text-earth-400 uppercase tracking-wider">
          Error code: {code}
        </p>

        <Link
          href="/auth/login"
          className="mt-6 inline-flex items-center gap-2 bg-warm-600 hover:bg-warm-700 text-white font-semibold px-5 py-2.5 rounded-xl transition"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to sign in
        </Link>
      </div>
    </main>
  );
}
