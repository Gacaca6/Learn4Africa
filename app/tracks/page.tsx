"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Clock,
  Target,
  Briefcase,
  Code,
  TrendingUp,
  Sparkles,
  Smartphone,
  Cpu,
  MessageSquare,
  Rocket,
  Users,
  BookOpen,
} from "@/lib/icons";
import { useCurriculumStore } from "@/lib/curriculumStore";
import { TopNav } from "@/components/TopNav";
import { useAuth } from "@/lib/useAuth";
import { listTracks } from "@/lib/tracks";

interface TrackSummary {
  id: string;
  title: string;
  tagline: string;
  duration_weeks: number;
  estimated_weekly_hours: number;
  difficulty: string;
  module_count: number;
  capstone_project: string;
  target_jobs: { title: string; salary_rwf: string; companies: string[] }[];
}

// Visual styling per track — not emoji, real iconography
const TRACK_VISUALS: Record<
  string,
  { Icon: typeof Code; gradient: string; accent: string; border: string }
> = {
  web_development: {
    Icon: Code,
    gradient: "from-zigama-500 to-zigama-700",
    accent: "text-zigama-600",
    border: "border-zigama-300",
  },
  python_data: {
    Icon: TrendingUp,
    gradient: "from-sage-600 to-sage-800",
    accent: "text-sage-700",
    border: "border-sage-300",
  },
  digital_marketing: {
    Icon: Sparkles,
    gradient: "from-earth-500 to-earth-700",
    accent: "text-earth-700",
    border: "border-earth-300",
  },
  cloud_devops: {
    Icon: Cpu,
    gradient: "from-warm-700 to-warm-900",
    accent: "text-warm-700",
    border: "border-warm-300",
  },
  digital_literacy: {
    Icon: Smartphone,
    gradient: "from-sage-500 to-zigama-600",
    accent: "text-sage-600",
    border: "border-sage-200",
  },
  interview_prep: {
    Icon: MessageSquare,
    gradient: "from-zigama-600 to-earth-600",
    accent: "text-zigama-700",
    border: "border-zigama-200",
  },
};

function getVisual(id: string) {
  return (
    TRACK_VISUALS[id] || {
      Icon: BookOpen,
      gradient: "from-warm-600 to-warm-800",
      accent: "text-warm-700",
      border: "border-warm-300",
    }
  );
}

