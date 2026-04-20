"use client";

/**
 * Learn4Africa — curriculum builder.
 *
 * Replaces the legacy FastAPI SSE flow with a single Convex action.
 * Since actions don't stream, we simulate staged progress messages so
 * the student always knows Mwalimu is working. On success we map the
 * Convex response into the existing `Curriculum` shape, persist via
 * the Zustand store (which also writes localStorage), and route to
 * /curriculum/[id].
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  GraduationCap, Sparkles, ArrowRight, Check, Target,
} from "@/lib/icons";
import {
  useCurriculumStore,
  type Curriculum,
  type CurriculumModule,
} from "@/lib/curriculumStore";
import { TopNav } from "@/components/TopNav";

type Level = "beginner" | "some_knowledge" | "intermediate";

const LEVELS: { id: Level; label: string; desc: string }[] = [
  { id: "beginner", label: "Complete beginner", desc: "I have never learned this before" },
  { id: "some_knowledge", label: "I know a little", desc: "I have some basics but want structure" },
  { id: "intermediate", label: "Intermediate — go deeper", desc: "I want to build real expertise" },
];

const STAGES = [
  "Mwalimu is thinking about your goal...",
  "Designing your 6-week curriculum...",
  "Selecting free resources for each module...",
  "Almost ready — adding African job context...",
  "Your personal curriculum is ready!",
];

interface ConvexCurriculumModule {
  moduleNumber: number;
  title: string;
  description: string;
  youtubeSearchQuery?: string;
  learningObjectives?: string[];
  practiceExercise?: string;
  interviewQuestion?: string;
  portfolioContribution?: string | null;
  estimatedHours?: number;
  week?: number;
}

interface ConvexCurriculumResponse {
  title: string;
  goal: string;
  totalWeeks: number;
  careerOutcome?: string;
  estimatedSalaryRWF?: { min: number; max: number };
  modules: ConvexCurriculumModule[];
}

function toStoredCurriculum(
  id: string,
  level: Level,
  raw: ConvexCurriculumResponse,
): Curriculum {
  const modules: CurriculumModule[] = (raw.modules || []).map((m) => ({
    module_number: m.moduleNumber,
    title: m.title,
    description: m.description,
    search_query: m.youtubeSearchQuery || "",
    learning_objectives: m.learningObjectives || [],
    estimated_minutes: Math.max(15, Math.round((m.estimatedHours ?? 1) * 60)),
    week: m.week ?? 1,
    video: null,
    // Without YouTube search, Mwalimu will teach each module directly
    // when the student opens it. /curriculum/[id] already handles this.
    mwalimu_teaches_directly: true,
    content: {
      summary: m.description,
      key_concepts: (m.learningObjectives || []).map((o) => ({
        concept: o,
        explanation: "",
      })),
      african_context: m.practiceExercise
        ? `Practice this in a real African context: ${m.practiceExercise}`
        : "",
      flashcards: [],
      quiz: [],
    },
  }));

  return {
    id,
    title: raw.title,
    goal: raw.goal,
    total_weeks: raw.totalWeeks ?? 6,
    career_outcome: raw.careerOutcome ?? "",
    level,
    modules,
    createdAt: new Date().toISOString(),
  };
}

export default function NewCurriculumPage() {
  const router = useRouter();
  const designCurriculum = useAction(api.ai.curriculum.designCurriculum);
  const setCurriculum = useCurriculumStore((s) => s.setCurriculum);

  const [goal, setGoal] = useState("");
  const [level, setLevel] = useState<Level>("beginner");

  const [isBuilding, setIsBuilding] = useState(false);
  const [stage, setStage] = useState(STAGES[0]);
  const [error, setError] = useState("");

  // Rotate through the staged messages while the single Convex call runs.
  useEffect(() => {
    if (!isBuilding) return;
    setStage(STAGES[0]);
    let i = 0;
    const timer = window.setInterval(() => {
      i = Math.min(i + 1, STAGES.length - 1);
      setStage(STAGES[i]);
    }, 2500);
    return () => window.clearInterval(timer);
  }, [isBuilding]);

  async function handleBuild() {
    if (!goal.trim() || isBuilding) return;
    setError("");
    setIsBuilding(true);

    try {
      const raw = (await designCurriculum({
        goal: goal.trim(),
        level,
        targetWeeks: 6,
      })) as ConvexCurriculumResponse;

      if (!raw || !Array.isArray(raw.modules) || raw.modules.length === 0) {
        throw new Error("Mwalimu couldn't design a curriculum this time.");
      }

      const id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `curr_${Date.now()}`;
      const curriculum = toStoredCurriculum(id, level, raw);
      setCurriculum(id, curriculum);

      setStage("Your curriculum is ready!");
      // Small beat so the success message registers.
      await new Promise((r) => setTimeout(r, 700));
      router.push(`/curriculum/${id}`);
    } catch (e: any) {
      setError(
        e?.message ||
          "Mwalimu couldn't finish that curriculum. Please try again in a moment.",
      );
      setIsBuilding(false);
    }
  }

  // ── Loading screen ──────────────────────────────────────────
  if (isBuilding) {
    return (
      <div className="noise min-h-screen bg-warm-50">
        <TopNav currentPath="/curriculum/new" />
        <div id="main" className="h-16" aria-hidden />

        <main className="max-w-2xl mx-auto px-5 sm:px-8 py-12 sm:py-20">
          <div className="bg-white rounded-2xl border border-warm-200/60 p-8 sm:p-10 text-center">
            {/* Mwalimu avatar with pulsing ring */}
            <div className="relative w-24 h-24 mx-auto mb-6">
              <div className="absolute inset-0 rounded-full bg-zigama-200 animate-ping opacity-60" />
              <div className="relative w-24 h-24 rounded-full bg-warm-900 flex items-center justify-center">
                <GraduationCap className="w-12 h-12 text-zigama-300" />
              </div>
            </div>

            <p className="text-xs font-semibold text-zigama-600 uppercase tracking-wide mb-2">
              Mwalimu is building your path
            </p>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-warm-900 mb-3">
              {stage}
            </h1>

            {/* Animated dots */}
            <div className="flex items-center justify-center gap-2 mb-6">
              <div className="w-2 h-2 rounded-full bg-zigama-500 animate-bounce" style={{ animationDelay: "0ms" }} />
              <div className="w-2 h-2 rounded-full bg-zigama-500 animate-bounce" style={{ animationDelay: "150ms" }} />
              <div className="w-2 h-2 rounded-full bg-zigama-500 animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>

            <p className="text-sm text-warm-500">
              This usually takes 10–12 seconds.
            </p>
            <p className="text-xs text-warm-400 mt-2">
              Your goal: <span className="text-warm-700 font-medium">{goal}</span>
            </p>
          </div>
        </main>
      </div>
    );
  }

  // ── Input screen ──────────────────────────────────────────
  return (
    <div className="noise min-h-screen bg-warm-50">
      <TopNav currentPath="/curriculum/new" />
      <div id="main" className="h-16" aria-hidden />

      <main className="max-w-3xl mx-auto px-5 sm:px-8 py-12 sm:py-20">
        <p className="text-sm font-medium text-zigama-600 mb-3 uppercase tracking-wide slide-up">
          Mwalimu Curriculum Builder
        </p>
        <h1 className="font-display text-4xl sm:text-5xl font-bold text-warm-900 leading-tight mb-4 slide-up" style={{ animationDelay: "50ms" }}>
          What do you want to learn?
        </h1>
        <p className="text-lg text-warm-500 mb-10 max-w-xl slide-up" style={{ animationDelay: "100ms" }}>
          Tell Mwalimu your goal. She will design a 6-week learning path
          tailored to real African jobs — no sign-up, no cost.
        </p>

        <div className="space-y-8">
          <div>
            <label className="block text-xs font-semibold text-warm-500 uppercase tracking-wide mb-2">
              Your learning goal
            </label>
            <textarea
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="e.g. I want to become a web developer and get a job in Kigali"
              rows={3}
              className="w-full px-5 py-4 bg-white border border-warm-200/60 rounded-xl outline-none focus:border-zigama-400 focus:ring-2 focus:ring-zigama-100 placeholder:text-warm-400 text-warm-900 resize-none"
              style={{ fontSize: "16px" }}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-warm-500 uppercase tracking-wide mb-3">
              What&apos;s your current level?
            </label>
            <div className="grid sm:grid-cols-3 gap-3">
              {LEVELS.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setLevel(opt.id)}
                  className={`text-left p-5 rounded-xl border-2 transition-colors ${
                    level === opt.id
                      ? "border-warm-900 bg-white"
                      : "border-warm-200/60 bg-white hover:border-warm-300"
                  }`}
                >
                  <div className="flex items-start justify-between mb-1">
                    <span className="font-semibold text-warm-900 text-sm">{opt.label}</span>
                    {level === opt.id && <Check className="w-4 h-4 text-zigama-600 shrink-0 ml-2" />}
                  </div>
                  <p className="text-xs text-warm-500 leading-relaxed">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm flex items-start gap-2">
              <Target className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <button
              onClick={handleBuild}
              disabled={!goal.trim()}
              className="tap-target w-full sm:w-auto flex items-center justify-center gap-2 px-7 py-4 bg-warm-900 text-warm-50 rounded-xl text-base font-semibold hover:bg-warm-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Sparkles className="w-5 h-5" />
              Build My Curriculum
              <ArrowRight className="w-5 h-5" />
            </button>
            <p className="text-xs text-warm-400 mt-3">
              No sign-up. Takes ~15 seconds. Free forever.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
