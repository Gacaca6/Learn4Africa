"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sprout, Leaf, TreeDeciduous, Check } from "@/lib/icons";
import { TopNav } from "@/components/TopNav";
import { IMAGES } from "@/lib/images";
import { useCourseStore, slugify } from "@/lib/courseStore";

const DIFFICULTIES = [
  { id: "beginner", Icon: Sprout, label: "Beginner", desc: "No prior knowledge needed" },
  { id: "intermediate", Icon: Leaf, label: "Intermediate", desc: "Some background helpful" },
  { id: "advanced", Icon: TreeDeciduous, label: "Advanced", desc: "Deep dive for experienced learners" },
];

const AGE_GROUPS = [
  { id: "child", label: "Child (8-12)" },
  { id: "teen", label: "Teen (13-17)" },
  { id: "adult", label: "Adult (18+)" },
];

const LANGUAGES = [
  { id: "en", label: "English" },
  { id: "sw", label: "Kiswahili" },
  { id: "fr", label: "Fran\u00e7ais" },
  { id: "ha", label: "Hausa" },
  { id: "yo", label: "Yor\u00f9b\u00e1" },
  { id: "am", label: "\u12A0\u121B\u122D\u129B (Amharic)" },
  { id: "ar", label: "\u0627\u0644\u0639\u0631\u0628\u064A\u0629 (Arabic)" },
  { id: "zu", label: "isiZulu" },
  { id: "ig", label: "Igbo" },
  { id: "rw", label: "Kinyarwanda" },
];

