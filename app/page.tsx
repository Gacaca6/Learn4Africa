"use client";

import Link from "next/link";
import {
  Globe, BookOpen, Layers, CircleHelp, Mic, BookImage,
  Gamepad2, Music, Bot, GraduationCap, Zap, Flame, Medal, Trophy,
  Cpu, FlaskConical, Compass, Crown, Wallet, HeartPulse, Palette,
  Wrench, Sprout, MessageCircle, Smartphone, WifiOff, Heart,
} from "@/lib/icons";
import { HeroImage, OptimizedImage } from "@/lib/image";
import { IMAGES } from "@/lib/images";
import { TopNav } from "@/components/TopNav";

const FORMATS = [
  { Icon: BookOpen, name: "Reading", desc: "Clear, structured lessons" },
  { Icon: Layers, name: "Flashcards", desc: "Spaced repetition memory cards" },
  { Icon: CircleHelp, name: "Quizzes", desc: "Test your understanding" },
  { Icon: Mic, name: "Podcasts", desc: "Audio lessons in African languages" },
  { Icon: BookImage, name: "Comics", desc: "Visual stories that teach" },
  { Icon: Gamepad2, name: "Games", desc: "Learn through play with XP and badges" },
  { Icon: Music, name: "Songs", desc: "Catchy tunes to remember concepts" },
  { Icon: Bot, name: "AI Tutor", desc: "Mwalimu — your personal guide" },
];

const CATEGORIES = [
  { Icon: Cpu, name: "AI & Technology" },
  { Icon: FlaskConical, name: "Science" },
  { Icon: Compass, name: "Mathematics" },
  { Icon: Globe, name: "African History" },
  { Icon: Wallet, name: "Business & Finance" },
  { Icon: HeartPulse, name: "Health & Wellness" },
  { Icon: Palette, name: "Arts & Culture" },
  { Icon: Wrench, name: "Practical Trades" },
  { Icon: Sprout, name: "Environment" },
  { Icon: MessageCircle, name: "Languages" },
];

