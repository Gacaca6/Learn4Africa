"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Globe,
  ArrowLeft,
  ArrowRight,
  Clock,
  Target,
  Check,
  BookOpen,
  Sparkles,
  Code,
  MessageSquare,
  Trophy,
  Youtube,
  Play,
  Briefcase,
  Info,
  FileText,
  Lock,
  CircleDot,
  Building,
  Award,
} from "@/lib/icons";
import { useCurriculumStore } from "@/lib/curriculumStore";
import { useAuth } from "@/lib/useAuth";
import {
  syncTrackStart,
  syncModuleComplete,
  syncPortfolioItem,
} from "@/lib/trackSync";

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

interface ResourcesResponse {
  rwanda_companies: { name: string; focus: string; typical_roles: string[]; salary_range_rwf: string; notes: string }[];
  job_search_resources: { name: string; url: string; description: string; category: string }[];
  free_certifications: { name: string; url: string; cost: string; value: string }[];
}

type TabKey = "why" | "learn" | "practice" | "interview" | "resources";

// ───── Markdown mini-renderer (headings + paragraphs + lists) ─

function renderMarkdown(md: string) {
  const lines = md.split("\n");
  const blocks: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }

    // Headings
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      const level = h[1].length;
      const text = h[2];
      if (level === 1) {
        blocks.push(
          <h1 key={key++} className="font-display text-2xl font-bold text-warm-900 mt-6 mb-3">
            {text}
          </h1>
        );
      } else if (level === 2) {
        blocks.push(
          <h2 key={key++} className="font-display text-xl font-bold text-warm-900 mt-6 mb-2">
            {text}
          </h2>
        );
      } else {
        blocks.push(
          <h3 key={key++} className="font-semibold text-warm-900 mt-4 mb-1.5">
            {text}
          </h3>
        );
      }
      i++;
      continue;
    }

    // Unordered list
    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*]\s+/, ""));
        i++;
      }
      blocks.push(
        <ul key={key++} className="list-disc pl-6 space-y-1 text-warm-800 my-2">
          {items.map((it, j) => (
            <li key={j}>{renderInline(it)}</li>
          ))}
        </ul>
      );
      continue;
    }

    // Ordered list
    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s+/, ""));
        i++;
      }
      blocks.push(
        <ol key={key++} className="list-decimal pl-6 space-y-1 text-warm-800 my-2">
          {items.map((it, j) => (
            <li key={j}>{renderInline(it)}</li>
          ))}
        </ol>
      );
      continue;
    }

    // Paragraph — collect consecutive non-empty, non-special lines
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^#{1,6}\s+/.test(lines[i]) &&
      !/^[-*]\s+/.test(lines[i]) &&
      !/^\d+\.\s+/.test(lines[i])
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    blocks.push(
      <p key={key++} className="text-warm-800 leading-relaxed my-2">
        {renderInline(paraLines.join(" "))}
      </p>
    );
  }

  return <div>{blocks}</div>;
}

function renderInline(text: string): React.ReactNode {
  // Support **bold** and *italic*
  const parts: React.ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith("**")) {
      parts.push(
        <strong key={key++} className="font-semibold text-warm-900">
          {token.slice(2, -2)}
        </strong>
      );
    } else {
      parts.push(
        <em key={key++} className="italic">
          {token.slice(1, -1)}
        </em>
      );
    }
    lastIndex = match.index + token.length;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return parts;
}

// ───── Page ───────────────────────────────────────────────────