export default function CreateCoursePage() {
  const router = useRouter();
  const setCourseInStore = useCourseStore((s) => s.setCourse);
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState("beginner");
  const [ageGroup, setAgeGroup] = useState("teen");
  const [language, setLanguage] = useState("en");
  const [numChapters, setNumChapters] = useState(5);
  const [isGenerating, setIsGenerating] = useState(false);
  const [course, setCourse] = useState<any>(null);
  const [error, setError] = useState<string>("");

  // Read topic from URL on mount
  if (typeof window !== "undefined" && !topic) {
    const params = new URLSearchParams(window.location.search);
    const urlTopic = params.get("topic");
    if (urlTopic) setTopic(urlTopic);
  }

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    setIsGenerating(true);
    setCourse(null);
    setError("");

    try {
      const res = await fetch("http://localhost:8001/api/v1/courses/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          difficulty,
          language,
          age_group: ageGroup,
          num_chapters: numChapters,
        }),
      });
      const data = await res.json();
      if (data.course) {
        setCourse(data.course);
        const courseId = slugify(data.course.title || topic);
        setCourseInStore({
          id: courseId,
          topic,
          difficulty,
          language,
          ageGroup,
          outline: data.course,
          generatedAt: new Date().toISOString(),
        });
      } else {
        setError(data.detail || "Something went wrong. Please try again.");
      }
    } catch (err: any) {
      setError("Cannot connect to backend. Make sure the backend is running on port 8001.");
      console.error("Failed to generate course:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="noise min-h-screen bg-warm-50">
      <TopNav currentPath="/create" />

      {/* Two-column layout: form left, inspiration image right */}
      <main id="main" className="max-w-6xl mx-auto px-5 sm:px-8 py-10 pt-28">
        <div className="grid lg:grid-cols-[1fr_0.8fr] gap-12 items-start">
          {/* Left column — form */}
          <div>
            <h1 className="font-display text-3xl font-bold text-warm-900 mb-2 slide-up">
              Create your course
            </h1>
            <p className="text-warm-500 mb-8 slide-up" style={{ animationDelay: "50ms" }}>
              Tell us what you want to learn. Our AI will build a complete course with all 8
              learning formats — in seconds.
            </p>

            <div className="space-y-6 slide-up" style={{ animationDelay: "100ms" }}>
              {/* Topic Input */}
              <div>
                <label className="block text-sm font-medium text-warm-700 mb-2">
                  What do you want to learn?
                </label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder='e.g., "How electricity works", "Introduction to farming"'
                  className="w-full px-4 py-3 rounded-xl border border-warm-200 bg-white outline-none focus:border-zigama-500 focus:ring-2 focus:ring-zigama-100 text-base text-warm-900 placeholder:text-warm-400"
                />
              </div>

              {/* Difficulty */}
              <div>
                <label className="block text-sm font-medium text-warm-700 mb-2">
                  Difficulty level
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {DIFFICULTIES.map((d) => (
                    <button
                      key={d.id}
                      onClick={() => setDifficulty(d.id)}
                      className={`p-3 rounded-xl border-2 text-center transition-colors ${
                        difficulty === d.id
                          ? "border-zigama-500 bg-zigama-50"
                          : "border-warm-200 hover:border-warm-300 bg-white"
                      }`}
                    >
                      <d.Icon className="w-5 h-5 text-warm-500 mx-auto mb-1" />
                      <div className="font-medium text-sm text-warm-900">{d.label}</div>
                      <div className="text-xs text-warm-400 mt-0.5">{d.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Age Group */}
              <div>
                <label className="block text-sm font-medium text-warm-700 mb-2">
                  Who is this for?
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {AGE_GROUPS.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => setAgeGroup(a.id)}
                      className={`p-3 rounded-xl border-2 text-center transition-colors ${
                        ageGroup === a.id
                          ? "border-zigama-500 bg-zigama-50"
                          : "border-warm-200 hover:border-warm-300 bg-white"
                      }`}
                    >
                      <div className="font-medium text-sm text-warm-900">{a.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Language */}
              <div>
                <label className="block text-sm font-medium text-warm-700 mb-2">
                  Language
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-warm-200 bg-white outline-none focus:border-zigama-500 text-sm text-warm-900"
                >
                  {LANGUAGES.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Chapters */}
              <div>
                <label className="block text-sm font-medium text-warm-700 mb-2">
                  Number of chapters: <span className="tabular-nums">{numChapters}</span>
                </label>
                <input
                  type="range"
                  min="3"
                  max="10"
                  value={numChapters}
                  onChange={(e) => setNumChapters(parseInt(e.target.value))}
                  className="w-full accent-zigama-500"
                />
                <div className="flex justify-between text-xs text-warm-400 mt-1">
                  <span>Quick (3)</span>
                  <span>Deep (10)</span>
                </div>
              </div>

              {/* Generate Button */}
              <button
                onClick={handleGenerate}
                disabled={!topic.trim() || isGenerating}
                className={`w-full py-3.5 rounded-xl text-sm font-semibold transition-colors ${
                  !topic.trim() || isGenerating
                    ? "bg-warm-200 text-warm-400 cursor-not-allowed"
                    : "bg-warm-900 text-warm-50 hover:bg-warm-800"
                }`}
              >
                {isGenerating ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="inline-block w-4 h-4 border-2 border-warm-400 border-t-warm-50 rounded-full animate-spin" />
                    Creating your course...
                  </span>
                ) : (
                  "Generate My Course"
                )}
              </button>

              {/* Error Display */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
                  {error}
                </div>
              )}
            </div>
          </div>

          {/* Right column — inspiration image, sticky */}
          <div className="hidden lg:block sticky top-24">
            <div className="rounded-2xl overflow-hidden border border-warm-200/60 shadow-sm">
              <div className="relative aspect-[4/5] bg-warm-100">
                <picture>
                  <source
                    type="image/webp"
                    srcSet={`${IMAGES.hero.srcSmall}&fm=webp 800w, ${IMAGES.hero.src}&fm=webp 1600w`}
                    sizes="40vw"
                  />
                  <img
                    src={IMAGES.hero.src}
                    srcSet={`${IMAGES.hero.srcSmall} 800w, ${IMAGES.hero.src} 1600w`}
                    sizes="40vw"
                    alt={IMAGES.hero.alt}
                    loading="lazy"
                    decoding="async"
                    className="absolute inset-0 w-full h-full object-cover"
                    style={{ objectPosition: "center 30%" }}
                  />
                </picture>
                <div className="absolute inset-0 bg-gradient-to-t from-warm-950/80 via-warm-900/20 to-transparent" />
                <div className="absolute bottom-0 inset-x-0 p-6">
                  <p className="text-warm-100 font-display text-lg font-bold mb-1">
                    Any topic. Any language.
                  </p>
                  <p className="text-warm-300 text-sm leading-relaxed">
                    Our AI creates reading, flashcards, quizzes, podcasts, comics, games, and songs — all personalized for you.
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-3 text-center">
              <a
                href={IMAGES.hero.creditUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-warm-400 hover:text-warm-500 transition-colors"
              >
                Photo by {IMAGES.hero.credit} on Unsplash
              </a>
            </div>
          </div>
        </div>

        {/* Generated Course Preview */}
        {course && (
          <div className="mt-10 bg-white rounded-xl border border-warm-200/60 overflow-hidden slide-up max-w-2xl">
            <div className="bg-warm-900 p-6 text-warm-50">
              <h2 className="font-display text-xl font-bold">{course.title}</h2>
              <p className="text-warm-400 text-sm mt-1">{course.description}</p>
            </div>

            {course.learning_outcomes && (
              <div className="p-6 border-b border-warm-200/60">
                <h3 className="font-semibold text-warm-900 text-sm mb-3">
                  What you&apos;ll learn
                </h3>
                <ul className="space-y-2">
                  {course.learning_outcomes.map((outcome: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-warm-600">
                      <Check className="w-4 h-4 text-sage-500 mt-0.5 shrink-0" />
                      {outcome}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="p-6">
              <h3 className="font-semibold text-warm-900 text-sm mb-4">Course outline</h3>
              <div className="space-y-3">
                {course.chapters?.map((chapter: any, i: number) => (
                  <div key={i} className="border border-warm-200/60 rounded-xl p-4">
                    <h4 className="font-medium text-warm-900 text-sm mb-2">
                      <span className="text-zigama-600 tabular-nums mr-1.5">{i + 1}.</span>
                      {chapter.title}
                    </h4>
                    <p className="text-xs text-warm-500 mb-3">{chapter.description}</p>
                    <ul className="space-y-1.5">
                      {chapter.lessons?.map((lesson: any, j: number) => (
                        <li key={j} className="text-sm text-warm-600 flex items-center gap-2">
                          <span className="w-5 h-5 bg-warm-100 text-warm-500 rounded flex items-center justify-center text-xs tabular-nums shrink-0">
                            {j + 1}
                          </span>
                          {lesson.title}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 bg-sage-50 border-t border-sage-100">
              <button
                onClick={() => router.push(`/course/${slugify(course.title || topic)}`)}
                className="block w-full bg-sage-600 text-white py-3 rounded-xl text-center text-sm font-semibold hover:bg-sage-700 transition-colors"
              >
                Start Learning This Course
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
