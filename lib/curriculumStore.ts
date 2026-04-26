import { create } from "zustand";

// ─────────────────────────────────────────────────────────────
// Types — mirror the backend curriculum shape
// ─────────────────────────────────────────────────────────────

export interface CurriculumVideo {
  video_id: string;
  title: string;
  channel_title: string;
  url: string;
  thumbnail_url: string;
  duration_seconds: number;
  view_count: number;
  score: number;
}

export interface KeyConcept {
  concept: string;
  explanation: string;
}

export interface Flashcard {
  front: string;
  back: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correct: string;
  explanation: string;
}

export interface ModuleContent {
  summary: string;
  key_concepts: KeyConcept[];
  african_context: string;
  flashcards: Flashcard[];
  quiz: QuizQuestion[];
}

export interface CurriculumModule {
  module_number: number;
  title: string;
  description: string;
  search_query: string;
  learning_objectives: string[];
  estimated_minutes: number;
  week: number;
  video: CurriculumVideo | null;
  mwalimu_teaches_directly: boolean;
  content: ModuleContent;
}

export interface Curriculum {
  id: string;
  title: string;
  goal: string;
  total_weeks: number;
  career_outcome: string;
  level: string;
  modules: CurriculumModule[];
  createdAt: string;
}

export type ModuleStatus = "locked" | "available" | "in_progress" | "complete";

// ─────────────────────────────────────────────────────────────
// Career Tracks — hand-curated learning paths
// ─────────────────────────────────────────────────────────────

export interface PortfolioItem {
  track_id: string;
  track_title: string;
  module_number: number;
  module_title: string;
  contribution: string;
  completed_at: string; // ISO date
  notes?: string;
}

export interface TrackProgress {
  track_id: string;
  started_at: string; // ISO date
  current_module: number;
  completed_modules: number[];
  quiz_scores: Record<number, number>; // module_number → 0-100
  practice_completed: number[];
  interview_practiced: number[];
  portfolio_items: PortfolioItem[];
}

// ─────────────────────────────────────────────────────────────
// Store
// ─────────────────────────────────────────────────────────────

interface CurriculumStore {
  curricula: Record<string, Curriculum>;
  activeCurriculumId: string | null;
  moduleProgress: Record<string, Record<number, ModuleStatus>>;

  // Career track progress
  tracks: Record<string, TrackProgress>;

  addCurriculum: (curriculum: Curriculum) => void;
  setCurriculum: (id: string, curriculum: Curriculum) => void;
  getCurriculum: (id: string) => Curriculum | null;
  setActive: (id: string) => void;
  startModule: (curriculumId: string, moduleNumber: number) => void;
  completeModule: (curriculumId: string, moduleNumber: number) => void;
  getModuleStatus: (curriculumId: string, moduleNumber: number) => ModuleStatus;
  getProgress: (curriculumId: string) => { completed: number; total: number };
  clearAll: () => void;

  // Track actions
  startTrack: (trackId: string) => void;
  setTrackCurrentModule: (trackId: string, moduleNumber: number) => void;
  completeTrackModule: (trackId: string, moduleNumber: number) => void;
  recordQuizScore: (trackId: string, moduleNumber: number, score: number) => void;
  recordPracticeCompleted: (trackId: string, moduleNumber: number) => void;
  recordInterviewPracticed: (trackId: string, moduleNumber: number) => void;
  addPortfolioItem: (item: PortfolioItem) => void;
  getTrackProgress: (trackId: string) => TrackProgress | null;
  getAllPortfolioItems: () => PortfolioItem[];

  // Server sync — called after sign in to hydrate from MongoDB
  hydrateFromServer: (token: string) => Promise<void>;
}

const STORAGE_KEY = "learn4africa_curriculum_store";

interface PersistedState {
  curricula: Record<string, Curriculum>;
  activeCurriculumId: string | null;
  moduleProgress: Record<string, Record<number, ModuleStatus>>;
  tracks: Record<string, TrackProgress>;
}

function loadFromStorage(): PersistedState {
  if (typeof window === "undefined") {
    return { curricula: {}, activeCurriculumId: null, moduleProgress: {}, tracks: {} };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { curricula: {}, activeCurriculumId: null, moduleProgress: {}, tracks: {} };
    const parsed = JSON.parse(raw);
    return {
      curricula: parsed.curricula || {},
      activeCurriculumId: parsed.activeCurriculumId ?? null,
      moduleProgress: parsed.moduleProgress || {},
      tracks: parsed.tracks || {},
    };
  } catch {
    return { curricula: {}, activeCurriculumId: null, moduleProgress: {}, tracks: {} };
  }
}

