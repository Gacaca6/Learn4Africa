"use client";

import Link from "next/link";
import {
  Globe, GraduationCap, Heart, Check,
  BookOpen, Smartphone, WifiOff, HeartPulse,
} from "@/lib/icons";
import { TopNav } from "@/components/TopNav";

const VALUES = [
  {
    title: "Free forever",
    description:
      "Knowledge is a right, not a privilege. Learn4Africa will never charge learners. No premium tier, no hidden fees, no paywalls. Ever.",
    Icon: Heart,
  },
  {
    title: "Built with Ubuntu",
    description:
      '"I am because we are." Ubuntu is the philosophy that binds Learn4Africa. We succeed when our community succeeds. Every feature is designed to lift everyone, not just the few.',
    Icon: Globe,
  },
  {
    title: "African-centred",
    description:
      "Our examples come from Kigali, Lagos, Nairobi, and Accra — not from contexts that don't reflect our lives. We teach with African proverbs, African heroes, and African ambition.",
    Icon: GraduationCap,
  },
  {
    title: "Dignity always",
    description:
      "Mwalimu never shames a learner. Wrong answers are learning opportunities. Struggle is normal. Every child deserves to feel intelligent, because they are.",
    Icon: HeartPulse,
  },
];

const COMMITMENTS = [
  "We will never sell learner data",
  "We will never put essential features behind a paywall",
  "We will never use AI to replace teachers — only to support them",
  "We will always represent African voices, contexts, and aspirations",
  "We will make every format accessible on low-bandwidth connections",
  "We will open-source our code so others can build for their communities",
  "We will prioritize African languages alongside English and French",
  "We will listen to learners and communities, not just investors",
];

