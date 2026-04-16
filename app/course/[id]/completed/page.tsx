"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Globe, GraduationCap, ArrowRight, Check, BookOpen, Zap, Trophy,
  Crown, Sprout, Code, HeartPulse, Wallet, Cpu,
} from "@/lib/icons";
import { useCourseStore, type StoredCourse } from "@/lib/courseStore";

// ── Rwanda-focused job pathway data ──────────────────────────
interface JobCard {
  title: string;
  sector: string;
  salary: string;
  growth: string;
  skills: string[];
}

interface Pathway {
  label: string;
  emoji: string;
  jobs: JobCard[];
  nextCourse: string;
}

const JOB_MAP: Record<string, Pathway> = {
  python: {
    label: "Software Development",
    emoji: "code",
    jobs: [
      {
        title: "Junior Python Developer",
        sector: "BK TecHouse / Irembo",
        salary: "250,000 - 450,000 RWF/mo",
        growth: "High demand — 40% growth in Kigali tech sector",
        skills: ["Python", "Django/Flask", "SQL", "Git"],
      },
      {
        title: "Data Analyst",
        sector: "Bank of Kigali / MINICT",
        salary: "300,000 - 600,000 RWF/mo",
        growth: "Critical role in Rwanda's data-driven governance",
        skills: ["Python", "Pandas", "Excel", "Data Visualization"],
      },
      {
        title: "Mobile App Developer",
        sector: "MTN Rwanda / Tigo",
        salary: "350,000 - 700,000 RWF/mo",
        growth: "Mobile-first economy — huge opportunity",
        skills: ["Python", "React Native", "API Design"],
      },
    ],
    nextCourse: "Web Development with JavaScript",
  },
  web: {
    label: "Web & Digital",
    emoji: "globe",
    jobs: [
      {
        title: "Frontend Developer",
        sector: "Kigali tech startups",
        salary: "300,000 - 550,000 RWF/mo",
        growth: "Every business needs a web presence",
        skills: ["HTML/CSS", "JavaScript", "React", "Tailwind"],
      },
      {
        title: "Digital Marketing Specialist",
        sector: "Teta Tech / AC Group",
        salary: "200,000 - 400,000 RWF/mo",
        growth: "Growing as Rwanda's digital economy expands",
        skills: ["SEO", "Social Media", "Analytics", "Content"],
      },
      {
        title: "UI/UX Designer",
        sector: "Andela / Remote Global",
        salary: "400,000 - 800,000 RWF/mo",
        growth: "Top remote-work opportunity from Rwanda",
        skills: ["Figma", "User Research", "Prototyping"],
      },
    ],
    nextCourse: "Python Programming",
  },
  data: {
    label: "Data & AI",
    emoji: "cpu",
    jobs: [
      {
        title: "Data Scientist",
        sector: "CMU-Africa / AIMS Rwanda",
        salary: "500,000 - 1,000,000 RWF/mo",
        growth: "Rwanda is positioning as Africa's AI hub",
        skills: ["Python", "Machine Learning", "Statistics"],
      },
      {
        title: "AI Research Assistant",
        sector: "AIMS / University of Rwanda",
        salary: "350,000 - 700,000 RWF/mo",
        growth: "Academic + industry crossover opportunities",
        skills: ["Research Methods", "Python", "NLP"],
      },
      {
        title: "Business Intelligence Analyst",
        sector: "RDB / Ministry of Finance",
        salary: "400,000 - 750,000 RWF/mo",
        growth: "Government investing heavily in data capacity",
        skills: ["SQL", "Tableau", "Data Modeling", "Reporting"],
      },
    ],
    nextCourse: "Python Programming",
  },
  health: {
    label: "Health & Wellness",
    emoji: "heart",
    jobs: [
      {
        title: "Community Health Worker",
        sector: "MOH Rwanda / Partners In Health",
        salary: "150,000 - 300,000 RWF/mo",
        growth: "Rwanda's community health model is world-renowned",
        skills: ["Health Education", "First Aid", "Community Outreach"],
      },
      {
        title: "Nutrition Advisor",
        sector: "WFP Rwanda / UNICEF",
        salary: "250,000 - 500,000 RWF/mo",
        growth: "Nutrition programs expanding across East Africa",
        skills: ["Nutrition Science", "Counseling", "Data Collection"],
      },
      {
        title: "Health Tech Coordinator",
        sector: "Babyl Rwanda / mHealth startups",
        salary: "300,000 - 600,000 RWF/mo",
        growth: "Digital health is Rwanda's fastest-growing sector",
        skills: ["Digital Health", "Project Management", "Training"],
      },
    ],
    nextCourse: "Introduction to First Aid",
  },
  finance: {
    label: "Business & Finance",
    emoji: "wallet",
    jobs: [
      {
        title: "Financial Advisor",
        sector: "BPR / Equity Bank Rwanda",
        salary: "300,000 - 600,000 RWF/mo",
        growth: "Financial inclusion is a national priority",
        skills: ["Financial Planning", "Risk Assessment", "Customer Relations"],
      },
      {
        title: "Microfinance Officer",
        sector: "Umurenge SACCOs / Vision Finance",
        salary: "200,000 - 400,000 RWF/mo",
        growth: "Critical for rural economic development",
        skills: ["Lending", "Community Finance", "Record Keeping"],
      },
      {
        title: "Entrepreneur / Small Business Owner",
        sector: "Self-employed / BDF-supported",
        salary: "Variable — avg 500,000+ RWF/mo",
        growth: "Rwanda ranked #2 in Africa for ease of doing business",
        skills: ["Budgeting", "Marketing", "Operations", "Leadership"],
      },
    ],
    nextCourse: "Starting a Small Business",
  },
  default: {
    label: "General Career Pathways",
    emoji: "star",
    jobs: [
      {
        title: "Teaching Assistant",
        sector: "Schools across Rwanda",
        salary: "150,000 - 300,000 RWF/mo",
        growth: "Education sector growing with Rwanda's youth population",
        skills: ["Communication", "Subject Knowledge", "Patience"],
      },
      {
        title: "Research Assistant",
        sector: "Universities / NGOs",
        salary: "250,000 - 500,000 RWF/mo",
        growth: "Growing demand for evidence-based policy",
        skills: ["Research", "Writing", "Data Analysis"],
      },
      {
        title: "Content Creator",
        sector: "Remote / Freelance",
        salary: "200,000 - 600,000 RWF/mo",
        growth: "Africa's creator economy is booming",
        skills: ["Writing", "Video", "Social Media", "Storytelling"],
      },
    ],
    nextCourse: "Python Programming",
  },
};

