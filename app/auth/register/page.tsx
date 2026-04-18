"use client";

/**
 * Learn4Africa — Create account page.
 *
 * Calls the Convex `passwords.signUp` action to create the user (the
 * bcrypt hashing + duplicate-email check run server-side on Convex),
 * then signs them in via NextAuth Credentials so they land back on the
 * track they were trying to open (or /tracks).
 */

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useAction } from "convex/react";
import { FormEvent, Suspense, useState } from "react";

import { api } from "@/convex/_generated/api";
import { ArrowRight, GraduationCap, Heart, Info } from "@/lib/icons";

const COUNTRIES = [
  "Rwanda",
  "Kenya",
  "Uganda",
  "Tanzania",
  "Burundi",
  "DRC",
  "Ethiopia",
  "South Africa",
  "Nigeria",
  "Ghana",
  "Senegal",
  "Cote d'Ivoire",
  "Other",
];

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "sw", label: "Kiswahili" },
  { code: "rw", label: "Kinyarwanda" },
  { code: "fr", label: "Francais" },
  { code: "ha", label: "Hausa" },
  { code: "yo", label: "Yoruba" },
];

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterInner />
    </Suspense>
  );
}

function RegisterInner() {
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") || "/tracks";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [country, setCountry] = useState("Rwanda");
  const [preferredLanguage, setPreferredLanguage] = useState("en");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const signUp = useAction(api.passwords.signUp);

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

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      // Create the user on Convex. The action returns either
      // { ok: true, user } or { ok: false, error } — errors come back
      // as strings so we can render them directly (no exceptions thrown
      // for expected conditions like duplicate email).
      const result = await signUp({
        name: name.trim(),
        email: email.trim(),
        password,
      });
      if (!result.ok) {
        setError(result.error);
        setBusy(false);
        return;
      }

      // `country` + `preferredLanguage` aren't persisted on the user
      // row yet — Stage 3 adds a profile extension. Keeping them in
      // the UI now so we don't lose state on the form.

      // Sign in through NextAuth Credentials so the session cookie
      // gets issued with the new user id.
      const res = await signIn("credentials", {
        email: email.trim(),
        password,
        redirect: false,
      });
      if (!res || res.error) {
        throw new Error("Account created but sign-in failed. Try signing in.");
      }
      router.push(callbackUrl);
      router.refresh();
    } catch (err: any) {
      const msg = String(err?.message || "");
      setError(msg || "Could not create your account. Please try again.");
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-sage-50 via-white to-warm-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-warm-700 hover:text-warm-900">
            <GraduationCap className="w-8 h-8" />
            <span className="font-display text-2xl font-bold">Learn4Africa</span>
          </Link>
          <h1 className="mt-6 font-display text-3xl font-bold text-earth-900">
            Start your free account
          </h1>
          <p className="mt-2 text-earth-600">
            Save progress. Build a portfolio. Practice real interviews.
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
            Continue with Google
          </button>

          <div className="flex items-center gap-3 text-xs text-earth-500 uppercase tracking-wider">
            <div className="h-px flex-1 bg-earth-200" />
            <span>or with email</span>
            <div className="h-px flex-1 bg-earth-200" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-earth-700 mb-1">
                Full name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-earth-200 focus:border-warm-500 focus:ring-2 focus:ring-warm-200 outline-none"
                placeholder="Your name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-earth-700 mb-1">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-earth-200 focus:border-warm-500 focus:ring-2 focus:ring-warm-200 outline-none"
                placeholder="At least 6 characters"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-earth-700 mb-1">
                  Country
                </label>
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-earth-200 bg-white focus:border-warm-500 focus:ring-2 focus:ring-warm-200 outline-none"
                >
                  {COUNTRIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-earth-700 mb-1">
                  Preferred language
                </label>
                <select
                  value={preferredLanguage}
                  onChange={(e) => setPreferredLanguage(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-earth-200 bg-white focus:border-warm-500 focus:ring-2 focus:ring-warm-200 outline-none"
                >
                  {LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={busy}
              className="w-full inline-flex items-center justify-center gap-2 bg-warm-600 hover:bg-warm-700 text-white font-semibold py-3 rounded-xl transition disabled:opacity-60"
            >
              {busy ? "Creating your account…" : "Create free account"}
              {!busy && <ArrowRight className="w-5 h-5" />}
            </button>
          </form>

          <p className="text-center text-sm text-earth-600">
            Already have an account?{" "}
            <Link
              href={`/auth/login${callbackUrl ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ""}`}
              className="text-warm-700 hover:text-warm-900 font-semibold"
            >
              Sign in
            </Link>
          </p>
        </div>

        <p className="mt-6 text-center text-sm text-earth-500 flex items-center justify-center gap-1">
          <Heart className="w-4 h-4 text-warm-600" />
          Free forever. Your data belongs to you.
        </p>
      </div>
    </main>
  );
}
