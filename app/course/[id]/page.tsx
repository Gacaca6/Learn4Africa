"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  BookOpen, Layers, CircleHelp, Mic, BookImage,
  Gamepad2, Music, GraduationCap, ArrowLeft, Check, Play, Pause, Trophy,
} from "@/lib/icons";
import { useCourseStore, type StoredCourse } from "@/lib/courseStore";

const API = "http://localhost:8001/api/v1";

type FormatTab = "reading" | "flashcards" | "quiz" | "podcast" | "comic" | "song";

const FORMAT_TABS: { id: FormatTab; label: string; Icon: typeof BookOpen }[] = [
  { id: "reading", label: "Read", Icon: BookOpen },
  { id: "flashcards", label: "Flashcards", Icon: Layers },
  { id: "quiz", label: "Quiz", Icon: CircleHelp },
  { id: "podcast", label: "Podcast", Icon: Mic },
  { id: "comic", label: "Comic", Icon: BookImage },
  { id: "song", label: "Song", Icon: Music },
];

// Warm loading skeleton
function Skeleton({ lines = 5 }: { lines?: number }) {
  return (
    <div className="animate-pulse space-y-3">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-4 rounded-lg" style={{
          width: `${70 + Math.random() * 30}%`,
          backgroundColor: "rgb(var(--warm-200, 229 218 206) / 0.6)",
        }}>
          <div className="h-full bg-warm-200/60 rounded-lg" />
        </div>
      ))}
    </div>
  );
}

function LoadingState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="w-10 h-10 border-3 border-warm-200 border-t-zigama-500 rounded-full animate-spin mb-4" />
      <p className="text-sm text-warm-500">{message}</p>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="w-14 h-14 bg-warm-100 rounded-2xl flex items-center justify-center mb-4">
        <GraduationCap className="w-7 h-7 text-warm-400" />
      </div>
      <p className="text-sm text-warm-600 mb-4 text-center max-w-sm">{message}</p>
      <button onClick={onRetry} className="px-5 py-2 bg-warm-900 text-warm-50 rounded-lg text-sm font-medium hover:bg-warm-800 transition-colors">
        Try Again
      </button>
    </div>
  );
}

// Build a summary of the course for sending to backend as "lesson_content"
function buildContentSummary(course: StoredCourse): string {
  const outline = course.outline;
  let summary = `Course: ${outline.title}\n${outline.description}\n\n`;
  for (const ch of outline.chapters) {
    summary += `Chapter: ${ch.title} — ${ch.description}\n`;
    for (const l of ch.lessons) {
      summary += `  - ${l.title}: ${l.key_concepts?.join(", ") || ""}\n`;
    }
  }
  return summary;
}

function getLessonContent(course: StoredCourse, lessonIndex: number): { title: string; chapterTitle: string; keyConcepts: string[] } {
  const allLessons = course.outline.chapters.flatMap((ch) =>
    ch.lessons.map((l) => ({ ...l, chapterTitle: ch.title }))
  );
  const lesson = allLessons[lessonIndex];
  return {
    title: lesson?.title || "",
    chapterTitle: lesson?.chapterTitle || "",
    keyConcepts: lesson?.key_concepts || [],
  };
}