function detectPathway(course: StoredCourse): Pathway {
  const topic = (course.topic + " " + course.outline.title).toLowerCase();
  if (topic.includes("python") || topic.includes("programming") || topic.includes("coding")) return JOB_MAP.python;
  if (topic.includes("web") || topic.includes("html") || topic.includes("javascript") || topic.includes("css")) return JOB_MAP.web;
  if (topic.includes("data") || topic.includes("ai") || topic.includes("artificial") || topic.includes("machine")) return JOB_MAP.data;
  if (topic.includes("health") || topic.includes("nutrition") || topic.includes("medical") || topic.includes("first aid")) return JOB_MAP.health;
  if (topic.includes("finance") || topic.includes("money") || topic.includes("business") || topic.includes("financial")) return JOB_MAP.finance;
  return JOB_MAP.default;
}

function extractSkills(course: StoredCourse): string[] {
  const skills = new Set<string>();
  for (const ch of course.outline.chapters) {
    for (const l of ch.lessons) {
      l.key_concepts?.forEach((k: string) => skills.add(k));
    }
  }
  // Limit to 12 most relevant
  return Array.from(skills).slice(0, 12);
}

const ICON_MAP: Record<string, typeof Code> = {
  code: Code,
  globe: Globe,
  cpu: Cpu,
  heart: HeartPulse,
  wallet: Wallet,
  star: Trophy,
};

