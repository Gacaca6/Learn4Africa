/**
 * Learn4Africa — API Client
 * Communicates with the Python FastAPI backend.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}/api/v1${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(error.detail || `API error: ${res.status}`);
  }

  return res.json();
}

// ── Courses ──

export const courses = {
  generate: (data: {
    topic: string;
    difficulty?: string;
    language?: string;
    age_group?: string;
    num_chapters?: number;
  }) => request<any>("/courses/generate", { method: "POST", body: JSON.stringify(data) }),

  generateLesson: (data: {
    lesson_title: string;
    chapter_title: string;
    course_title: string;
    key_concepts: string[];
    difficulty?: string;
    language?: string;
    age_group?: string;
  }) => request<any>("/courses/generate-lesson", { method: "POST", body: JSON.stringify(data) }),

  categories: () => request<any>("/courses/categories"),
};

// ── AI Tutor ──

export const tutor = {
  chat: (data: {
    message: string;
    conversation_history?: Array<{ role: string; content: string }>;
    learner_name?: string;
    language?: string;
    current_topic?: string;
  }) => request<any>("/tutor/chat", { method: "POST", body: JSON.stringify(data) }),
};

// ── Flashcards ──

export const flashcards = {
  generate: (data: {
    lesson_content: string;
    num_cards?: number;
    difficulty?: string;
    language?: string;
  }) => request<any>("/flashcards/generate", { method: "POST", body: JSON.stringify(data) }),

  review: (data: { card_id: string; quality: number; history?: object }) =>
    request<any>("/flashcards/review", { method: "POST", body: JSON.stringify(data) }),
};

// ── Quizzes ──

export const quizzes = {
  generate: (data: {
    lesson_content: string;
    num_questions?: number;
    difficulty?: string;
    language?: string;
  }) => request<any>("/quizzes/generate", { method: "POST", body: JSON.stringify(data) }),

  grade: (data: {
    question: string;
    expected_answer: string;
    student_answer: string;
    language?: string;
  }) => request<any>("/quizzes/grade", { method: "POST", body: JSON.stringify(data) }),
};

// ── Podcasts ──

export const podcasts = {
  generate: (data: {
    lesson_content: string;
    lesson_title: string;
    language?: string;
  }) => request<any>("/podcasts/generate", { method: "POST", body: JSON.stringify(data) }),

  scriptOnly: (data: {
    lesson_content: string;
    lesson_title: string;
    language?: string;
  }) => request<any>("/podcasts/script-only", { method: "POST", body: JSON.stringify(data) }),
};

// ── Comics ──

export const comics = {
  generate: (data: {
    lesson_content: string;
    lesson_title: string;
    language?: string;
  }) => request<any>("/comics/generate", { method: "POST", body: JSON.stringify(data) }),

  scriptOnly: (data: {
    lesson_content: string;
    lesson_title: string;
    language?: string;
    num_panels?: number;
  }) => request<any>("/comics/script-only", { method: "POST", body: JSON.stringify(data) }),
};

// ── Gamification ──

export const gamification = {
  awardXP: (data: {
    user_id: string;
    action: string;
    current_xp?: number;
    current_badges?: string[];
    stats?: object;
  }) => request<any>("/gamification/award-xp", { method: "POST", body: JSON.stringify(data) }),

  badges: () => request<any>("/gamification/badges"),
  leaderboard: () => request<any>("/gamification/leaderboard"),
};

// ── Songs ──

export const songs = {
  generate: (data: {
    lesson_content: string;
    lesson_title: string;
    language?: string;
    style?: string;
  }) => request<any>("/songs/generate", { method: "POST", body: JSON.stringify(data) }),

  lyricsOnly: (data: {
    lesson_content: string;
    lesson_title: string;
    language?: string;
    style?: string;
  }) => request<any>("/songs/lyrics-only", { method: "POST", body: JSON.stringify(data) }),

  styles: () => request<any>("/songs/styles"),
};
