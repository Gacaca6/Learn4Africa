"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Globe, GraduationCap, ArrowRight, ArrowLeft, Check, BookOpen, Trophy,
  Lock, CircleDot, Circle, Sparkles, Youtube, Clock, Target, Briefcase,
  Code, HeartPulse, Wallet, Cpu,
} from "@/lib/icons";
import {
  useCurriculumStore,
  type Curriculum,
  type CurriculumModule,
  type ModuleStatus,
} from "@/lib/curriculumStore";

// ─────────────────────────────────────────────────────────────
// Job pathway map (mirrors /course/[id]/completed)
// ─────────────────────────────────────────────────────────────
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
        skills: ["Python", "Pandas", "Excel", "Visualization"],
      },
    ],
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
        title: "UI/UX Designer",
        sector: "Andela / Remote Global",
        salary: "400,000 - 800,000 RWF/mo",
        growth: "Top remote-work opportunity from Rwanda",
        skills: ["Figma", "User Research", "Prototyping"],
      },
    ],
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
        skills: ["Python", "ML", "Statistics"],
      },
      {
        title: "Business Intelligence Analyst",
        sector: "RDB / Ministry of Finance",
        salary: "400,000 - 750,000 RWF/mo",
        growth: "Government investing heavily in data capacity",
        skills: ["SQL", "Tableau", "Reporting"],
      },
    ],
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
        skills: ["Health Education", "First Aid", "Outreach"],
      },
    ],
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
        skills: ["Financial Planning", "Risk", "Customer Relations"],
      },
    ],
  },
  default: {
    label: "General Career Pathways",
    emoji: "star",
    jobs: [
      {
        title: "Content Creator",
        sector: "Remote / Freelance",
        salary: "200,000 - 600,000 RWF/mo",
        growth: "Africa's creator economy is booming",
        skills: ["Writing", "Video", "Storytelling"],
      },
    ],
  },
};

const ICON_MAP: Record<string, typeof Code> = {
  code: Code, globe: Globe, cpu: Cpu, heart: HeartPulse, wallet: Wallet, star: Trophy,
};

function detectPathway(curriculum: Curriculum): Pathway {
  const t = (curriculum.goal + " " + curriculum.title).toLowerCase();
  if (t.includes("python") || t.includes("programming") || t.includes("coding")) return JOB_MAP.python;
  if (t.includes("web") || t.includes("html") || t.includes("javascript") || t.includes("css") || t.includes("frontend")) return JOB_MAP.web;
  if (t.includes("data") || t.includes("ai") || t.includes("machine") || t.includes("ml")) return JOB_MAP.data;
  if (t.includes("health") || t.includes("nutrition") || t.includes("medical")) return JOB_MAP.health;
  if (t.includes("finance") || t.includes("money") || t.includes("business")) return JOB_MAP.finance;
  return JOB_MAP.default;
}

function extractSkills(curriculum: Curriculum): string[] {
  const skills = new Set<string>();
  for (const m of curriculum.modules) {
    m.content?.key_concepts?.forEach((k) => skills.add(k.concept));
  }
  return Array.from(skills).slice(0, 12);
}

// ─────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────
type Tab = "concepts" | "flashcards" | "quiz";

