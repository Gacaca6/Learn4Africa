"use client";

/**
 * Learn4Africa — Sign in page.
 *
 * Presents Google OAuth as the primary path and email/password as the
 * fallback. Honours the `callbackUrl` query param so learners land back
 * on the module they tried to open after signing in.
 */

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { FormEvent, Suspense, useState } from "react";

import { ArrowRight, GraduationCap, Heart, Info } from "@/lib/icons";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") || "/tracks";
  const initialError = params.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(
    initialError ? "Sign-in failed. Please try again." : null
  );
  const [busy, setBusy] = useState(false);

  async function handleGoogle() {
    setBusy(true);
    setError(null);
    try {
      await signIn("google", { callbackUrl });
    } catch (err) {
      console.error(err);
      setError("Could not start Google sign-in.");
      setBusy(false);
    }
  }

  async function handleCredentials(e: FormEvent) {
    e.preventDefault();
    if (!email || !password) return;
    setBusy(true);
    setError(null);
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setBusy(false);
    if (!res || res.error) {
      setError("Incorrect email or password. Please try again.");
      return;
    }
    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-warm-50 via-white to-sage-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-warm-700 hover:text-warm-900">
            <GraduationCap className="w-8 h-8" />
            <span className="font-display text-2xl font-bold">Learn4Africa</span>
          </Link>
          <h1 className="mt-6 font-display text-3xl font-bold text-earth-900">
            Karibu tena.
          </h1>
          <p className="mt-2 text-earth-600">
            Sign in to save your progress and keep learning.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-warm-100 p-6 sm:p-8 space-y-5">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm p-3 flex gap-2">
              <Info className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="button"
            onClick={handleGoogle}
            disabled={busy}
            className="w-full flex items-center justify-center gap-3 bg-white border-2 border-earth-200 hover:border-warm-400 hover:bg-warm-50 text-earth-900 font-semibold py-3 rounded-xl transition disabled:opacity-60"
          >
            <GoogleMark />
            Continue with Google
          </button>

          <div className="flex items-center gap-3 text-xs text-earth-500 uppercase tracking-wider">
            <div className="h-px flex-1 bg-earth-200" />
            <span>or with email</span>
            <div className="h-px flex-1 bg-earth-200" />
          </div>

          <form onSubmit={handleCredentials} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-earth-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
                className="w-full px-4 py-2.5 rounded-lg border border-earth-200 focus:border-warm-500 focus:ring-2 focus:ring-warm-200 outline-none"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-earth-700 mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                minLength={6}
                className="w-full px-4 py-2.5 rounded-lg border border-earth-200 focus:border-warm-500 focus:ring-2 focus:ring-warm-200 outline-none"
                placeholder="••••••"
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              className="w-full inline-flex items-center justify-center gap-2 bg-warm-600 hover:bg-warm-700 text-white font-semibold py-3 rounded-xl transition disabled:opacity-60"
            >
              {busy ? "Signing in…" : "Sign in"}
              {!busy && <ArrowRight className="w-5 h-5" />}
            </button>
          </form>

          <p className="text-center text-sm text-earth-600">
            New to Learn4Africa?{" "}
            <Link
              href={`/auth/register${callbackUrl ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ""}`}
              className="text-warm-700 hover:text-warm-900 font-semibold"
            >
              Create a free account
            </Link>
          </p>
        </div>

        <p className="mt-6 text-center text-sm text-earth-500 flex items-center justify-center gap-1">
          <Heart className="w-4 h-4 text-warm-600" />
          Free forever. No credit card. No ads.
        </p>
      </div>
    </main>
  );
}

function GoogleMark() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 48 48"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
      />
    </svg>
  );
}
