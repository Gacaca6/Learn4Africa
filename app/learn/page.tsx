"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Sun, Code, Crown, Wallet, Bot, Salad, BookOpen, GraduationCap,
  Sparkles, Target, Clock, ArrowRight, Trophy,
} from "@/lib/icons";
import { TopNav } from "@/components/TopNav";
import { IMAGES } from "@/lib/images";
import { useCourseStore } from "@/lib/courseStore";
import { useCurriculumStore } from "@/lib/curriculumStore";

const FEATURED_COURSES = [
  {
    id: "intro-solar-energy",
    title: "Solar Energy for Everyone",
    description: "Learn how the sun powers our world — from basic science to building your own solar charger",
    category: "Science",
    difficulty: "Beginner",
    chapters: 5,
    Icon: Sun,
    image: IMAGES.solarEnergy,
  },
  {
    id: "intro-python",
    title: "Python Programming",
    description: "Your first steps into coding — build real programs that solve real problems",
    category: "Technology",
    difficulty: "Beginner",
    chapters: 8,
    Icon: Code,
    image: IMAGES.python,
  },
  {
    id: "african-kingdoms",
    title: "Great African Kingdoms",
    description: "Discover the empires of Mali, Songhai, Great Zimbabwe, Aksum, and more",
    category: "History",
    difficulty: "Beginner",
    chapters: 6,
    Icon: Crown,
    image: IMAGES.africanKingdoms,
  },
  {
    id: "financial-literacy",
    title: "Money Smart: Financial Literacy",
    description: "Saving, budgeting, investing, and building wealth — skills for life",
    category: "Finance",
    difficulty: "Beginner",
    chapters: 5,
    Icon: Wallet,
    image: IMAGES.financialLiteracy,
  },
  {
    id: "intro-ai",
    title: "Understanding AI",
    description: "What is Artificial Intelligence? How does it work? How will it shape your future?",
    category: "Technology",
    difficulty: "Beginner",
    chapters: 6,
    Icon: Bot,
    image: IMAGES.ai,
  },
  {
    id: "health-nutrition",
    title: "Health & Nutrition Basics",
    description: "Understand your body, eat well, stay healthy — knowledge that saves lives",
    category: "Health",
    difficulty: "Beginner",
    chapters: 5,
    Icon: Salad,
    image: IMAGES.healthNutrition,
  },
];