export default function CurriculumViewPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const curriculum = useCurriculumStore((s) => s.curricula[id]);
  const moduleProgress = useCurriculumStore((s) => s.moduleProgress[id]);
  const startModule = useCurriculumStore((s) => s.startModule);
  const completeModule = useCurriculumStore((s) => s.completeModule);
  const setActive = useCurriculumStore((s) => s.setActive);

  const [selectedModule, setSelectedModule] = useState<number | null>(null);
  const [tab, setTab] = useState<Tab>("concepts");
  const [flashIndex, setFlashIndex] = useState(0);
  const [flashFlipped, setFlashFlipped] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, string>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  // Set active + auto-pick first available module
  useEffect(() => {
    if (curriculum) setActive(id);
  }, [id, curriculum, setActive]);

  useEffect(() => {
    if (!curriculum || selectedModule !== null) return;
    const firstAvailable = curriculum.modules.find(
      (m) => moduleProgress?.[m.module_number] !== "locked"
    );
    if (firstAvailable) setSelectedModule(firstAvailable.module_number);
  }, [curriculum, moduleProgress, selectedModule]);

  // Reset tabs when switching modules
  useEffect(() => {
    setTab("concepts");
    setFlashIndex(0);
    setFlashFlipped(false);
    setQuizAnswers({});
    setQuizSubmitted(false);
  }, [selectedModule]);

  const progress = useMemo(() => {
    if (!curriculum) return { completed: 0, total: 0 };
    const total = curriculum.modules.length;
    const completed = Object.values(moduleProgress || {}).filter((s) => s === "complete").length;
    return { completed, total };
  }, [curriculum, moduleProgress]);

  const allComplete = curriculum && progress.completed === progress.total && progress.total > 0;

  if (!curriculum) {
    return (
      <div className="noise min-h-screen bg-warm-50 flex items-center justify-center">
        <div className="text-center px-6">
          <h2 className="font-display text-xl font-bold text-warm-900 mb-2">Curriculum not found</h2>
          <p className="text-sm text-warm-500 mb-6">It may have been removed, or the link is wrong.</p>
          <Link href="/curriculum/new" className="inline-block bg-warm-900 text-warm-50 px-6 py-3 rounded-xl text-sm font-semibold hover:bg-warm-800 transition-colors">
            Build a New Curriculum
          </Link>
        </div>
      </div>
    );
  }

  const activeModule: CurriculumModule | undefined = curriculum.modules.find(
    (m) => m.module_number === selectedModule
  );

  function getStatus(num: number): ModuleStatus {
    return moduleProgress?.[num] || "locked";
  }

  function handleSelectModule(num: number) {
    const status = getStatus(num);
    if (status === "locked") return;
    setSelectedModule(num);
    if (status === "available") startModule(id, num);
  }

  function handleComplete() {
    if (!activeModule) return;
    completeModule(id, activeModule.module_number);
    setShowCelebration(true);
    setTimeout(() => setShowCelebration(false), 2500);

    // Auto-advance to next module
    const idx = curriculum.modules.findIndex((m) => m.module_number === activeModule.module_number);
    const next = curriculum.modules[idx + 1];
    if (next) {
      setTimeout(() => setSelectedModule(next.module_number), 800);
    }
  }

  return (
    <div className="noise min-h-screen bg-warm-50">
      {/* Header */}
      <header className="bg-warm-50/80 backdrop-blur-md border-b border-warm-200/60 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-warm-700" />
              <span className="text-lg font-semibold tracking-tight text-warm-900">Learn4Africa</span>
            </Link>
            <Link href="/learn" className="text-sm text-warm-600 hover:text-warm-900 transition-colors flex items-center gap-1">
              <ArrowLeft className="w-4 h-4" />
              My Learning
            </Link>
          </div>
        </div>
      </header>

      {/* Celebration banner */}
      {showCelebration && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-sage-600 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-2 fade-in">
          <Trophy className="w-5 h-5 text-yellow-300" />
          <span className="font-semibold text-sm">Module complete! Hongera!</span>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-5 sm:px-8 py-6 lg:py-10">
        <div className="lg:grid lg:grid-cols-[320px_1fr] lg:gap-8">
          {/* ───── Sidebar ───── */}
          <aside className="mb-8 lg:mb-0">
            <div className="lg:sticky lg:top-24">
              <div className="bg-white rounded-2xl border border-warm-200/60 p-5 mb-4">
                <p className="text-xs font-semibold text-zigama-600 uppercase tracking-wide mb-1">
                  Your curriculum
                </p>
                <h1 className="font-display text-lg font-bold text-warm-900 leading-tight mb-2">
                  {curriculum.title}
                </h1>
                <p className="text-xs text-warm-500 mb-4 line-clamp-2">{curriculum.goal}</p>

                {/* Progress bar */}
                <div className="mb-2">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-warm-500">Progress</span>
                    <span className="font-semibold text-warm-900 tabular-nums">
                      {progress.completed} / {progress.total}
                    </span>
                  </div>
                  <div className="h-2 bg-warm-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-zigama-500 transition-all duration-500"
                      style={{ width: `${progress.total ? (progress.completed / progress.total) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                {curriculum.career_outcome && (
                  <p className="text-xs text-warm-500 mt-3 flex items-start gap-1.5">
                    <Target className="w-3 h-3 text-zigama-500 mt-0.5 shrink-0" />
                    <span>{curriculum.career_outcome}</span>
                  </p>
                )}
              </div>

              {/* Module list */}
              <div className="bg-white rounded-2xl border border-warm-200/60 p-3">
                <p className="text-xs font-semibold text-warm-500 uppercase tracking-wide px-2 py-2">
                  Modules
                </p>
                <div className="space-y-1">
                  {curriculum.modules.map((m) => {
                    const status = getStatus(m.module_number);
                    const isActive = selectedModule === m.module_number;
                    const isLocked = status === "locked";
                    return (
                      <button
                        key={m.module_number}
                        onClick={() => handleSelectModule(m.module_number)}
                        disabled={isLocked}
                        className={`w-full text-left px-3 py-2.5 rounded-xl transition-colors flex items-start gap-3 ${
                          isActive
                            ? "bg-warm-900 text-warm-50"
                            : isLocked
                            ? "opacity-50 cursor-not-allowed"
                            : "hover:bg-warm-50"
                        }`}
                      >
                        <div className="shrink-0 mt-0.5">
                          {status === "complete" ? (
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center ${isActive ? "bg-sage-400" : "bg-sage-500"}`}>
                              <Check className="w-3 h-3 text-white" />
                            </div>
                          ) : status === "in_progress" ? (
                            <CircleDot className={`w-5 h-5 ${isActive ? "text-zigama-300" : "text-zigama-500"}`} />
                          ) : status === "available" ? (
                            <Circle className={`w-5 h-5 ${isActive ? "text-warm-300" : "text-warm-400"}`} />
                          ) : (
                            <Lock className="w-5 h-5 text-warm-300" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-medium tabular-nums mb-0.5 ${isActive ? "text-warm-300" : "text-warm-400"}`}>
                            Module {m.module_number} · Week {m.week}
                          </p>
                          <p className={`text-sm font-semibold leading-tight truncate ${isActive ? "text-warm-50" : "text-warm-900"}`}>
                            {m.title}
                          </p>
                          <p className={`text-xs mt-0.5 flex items-center gap-1 ${isActive ? "text-warm-400" : "text-warm-500"}`}>
                            <Clock className="w-3 h-3" />
                            {m.estimated_minutes} min
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </aside>

          {/* ───── Main content ───── */}
          <main>
            {allComplete ? (
              <CompletionScreen curriculum={curriculum} />
            ) : activeModule ? (
              <ModuleView
                module={activeModule}
                tab={tab}
                setTab={setTab}
                flashIndex={flashIndex}
                setFlashIndex={setFlashIndex}
                flashFlipped={flashFlipped}
                setFlashFlipped={setFlashFlipped}
                quizAnswers={quizAnswers}
                setQuizAnswers={setQuizAnswers}
                quizSubmitted={quizSubmitted}
                setQuizSubmitted={setQuizSubmitted}
                onComplete={handleComplete}
                isComplete={getStatus(activeModule.module_number) === "complete"}
              />
            ) : (
              <div className="bg-white rounded-2xl border border-warm-200/60 p-10 text-center">
                <p className="text-warm-500">Select a module from the sidebar to begin.</p>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Module view
// ─────────────────────────────────────────────────────────────
interface ModuleViewProps {
  module: CurriculumModule;
  tab: Tab;
  setTab: (t: Tab) => void;
  flashIndex: number;
  setFlashIndex: (n: number) => void;
  flashFlipped: boolean;
  setFlashFlipped: (b: boolean) => void;
  quizAnswers: Record<number, string>;
  setQuizAnswers: (r: Record<number, string>) => void;
  quizSubmitted: boolean;
  setQuizSubmitted: (b: boolean) => void;
  onComplete: () => void;
  isComplete: boolean;
}

function ModuleView({
  module: m, tab, setTab, flashIndex, setFlashIndex, flashFlipped, setFlashFlipped,
  quizAnswers, setQuizAnswers, quizSubmitted, setQuizSubmitted, onComplete, isComplete,
}: ModuleViewProps) {
  return (
    <div className="space-y-6">
      {/* Module header */}
      <div>
        <p className="text-xs font-semibold text-zigama-600 uppercase tracking-wide mb-2">
          Module {m.module_number} · Week {m.week}
        </p>
        <h2 className="font-display text-3xl sm:text-4xl font-bold text-warm-900 leading-tight mb-3">
          {m.title}
        </h2>
        <p className="text-warm-500 text-base">{m.description}</p>
        {m.learning_objectives && m.learning_objectives.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {m.learning_objectives.map((obj, i) => (
              <span key={i} className="text-xs bg-warm-100 text-warm-700 px-2.5 py-1 rounded-md">
                {obj}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Video section */}
      {m.video ? (
        <div className="bg-white rounded-2xl border border-warm-200/60 overflow-hidden">
          <div className="aspect-video bg-black">
            <iframe
              src={`https://www.youtube.com/embed/${m.video.video_id}`}
              title={m.video.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full"
            />
          </div>
          <div className="p-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center shrink-0">
                <Youtube className="w-5 h-5 text-red-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-warm-500 uppercase tracking-wide mb-1">
                  Watch this first ({m.estimated_minutes} min)
                </p>
                <p className="font-semibold text-warm-900 leading-tight mb-1">{m.video.title}</p>
                <p className="text-sm text-warm-500">{m.video.channel_title}</p>
              </div>
            </div>
          </div>
        </div>
      ) : m.mwalimu_teaches_directly ? (
        <div className="bg-warm-900 rounded-2xl p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-warm-800 rounded-xl flex items-center justify-center shrink-0">
              <GraduationCap className="w-6 h-6 text-zigama-300" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-warm-400 uppercase tracking-wide mb-1">Mwalimu teaches directly</p>
              <p className="font-display text-lg font-bold text-warm-50 mb-1">
                No video this time — Mwalimu has you.
              </p>
              <p className="text-sm text-warm-300">
                Read Mwalimu&apos;s explanation below, then work through the concepts and quiz.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {/* Mwalimu's explanation */}
      <div className="bg-gradient-to-br from-zigama-50 to-warm-50 rounded-2xl border border-zigama-100 p-6 sm:p-8">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-9 h-9 bg-warm-900 rounded-xl flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-zigama-300" />
          </div>
          <div>
            <p className="text-xs text-warm-500 uppercase tracking-wide">Mwalimu&apos;s Explanation</p>
            <p className="font-semibold text-warm-900 text-sm">In African context</p>
          </div>
        </div>
        {m.content?.summary && (
          <p className="text-warm-800 text-base leading-relaxed mb-4 whitespace-pre-line">
            {m.content.summary}
          </p>
        )}
        {m.content?.african_context && (
          <div className="bg-white/60 rounded-xl p-4 border border-zigama-100">
            <p className="text-xs font-semibold text-zigama-700 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Why this matters here
            </p>
            <p className="text-warm-800 text-sm leading-relaxed whitespace-pre-line">
              {m.content.african_context}
            </p>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div>
        <div className="flex gap-1 border-b border-warm-200/60 mb-5">
          {([
            { id: "concepts", label: "Key Concepts", count: m.content?.key_concepts?.length || 0 },
            { id: "flashcards", label: "Flashcards", count: m.content?.flashcards?.length || 0 },
            { id: "quiz", label: "Quiz", count: m.content?.quiz?.length || 0 },
          ] as const).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px ${
                tab === t.id
                  ? "border-warm-900 text-warm-900"
                  : "border-transparent text-warm-500 hover:text-warm-700"
              }`}
            >
              {t.label}
              <span className="ml-1.5 text-xs text-warm-400 tabular-nums">{t.count}</span>
            </button>
          ))}
        </div>

        {tab === "concepts" && (
          <div className="space-y-3">
            {m.content?.key_concepts?.length ? (
              m.content.key_concepts.map((kc, i) => (
                <div key={i} className="bg-white rounded-xl border border-warm-200/60 p-5">
                  <p className="font-semibold text-warm-900 text-sm mb-1.5 flex items-center gap-2">
                    <span className="w-5 h-5 bg-zigama-50 text-zigama-700 rounded-md flex items-center justify-center text-xs font-bold">
                      {i + 1}
                    </span>
                    {kc.concept}
                  </p>
                  <p className="text-sm text-warm-600 leading-relaxed">{kc.explanation}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-warm-400 text-center py-8">No concepts available for this module.</p>
            )}
          </div>
        )}

        {tab === "flashcards" && (
          <div>
            {m.content?.flashcards?.length ? (
              <>
                <div
                  onClick={() => setFlashFlipped(!flashFlipped)}
                  className="bg-white rounded-2xl border border-warm-200/60 p-8 sm:p-12 min-h-[240px] flex items-center justify-center text-center cursor-pointer hover:border-zigama-300 transition-colors"
                >
                  <div>
                    <p className="text-xs font-semibold text-warm-400 uppercase tracking-wide mb-3">
                      {flashFlipped ? "Answer" : "Question"} · {flashIndex + 1} / {m.content.flashcards.length}
                    </p>
                    <p className="font-display text-xl sm:text-2xl text-warm-900 leading-tight">
                      {flashFlipped
                        ? m.content.flashcards[flashIndex].back
                        : m.content.flashcards[flashIndex].front}
                    </p>
                    <p className="text-xs text-warm-400 mt-4">Tap to {flashFlipped ? "see question" : "reveal answer"}</p>
                  </div>
                </div>
                <div className="flex justify-between mt-4">
                  <button
                    onClick={() => {
                      setFlashFlipped(false);
                      setFlashIndex(Math.max(0, flashIndex - 1));
                    }}
                    disabled={flashIndex === 0}
                    className="px-4 py-2 text-sm font-semibold text-warm-700 bg-white border border-warm-200/60 rounded-lg hover:border-warm-300 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                  >
                    <ArrowLeft className="w-4 h-4" /> Previous
                  </button>
                  <button
                    onClick={() => {
                      setFlashFlipped(false);
                      setFlashIndex(Math.min(m.content.flashcards.length - 1, flashIndex + 1));
                    }}
                    disabled={flashIndex >= m.content.flashcards.length - 1}
                    className="px-4 py-2 text-sm font-semibold text-warm-700 bg-white border border-warm-200/60 rounded-lg hover:border-warm-300 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                  >
                    Next <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </>
            ) : (
              <p className="text-sm text-warm-400 text-center py-8">No flashcards available for this module.</p>
            )}
          </div>
        )}

        {tab === "quiz" && (
          <div className="space-y-4">
            {m.content?.quiz?.length ? (
              <>
                {m.content.quiz.map((q, i) => {
                  const selected = quizAnswers[i];
                  const isCorrect = selected === q.correct;
                  return (
                    <div key={i} className="bg-white rounded-xl border border-warm-200/60 p-5">
                      <p className="font-semibold text-warm-900 text-sm mb-3">
                        <span className="text-warm-400 mr-1">{i + 1}.</span> {q.question}
                      </p>
                      <div className="space-y-2">
                        {q.options.map((opt, oi) => {
                          const isSelected = selected === opt;
                          const showCorrect = quizSubmitted && opt === q.correct;
                          const showWrong = quizSubmitted && isSelected && !isCorrect;
                          return (
                            <button
                              key={oi}
                              onClick={() => {
                                if (quizSubmitted) return;
                                setQuizAnswers({ ...quizAnswers, [i]: opt });
                              }}
                              disabled={quizSubmitted}
                              className={`w-full text-left px-4 py-2.5 rounded-lg border-2 text-sm transition-colors ${
                                showCorrect
                                  ? "border-sage-400 bg-sage-50 text-sage-900"
                                  : showWrong
                                  ? "border-red-300 bg-red-50 text-red-900"
                                  : isSelected
                                  ? "border-warm-900 bg-warm-50 text-warm-900"
                                  : "border-warm-200/60 bg-white hover:border-warm-300 text-warm-700"
                              }`}
                            >
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                      {quizSubmitted && (
                        <p className={`text-xs mt-3 p-2.5 rounded-lg ${isCorrect ? "bg-sage-50 text-sage-700" : "bg-warm-100 text-warm-700"}`}>
                          {isCorrect ? "Correct! " : "Not quite. "}
                          {q.explanation}
                        </p>
                      )}
                    </div>
                  );
                })}
                {!quizSubmitted ? (
                  <button
                    onClick={() => setQuizSubmitted(true)}
                    disabled={Object.keys(quizAnswers).length < m.content.quiz.length}
                    className="w-full sm:w-auto px-6 py-3 bg-warm-900 text-warm-50 rounded-xl text-sm font-semibold hover:bg-warm-800 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Submit Quiz
                  </button>
                ) : (
                  <div className="bg-sage-50 border border-sage-200 rounded-xl p-4 text-sm text-sage-800">
                    You scored{" "}
                    <span className="font-bold">
                      {m.content.quiz.filter((q, i) => quizAnswers[i] === q.correct).length} / {m.content.quiz.length}
                    </span>
                    . Hongera! Ready to mark this module complete?
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-warm-400 text-center py-8">No quiz available for this module.</p>
            )}
          </div>
        )}
      </div>

      {/* Complete button */}
      <div className="bg-white rounded-2xl border border-warm-200/60 p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="font-semibold text-warm-900 text-sm">Done with this module?</p>
          <p className="text-xs text-warm-500 mt-0.5">
            Marking complete unlocks the next module in your learning path.
          </p>
        </div>
        <button
          onClick={onComplete}
          disabled={isComplete}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-zigama-600 text-white rounded-xl text-sm font-semibold hover:bg-zigama-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed shrink-0"
        >
          {isComplete ? (
            <>
              <Check className="w-4 h-4" /> Already complete
            </>
          ) : (
            <>
              <Check className="w-4 h-4" /> Mark Complete
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Completion screen
// ─────────────────────────────────────────────────────────────
function CompletionScreen({ curriculum }: { curriculum: Curriculum }) {
  const pathway = detectPathway(curriculum);
  const skills = extractSkills(curriculum);
  const PathwayIcon = ICON_MAP[pathway.emoji] || Trophy;

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="relative bg-warm-900 rounded-2xl p-8 sm:p-12 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          {Array.from({ length: 24 }).map((_, i) => (
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
        <div className="relative z-10 text-center">
          <div className="w-20 h-20 bg-warm-800 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Trophy className="w-10 h-10 text-yellow-400" />
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-warm-50 mb-3">
            Hongera! You did it.
          </h1>
          <p className="text-warm-300 text-lg mb-2">
            You completed <span className="text-white font-semibold">{curriculum.title}</span>
          </p>
          <p className="text-warm-400 text-sm max-w-md mx-auto">
            {curriculum.modules.length} modules over {curriculum.total_weeks} weeks. Real skills, ready for real work.
          </p>
        </div>
      </div>

      {/* Skills */}
      <section>
        <h2 className="font-semibold text-warm-900 text-sm uppercase tracking-wide mb-4 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-zigama-500" />
          Skills You&apos;ve Earned
        </h2>
        <div className="flex flex-wrap gap-2">
          {skills.length > 0 ? (
            skills.map((s) => (
              <span key={s} className="inline-flex items-center gap-1.5 bg-white border border-warm-200/60 text-warm-700 px-3 py-1.5 rounded-lg text-sm">
                <Check className="w-3.5 h-3.5 text-sage-500" />
                {s}
              </span>
            ))
          ) : (
            <span className="text-sm text-warm-400">Skills from your curriculum will appear here.</span>
          )}
        </div>
      </section>

      {/* Job pathway */}
      <section>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-zigama-50 rounded-xl flex items-center justify-center">
            <PathwayIcon className="w-5 h-5 text-zigama-600" />
          </div>
          <div>
            <h2 className="font-display text-xl font-bold text-warm-900">
              Your Pathway: {pathway.label}
            </h2>
            <p className="text-sm text-warm-500">Real jobs in Rwanda and East Africa that match your new skills</p>
          </div>
        </div>
        <div className="space-y-4">
          {pathway.jobs.map((job, i) => (
            <div key={i} className="bg-white rounded-xl border border-warm-200/60 p-6 hover:border-zigama-300 transition-colors">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-start gap-2 mb-1">
                    <Briefcase className="w-4 h-4 text-warm-500 mt-1 shrink-0" />
                    <h3 className="font-semibold text-warm-900 text-base">{job.title}</h3>
                  </div>
                  <p className="text-sm text-warm-500 mb-3 ml-6">{job.sector}</p>
                  <div className="flex flex-wrap gap-1.5 mb-3 ml-6">
                    {job.skills.map((s) => (
                      <span key={s} className="text-xs bg-warm-50 text-warm-600 px-2 py-1 rounded-md border border-warm-200/60">
                        {s}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-sage-600 bg-sage-50 inline-block px-2.5 py-1 rounded-lg ml-6">
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

      {/* CTAs */}
      <div className="grid sm:grid-cols-2 gap-4">
        <Link
          href="/curriculum/new"
          className="bg-warm-900 text-warm-50 rounded-xl p-6 hover:bg-warm-800 transition-colors group"
        >
          <BookOpen className="w-6 h-6 text-zigama-300 mb-3" />
          <h3 className="font-semibold text-warm-50 mb-1">Build another curriculum</h3>
          <p className="text-sm text-warm-300 mb-2">Pick a new goal and let Mwalimu design your next path.</p>
          <span className="text-sm font-semibold text-zigama-300 flex items-center gap-1">
            Start <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </span>
        </Link>
        <Link
          href="/learn"
          className="bg-white border border-warm-200/60 rounded-xl p-6 hover:border-zigama-300 transition-colors group"
        >
          <Trophy className="w-6 h-6 text-zigama-500 mb-3" />
          <h3 className="font-semibold text-warm-900 mb-1">My learning</h3>
          <p className="text-sm text-warm-500 mb-2">See all your curricula and progress in one place.</p>
          <span className="text-sm font-semibold text-warm-900 flex items-center gap-1">
            Open <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </span>
        </Link>
      </div>
    </div>
  );
}