export default function CoursePage() {
  const stored = useCourseStore((s) => s.current);
  const [course, setCourse] = useState<StoredCourse | null>(null);
  const [activeFormat, setActiveFormat] = useState<FormatTab>("reading");
  const [currentLesson, setCurrentLesson] = useState(0);

  // Cache for each tab's data
  const [readingContent, setReadingContent] = useState<string | null>(null);
  const [flashcards, setFlashcards] = useState<any[] | null>(null);
  const [quizData, setQuizData] = useState<any[] | null>(null);
  const [podcastData, setPodcastData] = useState<{ script: any[]; audio_url: string } | null>(null);
  const [comicData, setComicData] = useState<any[] | null>(null);
  const [songData, setSongData] = useState<any | null>(null);

  // Loading / error states per tab
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Flashcard flip state
  const [flippedCards, setFlippedCards] = useState<Set<number>>(new Set());
  // Quiz answer state
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  // Audio ref
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Load course from store or localStorage on mount
  useEffect(() => {
    if (stored) {
      setCourse(stored);
    } else {
      // Try localStorage directly as fallback
      try {
        const raw = localStorage.getItem("learn4africa_current_course");
        if (raw) setCourse(JSON.parse(raw));
      } catch {}
    }
  }, [stored]);

  // Reset tab caches when lesson changes
  useEffect(() => {
    setReadingContent(null);
    setFlashcards(null);
    setQuizData(null);
    setPodcastData(null);
    setComicData(null);
    setSongData(null);
    setFlippedCards(new Set());
    setQuizAnswers({});
    setQuizSubmitted(false);
    setErrors({});
    setIsPlaying(false);
  }, [currentLesson]);

  // Auto-fetch when tab changes
  useEffect(() => {
    if (!course) return;
    if (activeFormat === "reading" && !readingContent && !loading.reading) fetchReading();
    if (activeFormat === "flashcards" && !flashcards && !loading.flashcards) fetchFlashcards();
    if (activeFormat === "quiz" && !quizData && !loading.quiz) fetchQuiz();
    if (activeFormat === "podcast" && !podcastData && !loading.podcast) fetchPodcast();
    if (activeFormat === "comic" && !comicData && !loading.comic) fetchComic();
    if (activeFormat === "song" && !songData && !loading.song) fetchSong();
  }, [activeFormat, course, currentLesson]);

  if (!course) {
    return (
      <div className="noise min-h-screen bg-warm-50 flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <div className="w-16 h-16 bg-warm-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-7 h-7 text-warm-400" />
          </div>
          <h2 className="font-display text-xl font-bold text-warm-900 mb-2">No course loaded</h2>
          <p className="text-sm text-warm-500 mb-6">Create a course first, then come back here to start learning.</p>
          <Link href="/create" className="inline-block bg-warm-900 text-warm-50 px-6 py-3 rounded-xl text-sm font-semibold hover:bg-warm-800 transition-colors">
            Create a Course
          </Link>
        </div>
      </div>
    );
  }

  const { outline } = course;
  const allLessons = outline.chapters.flatMap((ch) => ch.lessons);
  const lesson = allLessons[currentLesson];
  const lessonInfo = getLessonContent(course, currentLesson);
  const contentSummary = buildContentSummary(course);

  async function fetchReading() {
    if (!course) return;
    setLoading((p) => ({ ...p, reading: true }));
    setErrors((p) => ({ ...p, reading: "" }));
    try {
      const res = await fetch(`${API}/courses/generate-lesson`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lesson_title: lessonInfo.title,
          chapter_title: lessonInfo.chapterTitle,
          course_title: outline.title,
          key_concepts: lessonInfo.keyConcepts,
          difficulty: course.difficulty,
          language: course.language,
          age_group: course.ageGroup,
        }),
      });
      const data = await res.json();
      if (data.content) setReadingContent(data.content);
      else throw new Error(data.detail || "Failed to load reading content");
    } catch (e: any) {
      setErrors((p) => ({ ...p, reading: e.message || "Mwalimu is thinking... try again" }));
    } finally {
      setLoading((p) => ({ ...p, reading: false }));
    }
  }

  async function fetchFlashcards() {
    if (!course) return;
    setLoading((p) => ({ ...p, flashcards: true }));
    setErrors((p) => ({ ...p, flashcards: "" }));
    try {
      const res = await fetch(`${API}/flashcards/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lesson_content: `${lessonInfo.title}. Key concepts: ${lessonInfo.keyConcepts.join(", ")}. From the course "${outline.title}": ${outline.description}`,
          num_cards: 8,
          difficulty: course.difficulty,
          language: course.language,
        }),
      });
      const data = await res.json();
      if (data.cards) setFlashcards(data.cards);
      else throw new Error(data.detail || "Failed to generate flashcards");
    } catch (e: any) {
      setErrors((p) => ({ ...p, flashcards: e.message || "Mwalimu is thinking... try again" }));
    } finally {
      setLoading((p) => ({ ...p, flashcards: false }));
    }
  }

  async function fetchQuiz() {
    if (!course) return;
    setLoading((p) => ({ ...p, quiz: true }));
    setErrors((p) => ({ ...p, quiz: "" }));
    try {
      const res = await fetch(`${API}/quizzes/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lesson_content: `${lessonInfo.title}. Key concepts: ${lessonInfo.keyConcepts.join(", ")}. From the course "${outline.title}": ${outline.description}`,
          num_questions: 5,
          difficulty: course.difficulty,
          language: course.language,
          age_group: course.ageGroup,
        }),
      });
      const data = await res.json();
      if (data.questions) setQuizData(data.questions);
      else throw new Error(data.detail || "Failed to generate quiz");
    } catch (e: any) {
      setErrors((p) => ({ ...p, quiz: e.message || "Mwalimu is thinking... try again" }));
    } finally {
      setLoading((p) => ({ ...p, quiz: false }));
    }
  }

  async function fetchPodcast() {
    if (!course) return;
    setLoading((p) => ({ ...p, podcast: true }));
    setErrors((p) => ({ ...p, podcast: "" }));
    try {
      const res = await fetch(`${API}/podcasts/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lesson_content: `${lessonInfo.title}. Key concepts: ${lessonInfo.keyConcepts.join(", ")}. ${outline.description}`,
          lesson_title: lessonInfo.title,
          language: course.language,
          age_group: course.ageGroup,
        }),
      });
      const data = await res.json();
      if (data.script) setPodcastData({ script: data.script, audio_url: data.audio_url || "" });
      else throw new Error(data.detail || "Failed to generate podcast");
    } catch (e: any) {
      setErrors((p) => ({ ...p, podcast: e.message || "Mwalimu is thinking... try again" }));
    } finally {
      setLoading((p) => ({ ...p, podcast: false }));
    }
  }

  async function fetchComic() {
    if (!course) return;
    setLoading((p) => ({ ...p, comic: true }));
    setErrors((p) => ({ ...p, comic: "" }));
    try {
      const res = await fetch(`${API}/comics/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lesson_content: `${lessonInfo.title}. Key concepts: ${lessonInfo.keyConcepts.join(", ")}. ${outline.description}`,
          lesson_title: lessonInfo.title,
          language: course.language,
          age_group: course.ageGroup,
          num_panels: 4,
        }),
      });
      const data = await res.json();
      if (data.panels) setComicData(data.panels);
      else throw new Error(data.detail || "Failed to generate comic");
    } catch (e: any) {
      setErrors((p) => ({ ...p, comic: e.message || "Mwalimu is thinking... try again" }));
    } finally {
      setLoading((p) => ({ ...p, comic: false }));
    }
  }

  async function fetchSong() {
    if (!course) return;
    setLoading((p) => ({ ...p, song: true }));
    setErrors((p) => ({ ...p, song: "" }));
    try {
      const res = await fetch(`${API}/songs/lyrics-only`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lesson_content: `${lessonInfo.title}. Key concepts: ${lessonInfo.keyConcepts.join(", ")}. ${outline.description}`,
          lesson_title: lessonInfo.title,
          language: course.language,
          age_group: course.ageGroup,
          style: "afrobeats",
        }),
      });
      const data = await res.json();
      if (data.song) setSongData(data.song);
      else throw new Error(data.detail || "Failed to generate song");
    } catch (e: any) {
      setErrors((p) => ({ ...p, song: e.message || "Mwalimu is thinking... try again" }));
    } finally {
      setLoading((p) => ({ ...p, song: false }));
    }
  }

  const toggleCard = (i: number) => {
    setFlippedCards((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  };

  const quizScore = quizSubmitted && quizData
    ? quizData.filter((q: any, i: number) => {
        const correctIdx = q.options?.indexOf(q.correct_answer ?? q.answer);
        return quizAnswers[i] === correctIdx;
      }).length
    : 0;

  return (
    <div className="noise min-h-screen bg-warm-50">
      {/* Course Hero Banner */}
      <div className="relative h-40 sm:h-48 overflow-hidden bg-warm-900">
        <div className="absolute inset-0 bg-gradient-to-br from-warm-800 to-warm-950" />
        <div className="absolute inset-0 z-10">
          <div className="max-w-7xl mx-auto px-5 sm:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Link href="/learn" className="text-white/70 hover:text-white transition-colors">
                  <ArrowLeft className="w-4 h-4" />
                </Link>
                <div className="h-4 w-px bg-white/20" />
                <div>
                  <h1 className="font-semibold text-white text-sm">{outline.title}</h1>
                  <p className="text-xs text-white/60 tabular-nums">
                    Lesson {currentLesson + 1} of {allLessons.length}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="hidden sm:block w-32 h-1.5 bg-white/20 rounded-full overflow-hidden">
                  <div className="h-full bg-white rounded-full transition-all duration-500" style={{ width: `${((currentLesson + 1) / allLessons.length) * 100}%` }} />
                </div>
                <Link href="/tutor" className="flex items-center gap-1.5 bg-white/15 backdrop-blur-sm text-white/90 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-white/25 transition-colors border border-white/10">
                  <GraduationCap className="w-3.5 h-3.5" />
                  Ask Mwalimu
                </Link>
              </div>
            </div>
          </div>
        </div>
        {/* Title at bottom of banner */}
        <div className="absolute bottom-0 inset-x-0 z-10 px-5 sm:px-8 pb-4">
          <div className="max-w-7xl mx-auto">
            <p className="text-white/90 font-display text-lg font-bold">{lesson?.title}</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto flex">
        {/* Sidebar */}
        <aside className="hidden lg:block w-60 bg-white border-r border-warm-200/60 min-h-[calc(100dvh-192px)] p-5 shrink-0">
          <h2 className="font-medium text-xs text-warm-400 uppercase tracking-wide mb-4">Course outline</h2>
          {outline.chapters.map((chapter, ci) => (
            <div key={ci} className="mb-5">
              <h3 className="font-medium text-warm-900 text-sm mb-2">{chapter.title}</h3>
              <ul className="space-y-0.5">
                {chapter.lessons.map((l, li) => {
                  const globalIndex = outline.chapters.slice(0, ci).reduce((acc, ch) => acc + ch.lessons.length, 0) + li;
                  return (
                    <li key={li}>
                      <button
                        onClick={() => setCurrentLesson(globalIndex)}
                        className={`w-full text-left text-sm px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5 ${
                          currentLesson === globalIndex
                            ? "bg-zigama-50 text-zigama-700 font-medium"
                            : "text-warm-500 hover:bg-warm-50 hover:text-warm-700"
                        }`}
                      >
                        {globalIndex < currentLesson && <Check className="w-3.5 h-3.5 text-sage-500 shrink-0" />}
                        <span className="truncate">{l.title}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-5 sm:p-8 min-w-0">
          {/* Format Tabs */}
          <div className="flex gap-1 bg-white rounded-xl p-1 border border-warm-200/60 mb-6 overflow-x-auto">
            {FORMAT_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveFormat(tab.id)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  activeFormat === tab.id
                    ? "bg-warm-900 text-warm-50"
                    : "text-warm-500 hover:bg-warm-50 hover:text-warm-700"
                }`}
              >
                <tab.Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Content Area */}
          <div className="bg-white rounded-xl border border-warm-200/60 p-6 min-h-[400px]">

            {/* ═══ READING TAB ═══ */}
            {activeFormat === "reading" && (
              loading.reading ? <LoadingState message="Generating lesson content..." /> :
              errors.reading ? <ErrorState message={errors.reading} onRetry={fetchReading} /> :
              readingContent ? (
                <div className="prose max-w-none">
                  <div className="text-warm-700 text-sm leading-relaxed whitespace-pre-wrap">{readingContent}</div>
                </div>
              ) : <LoadingState message="Loading..." />
            )}

            {/* ═══ FLASHCARDS TAB ═══ */}
            {activeFormat === "flashcards" && (
              loading.flashcards ? <LoadingState message="Creating flashcards..." /> :
              errors.flashcards ? <ErrorState message={errors.flashcards} onRetry={fetchFlashcards} /> :
              flashcards ? (
                <div>
                  <p className="text-xs text-warm-400 mb-4">Tap a card to flip it</p>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {flashcards.map((card: any, i: number) => (
                      <div key={i} onClick={() => toggleCard(i)} className="card-flip cursor-pointer h-44">
                        <div className={`card-flip-inner relative w-full h-full ${flippedCards.has(i) ? "flipped" : ""}`}>
                          <div className="card-front absolute inset-0 bg-warm-900 rounded-xl p-5 flex items-center justify-center text-warm-100 text-center text-sm font-medium">
                            {card.front || card.question}
                          </div>
                          <div className="card-back absolute inset-0 bg-sage-700 rounded-xl p-5 flex items-center justify-center text-white text-center text-sm">
                            {card.back || card.answer}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : <LoadingState message="Loading..." />
            )}

            {/* ═══ QUIZ TAB ═══ */}
            {activeFormat === "quiz" && (
              loading.quiz ? <LoadingState message="Preparing your quiz..." /> :
              errors.quiz ? <ErrorState message={errors.quiz} onRetry={fetchQuiz} /> :
              quizData ? (
                <div>
                  {quizSubmitted && (
                    <div className={`mb-6 p-4 rounded-xl text-center ${quizScore / quizData.length >= 0.8 ? "bg-sage-50 border border-sage-200" : "bg-zigama-50 border border-zigama-200"}`}>
                      <p className="font-display text-2xl font-bold mb-1">{quizScore}/{quizData.length}</p>
                      <p className="text-sm">{quizScore / quizData.length >= 0.8 ? "Excellent work! You really understand this!" : "Good effort! Review and try again."}</p>
                    </div>
                  )}
                  <div className="space-y-5">
                    {quizData.map((q: any, qi: number) => {
                      const correctIdx = q.options?.indexOf(q.correct_answer ?? q.answer);
                      return (
                        <div key={qi} className="border border-warm-200/60 rounded-xl p-5">
                          <p className="font-medium text-warm-900 text-sm mb-3">
                            <span className="tabular-nums">{qi + 1}.</span> {q.question}
                          </p>
                          <div className="space-y-2">
                            {q.options?.map((opt: string, oi: number) => {
                              const isSelected = quizAnswers[qi] === oi;
                              const showResult = quizSubmitted;
                              const isCorrect = oi === correctIdx;
                              return (
                                <button
                                  key={oi}
                                  onClick={() => !quizSubmitted && setQuizAnswers((p) => ({ ...p, [qi]: oi }))}
                                  className={`w-full text-left px-4 py-3 rounded-lg border-2 text-sm transition-colors flex items-center justify-between ${
                                    showResult && isCorrect ? "border-sage-500 bg-sage-50 text-sage-700" :
                                    showResult && isSelected && !isCorrect ? "border-red-300 bg-red-50 text-red-700" :
                                    isSelected ? "border-zigama-500 bg-zigama-50 text-zigama-700" :
                                    "border-warm-200 hover:border-warm-300 text-warm-700"
                                  }`}
                                >
                                  {opt}
                                  {showResult && isCorrect && <Check className="w-4 h-4 text-sage-500" />}
                                </button>
                              );
                            })}
                          </div>
                          {quizSubmitted && q.explanation && (
                            <p className="text-xs text-warm-500 mt-3 bg-warm-50 p-3 rounded-lg">{q.explanation}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {!quizSubmitted && (
                    <button
                      onClick={() => setQuizSubmitted(true)}
                      disabled={Object.keys(quizAnswers).length < quizData.length}
                      className="mt-6 w-full py-3 bg-warm-900 text-warm-50 rounded-xl text-sm font-semibold hover:bg-warm-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Submit Answers ({Object.keys(quizAnswers).length}/{quizData.length})
                    </button>
                  )}
                </div>
              ) : <LoadingState message="Loading..." />
            )}

            {/* ═══ PODCAST TAB ═══ */}
            {activeFormat === "podcast" && (
              loading.podcast ? <LoadingState message="Generating podcast episode... this takes a moment" /> :
              errors.podcast ? <ErrorState message={errors.podcast} onRetry={fetchPodcast} /> :
              podcastData ? (
                <div>
                  {podcastData.audio_url && (
                    <div className="mb-6 bg-warm-900 rounded-xl p-5">
                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => {
                            if (audioRef.current) {
                              if (isPlaying) audioRef.current.pause();
                              else audioRef.current.play();
                              setIsPlaying(!isPlaying);
                            }
                          }}
                          className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors shrink-0"
                        >
                          {isPlaying ? <Pause className="w-5 h-5 text-white" /> : <Play className="w-5 h-5 text-white ml-0.5" />}
                        </button>
                        <div className="flex-1">
                          <p className="text-white font-medium text-sm">{lessonInfo.title}</p>
                          <p className="text-white/60 text-xs">Audio lesson</p>
                        </div>
                      </div>
                      <audio ref={audioRef} src={`http://localhost:8001${podcastData.audio_url}`} onEnded={() => setIsPlaying(false)} />
                    </div>
                  )}
                  <h3 className="font-semibold text-warm-900 text-sm mb-4">Episode Script</h3>
                  <div className="space-y-3">
                    {podcastData.script.map((line: any, i: number) => (
                      <div key={i} className={`flex gap-3 ${line.speaker === "host" ? "" : "pl-4"}`}>
                        <span className={`text-xs font-semibold uppercase shrink-0 w-16 pt-0.5 ${line.speaker === "host" ? "text-zigama-600" : "text-sage-600"}`}>
                          {line.speaker}
                        </span>
                        <p className="text-sm text-warm-700 leading-relaxed">{line.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : <LoadingState message="Loading..." />
            )}

            {/* ═══ COMIC TAB ═══ */}
            {activeFormat === "comic" && (
              loading.comic ? <LoadingState message="Drawing comic panels... Nia, Babu and Zuri are getting ready" /> :
              errors.comic ? <ErrorState message={errors.comic} onRetry={fetchComic} /> :
              comicData ? (
                <div>
                  <p className="text-xs text-warm-400 mb-4">Illustrated by AI — starring Nia, Babu, and Zuri</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {comicData.map((panel: any, i: number) => (
                      <div key={i} className="border border-warm-200/60 rounded-xl overflow-hidden">
                        {panel.image_url && (
                          <div className="aspect-square bg-warm-100 relative">
                            <img
                              src={`http://localhost:8001${panel.image_url}`}
                              alt={panel.caption || `Panel ${panel.panel}`}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          </div>
                        )}
                        <div className="p-4">
                          <p className="text-xs font-semibold text-zigama-600 mb-2">Panel {panel.panel}</p>
                          {panel.dialogue?.map((d: any, di: number) => (
                            <p key={di} className="text-sm text-warm-700 mb-1">
                              <span className="font-semibold text-warm-900">{d.character}:</span> {d.text}
                            </p>
                          ))}
                          {panel.caption && <p className="text-xs text-warm-400 mt-2 italic">{panel.caption}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : <LoadingState message="Loading..." />
            )}

            {/* ═══ SONG TAB ═══ */}
            {activeFormat === "song" && (
              loading.song ? <LoadingState message="Composing an educational song..." /> :
              errors.song ? <ErrorState message={errors.song} onRetry={fetchSong} /> :
              songData ? (
                <div>
                  <div className="text-center mb-6">
                    <div className="w-14 h-14 bg-zigama-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                      <Music className="w-7 h-7 text-zigama-500" />
                    </div>
                    <h3 className="font-display text-lg font-bold text-warm-900">{songData.title || lessonInfo.title}</h3>
                    {songData.style && <p className="text-xs text-warm-400 mt-1">Style: {songData.style}</p>}
                  </div>
                  <div className="max-w-lg mx-auto bg-warm-50 rounded-xl p-6 border border-warm-200/60">
                    <pre className="text-sm text-warm-700 leading-relaxed whitespace-pre-wrap font-sans">
                      {songData.full_lyrics || songData.lyrics || JSON.stringify(songData, null, 2)}
                    </pre>
                  </div>
                  {songData.chorus && (
                    <div className="max-w-lg mx-auto mt-4 bg-zigama-50 rounded-xl p-4 border border-zigama-200/60">
                      <p className="text-xs font-semibold text-zigama-600 mb-2">Chorus</p>
                      <p className="text-sm text-zigama-700 whitespace-pre-wrap">{songData.chorus}</p>
                    </div>
                  )}
                </div>
              ) : <LoadingState message="Loading..." />
            )}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-6">
            <button
              onClick={() => setCurrentLesson(Math.max(0, currentLesson - 1))}
              disabled={currentLesson === 0}
              className="flex items-center gap-1.5 px-4 py-2 text-sm text-warm-500 hover:text-warm-700 disabled:opacity-30 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Previous
            </button>

            <div className="flex items-center gap-1.5">
              {allLessons.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentLesson(i)}
                  className={`w-2 h-2 rounded-full transition-all duration-200 ${
                    i === currentLesson ? "bg-zigama-500 w-5" : i < currentLesson ? "bg-sage-400" : "bg-warm-300"
                  }`}
                />
              ))}
            </div>

            {currentLesson === allLessons.length - 1 ? (
              <Link
                href={`/course/${course.id}/completed`}
                className="px-5 py-2 bg-sage-600 text-white rounded-lg text-sm font-semibold hover:bg-sage-700 transition-colors flex items-center gap-1.5"
              >
                See Your Career Path <Trophy className="w-4 h-4" />
              </Link>
            ) : (
              <button
                onClick={() => setCurrentLesson(Math.min(allLessons.length - 1, currentLesson + 1))}
                className="px-4 py-2 bg-warm-900 text-warm-50 rounded-lg text-sm font-medium hover:bg-warm-800 transition-colors disabled:opacity-30"
              >
                Next
              </button>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