export default function LearnPage() {
  const [search, setSearch] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const currentCourse = useCourseStore((s) => s.current);
  const curricula = useCurriculumStore((s) => s.curricula);
  const moduleProgress = useCurriculumStore((s) => s.moduleProgress);

  useEffect(() => {
    setHydrated(true);
  }, []);

  const curriculumList = hydrated
    ? Object.values(curricula).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
    : [];

  function curriculumProgress(id: string, total: number) {
    const progress = moduleProgress[id] || {};
    const completed = Object.values(progress).filter((s) => s === "complete").length;
    return { completed, total, pct: total ? (completed / total) * 100 : 0 };
  }

  const filtered = FEATURED_COURSES.filter(
    (c) =>
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="noise min-h-screen bg-warm-50">
      <TopNav currentPath="/learn" />

      <main id="main" className="max-w-6xl mx-auto px-5 sm:px-8 py-10 pt-28">
        {/* Header */}
        <div className="mb-10 max-w-2xl">
          <h1 className="font-display text-3xl font-bold text-warm-900 mb-2 slide-up">
            My learning
          </h1>
          <p className="text-warm-500 slide-up" style={{ animationDelay: "50ms" }}>
            Your active learning paths and featured courses, all in one place.
          </p>
        </div>

        {/* My Curricula — built with Mwalimu */}
        {curriculumList.length > 0 ? (
          <section className="mb-12">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-warm-900 text-sm uppercase tracking-wide flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-zigama-500" />
                Your learning paths
              </h2>
              <Link
                href="/curriculum/new"
                className="text-xs font-semibold text-zigama-600 hover:text-zigama-700 flex items-center gap-1"
              >
                Build another <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {curriculumList.map((c) => {
                const p = curriculumProgress(c.id, c.modules.length);
                const done = p.completed === p.total && p.total > 0;
                return (
                  <Link
                    key={c.id}
                    href={`/curriculum/${c.id}`}
                    className="card group bg-white rounded-xl border-2 border-zigama-200 p-5 hover:border-zigama-400 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-10 h-10 bg-zigama-50 rounded-xl flex items-center justify-center">
                        {done ? (
                          <Trophy className="w-5 h-5 text-yellow-500" />
                        ) : (
                          <GraduationCap className="w-5 h-5 text-zigama-600" />
                        )}
                      </div>
                      <span className="text-xs font-semibold text-zigama-600 bg-zigama-50 px-2 py-0.5 rounded tabular-nums">
                        {p.completed} / {p.total}
                      </span>
                    </div>
                    <h3 className="font-semibold text-warm-900 leading-tight mb-1">{c.title}</h3>
                    <p className="text-xs text-warm-500 line-clamp-2 mb-3">{c.goal}</p>
                    {c.career_outcome && (
                      <p className="text-xs text-warm-500 mb-3 flex items-start gap-1.5">
                        <Target className="w-3 h-3 text-zigama-500 mt-0.5 shrink-0" />
                        <span className="line-clamp-1">{c.career_outcome}</span>
                      </p>
                    )}
                    <div className="h-1.5 bg-warm-100 rounded-full overflow-hidden mb-3">
                      <div
                        className="h-full bg-zigama-500 transition-all"
                        style={{ width: `${p.pct}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-zigama-600 flex items-center gap-1">
                      {done ? "Review pathway" : "Continue learning"} <ArrowRight className="w-3 h-3" />
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        ) : (
          <section className="mb-12 bg-warm-900 rounded-2xl p-8 sm:p-10">
            <div className="max-w-xl">
              <div className="w-12 h-12 bg-warm-800 rounded-xl flex items-center justify-center mb-4">
                <GraduationCap className="w-6 h-6 text-zigama-300" />
              </div>
              <h2 className="font-display text-2xl font-bold text-warm-50 mb-2">
                Build your first learning path
              </h2>
              <p className="text-warm-300 text-sm mb-5 leading-relaxed">
                Tell Mwalimu what you want to achieve. She&apos;ll search YouTube for the best teachers
                and design a complete curriculum, grounded in African context.
              </p>
              <Link
                href="/curriculum/new"
                className="inline-flex items-center gap-2 bg-warm-50 text-warm-900 px-5 py-3 rounded-xl text-sm font-semibold hover:bg-white transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                Build a learning path
              </Link>
            </div>
          </section>
        )}

        {/* Featured courses search */}
        <div className="mb-6 max-w-lg">
          <h2 className="font-semibold text-warm-900 text-sm uppercase tracking-wide mb-3 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-warm-500" />
            Featured courses
          </h2>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search courses..."
            className="w-full px-4 py-3 rounded-xl border border-warm-200 bg-white outline-none focus:border-zigama-500 focus:ring-2 focus:ring-zigama-100 text-sm text-warm-900 placeholder:text-warm-400"
          />
        </div>

        {/* Continue Learning — shows current course from store */}
        {currentCourse && (
          <div className="mb-10 slide-up">
            <h2 className="font-semibold text-warm-900 text-sm mb-3 uppercase tracking-wide">Continue Learning</h2>
            <Link
              href={`/course/${currentCourse.id}`}
              className="card group bg-white rounded-xl border-2 border-zigama-200 overflow-hidden flex items-center gap-5 p-5 hover:border-zigama-400 transition-colors"
            >
              <div className="w-14 h-14 bg-zigama-50 rounded-xl flex items-center justify-center shrink-0">
                <BookOpen className="w-6 h-6 text-zigama-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-warm-900 truncate">{currentCourse.outline.title}</h3>
                <p className="text-sm text-warm-500 truncate">{currentCourse.outline.description}</p>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-xs text-warm-400">{currentCourse.outline.chapters.length} chapters</span>
                  <span className="text-xs font-medium text-zigama-600 bg-zigama-50 px-2 py-0.5 rounded">{currentCourse.difficulty}</span>
                </div>
              </div>
              <span className="text-sm font-semibold text-zigama-600 shrink-0">Continue →</span>
            </Link>
          </div>
        )}

        {/* Course Grid — cards with 3:2 images */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 stagger-in">
          {filtered.map((course) => (
            <Link
              href={`/course/${course.id}`}
              key={course.id}
              className="card group bg-white rounded-xl border border-warm-200/60 overflow-hidden"
            >
              {/* Card image — 3:2 aspect, hover zoom */}
              <div className="card-image relative aspect-[3/2] bg-warm-100 overflow-hidden">
                <picture>
                  <source
                    type="image/webp"
                    srcSet={`${course.image.srcSmall}&fm=webp 800w, ${course.image.src}&fm=webp 1600w`}
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                  <img
                    src={course.image.srcSmall}
                    srcSet={`${course.image.srcSmall} 800w, ${course.image.src} 1600w`}
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    alt={course.image.alt}
                    loading="lazy"
                    decoding="async"
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500"
                    style={{ transitionTimingFunction: "var(--ease-out)" }}
                  />
                </picture>
                {/* Subtle bottom gradient for text readability */}
                <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/20 to-transparent" />
                {/* Category badge floating on image */}
                <div className="absolute top-3 left-3">
                  <span className="text-xs font-medium bg-white/90 backdrop-blur-sm text-warm-700 px-2.5 py-1 rounded-lg shadow-sm">
                    {course.category}
                  </span>
                </div>
              </div>
              <div className="p-5">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-warm-400 tabular-nums">
                    {course.chapters} chapters
                  </span>
                </div>
                <h3 className="font-semibold text-warm-900 mb-1">
                  {course.title}
                </h3>
                <p className="text-sm text-warm-500 leading-relaxed mb-3">{course.description}</p>
                <span className="text-xs font-medium text-sage-600 bg-sage-50 px-2 py-0.5 rounded">
                  {course.difficulty}
                </span>
              </div>
            </Link>
          ))}
        </div>

        {/* Empty state */}
        {filtered.length === 0 && (
          <div className="text-center py-16">
            <p className="text-warm-500 mb-2">No courses match your search.</p>
            <p className="text-sm text-warm-400">
              Try a different term, or{" "}
              <Link href="/create" className="text-zigama-600 underline underline-offset-2">
                create a custom course
              </Link>
              .
            </p>
          </div>
        )}

        {/* Create Your Own */}
        <div className="mt-14 p-8 bg-white rounded-xl border border-warm-200/60">
          <div className="max-w-md">
            <h2 className="font-display text-xl font-bold text-warm-900 mb-2">
              Don&apos;t see what you need?
            </h2>
            <p className="text-sm text-warm-500 mb-5">
              Tell our AI any topic and we&apos;ll create a complete course for you in seconds.
            </p>
            <Link
              href="/create"
              className="inline-block bg-warm-900 text-warm-50 px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-warm-800 transition-colors"
            >
              Create a Custom Course
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
