"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Trophy,
  BookOpen,
  Briefcase,
  Download,
  Share,
  Sparkles,
  Target,
  Check,
  User,
  FileText,
  BookmarkCheck,
  GraduationCap,
} from "@/lib/icons";
import { useCurriculumStore, PortfolioItem, TrackProgress } from "@/lib/curriculumStore";
import { TopNav } from "@/components/TopNav";
import { useAuth } from "@/lib/useAuth";
import { listTracks } from "@/lib/tracks";

interface TrackSummary {
  id: string;
  title: string;
  module_count: number;
  capstone_project: string;
  target_jobs: { title: string; salary_rwf: string; companies: string[] }[];
}

export default function PortfolioPage() {
  const [hydrated, setHydrated] = useState(false);
  const [tracks, setTracks] = useState<TrackSummary[]>([]);
  const [name, setName] = useState("");

  const tracksState = useCurriculumStore((s) => s.tracks);
  const getAllPortfolioItems = useCurriculumStore((s) => s.getAllPortfolioItems);
  const { user } = useAuth();

  useEffect(() => {
    setHydrated(true);
  }, []);

  // Prefill name from the signed-in user once it's available.
  useEffect(() => {
    if (user?.name && !name) setName(user.name);
  }, [user, name]);

  // Progress hydration handled directly by
  // Convex useQuery(api.progress.getMyProgress)

  useEffect(() => {
    // Static track summaries, bundled at build time.
    setTracks(listTracks());
  }, []);

  const items: PortfolioItem[] = hydrated ? getAllPortfolioItems() : [];
  const activeTracks: TrackProgress[] = hydrated
    ? Object.values(tracksState)
    : [];

  const trackById = useMemo(() => {
    const m: Record<string, TrackSummary> = {};
    tracks.forEach((t) => {
      m[t.id] = t;
    });
    return m;
  }, [tracks]);

  // Stats
  const totalCompleted = activeTracks.reduce(
    (acc, t) => acc + t.completed_modules.length,
    0
  );
  const totalPractice = activeTracks.reduce(
    (acc, t) => acc + t.practice_completed.length,
    0
  );
  const totalInterviews = activeTracks.reduce(
    (acc, t) => acc + t.interview_practiced.length,
    0
  );
  const skills = Array.from(
    new Set(
      activeTracks.flatMap((t) => {
        const track = trackById[t.track_id];
        return track ? [track.title] : [];
      })
    )
  );

  // CV download
  function downloadCV() {
    const cvName = name.trim() || "Your Name";
    const skillsList = skills.length
      ? skills.map((s) => `  - ${s}`).join("\n")
      : "  - (complete your first track to list skills here)";

    const projectsList = items.length
      ? items
          .slice(0, 10)
          .map(
            (it, i) =>
              `${i + 1}. ${it.module_title} (${it.track_title})\n   ${it.contribution}`
          )
          .join("\n\n")
      : "(Complete modules to populate projects)";

    const text = `${cvName}
Learn4Africa Graduate Profile
Generated on ${new Date().toLocaleDateString()}

=====================================
SUMMARY
=====================================
Self-taught African professional trained through the Learn4Africa career tracks.
Completed ${totalCompleted} modules across ${activeTracks.length} learning track${
      activeTracks.length === 1 ? "" : "s"
    }.
Delivered ${totalPractice} hands-on practice project${
      totalPractice === 1 ? "" : "s"
    } and ${totalInterviews} mock interview${
      totalInterviews === 1 ? "" : "s"
    }.

=====================================
SKILLS
=====================================
${skillsList}

=====================================
PROJECTS
=====================================
${projectsList}

=====================================
EDUCATION
=====================================
Learn4Africa — Career Tracks
Self-paced, African-first, hands-on
${activeTracks
  .map((t) => {
    const track = trackById[t.track_id];
    if (!track) return `- ${t.track_id}`;
    return `- ${track.title} (${t.completed_modules.length}/${track.module_count} modules)`;
  })
  .join("\n")}

=====================================
Built with Learn4Africa — free learning that leads to real jobs.
`;

    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${cvName.replace(/\s+/g, "_")}_CV.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function shareProfile() {
    const cvName = name.trim() || "Your Name";
    const shareText = `${cvName} — Learn4Africa Graduate
${totalCompleted} modules • ${items.length} portfolio projects • ${totalInterviews} mock interviews
Skills: ${skills.join(", ") || "(growing)"}
Built on Learn4Africa — free learning that leads to real jobs.`;

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "My Learn4Africa profile",
          text: shareText,
        });
        return;
      } catch {
        // fall through to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(shareText);
      alert("Profile copied to clipboard — paste it into LinkedIn, WhatsApp, or email.");
    } catch {
      alert(shareText);
    }
  }

  return (
    <div className="noise min-h-screen bg-warm-50">
      <TopNav currentPath="/portfolio" />

      <main id="main" className="max-w-5xl mx-auto px-5 sm:px-8 py-10 pt-28">
        {/* Hero */}
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 bg-sage-50 border border-sage-200 rounded-full px-3 py-1 mb-4">
            <BookmarkCheck className="w-3.5 h-3.5 text-sage-600" />
            <span className="text-xs font-semibold text-sage-700 uppercase tracking-wide">
              Your Portfolio
            </span>
          </div>
          <h1 className="font-display text-4xl sm:text-5xl font-bold text-warm-900 mb-3 leading-tight">
            Proof of what you can do.
          </h1>
          <p className="text-warm-600 text-lg max-w-3xl leading-relaxed">
            Every module you complete adds a real, shareable piece of work to
            your portfolio. This is what makes an employer say yes.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
          <StatCard
            label="Modules complete"
            value={hydrated ? totalCompleted : 0}
            Icon={BookOpen}
            tone="zigama"
          />
          <StatCard
            label="Hands-on projects"
            value={hydrated ? totalPractice : 0}
            Icon={Target}
            tone="sage"
          />
          <StatCard
            label="Mock interviews"
            value={hydrated ? totalInterviews : 0}
            Icon={Briefcase}
            tone="earth"
          />
          <StatCard
            label="Portfolio items"
            value={hydrated ? items.length : 0}
            Icon={Trophy}
            tone="warm"
          />
        </div>

        {/* CV builder */}
        <section className="mb-10 bg-white rounded-2xl border-2 border-zigama-200 p-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 bg-zigama-100 rounded-lg flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5 text-zigama-600" />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold text-warm-900">
                Auto-generated CV
              </h2>
              <p className="text-sm text-warm-500">
                Built from your real progress. Download anytime.
              </p>
            </div>
          </div>

          <label className="block text-xs font-semibold text-warm-500 uppercase tracking-wide mb-1.5">
            Your full name
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Aline Uwimana"
              className="flex-1 px-4 py-2.5 bg-warm-50 border border-warm-200 rounded-lg text-sm text-warm-900 placeholder-warm-400 outline-none focus:border-zigama-400"
            />
            <button
              onClick={downloadCV}
              disabled={!hydrated}
              className="px-5 py-2.5 bg-zigama-600 hover:bg-zigama-700 disabled:bg-warm-300 text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <Download className="w-4 h-4" />
              Download CV
            </button>
            <button
              onClick={shareProfile}
              disabled={!hydrated}
              className="px-5 py-2.5 bg-sage-600 hover:bg-sage-700 disabled:bg-warm-300 text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <Share className="w-4 h-4" />
              Share profile
            </button>
          </div>
        </section>

        {/* Portfolio items */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl font-bold text-warm-900 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-zigama-600" />
              Projects
            </h2>
            <Link
              href="/tracks"
              className="text-sm font-semibold text-zigama-600 hover:text-zigama-700 flex items-center gap-1"
            >
              Add more <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {hydrated && items.length === 0 ? (
            <div className="p-10 bg-white rounded-2xl border-2 border-dashed border-warm-300 text-center">
              <Target className="w-12 h-12 text-warm-300 mx-auto mb-3" />
              <p className="text-warm-700 font-semibold mb-1">
                No portfolio items yet
              </p>
              <p className="text-sm text-warm-500 mb-5">
                Complete your first module to add a real, shareable project.
              </p>
              <Link
                href="/tracks"
                className="inline-flex items-center gap-2 px-4 py-2 bg-zigama-600 hover:bg-zigama-700 text-white rounded-lg text-sm font-semibold transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                Pick a track to start
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item, i) => (
                <div
                  key={`${item.track_id}-${item.module_number}-${i}`}
                  className="p-5 bg-white rounded-2xl border border-warm-200 hover:border-zigama-300 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-sage-100 rounded-lg flex items-center justify-center shrink-0">
                      <Check className="w-5 h-5 text-sage-700" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 mb-1">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-zigama-600 uppercase tracking-wide mb-0.5">
                            {item.track_title} • Module {item.module_number}
                          </p>
                          <h3 className="font-semibold text-warm-900 leading-snug">
                            {item.module_title}
                          </h3>
                        </div>
                        <span className="text-xs text-warm-500 shrink-0 whitespace-nowrap">
                          {new Date(item.completed_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-warm-700 leading-relaxed mt-1">
                        {item.contribution}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Active tracks summary */}
        {hydrated && activeTracks.length > 0 && (
          <section className="mb-10">
            <h2 className="font-display text-xl font-bold text-warm-900 mb-4 flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-zigama-600" />
              Active tracks
            </h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {activeTracks.map((t) => {
                const track = trackById[t.track_id];
                const title = track?.title || t.track_id;
                const total = track?.module_count || 0;
                const done = t.completed_modules.length;
                const pct = total ? Math.round((done / total) * 100) : 0;
                return (
                  <Link
                    key={t.track_id}
                    href={`/tracks/${t.track_id}`}
                    className="block p-4 bg-white rounded-xl border border-warm-200 hover:border-zigama-300 transition-colors"
                  >
                    <p className="font-semibold text-warm-900 mb-1">{title}</p>
                    <div className="flex items-center justify-between mb-2 text-xs text-warm-500">
                      <span>
                        {done} / {total || "?"} modules
                      </span>
                      <span className="text-zigama-600 font-semibold">{pct}%</span>
                    </div>
                    <div className="h-1.5 bg-warm-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-zigama-500 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function StatCard({
  label,
  value,
  Icon,
  tone,
}: {
  label: string;
  value: number;
  Icon: typeof BookOpen;
  tone: "zigama" | "sage" | "earth" | "warm";
}) {
  const tones: Record<string, string> = {
    zigama: "bg-zigama-50 text-zigama-600 border-zigama-200",
    sage: "bg-sage-50 text-sage-600 border-sage-200",
    earth: "bg-earth-50 text-earth-700 border-earth-200",
    warm: "bg-warm-100 text-warm-700 border-warm-200",
  };
  return (
    <div className="p-4 bg-white rounded-xl border border-warm-200">
      <div
        className={`w-9 h-9 rounded-lg flex items-center justify-center mb-2 border ${tones[tone]}`}
      >
        <Icon className="w-4 h-4" />
      </div>
      <p className="text-2xl font-bold text-warm-900 tabular-nums leading-none mb-0.5">
        {value}
      </p>
      <p className="text-xs text-warm-500">{label}</p>
    </div>
  );
}