export default function AboutPage() {
  return (
    <div className="noise min-h-screen bg-warm-50">
      <TopNav currentPath="/about" />

      <main id="main" className="max-w-4xl mx-auto px-5 sm:px-8 py-12 pt-28">
        {/* ── Hero ────────────────────────────────────────────── */}
        <div className="mb-16 max-w-2xl">
          <p className="text-sm font-medium text-zigama-600 mb-3 uppercase tracking-wide slide-up">
            Our Mission
          </p>
          <h1 className="font-display text-4xl sm:text-5xl font-bold text-warm-900 leading-tight mb-6 slide-up" style={{ animationDelay: "50ms" }}>
            Every African child deserves world-class education
          </h1>
          <p className="text-lg text-warm-500 leading-relaxed slide-up" style={{ animationDelay: "100ms" }}>
            Learn4Africa is a free, AI-powered learning platform that transforms any topic into
            8 learning formats — reading, flashcards, quizzes, podcasts, comics, games, and songs —
            with a personal AI tutor named Mwalimu guiding every step.
          </p>
        </div>

        {/* ── Our Promise ────────────────────────────────────── */}
        <section className="mb-16">
          <h2 className="font-display text-2xl font-bold text-warm-900 mb-8">Our Promise</h2>
          <div className="grid sm:grid-cols-2 gap-6">
            {VALUES.map((value) => (
              <div key={value.title} className="bg-white rounded-xl border border-warm-200/60 p-6">
                <value.Icon className="w-6 h-6 text-warm-600 mb-4" />
                <h3 className="font-semibold text-warm-900 mb-2">{value.title}</h3>
                <p className="text-sm text-warm-500 leading-relaxed">{value.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── How Mwalimu Thinks ─────────────────────────────── */}
        <section className="mb-16">
          <div className="bg-warm-900 rounded-2xl p-8 sm:p-10">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 bg-warm-800 rounded-xl flex items-center justify-center">
                <GraduationCap className="w-7 h-7 text-warm-300" />
              </div>
              <div>
                <h2 className="font-display text-2xl font-bold text-warm-50">How Mwalimu Thinks</h2>
                <p className="text-warm-400 text-sm">&ldquo;Mwalimu&rdquo; means &ldquo;teacher&rdquo; in Swahili</p>
              </div>
            </div>

            <div className="space-y-6 text-warm-300 text-sm leading-relaxed">
              <div>
                <h3 className="text-warm-100 font-semibold mb-2">Patient, never punishing</h3>
                <p>
                  Mwalimu teaches with the warmth of a caring older sibling. When you get something wrong,
                  it says &ldquo;Let&apos;s try a different way&rdquo; — never &ldquo;That&apos;s wrong.&rdquo; Every mistake
                  is a step toward understanding.
                </p>
              </div>

              <div>
                <h3 className="text-warm-100 font-semibold mb-2">Culturally grounded</h3>
                <p>
                  When teaching about electricity, Mwalimu talks about solar panels in Kigali — not
                  power grids in New York. When explaining economics, it references M-Pesa and Village
                  Savings Groups. Every lesson is rooted in African life.
                </p>
              </div>

              <div>
                <h3 className="text-warm-100 font-semibold mb-2">Multilingual and adaptive</h3>
                <p>
                  Mwalimu speaks your language — literally. It naturally mixes encouragement in Swahili
                  (&ldquo;Vizuri sana!&rdquo;), Kinyarwanda (&ldquo;Komeza!&rdquo;), Yoruba, Hausa, and more. It adapts
                  to your age, your pace, and how you learn best.
                </p>
              </div>

              <div>
                <h3 className="text-warm-100 font-semibold mb-2">Detects when you&apos;re struggling</h3>
                <p>
                  If you ask the same question three times or seem frustrated, Mwalimu notices. It might
                  suggest switching to a comic, trying a game, or taking a break. Because sometimes the best
                  teaching is knowing when to change approach.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Who This Is For ────────────────────────────────── */}
        <section className="mb-16">
          <h2 className="font-display text-2xl font-bold text-warm-900 mb-4">Who This Is For</h2>
          <p className="text-warm-500 mb-8 leading-relaxed">
            Learn4Africa is built for every learner on the continent — and anyone who wants
            to understand the world through an African lens.
          </p>

          <div className="grid sm:grid-cols-3 gap-4">
            {[
              {
                title: "Students (8-18)",
                desc: "School subjects in formats that actually make sense. Study for exams with flashcards, learn through comics when reading gets tiring.",
                Icon: BookOpen,
              },
              {
                title: "Self-learners",
                desc: "Adults who want to learn Python, start a business, understand nutrition, or explore African history — at their own pace, for free.",
                Icon: Smartphone,
              },
              {
                title: "Offline communities",
                desc: "Lessons that cache on your device. Learn even when the internet is unreliable. Designed for 2G connections and basic smartphones.",
                Icon: WifiOff,
              },
            ].map((item) => (
              <div key={item.title} className="bg-white rounded-xl border border-warm-200/60 p-6">
                <item.Icon className="w-5 h-5 text-warm-500 mb-3" />
                <h3 className="font-semibold text-warm-900 text-sm mb-2">{item.title}</h3>
                <p className="text-xs text-warm-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Our Commitment to Dignity ──────────────────────── */}
        <section className="mb-16">
          <h2 className="font-display text-2xl font-bold text-warm-900 mb-6">
            Our Commitment
          </h2>
          <div className="bg-white rounded-xl border border-warm-200/60 p-6 sm:p-8">
            <ul className="space-y-3">
              {COMMITMENTS.map((commitment, i) => (
                <li key={i} className="flex items-start gap-3">
                  <Check className="w-4 h-4 text-sage-500 mt-0.5 shrink-0" />
                  <span className="text-sm text-warm-700">{commitment}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── The Name ───────────────────────────────────────── */}
        <section className="mb-16">
          <div className="bg-sage-50 rounded-xl border border-sage-200 p-8 text-center">
            <h2 className="font-display text-xl font-bold text-warm-900 mb-3">
              Why &ldquo;Learn4Africa&rdquo;?
            </h2>
            <p className="text-sm text-warm-600 leading-relaxed max-w-lg mx-auto">
              Because learning should be <em>for</em> Africa — designed around African needs, African
              languages, African dreams. Not an afterthought. Not a localized version of something
              built elsewhere. Built here, for here, by people who believe in here.
            </p>
          </div>
        </section>

        {/* ── CTA ────────────────────────────────────────────── */}
        <div className="bg-warm-900 rounded-xl p-8 sm:p-10 text-center">
          <h2 className="font-display text-2xl font-bold text-warm-50 mb-3">
            Ready to start learning?
          </h2>
          <p className="text-warm-400 mb-6 max-w-md mx-auto text-sm">
            No sign-up. No payment. No catch. Just tell us what you want to learn.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/curriculum/new"
              className="bg-warm-50 text-warm-900 px-6 py-3 rounded-lg text-sm font-semibold hover:bg-white transition-colors"
            >
              Build My Learning Path
            </Link>
            <Link
              href="/tracks"
              className="bg-warm-800 text-warm-200 px-6 py-3 rounded-lg text-sm font-medium hover:bg-warm-700 transition-colors border border-warm-700"
            >
              Browse Career Tracks
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-10 px-5 sm:px-8 bg-warm-950 text-warm-500 mt-12">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-warm-500" />
              <span className="text-warm-300 font-semibold text-sm">Learn4Africa</span>
            </div>
            <p className="text-xs text-center text-warm-600">
              Built with love for every child who deserves to see the world through a new lens.
            </p>
            <p className="text-xs text-warm-600">
              Open Source &bull; MIT License
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