function saveToStorage(state: PersistedState) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore quota errors
  }
}

function initialProgress(curriculum: Curriculum): Record<number, ModuleStatus> {
  const progress: Record<number, ModuleStatus> = {};
  curriculum.modules.forEach((m, i) => {
    progress[m.module_number] = i === 0 ? "available" : "locked";
  });
  return progress;
}

function snapshot(state: CurriculumStore): PersistedState {
  return {
    curricula: state.curricula,
    activeCurriculumId: state.activeCurriculumId,
    moduleProgress: state.moduleProgress,
    tracks: state.tracks,
  };
}

function emptyTrackProgress(trackId: string): TrackProgress {
  return {
    track_id: trackId,
    started_at: new Date().toISOString(),
    current_module: 1,
    completed_modules: [],
    quiz_scores: {},
    practice_completed: [],
    interview_practiced: [],
    portfolio_items: [],
  };
}

export const useCurriculumStore = create<CurriculumStore>((set, get) => {
  const initial = loadFromStorage();

  return {
    curricula: initial.curricula,
    activeCurriculumId: initial.activeCurriculumId,
    moduleProgress: initial.moduleProgress,
    tracks: initial.tracks,

    addCurriculum: (curriculum) => {
      set((state) => {
        const curricula = { ...state.curricula, [curriculum.id]: curriculum };
        const moduleProgress = {
          ...state.moduleProgress,
          [curriculum.id]:
            state.moduleProgress[curriculum.id] || initialProgress(curriculum),
        };
        const next = {
          ...state,
          curricula,
          activeCurriculumId: curriculum.id,
          moduleProgress,
        };
        saveToStorage(snapshot(next));
        return {
          curricula,
          activeCurriculumId: curriculum.id,
          moduleProgress,
        };
      });
    },

    setCurriculum: (id, curriculum) => {
      // Same behaviour as addCurriculum, but honours the id the caller
      // passes in (rather than curriculum.id). Keeps the AI-designed
      // curricula in the same bucket so /curriculum/[id] finds them.
      const withId: Curriculum = { ...curriculum, id };
      set((state) => {
        const curricula = { ...state.curricula, [id]: withId };
        const moduleProgress = {
          ...state.moduleProgress,
          [id]: state.moduleProgress[id] || initialProgress(withId),
        };
        const next = { ...state, curricula, activeCurriculumId: id, moduleProgress };
        saveToStorage(snapshot(next));
        return { curricula, activeCurriculumId: id, moduleProgress };
      });
    },

    getCurriculum: (id) => get().curricula[id] ?? null,

    setActive: (id) => {
      set((state) => {
        const next = { ...state, activeCurriculumId: id };
        saveToStorage(snapshot(next));
        return { activeCurriculumId: id };
      });
    },

    startModule: (curriculumId, moduleNumber) => {
      set((state) => {
        const progress = { ...(state.moduleProgress[curriculumId] || {}) };
        if (progress[moduleNumber] === "locked") return state;
        if (progress[moduleNumber] === "available") {
          progress[moduleNumber] = "in_progress";
        }
        const moduleProgress = { ...state.moduleProgress, [curriculumId]: progress };
        const next = { ...state, moduleProgress };
        saveToStorage(snapshot(next));
        return { moduleProgress };
      });
    },

    completeModule: (curriculumId, moduleNumber) => {
      set((state) => {
        const curriculum = state.curricula[curriculumId];
        if (!curriculum) return state;

        const progress = { ...(state.moduleProgress[curriculumId] || {}) };
        progress[moduleNumber] = "complete";

        // Unlock the next module in sequence
        const modules = curriculum.modules;
        const currentIndex = modules.findIndex((m) => m.module_number === moduleNumber);
        if (currentIndex !== -1 && currentIndex + 1 < modules.length) {
          const nextNum = modules[currentIndex + 1].module_number;
          if (progress[nextNum] === "locked" || !progress[nextNum]) {
            progress[nextNum] = "available";
          }
        }

        const moduleProgress = { ...state.moduleProgress, [curriculumId]: progress };
        const next = { ...state, moduleProgress };
        saveToStorage(snapshot(next));
        return { moduleProgress };
      });
    },

    getModuleStatus: (curriculumId, moduleNumber) => {
      const progress = get().moduleProgress[curriculumId];
      return progress?.[moduleNumber] || "locked";
    },

    getProgress: (curriculumId) => {
      const curriculum = get().curricula[curriculumId];
      const progress = get().moduleProgress[curriculumId] || {};
      if (!curriculum) return { completed: 0, total: 0 };
      const total = curriculum.modules.length;
      const completed = Object.values(progress).filter((s) => s === "complete").length;
      return { completed, total };
    },

    clearAll: () => {
      set(() => {
        const next: PersistedState = {
          curricula: {},
          activeCurriculumId: null,
          moduleProgress: {},
          tracks: {},
        };
        saveToStorage(next);
        return next;
      });
    },

    // ── Career track actions ─────────────────────────────────

    startTrack: (trackId) => {
      set((state) => {
        if (state.tracks[trackId]) return state;
        const tracks = {
          ...state.tracks,
          [trackId]: emptyTrackProgress(trackId),
        };
        const next = { ...state, tracks };
        saveToStorage(snapshot(next));
        return { tracks };
      });
    },

    setTrackCurrentModule: (trackId, moduleNumber) => {
      set((state) => {
        const existing = state.tracks[trackId] || emptyTrackProgress(trackId);
        const updated: TrackProgress = {
          ...existing,
          current_module: moduleNumber,
        };
        const tracks = { ...state.tracks, [trackId]: updated };
        const next = { ...state, tracks };
        saveToStorage(snapshot(next));
        return { tracks };
      });
    },

    completeTrackModule: (trackId, moduleNumber) => {
      set((state) => {
        const existing = state.tracks[trackId] || emptyTrackProgress(trackId);
        const completed = existing.completed_modules.includes(moduleNumber)
          ? existing.completed_modules
          : [...existing.completed_modules, moduleNumber].sort((a, b) => a - b);
        const updated: TrackProgress = {
          ...existing,
          completed_modules: completed,
          current_module: Math.max(existing.current_module, moduleNumber + 1),
        };
        const tracks = { ...state.tracks, [trackId]: updated };
        const next = { ...state, tracks };
        saveToStorage(snapshot(next));
        return { tracks };
      });
    },

    recordQuizScore: (trackId, moduleNumber, score) => {
      set((state) => {
        const existing = state.tracks[trackId] || emptyTrackProgress(trackId);
        const updated: TrackProgress = {
          ...existing,
          quiz_scores: { ...existing.quiz_scores, [moduleNumber]: score },
        };
        const tracks = { ...state.tracks, [trackId]: updated };
        const next = { ...state, tracks };
        saveToStorage(snapshot(next));
        return { tracks };
      });
    },

    recordPracticeCompleted: (trackId, moduleNumber) => {
      set((state) => {
        const existing = state.tracks[trackId] || emptyTrackProgress(trackId);
        if (existing.practice_completed.includes(moduleNumber)) return state;
        const updated: TrackProgress = {
          ...existing,
          practice_completed: [...existing.practice_completed, moduleNumber].sort((a, b) => a - b),
        };
        const tracks = { ...state.tracks, [trackId]: updated };
        const next = { ...state, tracks };
        saveToStorage(snapshot(next));
        return { tracks };
      });
    },

    recordInterviewPracticed: (trackId, moduleNumber) => {
      set((state) => {
        const existing = state.tracks[trackId] || emptyTrackProgress(trackId);
        if (existing.interview_practiced.includes(moduleNumber)) return state;
        const updated: TrackProgress = {
          ...existing,
          interview_practiced: [...existing.interview_practiced, moduleNumber].sort((a, b) => a - b),
        };
        const tracks = { ...state.tracks, [trackId]: updated };
        const next = { ...state, tracks };
        saveToStorage(snapshot(next));
        return { tracks };
      });
    },

    addPortfolioItem: (item) => {
      set((state) => {
        const existing = state.tracks[item.track_id] || emptyTrackProgress(item.track_id);
        // Dedupe by (track_id, module_number)
        const filtered = existing.portfolio_items.filter(
          (p) => p.module_number !== item.module_number
        );
        const updated: TrackProgress = {
          ...existing,
          portfolio_items: [...filtered, item],
        };
        const tracks = { ...state.tracks, [item.track_id]: updated };
        const next = { ...state, tracks };
        saveToStorage(snapshot(next));
        return { tracks };
      });
    },

    getTrackProgress: (trackId) => {
      return get().tracks[trackId] || null;
    },

    getAllPortfolioItems: () => {
      const tracks = get().tracks;
      const all: PortfolioItem[] = [];
      Object.values(tracks).forEach((t) => {
        all.push(...t.portfolio_items);
      });
      // Sort newest first
      return all.sort(
        (a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime()
      );
    },

    // Progress hydration handled directly by
    // Convex useQuery(api.progress.getMyProgress)
    hydrateFromServer: async (_token: string) => {},
  };
});
