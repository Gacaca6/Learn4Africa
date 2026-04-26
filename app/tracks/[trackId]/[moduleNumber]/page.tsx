"use client";

/**
 * Learn4Africa — module learning room.
 *
 * Five-tab interface that powers the heart of the learner experience:
 *   1. Why This Matters  — AI explanation via api.ai.explain.explainModule
 *   2. Learn              — YouTube video + optional Mermaid diagram
 *                           via api.ai.visualise.generateDiagram
 *   3. Practice           — exercise instructions + optional Flashcards
 *                           via api.ai.flashcards.generateFlashcards
 *   4. Quiz               — 5-question AI quiz via api.ai.quiz.generateQuiz;
 *                           perfect score fires celebration + marks complete
 *   5. Interview Prep     — static questions + link to live Mwalimu chat
 *
 * Module metadata (track, video, practice JSON, interview questions)
 * still loads from /api/v1/ routes because it's static content baked
 * into the Next bundle — not AI. All AI requests go through Convex.
 */

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAction, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  Globe, ArrowLeft, ArrowRight, Clock, Target, Check, BookOpen,
  Sparkles, Code, MessageSquare, Trophy, Youtube, Play, Briefcase,
  Info, Lock, Building, Award, Volume2, VolumeX, RotateCw, Lightbulb,
  Network, CircleHelp, Layers,
} from "@/lib/icons";
import { useCurriculumStore } from "@/lib/curriculumStore";
import { useAuth } from "@/lib/useAuth";
import { useMwalimuVoice } from "@/lib/useSpeech";
import { getTrack, getModule } from "@/lib/tracks";
import { syncTrackStart, syncModuleComplete, syncPortfolioItem } from "@/lib/trackSync";
import { CelebrationOverlay } from "@/components/CelebrationOverlay";
import { DiagramView } from "@/components/DiagramView";
import { MwalimuSkeleton } from "@/components/MwalimuSkeleton";

// ───── Types ──────────────────────────────────────────────────

interface VideoInfo {
  title: string;
  channel: string;
  url: string;
  video_id: string;
  duration_minutes: number;
  watch_for: string;
}

interface PracticeExercise {
  title: string;
  instructions: string;
  sandbox: string | null;
  estimated_minutes: number;
}

interface InterviewQuestion {
  question: string;
  model_answer: string;
  difficulty: string;
}

interface Module {
  module_number: number;
  title: string;
  estimated_hours: number;
  why_africa: string;
  concepts: string[];
  video_primary: VideoInfo | null;
  video_secondary: VideoInfo | null;
  practice_exercise: PracticeExercise | null;
  interview_questions: InterviewQuestion[];
  portfolio_contribution?: string;
}

interface ModuleResponse {
  track_id: string;
  track_title: string;
  total_modules: number;
  module: Module;
}

interface QuizQuestion {
  question: string;
  options: string[];
  correct: string;
  explanation: string;
  interviewRelevance?: string;
}

interface Flashcard {
  front: string;
  back: string;
  africanAnalogy?: string;
  interviewUse?: string;
}

type TabKey = "why" | "learn" | "practice" | "quiz" | "flashcards" | "interview";

// ───── Page ───────────────────────────────────────────────────

