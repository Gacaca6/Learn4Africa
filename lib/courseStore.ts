import { create } from "zustand";

export interface CourseOutline {
  title: string;
  description: string;
  learning_outcomes?: string[];
  chapters: {
    title: string;
    description: string;
    order: number;
    lessons: {
      title: string;
      description: string;
      key_concepts: string[];
      order: number;
    }[];
  }[];
}

export interface StoredCourse {
  id: string;
  topic: string;
  difficulty: string;
  language: string;
  ageGroup: string;
  outline: CourseOutline;
  generatedAt: string;
}

interface CourseStore {
  current: StoredCourse | null;
  setCourse: (course: StoredCourse) => void;
  clearCourse: () => void;
}

const STORAGE_KEY = "learn4africa_current_course";

function loadFromStorage(): StoredCourse | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveToStorage(course: StoredCourse | null) {
  if (typeof window === "undefined") return;
  if (course) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(course));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

export const useCourseStore = create<CourseStore>((set) => ({
  current: loadFromStorage(),
  setCourse: (course) => {
    saveToStorage(course);
    set({ current: course });
  },
  clearCourse: () => {
    saveToStorage(null);
    set({ current: null });
  },
}));

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
