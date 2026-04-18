"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Globe,
  ArrowLeft,
  ArrowRight,
  Clock,
  Target,
  Briefcase,
  BookOpen,
  Check,
  Lock,
  CircleDot,
  Circle,
  Trophy,
  Sparkles,
  Users,
  Building,
} from "@/lib/icons";
import { useCurriculumStore } from "@/lib/curriculumStore";
import { useAuth } from "@/lib/useAuth";
import { syncTrackStart } from "@/lib/trackSync";
import { getTrack } from "@/lib/tracks";

interface TrackModule {
  module_number: number;
  title: string;
  estimated_hours: number;
  why_africa: string;
  concepts: string[];
  portfolio_contribution?: string;
}

interface TargetJob {
  title: string;
  salary_rwf: string;
  companies: string[];
}

interface TrackDetail {
  id: string;
  title: string;
  tagline: string;
  duration_weeks: number;
  estimated_weekly_hours: number;
  difficulty: string;
  capstone_project: string;
  target_jobs: TargetJob[];
  modules: TrackModule[];
}

export default function TrackRoadmapPage() {
  const params = useParams<{ trackId: string }>();
  const trackId = params.trackId;

  const [track, setTrack] = useState<TrackDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const trackProgress = useCurriculumStore((s) => s.tracks[trackId]);
  const startTrack = useCurriculumStore((s) => s.startTrack);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    setHydrated(true);
  }, []);

  // Static content load — no network call needed.
  useEffect(() => {
    try {
      const data = getTrack(trackId);
      if (!data) {
        setError("Track not found");
      } else {
        setTrack(data as any);
      }
      setLoading(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load track");
      setLoading(false);
    }
  }, [trackId]);

  const completedSet = new Set(trackProgress?.completed_modules || []);
  const currentModule = trackProgress?.current_module || 1;

  function moduleStatus(moduleNumber: number): "complete" | "current" | "available" | "locked" {
    if (completedSet.has(moduleNumber)) return "complete";
    if (!trackProgress) return moduleNumber === 1 ? "available" : "locked";
    if (moduleNumber === currentModule) return "current";
    if (moduleNumber < currentModule) return "available";
    // Next module after highest completed is available
    if (completedSet.has(moduleNumber - 1)) return "available";
    return "locked";
  }

  function handleStart() {
    if (!trackProgress) {
      startTrack(trackId);
      // Best-effort server sync — the banner and UI do not wait on this.
      if (isAuthenticated) {
        void syncTrackStart(trackId);
      }
    }
  }

  if (loading) {
    return (
      <div className="noise min-h-screen bg-warm-50 p-10">
        <div className="max-w-5xl mx-auto">
          <div className="h-8 w-48 bg-warm-200 rounded animate-pulse mb-6" />
          <div className="h-40 bg-warm-100 rounded-2xl animate-pulse mb-6" />
          <div className="space-y-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-white rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !track) {
    return (
      <div className="noise min-h-screen bg-warm-50 p-10">
        <div className="max-w-2xl mx-auto p-6 bg-red-50 border border-red-200 rounded-xl text-red-700">
          {error || "Track not found"}
          <div className="mt-4">
            <Link href="/tracks" className="text-zigama-600 font-semibold underline">
              Back to all tracks
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const completedCount = trackProgress?.completed_modules.length || 0;
  const pct = track.modules.length
    ? Math.round((completedCount / track.modules.length) * 100)
    : 0;

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
            href="/tracks"
            className="text-sm text-warm-600 hover:text-warm-900 flex items-center gap-1"
          >
            <ArrowLeft className="w-4 h-4" />
            All tracks
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-5 sm:px-8 py-10">
        {/* Track hero */}
        <section className="mb-10">
          <div className="inline-flex items-center gap-2 bg-zigama-50 border border-zigama-200 rounded-full px-3 py-1 mb-4">
            <Sparkles className="w-3 h-3 text-zigama-600" />
            <span className="text-xs font-semibold text-zigama-700 uppercase tracking-wide">
              Career Track
            </span>
          </div>
          <h1 className="font-display text-4xl sm:text-5xl font-bold text-warm-900 mb-3 leading-tight">
            {track.title}
          </h1>
          <p className="text-warm-600 text-lg mb-5 max-w-3xl">{track.tagline}</p>

          <div className="flex flex-wrap items-center gap-5 text-sm text-warm-600 mb-6">
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-warm-500" />
              {track.duration_weeks} weeks • ~{track.estimated_weekly_hours}h/week
            </span>
            <span className="flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-warm-500" />
              {track.modules.length} modules
            </span>
            <span className="capitalize flex items-center gap-1.5 text-zigama-700 font-semibold">
              <Target className="w-4 h-4" />
              {track.difficulty}
            </span>
          </div>

          {/* Progress card */}
          {hydrated && trackProgress && (
            <div className="p-5 bg-white rounded-xl border-2 border-zigama-200 mb-6">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-xs font-semibold text-zigama-700 uppercase tracking-wide mb-0.5">
                    Your progress
                  </p>
                  <p className="text-2xl font-bold text-warm-900 tabular-nums">
                    {completedCount} <span className="text-warm-400">/</span>{" "}
                    {track.modules.length}
                    <span className="text-sm font-semibold text-warm-500 ml-2">
                      ({pct}%)
                    </span>
                  </p>
                </div>
                {pct === 100 ? (
                  <Trophy className="w-10 h-10 text-yellow-500" />
                ) : (
                  <Link
                    href={`/tracks/${trackId}/${currentModule}`}
                    className="px-5 py-2.5 bg-zigama-600 hover:bg-zigama-700 text-white rounded-lg text-sm font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    Continue
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                )}
              </div>
              <div className="h-2 bg-warm-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-zigama-500 to-zigama-700 transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )}

          {/* Start button (if not started) */}
          {hydrated && !trackProgress && (
            <div className="p-5 bg-gradient-to-br from-zigama-600 to-zigama-800 rounded-xl mb-6 text-white">
              <h2 className="font-display text-xl font-bold mb-2">
                Ready to start?
              </h2>
              <p className="text-white/90 text-sm mb-4 max-w-2xl">
                You are about to begin a {track.duration_weeks}-week journey built by
                people who actually got hired. Every module is designed around one
                question: can you prove you have this skill in an interview?
              </p>
              <Link
                href={`/tracks/${trackId}/1`}
                onClick={handleStart}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-zigama-700 rounded-lg font-semibold text-sm hover:bg-warm-50 transition-colors"
              >
                Start Module 1
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </section>

        {/* Target jobs */}
        {track.target_jobs && track.target_jobs.length > 0 && (
          <section className="mb-10">
            <h2 className="font-display text-xl font-bold text-warm-900 mb-4 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-zigama-600" />
              Jobs you are training for
            </h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {track.target_jobs.map((job, i) => (
                <div
                  key={i}
                  className="p-4 bg-white rounded-xl border border-warm-200"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className="font-semibold text-warm-900 leading-tight">
                      {job.title}
                    </h3>
                  </div>
                  <p className="text-sm font-semibold text-zigama-600 mb-2">
                    {job.salary_rwf}
                  </p>
                  {job.companies && job.companies.length > 0 && (
                    <p className="text-xs text-warm-500 flex items-start gap-1.5">
                      <Building className="w-3 h-3 mt-0.5 shrink-0" />
                      <span>{job.companies.join(", ")}</span>
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Capstone callout */}
        {track.capstone_project && (
          <section className="mb-10 p-5 bg-sage-50 border-2 border-sage-200 rounded-xl">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-sage-600 rounded-lg flex items-center justify-center shrink-0">
                <Trophy className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-display text-lg font-bold text-sage-900 mb-1">
                  Capstone project
                </h3>
                <p className="text-sm text-sage-800 leading-relaxed">
                  {track.capstone_project}
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Roadmap */}
        <section className="mb-10">
          <h2 className="font-display text-xl font-bold text-warm-900 mb-5 flex items-center gap-2">
            <Target className="w-5 h-5 text-zigama-600" />
            Your roadmap
          </h2>
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-[27px] top-6 bottom-6 w-0.5 bg-warm-200" />

            <div className="space-y-3">
              {track.modules.map((m) => {
                const status = moduleStatus(m.module_number);
                const clickable = status !== "locked";

                const statusIcon =
                  status === "complete" ? (
                    <div className="w-14 h-14 rounded-full bg-sage-600 border-4 border-warm-50 flex items-center justify-center">
                      <Check className="w-6 h-6 text-white" />
                    </div>
                  ) : status === "current" ? (
                    <div className="w-14 h-14 rounded-full bg-zigama-600 border-4 border-warm-50 flex items-center justify-center">
                      <CircleDot className="w-6 h-6 text-white" />
                    </div>
                  ) : status === "available" ? (
                    <div className="w-14 h-14 rounded-full bg-white border-4 border-warm-200 flex items-center justify-center">
                      <Circle className="w-6 h-6 text-warm-400" />
                    </div>
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-warm-100 border-4 border-warm-50 flex items-center justify-center">
                      <Lock className="w-5 h-5 text-warm-400" />
                    </div>
                  );

                const body = (
                  <div
                    className={`flex-1 p-5 rounded-xl border-2 transition-colors ${
                      status === "current"
                        ? "bg-white border-zigama-400 shadow-sm"
                        : status === "complete"
                        ? "bg-sage-50 border-sage-200"
                        : status === "available"
                        ? "bg-white border-warm-200 hover:border-zigama-300"
                        : "bg-warm-50 border-warm-100 opacity-60"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-1.5">
                      <div>
                        <p className="text-xs font-semibold text-warm-500 uppercase tracking-wide mb-0.5">
                          Module {m.module_number}
                        </p>
                        <h3 className="font-semibold text-warm-900 leading-snug">
                          {m.title}
                        </h3>
                      </div>
                      <span className="text-xs text-warm-500 flex items-center gap-1 shrink-0">
                        <Clock className="w-3 h-3" />
                        {m.estimated_hours}h
                      </span>
                    </div>
                    {m.why_africa && (
                      <p className="text-sm text-warm-600 line-clamp-2 leading-snug">
                        {m.why_africa}
                      </p>
                    )}
                    {m.portfolio_contribution && (
                      <p className="mt-2 text-xs text-sage-700 flex items-start gap-1.5">
                        <Trophy className="w-3 h-3 mt-0.5 shrink-0" />
                        <span className="line-clamp-1">
                          Portfolio: {m.portfolio_contribution}
                        </span>
                      </p>
                    )}
                  </div>
                );

                return (
                  <div
                    key={m.module_number}
                    className="flex items-start gap-4 relative"
                  >
                    <div className="z-10 shrink-0">{statusIcon}</div>
                    {clickable ? (
                      <Link
                        href={`/tracks/${trackId}/${m.module_number}`}
                        className="flex-1 group"
                      >
                        {body}
                      </Link>
                    ) : (
                      body
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Footer CTA */}
        {hydrated && !trackProgress && (
          <div className="text-center py-8">
            <Link
              href={`/tracks/${trackId}/1`}
              onClick={handleStart}
              className="inline-flex items-center gap-2 px-6 py-3 bg-zigama-600 hover:bg-zigama-700 text-white rounded-xl font-semibold transition-colors"
            >
              Start Module 1 now
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