export default function LearningRoomPage() {
  const params = useParams<{ trackId: string; moduleNumber: string }>();
  const router = useRouter();
  const trackId = params.trackId;
  const moduleNumber = parseInt(params.moduleNumber, 10);

  const { user, isAuthenticated } = useAuth();
  const userId = user?.id as Id<"users"> | undefined;

  // ── Convex actions & mutations ────────────────────────────
  const explainAction = useAction(api.ai.explain.explainModule);
  const quizAction = useAction(api.ai.quiz.generateQuiz);
  const flashcardsAction = useAction(api.ai.flashcards.generateFlashcards);
  const completeModuleMutation = useMutation(api.progress.completeModule);
  const recordQuizMutation = useMutation(api.progress.recordQuizScore);

  // ── Module metadata (static content) ──────────────────────
  const [data, setData] = useState<ModuleResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Tab + tab-specific state ──────────────────────────────
  const [tab, setTab] = useState<TabKey>("why");

  const [explanation, setExplanation] = useState<string | null>(null);
  const [explanationLoading, setExplanationLoading] = useState(false);

  const [quiz, setQuiz] = useState<QuizQuestion[] | null>(null);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizCurrent, setQuizCurrent] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<string[]>([]);
  const [quizRevealed, setQuizRevealed] = useState<boolean[]>([]);
  const [quizDone, setQuizDone] = useState(false);

  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [flashcardsLoading, setFlashcardsLoading] = useState(false);
  const [cardIndex, setCardIndex] = useState(0);
  const [cardFlipped, setCardFlipped] = useState(false);

  // ── Celebration overlay ───────────────────────────────────
  const [celebrateOpen, setCelebrateOpen] = useState(false);

  // ── Voice ─────────────────────────────────────────────────
  const { speakMwalimu, stop, isSpeaking } = useMwalimuVoice();

  // ── Store bindings ────────────────────────────────────────
  const trackProgress = useCurriculumStore((s) => s.tracks[trackId]);
  const startTrack = useCurriculumStore((s) => s.startTrack);
  const setTrackCurrentModule = useCurriculumStore((s) => s.setTrackCurrentModule);
  const completeTrackModule = useCurriculumStore((s) => s.completeTrackModule);
  const recordPracticeCompleted = useCurriculumStore((s) => s.recordPracticeCompleted);
  const recordQuizScoreLocal = useCurriculumStore((s) => s.recordQuizScore);
  const addPortfolioItem = useCurriculumStore((s) => s.addPortfolioItem);

  // ── Load module metadata (static, bundled at build time) ─────
  useEffect(() => {
    setLoading(true);
    setError(null);
    const track = getTrack(trackId);
    const mod = getModule(trackId, moduleNumber);
    if (!track || !mod) {
      setError("Module not found");
      setData(null);
      setLoading(false);
      return;
    }
    setData({
      track_id: track.id,
      track_title: track.title,
      total_modules: track.modules.length,
      module: mod as unknown as Module,
    });
    setLoading(false);
  }, [trackId, moduleNumber]);

  // ── Start track on mount ──────────────────────────────────
  useEffect(() => {
    if (!trackProgress) {
      startTrack(trackId);
      if (isAuthenticated) void syncTrackStart(trackId);
    }
    setTrackCurrentModule(trackId, moduleNumber);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackId, moduleNumber]);

  // ── Load explanation when "why" tab opened ────────────────
  useEffect(() => {
    if (tab !== "why" || !data || explanation || explanationLoading) return;
    let cancelled = false;
    (async () => {
      setExplanationLoading(true);
      try {
        const result = await explainAction({
          moduleTitle: data.module.title,
          moduleTopic: data.module.why_africa || data.module.title,
          trackId,
          studentName: user?.name ?? undefined,
        });
        if (!cancelled) setExplanation(result.explanation);
      } catch {
        if (!cancelled) {
          setExplanation(
            `Mwalimu could not reach the network right now. Here is the summary we have on file: ${data.module.why_africa || "This module gives you a real, employable skill."}`,
          );
        }
      } finally {
        if (!cancelled) setExplanationLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [tab, data, explanation, explanationLoading, explainAction, trackId, user?.name]);

  // ── Load quiz on first open ───────────────────────────────
  const loadQuiz = useCallback(async () => {
    if (!data) return;
    setQuizLoading(true);
    setQuizCurrent(0);
    setQuizAnswers([]);
    setQuizRevealed([]);
    setQuizDone(false);
    try {
      const result = (await quizAction({
        topic: data.module.why_africa || data.module.title,
        moduleTitle: data.module.title,
        trackId,
        difficulty: "beginner",
        count: 5,
      })) as { questions: QuizQuestion[] };
      setQuiz(result.questions ?? []);
    } catch {
      setQuiz([]);
    } finally {
      setQuizLoading(false);
    }
  }, [data, quizAction, trackId]);

  useEffect(() => {
    if (tab === "quiz" && !quiz && !quizLoading) void loadQuiz();
  }, [tab, quiz, quizLoading, loadQuiz]);

  // ── Load flashcards on first open (and retry button) ──────
  const loadFlashcards = useCallback(async () => {
    if (!data) return;
    setFlashcardsLoading(true);
    try {
      const result = (await flashcardsAction({
        topic: data.module.why_africa || data.module.title,
        moduleTitle: data.module.title,
        count: 8,
      })) as { flashcards: Flashcard[] };
      setFlashcards(result.flashcards ?? []);
      setCardIndex(0);
      setCardFlipped(false);
    } catch {
      setFlashcards([]);
    } finally {
      setFlashcardsLoading(false);
    }
  }, [data, flashcardsAction]);

  useEffect(() => {
    if (tab === "flashcards" && flashcards.length === 0 && !flashcardsLoading) {
      void loadFlashcards();
    }
    // Only run when entering the tab; loadFlashcards is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  // ── Handlers ──────────────────────────────────────────────
  const module = data?.module;

  const completedSet = useMemo(
    () => new Set(trackProgress?.completed_modules || []),
    [trackProgress],
  );
  const practiceDone = useMemo(
    () => new Set(trackProgress?.practice_completed || []),
    [trackProgress],
  );
  const isCompleted = completedSet.has(moduleNumber);
  const isPracticeDone = practiceDone.has(moduleNumber);

  const runCompletion = useCallback(() => {
    if (!module || !data) return;
    completeTrackModule(trackId, moduleNumber);
    setCelebrateOpen(true);
    if (isAuthenticated) {
      void syncModuleComplete(trackId, moduleNumber);
      if (userId) {
        void completeModuleMutation({ userId, trackId, moduleNumber }).catch(() => {});
      }
    }
    if (module.portfolio_contribution) {
      addPortfolioItem({
        track_id: trackId,
        track_title: data.track_title,
        module_number: moduleNumber,
        module_title: module.title,
        contribution: module.portfolio_contribution,
        completed_at: new Date().toISOString(),
      });
      if (isAuthenticated) {
        void syncPortfolioItem(trackId, moduleNumber, {
          project_name: module.title,
          description: module.portfolio_contribution,
        });
      }
    }
  }, [
    module, data, trackId, moduleNumber, completeTrackModule,
    isAuthenticated, userId, completeModuleMutation, addPortfolioItem,
  ]);

  function handleManualComplete() {
    runCompletion();
    // After the 2.2s overlay, move on to the next module.
    if (data && moduleNumber < data.total_modules) {
      setTimeout(() => {
        router.push(`/tracks/${trackId}/${moduleNumber + 1}`);
      }, 2500);
    }
  }

  // Quiz answer handler
  function handleQuizSelect(option: string) {
    if (!quiz) return;
    const letter = option.trim().charAt(0).toUpperCase();
    const answers = [...quizAnswers];
    answers[quizCurrent] = letter;
    const revealed = [...quizRevealed];
    revealed[quizCurrent] = true;
    setQuizAnswers(answers);
    setQuizRevealed(revealed);
  }

  function handleQuizNext() {
    if (!quiz) return;
    if (quizCurrent + 1 < quiz.length) {
      setQuizCurrent(quizCurrent + 1);
    } else {
      setQuizDone(true);
      const score = computeQuizScore();
      recordQuizScoreLocal(trackId, moduleNumber, Math.round((score / quiz.length) * 100));
      if (isAuthenticated && userId) {
        void recordQuizMutation({
          userId, trackId, moduleNumber,
          score, total: quiz.length,
        }).catch(() => {});
      }
      // Auto-complete on a passing score.
      if (score >= 4 && !isCompleted) {
        runCompletion();
      }
    }
  }

  function computeQuizScore(): number {
    if (!quiz) return 0;
    let s = 0;
    for (let i = 0; i < quiz.length; i++) {
      if ((quizAnswers[i] || "") === quiz[i].correct.trim().charAt(0).toUpperCase()) {
        s++;
      }
    }
    return s;
  }

  // Voice controls
  const [speakingKey, setSpeakingKey] = useState<string | null>(null);
  const handleSpeak = useCallback((key: string, text: string) => {
    if (speakingKey === key && isSpeaking) {
      stop();
      setSpeakingKey(null);
      return;
    }
    setSpeakingKey(key);
    speakMwalimu(text);
  }, [speakingKey, isSpeaking, stop, speakMwalimu]);

  useEffect(() => {
    if (!isSpeaking && speakingKey) {
      const t = window.setTimeout(() => setSpeakingKey(null), 300);
      return () => window.clearTimeout(t);
    }
  }, [isSpeaking, speakingKey]);

  // ── Loading / error ───────────────────────────────────────
  if (loading) {
    return (
      <div className="noise min-h-screen bg-warm-50 p-6 sm:p-10">
        <div className="max-w-5xl mx-auto">
          <div className="h-6 w-32 bg-warm-200 rounded animate-pulse mb-5" />
          <div className="h-10 w-3/4 bg-warm-200 rounded animate-pulse mb-4" />
          <div className="h-40 bg-warm-100 rounded-2xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (error || !data || !module) {
    return (
      <div className="noise min-h-screen bg-warm-50 p-6 sm:p-10">
        <div className="max-w-2xl mx-auto p-6 bg-red-50 border border-red-200 rounded-xl text-red-700">
          {error || "Module not found"}
          <div className="mt-4">
            <Link
              href={`/tracks/${trackId}`}
              className="text-zigama-600 font-semibold underline"
            >
              Back to roadmap
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const tabs: { key: TabKey; label: string; shortLabel: string; Icon: typeof Info }[] = [
    { key: "why",         label: "Why This Matters", shortLabel: "Why",        Icon: Sparkles },
    { key: "learn",       label: "Learn",            shortLabel: "Learn",      Icon: Youtube },
    { key: "practice",    label: "Practice",         shortLabel: "Practice",   Icon: Code },
    { key: "quiz",        label: "Quiz",             shortLabel: "Quiz",       Icon: CircleHelp },
    { key: "flashcards",  label: "Flashcards",       shortLabel: "Cards",      Icon: Layers },
    { key: "interview",   label: "Interview Prep",   shortLabel: "Interview",  Icon: MessageSquare },
  ];

  return (
    <div className="noise min-h-screen bg-warm-50">
      <CelebrationOverlay
        show={celebrateOpen}
        name={user?.name ?? null}
        moduleNumber={moduleNumber}
        moduleTitle={module.title}
        onDone={() => setCelebrateOpen(false)}
      />

      {/* Header */}
      <header className="bg-warm-50/80 backdrop-blur-md border-b border-warm-200/60 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-8 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 tap-target">
            <Globe className="w-5 h-5 text-warm-700" />
            <span className="text-base sm:text-lg font-semibold tracking-tight text-warm-900">
              Learn4Africa
            </span>
          </Link>
          <Link
            href={`/tracks/${trackId}`}
            className="text-sm text-warm-600 hover:text-warm-900 flex items-center gap-1 tap-target"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Roadmap</span>
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-8 py-6 sm:py-8 pb-32">
        {/* Module header */}
        <div className="mb-5">
          <div className="flex items-center gap-2 text-xs font-semibold text-warm-500 uppercase tracking-wide mb-2 flex-wrap">
            <Link
              href={`/tracks/${trackId}`}
              className="hover:text-zigama-600 transition-colors"
            >
              {data.track_title}
            </Link>
            <span>•</span>
            <span>Module {moduleNumber} of {data.total_modules}</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold text-warm-900 leading-tight mb-3">
            {module.title}
          </h1>
          <div className="flex items-center gap-4 text-sm text-warm-600 flex-wrap">
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />~{module.estimated_hours}h
            </span>
            {module.concepts?.length > 0 && (
              <span className="flex items-center gap-1.5">
                <Target className="w-4 h-4" />
                {module.concepts.length} concepts
              </span>
            )}
            {isCompleted && (
              <span className="flex items-center gap-1.5 text-sage-700 font-semibold">
                <Check className="w-4 h-4" />
                Completed
              </span>
            )}
          </div>
        </div>

        {/* Tabs — horizontally scrollable on mobile */}
        <div className="mb-6 border-b border-warm-200 scroll-tabs">
          <div className="flex gap-1">
            {tabs.map((t) => {
              const active = tab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`px-3 sm:px-4 py-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors shrink-0 ${
                    active
                      ? "border-zigama-600 text-zigama-700"
                      : "border-transparent text-warm-500 hover:text-warm-900"
                  }`}
                >
                  <t.Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{t.label}</span>
                  <span className="sm:hidden">{t.shortLabel}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab content */}
        <div className="mb-8">

          {/* ── WHY ─────────────────────────────────────────── */}
          <section
            style={{
              display: tab === "why" ? "block" : "none",
              animation: tab === "why" ? "fadeSlideIn 0.2s ease" : undefined,
            }}
            className="bg-white rounded-2xl border border-warm-200 p-5 sm:p-8"
          >
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-9 h-9 bg-zigama-100 rounded-lg flex items-center justify-center shrink-0">
                    <Sparkles className="w-5 h-5 text-zigama-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-zigama-600 uppercase tracking-wide">
                      Mwalimu explains
                    </p>
                    <p className="text-sm text-warm-500">
                      Why this matters for your future
                    </p>
                  </div>
                </div>
                {explanation && !explanationLoading && (
                  <button
                    onClick={() => handleSpeak("why", explanation)}
                    aria-label={
                      speakingKey === "why" && isSpeaking
                        ? "Stop listening"
                        : "Listen to Mwalimu"
                    }
                    className="tap-target rounded-lg border border-warm-200 px-3 flex items-center gap-1.5 text-sm text-warm-700 hover:bg-warm-50"
                  >
                    {speakingKey === "why" && isSpeaking ? (
                      <><VolumeX className="w-4 h-4" /> Stop</>
                    ) : (
                      <><Volume2 className="w-4 h-4" /> Listen</>
                    )}
                  </button>
                )}
              </div>

              {explanationLoading && <MwalimuSkeleton lines={5} />}

              {!explanationLoading && explanation && (
                <div className="text-warm-800 leading-relaxed whitespace-pre-wrap text-[15px] sm:text-base">
                  {explanation}
                </div>
              )}

              {module.concepts && module.concepts.length > 0 && (
                <div className="mt-6 pt-5 border-t border-warm-100">
                  <p className="text-xs font-semibold text-warm-500 uppercase tracking-wide mb-3">
                    Key concepts in this module
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {module.concepts.map((c, i) => (
                      <span
                        key={i}
                        className="px-3 py-1.5 bg-warm-50 border border-warm-200 rounded-full text-xs text-warm-700"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-6 pt-5 border-t border-warm-100 flex items-center justify-end">
                <button
                  onClick={() => setTab("learn")}
                  className="px-4 py-2 bg-zigama-600 hover:bg-zigama-700 text-white rounded-lg text-sm font-semibold flex items-center gap-1.5"
                >
                  Go to Learn <ArrowRight className="w-4 h-4" />
                </button>
              </div>
          </section>

          {/* ── LEARN ───────────────────────────────────────── */}
          <section
            style={{
              display: tab === "learn" ? "block" : "none",
              animation: tab === "learn" ? "fadeSlideIn 0.2s ease" : undefined,
            }}
            className="space-y-5"
          >
              {module.video_primary ? (
                <div className="bg-white rounded-2xl border border-warm-200 overflow-hidden">
                  <div className="relative aspect-video bg-black">
                    <iframe
                      src={`https://www.youtube.com/embed/${module.video_primary.video_id}`}
                      title={module.video_primary.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="absolute inset-0 w-full h-full"
                    />
                  </div>
                  <div className="p-5">
                    <h2 className="font-display text-lg sm:text-xl font-bold text-warm-900 mb-1">
                      {module.video_primary.title}
                    </h2>
                    <p className="text-sm text-warm-500 mb-3 flex items-center gap-3 flex-wrap">
                      <span>{module.video_primary.channel}</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {module.video_primary.duration_minutes}min
                      </span>
                    </p>
                    {module.video_primary.watch_for && (
                      <div className="p-3 bg-zigama-50 border border-zigama-200 rounded-lg">
                        <p className="text-xs font-semibold text-zigama-700 uppercase tracking-wide mb-1 flex items-center gap-1.5">
                          <Info className="w-3 h-3" />
                          What to watch for
                        </p>
                        <p className="text-sm text-warm-800 leading-relaxed">
                          {module.video_primary.watch_for}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-5 bg-white rounded-2xl border border-warm-200 text-warm-500">
                  No primary video available for this module.
                </div>
              )}

              {/* Visual explanation (Mermaid diagram) */}
              <DiagramView concept={module.title} moduleTitle={module.title} />

              <div className="flex items-center justify-end">
                <button
                  onClick={() => setTab("practice")}
                  className="px-4 py-2 bg-zigama-600 hover:bg-zigama-700 text-white rounded-lg text-sm font-semibold flex items-center gap-1.5"
                >
                  Go to practice <ArrowRight className="w-4 h-4" />
                </button>
              </div>
          </section>

          {/* ── PRACTICE ────────────────────────────────────── */}
          <section
            style={{
              display: tab === "practice" ? "block" : "none",
              animation: tab === "practice" ? "fadeSlideIn 0.2s ease" : undefined,
            }}
            className="bg-white rounded-2xl border border-warm-200 p-5 sm:p-8"
          >
              {module.practice_exercise ? (
                <>
                  <div className="flex items-start gap-3 mb-5">
                    <div className="w-10 h-10 bg-sage-100 rounded-lg flex items-center justify-center shrink-0">
                      <Code className="w-5 h-5 text-sage-700" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-sage-700 uppercase tracking-wide mb-0.5">
                        Hands-on practice
                      </p>
                      <h2 className="font-display text-lg sm:text-xl font-bold text-warm-900 leading-tight">
                        {module.practice_exercise.title}
                      </h2>
                      <p className="text-sm text-warm-500 mt-1 flex items-center gap-1.5">
                        <Clock className="w-3 h-3" />
                        ~{module.practice_exercise.estimated_minutes} minutes
                      </p>
                    </div>
                  </div>

                  <div className="p-4 bg-warm-50 rounded-lg border border-warm-100 mb-5">
                    <p className="text-sm text-warm-800 whitespace-pre-wrap leading-relaxed">
                      {module.practice_exercise.instructions}
                    </p>
                  </div>

                  {module.practice_exercise.sandbox && (
                    <a
                      href={module.practice_exercise.sandbox}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-zigama-600 hover:bg-zigama-700 text-white rounded-lg text-sm font-semibold mb-5"
                    >
                      <Play className="w-4 h-4" />
                      Open sandbox
                    </a>
                  )}

                  {module.portfolio_contribution && (
                    <div className="p-4 bg-gradient-to-br from-sage-50 to-sage-100 border-2 border-sage-200 rounded-xl mb-5">
                      <div className="flex items-start gap-3">
                        <Trophy className="w-5 h-5 text-sage-700 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-semibold text-sage-700 uppercase tracking-wide mb-1">
                            What goes on your portfolio
                          </p>
                          <p className="text-sm text-sage-900 leading-relaxed">
                            {module.portfolio_contribution}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="pt-4 border-t border-warm-100 flex items-center justify-between gap-3 flex-wrap">
                    <p className="text-sm text-warm-500">
                      {isPracticeDone
                        ? "Practice marked complete."
                        : "Finished the exercise? Mark it complete."}
                    </p>
                    <button
                      onClick={() => recordPracticeCompleted(trackId, moduleNumber)}
                      disabled={isPracticeDone}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-1.5 ${
                        isPracticeDone
                          ? "bg-sage-100 text-sage-700 cursor-default"
                          : "bg-sage-600 hover:bg-sage-700 text-white"
                      }`}
                    >
                      {isPracticeDone ? <Check className="w-4 h-4" /> : <Code className="w-4 h-4" />}
                      {isPracticeDone ? "Practice complete" : "Mark done"}
                    </button>
                  </div>
                </>
              ) : (
                <p className="text-warm-500">No practice exercise for this module.</p>
              )}
          </section>

          {/* ── QUIZ ────────────────────────────────────────── */}
          <section
            style={{
              display: tab === "quiz" ? "block" : "none",
              animation: tab === "quiz" ? "fadeSlideIn 0.2s ease" : undefined,
            }}
            className="bg-white rounded-2xl border border-warm-200 p-5 sm:p-8"
          >
              {quizLoading && !quiz && (
                <MwalimuSkeleton lines={6} label="Mwalimu is writing your quiz..." />
              )}

              {!quizLoading && quiz && quiz.length > 0 && !quizDone && (() => {
                const q = quiz[quizCurrent];
                const revealed = quizRevealed[quizCurrent];
                const chosen = quizAnswers[quizCurrent];
                const correctLetter = q.correct.trim().charAt(0).toUpperCase();

                return (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs font-semibold text-zigama-700 uppercase tracking-wide">
                        Question {quizCurrent + 1} of {quiz.length}
                      </span>
                      <div className="flex gap-1">
                        {quiz.map((_, i) => (
                          <span
                            key={i}
                            className={`w-6 h-1 rounded-full ${
                              i < quizCurrent ? "bg-sage-500" :
                              i === quizCurrent ? "bg-zigama-500" : "bg-warm-200"
                            }`}
                          />
                        ))}
                      </div>
                    </div>

                    <h3 className="font-display text-lg sm:text-xl font-bold text-warm-900 mb-5 leading-snug">
                      {q.question}
                    </h3>

                    <div className="space-y-2 mb-5">
                      {q.options.map((opt, i) => {
                        const letter = opt.trim().charAt(0).toUpperCase();
                        const isChosen = chosen === letter;
                        const isCorrect = correctLetter === letter;
                        let tone = "border-warm-200 bg-white hover:bg-warm-50";
                        if (revealed) {
                          if (isCorrect) tone = "border-sage-500 bg-sage-50";
                          else if (isChosen && !isCorrect) tone = "border-red-400 bg-red-50";
                          else tone = "border-warm-200 bg-white opacity-60";
                        }
                        return (
                          <button
                            key={i}
                            onClick={() => !revealed && handleQuizSelect(opt)}
                            disabled={revealed}
                            className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-colors text-sm ${tone}`}
                            style={{ minHeight: "48px" }}
                          >
                            <span className="text-warm-900">{opt}</span>
                            {revealed && isCorrect && (
                              <Check className="w-4 h-4 text-sage-600 float-right" />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {revealed && (
                      <div className="p-4 bg-warm-50 border border-warm-200 rounded-lg mb-5">
                        <p className="text-xs font-semibold text-warm-500 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                          <Lightbulb className="w-3 h-3" />
                          Explanation
                        </p>
                        <p className="text-sm text-warm-800 leading-relaxed">
                          {q.explanation}
                        </p>
                        {q.interviewRelevance && (
                          <p className="text-xs text-zigama-700 mt-2 italic">
                            Interview use: {q.interviewRelevance}
                          </p>
                        )}
                      </div>
                    )}

                    {revealed && (
                      <div className="flex justify-end">
                        <button
                          onClick={handleQuizNext}
                          className="px-5 py-2.5 bg-zigama-600 hover:bg-zigama-700 text-white rounded-lg text-sm font-semibold flex items-center gap-1.5"
                          style={{ minHeight: "48px" }}
                        >
                          {quizCurrent + 1 < quiz.length ? "Next question" : "See results"}
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })()}

              {quizDone && quiz && (() => {
                const score = computeQuizScore();
                const passed = score >= 4;
                return (
                  <div className="text-center py-4">
                    <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${
                      passed ? "bg-sage-100" : "bg-warm-100"
                    }`}>
                      {passed ? (
                        <Trophy className="w-10 h-10 text-sage-600" />
                      ) : (
                        <RotateCw className="w-10 h-10 text-warm-600" />
                      )}
                    </div>
                    <h3 className="font-display text-3xl font-bold text-warm-900 mb-1">
                      {score} / {quiz.length}
                    </h3>
                    <p className={`text-lg font-semibold mb-1 ${passed ? "text-sage-700" : "text-warm-700"}`}>
                      {passed ? "Vizuri sana! You passed." : "Close! Review and try again."}
                    </p>
                    <p className="text-sm text-warm-500 mb-5">
                      {passed
                        ? "Module marked complete. Your progress is saved."
                        : "Aim for 4 out of 5 to pass and mark the module complete."}
                    </p>

                    <div className="flex gap-2 justify-center flex-wrap">
                      <button
                        onClick={loadQuiz}
                        className="px-5 py-2.5 bg-white border-2 border-warm-200 hover:border-warm-400 text-warm-900 rounded-lg text-sm font-semibold flex items-center gap-1.5"
                        style={{ minHeight: "48px" }}
                      >
                        <RotateCw className="w-4 h-4" />
                        New quiz
                      </button>
                      {passed && moduleNumber < data.total_modules && (
                        <Link
                          href={`/tracks/${trackId}/${moduleNumber + 1}`}
                          className="px-5 py-2.5 bg-zigama-600 hover:bg-zigama-700 text-white rounded-lg text-sm font-semibold flex items-center gap-1.5"
                          style={{ minHeight: "48px" }}
                        >
                          Next module <ArrowRight className="w-4 h-4" />
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })()}

              {!quizLoading && quiz && quiz.length === 0 && (
                <div className="text-center py-6 text-warm-500">
                  <p className="mb-3">Mwalimu could not build a quiz right now.</p>
                  <button
                    onClick={loadQuiz}
                    className="px-4 py-2 bg-zigama-600 text-white rounded-lg text-sm font-semibold"
                  >
                    Try again
                  </button>
                </div>
              )}
          </section>

          {/* ── FLASHCARDS ──────────────────────────────────── */}
          <section
            style={{
              display: tab === "flashcards" ? "block" : "none",
              animation: tab === "flashcards" ? "fadeSlideIn 0.2s ease" : undefined,
            }}
            className="bg-white rounded-2xl border border-warm-200 p-5 sm:p-8"
          >
              {flashcardsLoading && (
                <MwalimuSkeleton lines={4} label="Mwalimu is making your cards..." />
              )}

              {!flashcardsLoading && flashcards.length > 0 && (
                <>
                  <div className="flex items-center justify-between mb-4 text-sm text-warm-500">
                    <span>Card {cardIndex + 1} of {flashcards.length}</span>
                    <span className="text-xs">Tap card to flip</span>
                  </div>

                  <div
                    className={`flip-card cursor-pointer ${cardFlipped ? "is-flipped" : ""}`}
                    style={{ height: "220px" }}
                    onClick={() => setCardFlipped((v) => !v)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === " " || e.key === "Enter") {
                        e.preventDefault();
                        setCardFlipped((v) => !v);
                      }
                    }}
                  >
                    <div className="flip-card-inner rounded-2xl">
                      <div className="flip-card-face rounded-2xl bg-gradient-to-br from-zigama-50 to-zigama-100 border-2 border-zigama-200 p-6 text-center">
                        <p className="text-xs font-semibold text-zigama-700 uppercase tracking-wide mb-3">
                          Concept
                        </p>
                        <p className="text-lg sm:text-xl font-semibold text-warm-900 leading-snug">
                          {flashcards[cardIndex].front}
                        </p>
                      </div>
                      <div className="flip-card-face flip-card-back rounded-2xl bg-gradient-to-br from-sage-50 to-sage-100 border-2 border-sage-200 p-6 text-center overflow-y-auto">
                        <p className="text-xs font-semibold text-sage-700 uppercase tracking-wide mb-2">
                          Explanation
                        </p>
                        <p className="text-sm sm:text-base text-warm-900 leading-relaxed mb-2">
                          {flashcards[cardIndex].back}
                        </p>
                        {flashcards[cardIndex].africanAnalogy && (
                          <p className="text-xs text-sage-800 italic mt-2">
                            {flashcards[cardIndex].africanAnalogy}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-4">
                    <button
                      onClick={() => {
                        setCardFlipped(false);
                        setCardIndex(Math.max(0, cardIndex - 1));
                      }}
                      disabled={cardIndex === 0}
                      className="tap-target px-4 py-2 rounded-lg border border-warm-200 disabled:opacity-40 flex items-center gap-1.5 text-sm font-semibold text-warm-700"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Previous
                    </button>
                    <div className="flex gap-1">
                      {flashcards.map((_, i) => (
                        <span
                          key={i}
                          className={`w-2 h-2 rounded-full ${
                            i === cardIndex ? "bg-zigama-600" : "bg-warm-200"
                          }`}
                        />
                      ))}
                    </div>
                    <button
                      onClick={() => {
                        setCardFlipped(false);
                        setCardIndex(Math.min(flashcards.length - 1, cardIndex + 1));
                      }}
                      disabled={cardIndex === flashcards.length - 1}
                      className="tap-target px-4 py-2 rounded-lg border border-warm-200 disabled:opacity-40 flex items-center gap-1.5 text-sm font-semibold text-warm-700"
                    >
                      Next
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </>
              )}

              {!flashcardsLoading && flashcards.length === 0 && (
                <div className="text-center py-6 text-warm-500">
                  <p className="mb-3">Mwalimu could not build flashcards right now.</p>
                  <button
                    onClick={loadFlashcards}
                    className="px-4 py-2 bg-zigama-600 text-white rounded-lg text-sm font-semibold"
                  >
                    Try again
                  </button>
                </div>
              )}
          </section>

          {/* ── INTERVIEW ───────────────────────────────────── */}
          <section
            style={{
              display: tab === "interview" ? "block" : "none",
              animation: tab === "interview" ? "fadeSlideIn 0.2s ease" : undefined,
            }}
            className="space-y-4"
          >
              <div className="p-5 bg-zigama-50 border border-zigama-200 rounded-xl flex items-start gap-3">
                <MessageSquare className="w-5 h-5 text-zigama-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-display font-bold text-warm-900 mb-1">
                    Real questions employers ask
                  </h3>
                  <p className="text-sm text-warm-700 leading-relaxed">
                    Read the question, think about your own answer, then reveal the model answer.
                    When you are ready, run a live mock interview with Mwalimu.
                  </p>
                </div>
              </div>

              {module.interview_questions?.length > 0 ? (
                module.interview_questions.map((q, i) => (
                  <InterviewCard key={i} question={q} index={i} />
                ))
              ) : (
                <p className="text-warm-500">No interview questions yet.</p>
              )}

              <Link
                href={`/tracks/${trackId}/${moduleNumber}/interview`}
                className="inline-flex items-center gap-2 px-5 py-3 bg-zigama-600 hover:bg-zigama-700 text-white rounded-lg text-sm font-semibold w-full sm:w-auto justify-center"
                style={{ minHeight: "48px" }}
              >
                <MessageSquare className="w-4 h-4" />
                Practice with Mwalimu
              </Link>
          </section>

        </div>
      </main>

      {/* Sticky complete-module bar */}
      <div className="fixed bottom-0 inset-x-0 safe-bottom z-30 bg-white border-t-2 border-zigama-200 shadow-[0_-4px_16px_-4px_rgba(0,0,0,0.08)]">
        <div className="max-w-5xl mx-auto px-4 sm:px-8 py-3 flex items-center justify-between gap-3">
          {moduleNumber > 1 && (
            <Link
              href={`/tracks/${trackId}/${moduleNumber - 1}`}
              aria-label="Previous module"
              className="shrink-0 px-3 sm:px-4 rounded-lg border border-warm-200 text-warm-700 hover:bg-warm-50 text-sm font-semibold flex items-center gap-1.5"
              style={{ minHeight: "48px" }}
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Previous</span>
            </Link>
          )}
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-warm-900 text-sm truncate">
              {isCompleted ? "Module complete" : "Ready to move on?"}
            </p>
            <p className="text-xs text-warm-500 truncate">
              {isCompleted
                ? "Feel free to review or continue."
                : "Mark complete to unlock the next module."}
            </p>
          </div>
          {!isCompleted ? (
            <button
              onClick={handleManualComplete}
              className="shrink-0 px-5 bg-sage-600 hover:bg-sage-700 text-white rounded-lg text-sm font-semibold flex items-center gap-1.5"
              style={{ minHeight: "48px" }}
            >
              <Check className="w-4 h-4" />
              <span className="hidden sm:inline">Mark complete</span>
              <span className="sm:hidden">Complete</span>
            </button>
          ) : moduleNumber < data.total_modules ? (
            <Link
              href={`/tracks/${trackId}/${moduleNumber + 1}`}
              className="shrink-0 px-5 bg-zigama-600 hover:bg-zigama-700 text-white rounded-lg text-sm font-semibold flex items-center gap-1.5"
              style={{ minHeight: "48px" }}
            >
              <span className="hidden sm:inline">Next module</span>
              <span className="sm:hidden">Next</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <Link
              href={`/tracks/${trackId}`}
              className="shrink-0 px-5 bg-sage-600 hover:bg-sage-700 text-white rounded-lg text-sm font-semibold flex items-center gap-1.5"
              style={{ minHeight: "48px" }}
            >
              <Trophy className="w-4 h-4" />
              <span className="hidden sm:inline">Finish track</span>
              <span className="sm:hidden">Finish</span>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

// ───── Interview question card ────────────────────────────────

function InterviewCard({ question, index }: { question: InterviewQuestion; index: number }) {
  const [revealed, setRevealed] = useState(false);
  return (
    <div className="bg-white rounded-2xl border border-warm-200 p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-8 h-8 bg-zigama-100 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold text-zigama-700">
            Q{index + 1}
          </div>
          <h3 className="font-semibold text-warm-900 leading-snug">
            {question.question}
          </h3>
        </div>
        <span className="text-xs font-semibold text-warm-500 uppercase tracking-wide shrink-0">
          {question.difficulty}
        </span>
      </div>
      {!revealed ? (
        <button
          onClick={() => setRevealed(true)}
          className="text-sm font-semibold text-zigama-600 hover:text-zigama-700 flex items-center gap-1 tap-target"
        >
          Reveal model answer
          <ArrowRight className="w-3 h-3" />
        </button>
      ) : (
        <div className="mt-2 p-3 bg-warm-50 border border-warm-100 rounded-lg">
          <p className="text-xs font-semibold text-warm-500 uppercase tracking-wide mb-1.5">
            Model answer
          </p>
          <p className="text-sm text-warm-800 leading-relaxed whitespace-pre-wrap">
            {question.model_answer}
          </p>
        </div>
      )}
    </div>
  );
}
