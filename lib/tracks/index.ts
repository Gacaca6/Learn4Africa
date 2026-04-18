/**
 * Learn4Africa — career track data loader.
 *
 * The 6 career tracks are static, hand-curated content — they don't
 * change per user and don't need a database round-trip. We import the
 * JSON files at build time so pages render instantly without any
 * network call.
 *
 * What IS dynamic lives in Convex:
 *   - per-user progress (startedAt, completedModules, quizScores, portfolio)
 *   - AI overlays added later (tutor explanations, on-demand quizzes)
 *
 * This split keeps read-heavy public content in the Next.js bundle and
 * user-specific writes where they belong.
 */

import cloudDevops from "./data/cloud_devops.json";
import digitalLiteracy from "./data/digital_literacy.json";
import digitalMarketing from "./data/digital_marketing.json";
import interviewPrep from "./data/interview_prep.json";
import pythonData from "./data/python_data.json";
import webDevelopment from "./data/web_development.json";

// ─────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────

export interface TrackVideo {
  title: string;
  channel?: string;
  url: string;
  video_id?: string;
  duration_minutes?: number;
  watch_for?: string;
}

export interface TrackInterviewQuestion {
  question: string;
  model_answer: string;
  difficulty?: string;
  companies_ask?: string[];
}

export interface TrackModule {
  module_number: number;
  title: string;
  estimated_hours: number;
  why_africa?: string;
  concepts?: string[];
  video_primary?: TrackVideo;
  video_secondary?: TrackVideo;
  practice_exercise?: {
    title: string;
    instructions: string;
    sandbox?: string | null;
    estimated_minutes?: number;
  };
  interview_questions?: TrackInterviewQuestion[];
  portfolio_contribution?: string | null;
  [key: string]: unknown; // additional fields per track
}

export interface TrackTargetJob {
  title: string;
  salary_rwf: string;
  companies: string[];
}

export interface Track {
  id: string;
  title: string;
  tagline: string;
  duration_weeks: number;
  estimated_weekly_hours: number;
  difficulty: string;
  target_jobs: TrackTargetJob[];
  capstone_project: string;
  modules: TrackModule[];
}

export interface TrackSummary {
  id: string;
  title: string;
  tagline: string;
  duration_weeks: number;
  estimated_weekly_hours: number;
  difficulty: string;
  module_count: number;
  capstone_project: string;
  target_jobs: TrackTargetJob[];
}

// ─────────────────────────────────────────────────────────────────────
// Data
// ─────────────────────────────────────────────────────────────────────

const ALL_TRACKS: Track[] = [
  webDevelopment as Track,
  pythonData as Track,
  cloudDevops as Track,
  digitalMarketing as Track,
  digitalLiteracy as Track,
  interviewPrep as Track,
];

const TRACKS_BY_ID: Record<string, Track> = Object.fromEntries(
  ALL_TRACKS.map((track) => [track.id, track]),
);

// ─────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────

/** Summary for the tracks index page — light payload without module bodies. */
export function listTracks(): TrackSummary[] {
  return ALL_TRACKS.map((t) => ({
    id: t.id,
    title: t.title,
    tagline: t.tagline,
    duration_weeks: t.duration_weeks,
    estimated_weekly_hours: t.estimated_weekly_hours,
    difficulty: t.difficulty,
    module_count: t.modules.length,
    capstone_project: t.capstone_project,
    target_jobs: t.target_jobs,
  }));
}

/** Full track detail — used on `/tracks/[trackId]`. */
export function getTrack(trackId: string): Track | null {
  return TRACKS_BY_ID[trackId] ?? null;
}

/** A single module inside a track. */
export function getModule(
  trackId: string,
  moduleNumber: number,
): TrackModule | null {
  const track = getTrack(trackId);
  if (!track) return null;
  return (
    track.modules.find((m) => m.module_number === moduleNumber) ?? null
  );
}

/** Valid track ids, useful for generating static params. */
export function allTrackIds(): string[] {
  return ALL_TRACKS.map((t) => t.id);
}