export default function HomePage() {
  return (
    <div className="noise min-h-screen bg-warm-50">
      {/* Shared top nav — skip-to-content + brand + desktop links + mobile drawer. */}
      <TopNav currentPath="/" />

      {/* Hero Section — Full-bleed photography */}
      <HeroImage
        src={IMAGES.hero.src}
        srcSmall={IMAGES.hero.srcSmall}
        alt={IMAGES.hero.alt}
        credit={IMAGES.hero.credit}
        creditUrl={IMAGES.hero.creditUrl}
        className="min-h-[85vh] sm:min-h-[90vh] flex items-end"
        objectPosition="center 30%"
      >
        <div id="main" className="max-w-3xl mx-auto px-5 sm:px-8 pb-16 pt-32 w-full">
          <p className="text-sm font-medium text-zigama-300 mb-4 tracking-wide uppercase slide-up">
            Free forever &bull; Built for Africa &bull; Powered by Mwalimu AI
          </p>

          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-warm-50 leading-[1.1] tracking-tight-display mb-6 slide-up" style={{ animationDelay: "50ms" }}>
            Any topic. <br className="hidden sm:block" />Taught the African way.
          </h1>

          <p className="text-lg text-warm-300 max-w-xl mb-10 leading-relaxed slide-up" style={{ animationDelay: "100ms" }}>
            Tell us what you want to learn. Mwalimu, our African AI tutor, creates a complete course
            in seconds &mdash; reading, flashcards, quizzes, podcasts, comics, and songs &mdash; all
            rooted in African contexts, stories, and ambition.
          </p>

          {/* CTAs */}
          <div className="max-w-lg slide-up flex flex-col sm:flex-row gap-3" style={{ animationDelay: "150ms" }}>
            <Link
              href="/tracks"
              className="inline-flex items-center gap-2 bg-zigama-600 text-white px-7 py-4 rounded-xl text-base font-semibold hover:bg-zigama-700 transition-colors shadow-lg"
            >
              <GraduationCap className="w-5 h-5" />
              Pick a career track
            </Link>
            <Link
              href="/curriculum/new"
              className="inline-flex items-center gap-2 bg-warm-50 text-warm-900 px-7 py-4 rounded-xl text-base font-semibold hover:bg-white transition-colors shadow-lg"
            >
              Build custom path
            </Link>
          </div>
          <p className="text-xs text-warm-300/90 mt-3 max-w-lg slide-up" style={{ animationDelay: "200ms" }}>
            Six hand-curated tracks that lead to real African jobs. Or tell Mwalimu your own goal and she&apos;ll build a custom path. Free, no sign-up.
          </p>
        </div>
      </HeroImage>

      {/* Stats Bar — the three numbers that define Learn4Africa */}
      <section className="py-12 sm:py-16 px-5 sm:px-8 bg-warm-900 border-b border-warm-800">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            <div className="bg-warm-800/60 border border-warm-700/60 rounded-2xl p-6 sm:p-7 text-center sm:text-left">
              <p className="font-display text-4xl sm:text-5xl font-bold text-warm-50 mb-2 tabular-nums">86%</p>
              <p className="text-sm text-warm-300 leading-snug">
                of African children lack quality learning
              </p>
            </div>
            <div className="bg-warm-800/60 border border-warm-700/60 rounded-2xl p-6 sm:p-7 text-center sm:text-left">
              <p className="font-display text-4xl sm:text-5xl font-bold text-warm-50 mb-2 tabular-nums">52</p>
              <p className="text-sm text-warm-300 leading-snug">
                free modules across 6 career tracks
              </p>
            </div>
            <div className="bg-zigama-600 border-2 border-zigama-400 rounded-2xl p-6 sm:p-7 text-center sm:text-left shadow-xl shadow-zigama-900/40">
              <p className="font-display text-5xl sm:text-6xl font-bold text-white mb-2 tabular-nums">0 RWF</p>
              <p className="text-sm sm:text-base text-warm-50 font-medium leading-snug">
                cost to any student. Forever.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Three-step flow */}
      <section className="py-20 px-5 sm:px-8 bg-warm-50 border-b border-warm-200/60">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-lg mb-12">
            <h2 className="font-display text-3xl font-bold text-warm-900 mb-3">
              Three steps. Zero barriers.
            </h2>
            <p className="text-warm-500 leading-relaxed">
              No sign-up. No payment. No download. Just open your browser and start learning.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 relative">
            {[
              {
                step: "01",
                title: "Tell us a topic",
                desc: '"Solar energy." "Python programming." "African kingdoms." Anything you want to learn — in any language you speak.',
                Icon: MessageCircle,
              },
              {
                step: "02",
                title: "Mwalimu builds your course",
                desc: "In seconds, our AI creates a full course with 8 learning formats, rooted in African culture and examples you'll recognize.",
                Icon: GraduationCap,
              },
              {
                step: "03",
                title: "Learn your way",
                desc: "Read, listen, play, sing, or watch comics. Switch formats anytime. Your progress travels with you across all of them.",
                Icon: BookOpen,
              },
            ].map((item, i) => (
              <div key={item.step} className="relative bg-white rounded-2xl border border-warm-200/60 p-6 sm:p-8">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 bg-warm-900 rounded-xl flex items-center justify-center shrink-0">
                    <item.Icon className="w-6 h-6 text-warm-50" />
                  </div>
                  <span className="font-display text-2xl font-bold text-warm-200 tabular-nums">{item.step}</span>
                </div>
                <h3 className="font-semibold text-warm-900 text-lg mb-2">{item.title}</h3>
                <p className="text-sm text-warm-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 8 Learning Formats */}
      <section className="py-20 px-5 sm:px-8 bg-white border-y border-warm-200/60">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-lg mb-12">
            <h2 className="font-display text-3xl font-bold text-warm-900 mb-3">
              One topic. Eight ways to learn.
            </h2>
            <p className="text-warm-500 leading-relaxed">
              Everyone learns differently. Learn4Africa creates every lesson in 8
              formats — switch freely, your progress carries across all of them.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 stagger-in">
            {FORMATS.map((format) => (
              <div
                key={format.name}
                className="card group p-5 rounded-xl border border-warm-200/60 cursor-default"
              >
                <div className="mb-3 transition-transform duration-200 group-hover:translate-y-[-2px]">
                  <format.Icon className="w-6 h-6 text-warm-600" />
                </div>
                <h3 className="font-semibold text-warm-900 text-sm mb-0.5">
                  {format.name}
                </h3>
                <p className="text-xs text-warm-500 leading-relaxed">{format.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Meet Mwalimu — image left, text right */}
      <section className="py-0 bg-warm-900">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-[1.2fr_1fr] min-h-[480px]">
            {/* Image bleeds to left edge */}
            <div className="relative overflow-hidden hidden md:block">
              <picture>
                <source
                  type="image/webp"
                  srcSet={`${IMAGES.mwalimu.srcSmall}&fm=webp 800w, ${IMAGES.mwalimu.src}&fm=webp 1600w`}
                  sizes="50vw"
                />
                <img
                  src={IMAGES.mwalimu.src}
                  srcSet={`${IMAGES.mwalimu.srcSmall} 800w, ${IMAGES.mwalimu.src} 1600w`}
                  sizes="50vw"
                  alt={IMAGES.mwalimu.alt}
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{ objectPosition: "center top" }}
                />
              </picture>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-warm-900/80" />
              <div className="absolute bottom-3 left-4">
                <a
                  href={IMAGES.mwalimu.creditUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-white/30 hover:text-white/50 transition-colors"
                >
                  Photo by {IMAGES.mwalimu.credit}
                </a>
              </div>
            </div>
            {/* Text side */}
            <div className="flex items-center px-8 sm:px-12 py-16 md:py-0">
              <div>
                <div className="w-16 h-16 bg-warm-800 rounded-2xl flex items-center justify-center mb-6">
                  <GraduationCap className="w-8 h-8 text-warm-300" />
                </div>
                <h2 className="font-display text-3xl font-bold text-warm-50 mb-4">
                  Meet Mwalimu
                </h2>
                <p className="text-warm-400 leading-relaxed mb-8">
                  Your personal AI tutor. &ldquo;Mwalimu&rdquo; means &ldquo;teacher&rdquo; in Swahili.
                  It notices when you&apos;re stuck, switches your learning format, and
                  guides you with the patience of a caring older sibling.
                </p>
                <div className="flex flex-wrap gap-2">
                  {["English", "Swahili", "Hausa", "Yoruba", "French", "Arabic", "Amharic", "Zulu", "Kinyarwanda"].map(
                    (lang) => (
                      <span
                        key={lang}
                        className="bg-warm-800 text-warm-300 px-4 py-2 rounded-lg text-sm border border-warm-700/50"
                      >
                        {lang}
                      </span>
                    )
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-20 px-5 sm:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-lg mb-12">
            <h2 className="font-display text-3xl font-bold text-warm-900 mb-3">
              Learn what matters to you
            </h2>
            <p className="text-warm-500">
              From practical trades to cutting-edge AI — courses designed for African
              learners.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 stagger-in">
            {CATEGORIES.map((cat) => (
              <Link
                href={`/learn?category=${cat.name}`}
                key={cat.name}
                className="card group p-5 rounded-xl bg-white border border-warm-200/60"
              >
                <div className="mb-2 transition-transform duration-200 group-hover:translate-y-[-2px]">
                  <cat.Icon className="w-5 h-5 text-warm-600" />
                </div>
                <h3 className="font-medium text-sm text-warm-900">{cat.name}</h3>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Gamification */}
      <section className="py-20 px-5 sm:px-8 bg-white border-y border-warm-200/60">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-[1fr_1.5fr] gap-12 items-center">
            <div>
              <h2 className="font-display text-3xl font-bold text-warm-900 mb-3">
                Learning is an adventure
              </h2>
              <p className="text-warm-500 leading-relaxed">
                Earn XP, unlock badges, maintain streaks, and climb the leaderboard.
                Every lesson is a step forward.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 stagger-in">
              {[
                { Icon: Zap, label: "Earn XP", value: "Every action counts" },
                { Icon: Flame, label: "Daily Streaks", value: "Build consistency" },
                { Icon: Medal, label: "12 Badges", value: "Unlock achievements" },
                { Icon: Trophy, label: "Leaderboard", value: "Compete with friends" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="card p-5 rounded-xl bg-warm-50 border border-warm-200/60"
                >
                  <item.Icon className="w-5 h-5 text-warm-600 mb-2" />
                  <h3 className="font-semibold text-sm text-warm-900">{item.label}</h3>
                  <p className="text-xs text-warm-500 mt-0.5">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Built for Africa */}
      <section className="py-20 px-5 sm:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { Icon: Smartphone, title: "Mobile first", desc: "Works beautifully on any phone. No app download needed — just open your browser." },
              { Icon: WifiOff, title: "Offline ready", desc: "Lessons cache on your device. Learn even when the internet is unreliable." },
              { Icon: Heart, title: "Free forever", desc: "No hidden fees. No premium tier. Knowledge is a right, not a privilege." },
            ].map((item) => (
              <div key={item.title} className="pr-4">
                <item.Icon className="w-5 h-5 text-warm-500 mb-3" />
                <h3 className="font-semibold text-warm-900 mb-2">{item.title}</h3>
                <p className="text-sm text-warm-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-5 sm:px-8 bg-warm-900 border-t border-warm-800">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-warm-50 mb-4">
            Your future starts with one lesson
          </h2>
          <p className="text-warm-400 mb-8 leading-relaxed">
            Every expert was once a beginner. Every journey starts with a single
            step. Take yours now.
          </p>
          <Link
            href="/curriculum/new"
            className="inline-block bg-warm-50 text-warm-900 px-7 py-3.5 rounded-lg text-sm font-semibold hover:bg-white transition-colors"
          >
            Build My Learning Path — It&apos;s Free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 px-5 sm:px-8 bg-warm-950 text-warm-500">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-warm-500" />
              <span className="text-warm-300 font-semibold text-sm">Learn4Africa</span>
            </div>
            <div className="flex items-center gap-5 text-xs">
              <Link href="/learn" className="text-warm-500 hover:text-warm-300 transition-colors">Learn</Link>
              <Link href="/create" className="text-warm-500 hover:text-warm-300 transition-colors">Create</Link>
              <Link href="/tutor" className="text-warm-500 hover:text-warm-300 transition-colors">Tutor</Link>
              <Link href="/about" className="text-warm-500 hover:text-warm-300 transition-colors">About</Link>
            </div>
            <p className="text-xs text-warm-600">
              Open Source &bull; MIT License
            </p>
          </div>
          <p className="text-xs text-center text-warm-600 mt-4 max-w-lg mx-auto">
            Built with love for every child who deserves to see the world through a new lens. Ubuntu.
          </p>
        </div>
      </footer>
    </div>
  );
}