export default function CompletedPage() {
  const stored = useCourseStore((s) => s.current);
  const [course, setCourse] = useState<StoredCourse | null>(null);
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    if (stored) setCourse(stored);
    else {
      try {
        const raw = localStorage.getItem("learn4africa_current_course");
        if (raw) setCourse(JSON.parse(raw));
      } catch {}
    }
  }, [stored]);

  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 4000);
    return () => clearTimeout(timer);
  }, []);

  if (!course) {
    return (
      <div className="noise min-h-screen bg-warm-50 flex items-center justify-center">
        <div className="text-center px-6">
          <h2 className="font-display text-xl font-bold text-warm-900 mb-2">No course found</h2>
          <p className="text-sm text-warm-500 mb-6">Complete a course first to see your career pathway.</p>
          <Link href="/create" className="inline-block bg-warm-900 text-warm-50 px-6 py-3 rounded-xl text-sm font-semibold hover:bg-warm-800 transition-colors">
            Create a Course
          </Link>
        </div>
      </div>
    );
  }

  const pathway = detectPathway(course);
  const skills = extractSkills(course);
  const PathwayIcon = ICON_MAP[pathway.emoji] || Trophy;

  return (
    <div className="noise min-h-screen bg-warm-50">
      {/* Header */}
      <header className="bg-warm-50/80 backdrop-blur-md border-b border-warm-200/60 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-warm-700" />
              <span className="text-lg font-semibold tracking-tight text-warm-900">Learn4Africa</span>
            </Link>
            <Link href="/learn" className="text-sm text-warm-600 hover:text-warm-900 transition-colors">
              Browse Courses
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-5 sm:px-8 py-10">
        {/* ── Celebration Header ─────────────────────────────── */}
        <div className="relative bg-warm-900 rounded-2xl p-8 sm:p-12 mb-10 overflow-hidden">
          {/* Animated celebration dots */}
          {showConfetti && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {Array.from({ length: 20 }).map((_, i) => (
                <div
                  key={i}
                  className="absolute w-2 h-2 rounded-full animate-bounce"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    backgroundColor: ["#f59e0b", "#10b981", "#3b82f6", "#ef4444", "#8b5cf6"][i % 5],
                    animationDelay: `${Math.random() * 2}s`,
                    animationDuration: `${1 + Math.random() * 2}s`,
                    opacity: 0.7,
                  }}
                />
              ))}
            </div>
          )}

          <div className="relative z-10 text-center">
            <div className="w-20 h-20 bg-warm-800 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Trophy className="w-10 h-10 text-yellow-400" />
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-warm-50 mb-3">
              Hongera! Congratulations!
            </h1>
            <p className="text-warm-300 text-lg mb-2">
              You completed <span className="text-white font-semibold">{course.outline.title}</span>
            </p>
            <p className="text-warm-400 text-sm max-w-md mx-auto">
              {course.outline.chapters.length} chapters mastered. You&apos;ve taken a real step toward your future. Here&apos;s what doors this opens for you.
            </p>
          </div>
        </div>

        {/* ── Skills Earned ──────────────────────────────────── */}
        <section className="mb-10">
          <h2 className="font-semibold text-warm-900 text-sm uppercase tracking-wide mb-4 flex items-center gap-2">
            <Zap className="w-4 h-4 text-zigama-500" />
            Skills You&apos;ve Earned
          </h2>
          <div className="flex flex-wrap gap-2">
            {skills.map((skill) => (
              <span
                key={skill}
                className="inline-flex items-center gap-1.5 bg-white border border-warm-200/60 text-warm-700 px-3 py-1.5 rounded-lg text-sm"
              >
                <Check className="w-3.5 h-3.5 text-sage-500" />
                {skill}
              </span>
            ))}
            {skills.length === 0 && (
              <span className="text-sm text-warm-400">Skills from your course concepts will appear here</span>
            )}
          </div>
        </section>

        {/* ── Career Pathway ─────────────────────────────────── */}
        <section className="mb-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-zigama-50 rounded-xl flex items-center justify-center">
              <PathwayIcon className="w-5 h-5 text-zigama-600" />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold text-warm-900">
                Your Pathway: {pathway.label}
              </h2>
              <p className="text-sm text-warm-500">
                Real jobs in Rwanda and East Africa that match your new skills
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {pathway.jobs.map((job, i) => (
              <div
                key={i}
                className="bg-white rounded-xl border border-warm-200/60 p-6 hover:border-zigama-300 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-warm-900 text-base mb-1">{job.title}</h3>
                    <p className="text-sm text-warm-500 mb-3">{job.sector}</p>
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {job.skills.map((s) => (
                        <span key={s} className="text-xs bg-warm-50 text-warm-600 px-2 py-1 rounded-md border border-warm-200/60">
                          {s}
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-sage-600 bg-sage-50 inline-block px-2.5 py-1 rounded-lg">
                      {job.growth}
                    </p>
                  </div>
                  <div className="sm:text-right shrink-0">
                    <p className="font-display font-bold text-warm-900 text-lg">{job.salary}</p>
                    <p className="text-xs text-warm-400">estimated range</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── What&apos;s Next ─────────────────────────────────── */}
        <section className="mb-10">
          <h2 className="font-semibold text-warm-900 text-sm uppercase tracking-wide mb-4 flex items-center gap-2">
            <Sprout className="w-4 h-4 text-sage-500" />
            Keep Growing
          </h2>

          <div className="grid sm:grid-cols-2 gap-4">
            <Link
              href={`/create?topic=${encodeURIComponent(pathway.nextCourse)}`}
              className="card group bg-white rounded-xl border border-warm-200/60 p-6 hover:border-zigama-400 transition-colors"
            >
              <div className="w-10 h-10 bg-zigama-50 rounded-xl flex items-center justify-center mb-3">
                <BookOpen className="w-5 h-5 text-zigama-600" />
              </div>
              <h3 className="font-semibold text-warm-900 mb-1">Recommended Next</h3>
              <p className="text-sm text-warm-500 mb-3">{pathway.nextCourse}</p>
              <span className="text-sm font-semibold text-zigama-600 flex items-center gap-1">
                Start Course <ArrowRight className="w-4 h-4" />
              </span>
            </Link>

            <Link
              href="/tutor"
              className="card group bg-white rounded-xl border border-warm-200/60 p-6 hover:border-warm-400 transition-colors"
            >
              <div className="w-10 h-10 bg-warm-100 rounded-xl flex items-center justify-center mb-3">
                <GraduationCap className="w-5 h-5 text-warm-600" />
              </div>
              <h3 className="font-semibold text-warm-900 mb-1">Talk to Mwalimu</h3>
              <p className="text-sm text-warm-500 mb-3">
                Ask your AI tutor for career advice based on what you&apos;ve learned
              </p>
              <span className="text-sm font-semibold text-warm-600 flex items-center gap-1">
                Open Chat <ArrowRight className="w-4 h-4" />
              </span>
            </Link>
          </div>
        </section>

        {/* ── Impact Statement ───────────────────────────────── */}
        <div className="bg-warm-900 rounded-xl p-8 text-center">
          <p className="text-warm-300 text-sm mb-2">Remember</p>
          <p className="font-display text-xl font-bold text-warm-50 max-w-lg mx-auto">
            &ldquo;Every expert was once a beginner. Every journey starts with a single step. You&apos;ve taken yours.&rdquo;
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link
              href="/learn"
              className="bg-warm-50 text-warm-900 px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-white transition-colors"
            >
              Explore More Courses
            </Link>
            <Link
              href="/about"
              className="bg-warm-800 text-warm-200 px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-warm-700 transition-colors border border-warm-700"
            >
              Our Mission
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
