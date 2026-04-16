"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  GraduationCap, Sparkles, ArrowRight, Check, Target,
  Youtube, Clock, Sprout,
} from "@/lib/icons";
import { useCurriculumStore, type Curriculum } from "@/lib/curriculumStore";
import { TopNav } from "@/components/TopNav";

const API = "http://localhost:8001/api/v1";

type Level = "beginner" | "some_knowledge" | "intermediate";

const LEVELS: { id: Level; label: string; desc: string }[] = [
  { id: "beginner", label: "Complete beginner", desc: "I have never learned this before" },
  { id: "some_knowledge", label: "I know a little", desc: "I have some basics but want structure" },
  { id: "intermediate", label: "Intermediate — go deeper", desc: "I want to build real expertise" },
];

interface ModulePreview {
  module_number: number;
  title: string;
  week: number;
  estimated_minutes: number;
  status: "pending" | "ready";
  video?: { thumbnail_url: string; title: string; channel_title: string } | null;
  mwalimu_teaches_directly?: boolean;
}

interface Skeleton {
  id: string;
  title: string;
  goal: string;
  total_weeks: number;
  career_outcome: string;
}

export default function NewCurriculumPage() {
  const router = useRouter();
  const addCurriculum = useCurriculumStore((s) => s.addCurriculum);

  const [goal, setGoal] = useState("");
  const [level, setLevel] = useState<Level>("beginner");

  const [building, setBuilding] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [skeleton, setSkeleton] = useState<Skeleton | null>(null);
  const [modules, setModules] = useState<ModulePreview[]>([]);
  const [error, setError] = useState("");

  async function handleBuild() {
    if (!goal.trim()) return;
    setBuilding(true);
    setError("");
    setStatusMessage("Mwalimu is thinking...");
    setSkeleton(null);
    setModules([]);

    try {
      const res = await fetch(`${API}/curriculum/build`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal: goal.trim(), level }),
      });

      if (!res.ok || !res.body) {
        throw new Error(`Server returned ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // Process complete SSE events (separated by \n\n)
        const events = buffer.split("\n\n");
        buffer = events.pop() || "";

        for (const evt of events) {
          const line = evt.trim();
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (!payload) continue;

          try {
            const data = JSON.parse(payload);
            handleEvent(data);
          } catch (e) {
            console.warn("Failed to parse SSE payload:", payload);
          }
        }
      }
    } catch (e: any) {
      setError(e.message || "Something went wrong. Please try again.");
      setBuilding(false);
    }
  }

  function handleEvent(data: any) {
    if (data.status === "designing") {
      setStatusMessage(data.message);
    } else if (data.status === "designed") {
      setStatusMessage(data.message);
      setSkeleton(data.skeleton);
      const preview = (data.skeleton.modules_preview || []).map((m: any) => ({
        ...m,
        status: "pending" as const,
      }));
      setModules(preview);
    } else if (data.status === "searching") {
      setStatusMessage(`Searching YouTube for Module ${data.module}: ${data.module_title}`);
    } else if (data.status === "module_ready") {
      setStatusMessage(`Module ${data.module} ready`);
      setModules((prev) =>
        prev.map((m) =>
          m.module_number === data.module
            ? {
                ...m,
                status: "ready",
                video: data.module_data?.video,
                mwalimu_teaches_directly: data.module_data?.mwalimu_teaches_directly,
              }
            : m
        )
      );
    } else if (data.status === "complete") {
      setStatusMessage("Your curriculum is ready!");
      const curriculum: Curriculum = {
        ...data.curriculum,
        createdAt: new Date().toISOString(),
      };
      addCurriculum(curriculum);
      setBuilding(false);
      // Smooth hand-off to curriculum view
      setTimeout(() => router.push(`/curriculum/${curriculum.id}`), 600);
    } else if (data.status === "error") {
      setError(data.message);
      setBuilding(false);
    }
  }

  return (
    <div className="noise min-h-screen bg-warm-50">
      <TopNav currentPath="/curriculum/new" />
      {/* Spacer to offset the fixed nav height (64px). */}
      <div id="main" className="h-16" aria-hidden />

      {!building && !modules.length ? (
        // ───── Input screen ─────
        <main className="max-w-3xl mx-auto px-5 sm:px-8 py-12 sm:py-20">
          <p className="text-sm font-medium text-zigama-600 mb-3 uppercase tracking-wide slide-up">
            Mwalimu Curriculum Builder
          </p>
          <h1 className="font-display text-4xl sm:text-5xl font-bold text-warm-900 leading-tight mb-4 slide-up" style={{ animationDelay: "50ms" }}>
            What do you want to learn?
          </h1>
          <p className="text-lg text-warm-500 mb-10 max-w-xl slide-up" style={{ animationDelay: "100ms" }}>
            Tell Mwalimu your goal. She will search YouTube, pick the highest-quality videos,
            and build you a complete learning path grounded in African context.
          </p>

          <div className="space-y-8">
            {/* Goal input */}
            <div>
              <label className="block text-xs font-semibold text-warm-500 uppercase tracking-wide mb-2">
                Your learning goal
              </label>
              <textarea
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="e.g. I want to become a web developer and get a job in Kigali"
                rows={3}
                className="w-full px-5 py-4 text-base bg-white border border-warm-200/60 rounded-xl outline-none focus:border-zigama-400 focus:ring-2 focus:ring-zigama-100 placeholder:text-warm-400 text-warm-900 resize-none"
              />
            </div>

            {/* Level selector */}
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

            {/* Submit */}
            <div>
              <button
                onClick={handleBuild}
                disabled={!goal.trim()}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-7 py-4 bg-warm-900 text-warm-50 rounded-xl text-base font-semibold hover:bg-warm-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Sparkles className="w-5 h-5" />
                Build My Curriculum
                <ArrowRight className="w-5 h-5" />
              </button>
              <p className="text-xs text-warm-400 mt-3">
                No sign-up. Takes ~1 minute. Powered by free AI + YouTube educators worldwide.
              </p>
            </div>
          </div>
        </main>
      ) : (
        // ───── Progress / build screen ─────
        <main className="max-w-4xl mx-auto px-5 sm:px-8 py-10">
          {/* Mwalimu avatar + status */}
          <div className="bg-warm-900 rounded-2xl p-6 sm:p-8 mb-8 flex items-start gap-5">
            <div className="w-16 h-16 bg-warm-800 rounded-2xl flex items-center justify-center shrink-0">
              <GraduationCap className="w-8 h-8 text-warm-300" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-warm-400 uppercase tracking-wide mb-1">Mwalimu</p>
              <p className="font-display text-xl font-bold text-warm-50 mb-2">
                {building ? statusMessage : "Your curriculum is ready!"}
              </p>
              {skeleton && (
                <div className="text-sm text-warm-300">
                  <p className="font-medium text-warm-100">{skeleton.title}</p>
                  {skeleton.career_outcome && (
                    <p className="text-warm-400 text-xs mt-1">
                      <Target className="w-3 h-3 inline mr-1" />
                      Career outcome: {skeleton.career_outcome}
                    </p>
                  )}
                </div>
              )}
              {building && (
                <div className="flex items-center gap-2 mt-3">
                  <div className="w-2 h-2 rounded-full bg-zigama-400 animate-pulse" />
                  <div className="w-2 h-2 rounded-full bg-zigama-400 animate-pulse" style={{ animationDelay: "200ms" }} />
                  <div className="w-2 h-2 rounded-full bg-zigama-400 animate-pulse" style={{ animationDelay: "400ms" }} />
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-6 text-sm">
              {error}
            </div>
          )}

          {/* Module cards streaming in */}
          <div className="space-y-3">
            {modules.map((m) => (
              <div
                key={m.module_number}
                className={`bg-white rounded-xl border p-5 transition-colors ${
                  m.status === "ready" ? "border-sage-300" : "border-warm-200/60"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 tabular-nums text-sm font-semibold ${
                      m.status === "ready"
                        ? "bg-sage-50 text-sage-700"
                        : "bg-warm-100 text-warm-500 animate-pulse"
                    }`}
                  >
                    {m.module_number}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-warm-900 text-sm truncate">{m.title}</h3>
                      {m.status === "ready" && <Check className="w-4 h-4 text-sage-600 shrink-0" />}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-warm-500">
                      <span>Week {m.week}</span>
                      <span className="w-1 h-1 rounded-full bg-warm-300" />
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {m.estimated_minutes} min
                      </span>
                      {m.status === "ready" && (
                        <>
                          <span className="w-1 h-1 rounded-full bg-warm-300" />
                          {m.video ? (
                            <span className="flex items-center gap-1 text-sage-600">
                              <Youtube className="w-3 h-3" />
                              Video ready
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-zigama-600">
                              <GraduationCap className="w-3 h-3" />
                              Mwalimu will teach this directly
                            </span>
                          )}
                        </>
                      )}
                    </div>
                    {m.video?.thumbnail_url && m.status === "ready" && (
                      <div className="mt-3 flex items-center gap-3 bg-warm-50 rounded-lg p-2 border border-warm-200/60">
                        <img
                          src={m.video.thumbnail_url}
                          alt={m.video.title}
                          className="w-16 h-10 object-cover rounded"
                          loading="lazy"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-warm-900 truncate">{m.video.title}</p>
                          <p className="text-xs text-warm-500 truncate">{m.video.channel_title}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {building && !modules.length && (
              <div className="bg-white rounded-xl border border-warm-200/60 p-6 text-center">
                <Sprout className="w-6 h-6 text-zigama-500 mx-auto mb-2 animate-pulse" />
                <p className="text-sm text-warm-500">Mwalimu is designing your learning path...</p>
              </div>
            )}
          </div>

          {!building && modules.length > 0 && !error && (
            <div className="mt-8 text-center">
              <p className="text-sm text-warm-500">Opening your curriculum...</p>
            </div>
          )}
        </main>
      )}
    </div>
  );
}