export default function TracksPage() {
  const [tracks, setTracks] = useState<TrackSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const trackProgress = useCurriculumStore((s) => s.tracks);
  const hydrateFromServer = useCurriculumStore((s) => s.hydrateFromServer);
  const { token, isAuthenticated } = useAuth();

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (isAuthenticated && token) {
      hydrateFromServer(token);
    }
  }, [isAuthenticated, token, hydrateFromServer]);

  // Career tracks are static content bundled with the app — no network
  // round-trip needed. See lib/tracks/ for the loader + JSON sources.
  useEffect(() => {
    try {
      setTracks(listTracks());
      setLoading(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load tracks");
      setLoading(false);
    }
  }, []);

  return (
    <div className="noise min-h-screen bg-warm-50">
      <TopNav currentPath="/tracks" />

      <main id="main" className="max-w-6xl mx-auto px-5 sm:px-8 py-12 pt-28">
        {/* Hero */}
        <div className="mb-12 max-w-3xl">
          <div className="inline-flex items-center gap-2 bg-zigama-50 border border-zigama-200 rounded-full px-4 py-1.5 mb-5">
            <Rocket className="w-3.5 h-3.5 text-zigama-600" />
            <span className="text-xs font-semibold text-zigama-700 tracking-wide">
              CAREER TRACKS — BUILT FOR HIRING
            </span>
          </div>
          <h1 className="font-display text-4xl sm:text-5xl font-bold text-warm-900 mb-4 leading-tight">
            Pick a path.
            <br />
            <span className="text-zigama-600">Land a real job.</span>
          </h1>
          <p className="text-warm-600 text-lg leading-relaxed">
            Six hand-curated career tracks, each built around one question:{" "}
            <strong className="text-warm-900">
              After completing this, can you get hired?
            </strong>{" "}
            Every module is the best free video on the internet, a real
            hands-on exercise, interview questions employers actually ask, and
            a portfolio piece you can show off.
          </p>
        </div>

        {/* Error state */}
        {error && (
          <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
            Could not load tracks: {error}
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="grid sm:grid-cols-2 gap-6">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-72 bg-white rounded-2xl border border-warm-200 animate-pulse"
              />
            ))}
          </div>
        )}

        {/* Tracks grid */}
        {!loading && tracks.length > 0 && (
          <div className="grid md:grid-cols-2 gap-6">
            {tracks.map((t) => {
              const v = getVisual(t.id);
              const progress = hydrated ? trackProgress[t.id] : undefined;
              const completed = progress?.completed_modules.length || 0;
              const pct = t.module_count
                ? Math.round((completed / t.module_count) * 100)
                : 0;
              const started = Boolean(progress);

              return (
                <Link
                  key={t.id}
                  href={`/tracks/${t.id}`}
                  className={`group relative bg-white rounded-2xl border-2 ${v.border} hover:shadow-lg transition-all overflow-hidden`}
                >
                  {/* Gradient header */}
                  <div
                    className={`bg-gradient-to-br ${v.gradient} p-6 text-white`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                        <v.Icon className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex items-center gap-1.5 text-xs font-semibold bg-white/20 backdrop-blur rounded-full px-3 py-1">
                        <Clock className="w-3 h-3" />
                        {t.duration_weeks} weeks
                      </div>
                    </div>
                    <h2 className="font-display text-2xl font-bold mb-1.5 leading-tight">
                      {t.title}
                    </h2>
                    <p className="text-white/90 text-sm leading-snug">
                      {t.tagline}
                    </p>
                  </div>

                  {/* Body */}
                  <div className="p-6">
                    {/* Stats strip */}
                    <div className="flex items-center gap-4 mb-4 text-xs text-warm-600">
                      <span className="flex items-center gap-1">
                        <BookOpen className="w-3.5 h-3.5" />
                        {t.module_count} modules
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        ~{t.estimated_weekly_hours}h/week
                      </span>
                      <span
                        className={`flex items-center gap-1 px-2 py-0.5 rounded-full bg-warm-50 ${v.accent} font-semibold uppercase tracking-wide`}
                      >
                        {t.difficulty}
                      </span>
                    </div>

                    {/* Capstone preview */}
                    {t.capstone_project && (
                      <div className="mb-4 p-3 bg-warm-50 rounded-lg border border-warm-100">
                        <p className="text-xs font-semibold text-warm-500 uppercase tracking-wide mb-1 flex items-center gap-1.5">
                          <Target className="w-3 h-3" />
                          Capstone project
                        </p>
                        <p className="text-sm text-warm-800 leading-snug">
                          {t.capstone_project}
                        </p>
                      </div>
                    )}

                    {/* Target jobs */}
                    {t.target_jobs && t.target_jobs.length > 0 && (
                      <div className="mb-4">
                        <p className="text-xs font-semibold text-warm-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                          <Briefcase className="w-3 h-3" />
                          Target roles
                        </p>
                        <div className="space-y-1.5">
                          {t.target_jobs.slice(0, 2).map((job, i) => (
                            <div
                              key={i}
                              className="flex items-start justify-between gap-3 text-xs"
                            >
                              <span className="text-warm-800 font-medium">
                                {job.title}
                              </span>
                              <span className={`${v.accent} font-semibold text-right whitespace-nowrap`}>
                                {job.salary_rwf.split("—")[0].trim()}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Progress bar (if started) */}
                    {started && hydrated && (
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-semibold text-warm-600">
                            Your progress
                          </span>
                          <span className={`text-xs font-bold ${v.accent}`}>
                            {completed} / {t.module_count}
                          </span>
                        </div>
                        <div className="h-1.5 bg-warm-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full bg-gradient-to-r ${v.gradient} transition-all`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* CTA */}
                    <div className="flex items-center justify-between pt-1">
                      <span
                        className={`font-semibold text-sm ${v.accent} flex items-center gap-1.5`}
                      >
                        {started ? "Continue track" : "Start this track"}
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                      </span>
                      {started && (
                        <span className="text-xs text-warm-500 flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          Joined
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && tracks.length === 0 && (
          <div className="p-10 bg-white rounded-2xl border-2 border-warm-200 text-center">
            <BookOpen className="w-12 h-12 text-warm-300 mx-auto mb-3" />
            <p className="text-warm-600">
              No tracks available yet. Check back soon.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