export default function LearningRoomPage() {
  const params = useParams<{ trackId: string; moduleNumber: string }>();
  const router = useRouter();
  const trackId = params.trackId;
  const moduleNumber = parseInt(params.moduleNumber, 10);

  const [data, setData] = useState<ModuleResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [tab, setTab] = useState<TabKey>("why");
  const [explanation, setExplanation] = useState<string>("");
  const [explanationLoading, setExplanationLoading] = useState(false);
  const [practiceGuide, setPracticeGuide] = useState<string>("");
  const [practiceLoading, setPracticeLoading] = useState(false);
  const [resources, setResources] = useState<ResourcesResponse | null>(null);
  const [resourcesLoading, setResourcesLoading] = useState(false);

  const trackProgress = useCurriculumStore((s) => s.tracks[trackId]);
  const startTrack = useCurriculumStore((s) => s.startTrack);
  const setTrackCurrentModule = useCurriculumStore((s) => s.setTrackCurrentModule);
  const completeTrackModule = useCurriculumStore((s) => s.completeTrackModule);
  const recordPracticeCompleted = useCurriculumStore((s) => s.recordPracticeCompleted);
  const addPortfolioItem = useCurriculumStore((s) => s.addPortfolioItem);
  const { isAuthenticated } = useAuth();

  // Load the module on mount
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const res = await fetch(`/api/v1/tracks/${trackId}/modules/${moduleNumber}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const j = (await res.json()) as ModuleResponse;
        if (!cancelled) {
          setData(j);
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load module");
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [trackId, moduleNumber]);

  // Mark track started + current module
  useEffect(() => {
    if (!trackProgress) {
      startTrack(trackId);
      // Best-effort server sync for the "started" transition.
      if (isAuthenticated) {
        void syncTrackStart(trackId);
      }
    }
    setTrackCurrentModule(trackId, moduleNumber);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackId, moduleNumber]);

  // Load Mwalimu explanation the first time "why" tab is opened (or on mount)
  useEffect(() => {
    if (!data || explanation || explanationLoading) return;
    if (tab !== "why") return;
    let cancelled = false;
    async function fetchExplanation() {
      setExplanationLoading(true);
      try {
        const res = await fetch(
          `/api/v1/tracks/${trackId}/modules/${moduleNumber}/explain`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ student_name: "", language: "en" }),
          }
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const j = await res.json();
        if (!cancelled) {
          setExplanation(j.explanation_markdown || "");
        }
      } catch {
        // Graceful fallback: use the module's why_africa text
        if (!cancelled && data) {
          setExplanation(
            `## Why this matters\n\n${data.module.why_africa || "This module gives you a real, employable skill."}`
          );
        }
      } finally {
        if (!cancelled) setExplanationLoading(false);
      }
    }
    fetchExplanation();
    return () => {
      cancelled = true;
    };
  }, [tab, data, trackId, moduleNumber, explanation, explanationLoading]);

  // Load practice guide when practice tab opens
  useEffect(() => {
    if (!data || practiceGuide || practiceLoading) return;
    if (tab !== "practice") return;
    if (!data.module.practice_exercise) return;
    let cancelled = false;
    async function fetchGuide() {
      setPracticeLoading(true);
      try {
        const res = await fetch(
          `/api/v1/tracks/${trackId}/modules/${moduleNumber}/practice-guide`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ student_name: "", language: "en" }),
          }
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const j = await res.json();
        if (!cancelled) setPracticeGuide(j.guide_markdown || "");
      } catch {
        if (!cancelled && data?.module.practice_exercise) {
          setPracticeGuide(
            `## ${data.module.practice_exercise.title}\n\n${data.module.practice_exercise.instructions}`
          );
        }
      } finally {
        if (!cancelled) setPracticeLoading(false);
      }
    }
    fetchGuide();
    return () => {
      cancelled = true;
    };
  }, [tab, data, trackId, moduleNumber, practiceGuide, practiceLoading]);

  // Load resources when resources tab opens
  useEffect(() => {
    if (tab !== "resources" || resources || resourcesLoading) return;
    let cancelled = false;
    async function fetchResources() {
      setResourcesLoading(true);
      try {
        const res = await fetch(
          `/api/v1/tracks/${trackId}/modules/${moduleNumber}/resources`
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const j = await res.json();
        if (!cancelled) setResources(j);
      } catch {
        // noop
      } finally {
        if (!cancelled) setResourcesLoading(false);
      }
    }
    fetchResources();
    return () => {
      cancelled = true;
    };
  }, [tab, trackId, moduleNumber, resources, resourcesLoading]);

  const module = data?.module;

  const completed = useMemo(
    () => new Set(trackProgress?.completed_modules || []),
    [trackProgress]
  );
  const practiceDone = useMemo(
    () => new Set(trackProgress?.practice_completed || []),
    [trackProgress]
  );
  const isCompleted = completed.has(moduleNumber);
  const isPracticeDone = practiceDone.has(moduleNumber);

  function handleCompleteModule() {
    if (!module || !data) return;
    completeTrackModule(trackId, moduleNumber);
    // Mirror the completion onto the backend for signed-in learners.
    if (isAuthenticated) {
      void syncModuleComplete(trackId, moduleNumber);
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
    // Try to navigate to next module
    if (moduleNumber < (data.total_modules || 1)) {
      setTimeout(() => {
        router.push(`/tracks/${trackId}/${moduleNumber + 1}`);
      }, 600);
    }
  }

  function handlePracticeDone() {
    recordPracticeCompleted(trackId, moduleNumber);
  }

  if (loading) {
    return (
      <div className="noise min-h-screen bg-warm-50 p-10">
        <div className="max-w-5xl mx-auto">
          <div className="h-8 w-48 bg-warm-200 rounded animate-pulse mb-6" />
          <div className="h-12 w-3/4 bg-warm-200 rounded animate-pulse mb-4" />
          <div className="h-40 bg-warm-100 rounded-2xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (error || !data || !module) {
    return (
      <div className="noise min-h-screen bg-warm-50 p-10">
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

  const tabs: { key: TabKey; label: string; Icon: typeof Info }[] = [
    { key: "why", label: "Why This Matters", Icon: Sparkles },
    { key: "learn", label: "Learn", Icon: Youtube },
    { key: "practice", label: "Practice", Icon: Code },
    { key: "interview", label: "Interview Prep", Icon: MessageSquare },
    { key: "resources", label: "Resources", Icon: BookOpen },
  ];

  return (
    <div className="noise min-h-screen bg-warm-50">
      {/* Header */}
      <header className="bg-warm-50/80 backdrop-blur-md border-b border-warm-200/60 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-5 sm:px-8 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-warm-700" />
            <span className="text-lg font-semibold tracking-tight text-warm-900">
              Learn4Africa
            </span>
          </Link>
          <Link
            href={`/tracks/${trackId}`}
            className="text-sm text-warm-600 hover:text-warm-900 flex items-center gap-1"
          >
            <ArrowLeft className="w-4 h-4" />
            Roadmap
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-5 sm:px-8 py-8">
        {/* Module header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 text-xs font-semibold text-warm-500 uppercase tracking-wide mb-2">
            <Link
              href={`/tracks/${trackId}`}
              className="hover:text-zigama-600 transition-colors"
            >
              {data.track_title}
            </Link>
            <span>•</span>
            <span>
              Module {moduleNumber} of {data.total_modules}
            </span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-warm-900 leading-tight mb-3">
            {module.title}
          </h1>
          <div className="flex items-center gap-5 text-sm text-warm-600">
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />~{module.estimated_hours}h
            </span>
            {module.concepts && module.concepts.length > 0 && (
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

        {/* Tabs */}
        <div className="mb-6 border-b border-warm-200 overflow-x-auto">
          <div className="flex gap-1 min-w-max">
            {tabs.map((t) => {
              const active = tab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`px-4 py-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
                    active
                      ? "border-zigama-600 text-zigama-700"
                      : "border-transparent text-warm-500 hover:text-warm-900"
                  }`}
                >
                  <t.Icon className="w-4 h-4" />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab content */}
        <div className="mb-10">
          {tab === "why" && (
            <section className="bg-white rounded-2xl border border-warm-200 p-6 sm:p-8">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-9 h-9 bg-zigama-100 rounded-lg flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-zigama-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-zigama-600 uppercase tracking-wide">
                    Mwalimu explains
                  </p>
                  <p className="text-sm text-warm-500">
                    Why this matters for your life and career
                  </p>
                </div>
              </div>

              {explanationLoading && (
                <div className="flex items-center gap-3 text-warm-500 text-sm">
                  <div className="w-2 h-2 bg-zigama-500 rounded-full animate-pulse" />
                  Mwalimu is thinking about how to explain this to you...
                </div>
              )}

              {!explanationLoading && explanation && (
                <div className="prose prose-warm max-w-none">
                  {renderMarkdown(explanation)}
                </div>
              )}

              <div className="mt-6 pt-6 border-t border-warm-100 flex items-center justify-between">
                <p className="text-sm text-warm-500">
                  Ready to watch the best free video on this topic?
                </p>
                <button
                  onClick={() => setTab("learn")}
                  className="px-4 py-2 bg-zigama-600 hover:bg-zigama-700 text-white rounded-lg text-sm font-semibold flex items-center gap-1.5 transition-colors"
                >
                  Go to Learn
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </section>
          )}

          {tab === "learn" && (
            <section className="space-y-6">
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
                  <div className="p-6">
                    <h2 className="font-display text-xl font-bold text-warm-900 mb-1">
                      {module.video_primary.title}
                    </h2>
                    <p className="text-sm text-warm-500 mb-4 flex items-center gap-3">
                      <span>{module.video_primary.channel}</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {module.video_primary.duration_minutes}min
                      </span>
                    </p>
                    {module.video_primary.watch_for && (
                      <div className="p-4 bg-zigama-50 border border-zigama-200 rounded-lg">
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
                <div className="p-6 bg-white rounded-2xl border border-warm-200 text-warm-500">
                  No primary video available for this module.
                </div>
              )}

              {module.video_secondary && (
                <div className="bg-white rounded-2xl border border-warm-200 p-5">
                  <p className="text-xs font-semibold text-warm-500 uppercase tracking-wide mb-2">
                    Optional follow-up
                  </p>
                  <a
                    href={module.video_secondary.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 hover:bg-warm-50 p-2 rounded-lg transition-colors"
                  >
                    <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center shrink-0">
                      <Youtube className="w-5 h-5 text-red-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-warm-900 text-sm truncate">
                        {module.video_secondary.title}
                      </p>
                      <p className="text-xs text-warm-500">
                        {module.video_secondary.channel} •{" "}
                        {module.video_secondary.duration_minutes}min
                      </p>
                    </div>
                  </a>
                </div>
              )}

              {/* Concepts checklist */}
              {module.concepts && module.concepts.length > 0 && (
                <div className="bg-white rounded-2xl border border-warm-200 p-6">
                  <h3 className="font-display text-lg font-bold text-warm-900 mb-3 flex items-center gap-2">
                    <Target className="w-4 h-4 text-zigama-600" />
                    Concepts you will learn
                  </h3>
                  <ul className="space-y-2">
                    {module.concepts.map((c, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-warm-800">
                        <Check className="w-4 h-4 text-sage-600 mt-0.5 shrink-0" />
                        <span>{c}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex items-center justify-end">
                <button
                  onClick={() => setTab("practice")}
                  className="px-4 py-2 bg-zigama-600 hover:bg-zigama-700 text-white rounded-lg text-sm font-semibold flex items-center gap-1.5 transition-colors"
                >
                  Go to practice
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </section>
          )}

          {tab === "practice" && (
            <section className="bg-white rounded-2xl border border-warm-200 p-6 sm:p-8">
              {module.practice_exercise ? (
                <>
                  <div className="flex items-start gap-3 mb-5">
                    <div className="w-10 h-10 bg-sage-100 rounded-lg flex items-center justify-center shrink-0">
                      <Code className="w-5 h-5 text-sage-700" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-sage-700 uppercase tracking-wide mb-0.5">
                        Hands-on practice
                      </p>
                      <h2 className="font-display text-xl font-bold text-warm-900 leading-tight">
                        {module.practice_exercise.title}
                      </h2>
                      <p className="text-sm text-warm-500 mt-1 flex items-center gap-1.5">
                        <Clock className="w-3 h-3" />~{module.practice_exercise.estimated_minutes}{" "}
                        minutes
                      </p>
                    </div>
                  </div>

                  {/* Raw instructions */}
                  <div className="p-4 bg-warm-50 rounded-lg border border-warm-100 mb-5">
                    <p className="text-xs font-semibold text-warm-500 uppercase tracking-wide mb-2">
                      Exercise instructions
                    </p>
                    <p className="text-sm text-warm-800 whitespace-pre-wrap leading-relaxed">
                      {module.practice_exercise.instructions}
                    </p>
                  </div>

                  {/* Sandbox link */}
                  {module.practice_exercise.sandbox && (
                    <a
                      href={module.practice_exercise.sandbox}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-zigama-600 hover:bg-zigama-700 text-white rounded-lg text-sm font-semibold mb-5 transition-colors"
                    >
                      <Play className="w-4 h-4" />
                      Open the sandbox
                    </a>
                  )}

                  {/* Mwalimu's step-by-step guide */}
                  <div className="pt-5 border-t border-warm-100">
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles className="w-4 h-4 text-zigama-600" />
                      <p className="text-xs font-semibold text-zigama-700 uppercase tracking-wide">
                        Mwalimu's walkthrough
                      </p>
                    </div>
                    {practiceLoading && (
                      <div className="flex items-center gap-3 text-warm-500 text-sm">
                        <div className="w-2 h-2 bg-zigama-500 rounded-full animate-pulse" />
                        Building your step-by-step guide...
                      </div>
                    )}
                    {!practiceLoading && practiceGuide && (
                      <div className="prose prose-warm max-w-none">
                        {renderMarkdown(practiceGuide)}
                      </div>
                    )}
                  </div>

                  {/* Mark practice complete */}
                  <div className="mt-6 pt-5 border-t border-warm-100 flex items-center justify-between">
                    <p className="text-sm text-warm-500">
                      {isPracticeDone
                        ? "Practice marked complete. Well done."
                        : "Finished the exercise? Mark it complete."}
                    </p>
                    <button
                      onClick={handlePracticeDone}
                      disabled={isPracticeDone}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-1.5 transition-colors ${
                        isPracticeDone
                          ? "bg-sage-100 text-sage-700 cursor-default"
                          : "bg-sage-600 hover:bg-sage-700 text-white"
                      }`}
                    >
                      {isPracticeDone ? <Check className="w-4 h-4" /> : <Code className="w-4 h-4" />}
                      {isPracticeDone ? "Practice complete" : "Mark practice done"}
                    </button>
                  </div>
                </>
              ) : (
                <p className="text-warm-500">
                  No practice exercise for this module.
                </p>
              )}
            </section>
          )}

          {tab === "interview" && (
            <section className="space-y-4">
              <div className="p-5 bg-zigama-50 border border-zigama-200 rounded-xl flex items-start gap-3">
                <MessageSquare className="w-5 h-5 text-zigama-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-display font-bold text-warm-900 mb-1">
                    Real questions employers ask
                  </h3>
                  <p className="text-sm text-warm-700">
                    Read the question, think about your own answer, then compare
                    to the model answer. When you are ready, run a{" "}
                    <Link
                      href={`/tracks/${trackId}/${moduleNumber}/interview`}
                      className="font-semibold text-zigama-700 underline"
                    >
                      live mock interview with Mwalimu
                    </Link>
                    .
                  </p>
                </div>
              </div>

              {module.interview_questions && module.interview_questions.length > 0 ? (
                module.interview_questions.map((q, i) => (
                  <InterviewCard key={i} question={q} index={i} />
                ))
              ) : (
                <p className="text-warm-500">
                  No interview questions for this module yet.
                </p>
              )}

              <div className="pt-2">
                <Link
                  href={`/tracks/${trackId}/${moduleNumber}/interview`}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-zigama-600 hover:bg-zigama-700 text-white rounded-lg text-sm font-semibold transition-colors"
                >
                  <MessageSquare className="w-4 h-4" />
                  Start live mock interview
                </Link>
              </div>
            </section>
          )}

          {tab === "resources" && (
            <section className="space-y-6">
              {resourcesLoading && (
                <div className="text-warm-500 text-sm">Loading resources...</div>
              )}

              {/* Portfolio contribution */}
              {module.portfolio_contribution && (
                <div className="p-5 bg-gradient-to-br from-sage-50 to-sage-100 border-2 border-sage-200 rounded-xl">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-sage-600 rounded-lg flex items-center justify-center shrink-0">
                      <Trophy className="w-5 h-5 text-white" />
                    </div>
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

              {/* Rwandan companies */}
              {resources?.rwanda_companies && resources.rwanda_companies.length > 0 && (
                <div className="bg-white rounded-2xl border border-warm-200 p-5">
                  <h3 className="font-display font-bold text-warm-900 mb-3 flex items-center gap-2">
                    <Building className="w-4 h-4 text-zigama-600" />
                    Rwandan tech companies
                  </h3>
                  <div className="space-y-2">
                    {resources.rwanda_companies.slice(0, 5).map((c, i) => (
                      <div key={i} className="p-3 bg-warm-50 rounded-lg">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-warm-900 text-sm">
                              {c.name}
                            </p>
                            <p className="text-xs text-warm-600 mt-0.5">{c.focus}</p>
                          </div>
                          <span className="text-xs text-zigama-600 font-semibold whitespace-nowrap">
                            {c.salary_range_rwf}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Free certifications */}
              {resources?.free_certifications && resources.free_certifications.length > 0 && (
                <div className="bg-white rounded-2xl border border-warm-200 p-5">
                  <h3 className="font-display font-bold text-warm-900 mb-3 flex items-center gap-2">
                    <Award className="w-4 h-4 text-zigama-600" />
                    Free certifications you can earn
                  </h3>
                  <div className="space-y-2">
                    {resources.free_certifications.slice(0, 5).map((c, i) => (
                      <a
                        key={i}
                        href={c.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block p-3 bg-warm-50 hover:bg-warm-100 rounded-lg transition-colors"
                      >
                        <p className="font-semibold text-warm-900 text-sm">
                          {c.name}
                        </p>
                        <p className="text-xs text-warm-600 mt-0.5">{c.value}</p>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Job search resources */}
              {resources?.job_search_resources &&
                resources.job_search_resources.length > 0 && (
                  <div className="bg-white rounded-2xl border border-warm-200 p-5">
                    <h3 className="font-display font-bold text-warm-900 mb-3 flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-zigama-600" />
                      Where to apply
                    </h3>
                    <div className="grid sm:grid-cols-2 gap-2">
                      {resources.job_search_resources.slice(0, 6).map((r, i) => (
                        <a
                          key={i}
                          href={r.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-3 bg-warm-50 hover:bg-warm-100 rounded-lg transition-colors"
                        >
                          <p className="font-semibold text-warm-900 text-sm">{r.name}</p>
                          <p className="text-xs text-warm-600 mt-0.5 line-clamp-2">
                            {r.description}
                          </p>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
            </section>
          )}
        </div>

        {/* Complete module footer */}
        <div className="sticky bottom-6 z-30">
          <div className="bg-white border-2 border-zigama-300 rounded-2xl p-5 shadow-lg flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="font-semibold text-warm-900 text-sm">
                {isCompleted
                  ? "You have completed this module"
                  : "Ready to move on?"}
              </p>
              <p className="text-xs text-warm-500 mt-0.5">
                {isCompleted
                  ? "Feel free to review or go to the next module."
                  : "Mark this module complete to unlock the next one."}
              </p>
            </div>
            {!isCompleted ? (
              <button
                onClick={handleCompleteModule}
                className="px-5 py-2.5 bg-sage-600 hover:bg-sage-700 text-white rounded-lg text-sm font-semibold flex items-center gap-1.5 transition-colors shrink-0"
              >
                <Check className="w-4 h-4" />
                Mark complete
              </button>
            ) : moduleNumber < data.total_modules ? (
              <Link
                href={`/tracks/${trackId}/${moduleNumber + 1}`}
                className="px-5 py-2.5 bg-zigama-600 hover:bg-zigama-700 text-white rounded-lg text-sm font-semibold flex items-center gap-1.5 transition-colors shrink-0"
              >
                Next module
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <Link
                href={`/tracks/${trackId}`}
                className="px-5 py-2.5 bg-sage-600 hover:bg-sage-700 text-white rounded-lg text-sm font-semibold flex items-center gap-1.5 transition-colors shrink-0"
              >
                <Trophy className="w-4 h-4" />
                Finish track
              </Link>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

// ───── Interview Question Card ────────────────────────────────

function InterviewCard({ question, index }: { question: InterviewQuestion; index: number }) {
  const [revealed, setRevealed] = useState(false);
  return (
    <div className="bg-white rounded-2xl border border-warm-200 p-5">
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
          className="text-sm font-semibold text-zigama-600 hover:text-zigama-700 flex items-center gap-1"
        >
          Reveal model answer
          <ArrowRight className="w-3 h-3" />
        </button>
      ) : (
        <div className="mt-2 p-4 bg-warm-50 border border-warm-100 rounded-lg">
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
