"use client";

/**
 * Learn4Africa — mock interview room.
 *
 * Mwalimu plays the role of an honest Rwandan/African tech interviewer.
 * We loop through the `interview_questions` bundled with the module,
 * collect the student's answer for each, and pass it to
 * api.ai.interview.conductInterview for per-answer feedback.
 *
 * After the last question we show a summary screen with strong points
 * and areas to review, and record the interview as practiced both in
 * the local curriculum store and (if signed in) by persisting the full
 * transcript to Convex.
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAction, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  Globe,
  ArrowLeft,
  Send,
  MessageSquare,
  Sparkles,
  Briefcase,
  Check,
  User,
  Volume2,
  VolumeX,
} from "@/lib/icons";
import { useCurriculumStore } from "@/lib/curriculumStore";
import { useAuth } from "@/lib/useAuth";
import { useMwalimuVoice } from "@/lib/useSpeech";
import { getTrack, getModule } from "@/lib/tracks";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface InterviewQuestion {
  question: string;
  model_answer?: string;
  difficulty?: string;
  companies_ask?: string[];
}

interface ModuleResponse {
  track_id: string;
  track_title: string;
  total_modules: number;
  module: {
    module_number: number;
    title: string;
    interview_questions?: InterviewQuestion[];
  };
}

export default function MockInterviewPage() {
  const params = useParams<{ trackId: string; moduleNumber: string }>();
  const trackId = params.trackId;
  const moduleNumber = parseInt(params.moduleNumber, 10);

  const { user, isAuthenticated } = useAuth();
  const userId = user?.id as Id<"users"> | undefined;

  const conductInterview = useAction(api.ai.interview.conductInterview);
  const appendExchange = useMutation(api.conversations.appendExchange);

  const { speakMwalimu, stop, isSpeaking } = useMwalimuVoice();
  const [speakingIndex, setSpeakingIndex] = useState<number | null>(null);

  const [moduleData, setModuleData] = useState<ModuleResponse | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [started, setStarted] = useState(false);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [finished, setFinished] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const recordInterviewPracticed = useCurriculumStore(
    (s) => s.recordInterviewPracticed,
  );

  useEffect(() => {
    // Static module metadata, bundled at build time.
    const track = getTrack(trackId);
    const mod = getModule(trackId, moduleNumber);
    if (!track || !mod) return;
    setModuleData({
      track_id: track.id,
      track_title: track.title,
      total_modules: track.modules.length,
      module: {
        module_number: mod.module_number,
        title: mod.title,
        interview_questions: (mod.interview_questions ?? []).map((q) => ({
          question: q.question,
          model_answer: q.model_answer,
          difficulty: q.difficulty,
          companies_ask: q.companies_ask,
        })),
      },
    });
  }, [trackId, moduleNumber]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  useEffect(() => {
    if (!isSpeaking && speakingIndex !== null) {
      const t = window.setTimeout(() => setSpeakingIndex(null), 300);
      return () => window.clearTimeout(t);
    }
  }, [isSpeaking, speakingIndex]);

  const questions: InterviewQuestion[] =
    moduleData?.module.interview_questions ?? [];
  const moduleTitle = moduleData?.module.title || "";
  const trackTitle = moduleData?.track_title || "";

  function handleListen(index: number, text: string) {
    if (speakingIndex === index && isSpeaking) {
      stop();
      setSpeakingIndex(null);
      return;
    }
    setSpeakingIndex(index);
    speakMwalimu(text);
  }

  async function startInterview() {
    if (questions.length === 0) return;
    setStarted(true);
    const first = questions[0];
    const opener: ChatMessage = {
      role: "assistant",
      content: `Muraho${user?.name ? ` ${user.name}` : ""}! I am Mwalimu, your interviewer today for ${moduleTitle}. We will do ${questions.length} questions. Take your time and answer honestly — I will give you specific feedback after each one.\n\nQuestion 1: ${first.question}`,
    };
    setMessages([opener]);
  }

  async function submitAnswer() {
    const answer = input.trim();
    if (!answer || sending || finished) return;

    const current = questions[questionIndex];
    if (!current) return;

    const historyForAction = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const userMsg: ChatMessage = { role: "user", content: answer };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setSending(true);

    try {
      const result = await conductInterview({
        moduleTitle,
        studentAnswer: answer,
        interviewQuestion: current.question,
        conversationHistory: historyForAction,
        studentName: user?.name ?? undefined,
      });

      const feedback = result.response;

      // Decide whether there is a next question.
      const nextIndex = questionIndex + 1;
      const hasNext = nextIndex < questions.length;

      let assistantContent = feedback;
      if (hasNext) {
        const next = questions[nextIndex];
        assistantContent += `\n\nQuestion ${nextIndex + 1}: ${next.question}`;
      } else {
        assistantContent += `\n\nThat was the final question. Vizuri sana — see the summary below for your strong points and areas to review.`;
      }

      const assistantMsg: ChatMessage = {
        role: "assistant",
        content: assistantContent,
      };
      setMessages((prev) => [...prev, assistantMsg]);

      if (isAuthenticated && userId) {
        void appendExchange({
          userId,
          type: "interview",
          trackId,
          moduleNumber,
          userMessage: answer,
          assistantMessage: assistantContent,
        }).catch(() => {
          // non-fatal
        });
      }

      if (hasNext) {
        setQuestionIndex(nextIndex);
      } else {
        setFinished(true);
        recordInterviewPracticed(trackId, moduleNumber);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "I am sorry, I could not reach the interview server. Please try again in a moment.",
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  // Extract "Strong points" + "Areas to review" from the assistant's feedback
  // messages for the summary card. We look for sentences that start with a
  // positive or critical marker. This is a light heuristic — the real value
  // is in the full feedback above.
  function summarise(): { strong: string[]; review: string[] } {
    const strong: string[] = [];
    const review: string[] = [];
    const assistantMsgs = messages
      .filter((m) => m.role === "assistant")
      .slice(1); // skip opener
    for (const m of assistantMsgs) {
      const lines = m.content.split(/\n+/).map((l) => l.trim()).filter(Boolean);
      for (const line of lines) {
        const lower = line.toLowerCase();
        if (
          lower.startsWith("good:") ||
          lower.startsWith("strong:") ||
          lower.includes("what was good") ||
          lower.includes("well done") ||
          lower.startsWith("you did well")
        ) {
          strong.push(line.replace(/^(good|strong):\s*/i, ""));
        } else if (
          lower.startsWith("missing:") ||
          lower.startsWith("improve:") ||
          lower.includes("you are missing") ||
          lower.includes("to improve") ||
          lower.includes("next time")
        ) {
          review.push(line.replace(/^(missing|improve):\s*/i, ""));
        }
      }
    }
    return { strong, review };
  }

  const summary = finished ? summarise() : null;

  return (
    <div className="noise min-h-screen bg-warm-50 flex flex-col">
      <header className="bg-warm-50/80 backdrop-blur-md border-b border-warm-200/60 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-5 sm:px-8 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-warm-700" />
            <span className="text-lg font-semibold tracking-tight text-warm-900">
              Learn4Africa
            </span>
          </Link>
          <Link
            href={`/tracks/${trackId}/${moduleNumber}`}
            className="text-sm text-warm-600 hover:text-warm-900 flex items-center gap-1"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to module</span>
            <span className="sm:hidden">Back</span>
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-8 py-6 sm:py-8 flex flex-col">
        <div className="mb-6">
          <div className="flex items-center gap-2 text-xs font-semibold text-warm-500 uppercase tracking-wide mb-1.5">
            <Briefcase className="w-3.5 h-3.5" />
            Mock Interview • {trackTitle}
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-warm-900 mb-1">
            Live interview with Mwalimu
          </h1>
          <p className="text-sm text-warm-500">
            Module: {moduleTitle || "…"}
          </p>
          {started && !finished && questions.length > 0 && (
            <p className="text-xs text-zigama-600 mt-2 font-semibold">
              Question {Math.min(questionIndex + 1, questions.length)} of{" "}
              {questions.length}
            </p>
          )}
        </div>

        {/* Not started — briefing */}
        {!started && (
          <div className="flex-1 flex items-center justify-center">
            <div className="max-w-xl p-6 sm:p-8 bg-white rounded-2xl border-2 border-zigama-200">
              <div className="w-12 h-12 bg-zigama-100 rounded-xl flex items-center justify-center mb-4">
                <MessageSquare className="w-6 h-6 text-zigama-600" />
              </div>
              <h2 className="font-display text-2xl font-bold text-warm-900 mb-2">
                Before you begin
              </h2>
              <p className="text-warm-700 leading-relaxed mb-4">
                Mwalimu will interview you like a real hiring manager at a top
                Kigali tech company. You will answer {questions.length || "a few"}{" "}
                questions and get specific feedback after each one.
              </p>
              <ul className="space-y-2 mb-6 text-sm text-warm-700">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-sage-600 mt-0.5 shrink-0" />
                  Answer out loud first, then type your answer.
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-sage-600 mt-0.5 shrink-0" />
                  Be specific and honest. No perfect answers needed.
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-sage-600 mt-0.5 shrink-0" />
                  You will get feedback after each answer.
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-sage-600 mt-0.5 shrink-0" />
                  Final summary with strong points and areas to review.
                </li>
              </ul>
              <button
                onClick={startInterview}
                disabled={questions.length === 0}
                className="tap-target w-full px-5 py-3 bg-zigama-600 hover:bg-zigama-700 disabled:bg-warm-300 text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                Start the interview
              </button>
            </div>
          </div>
        )}

        {/* Chat window */}
        {started && (
          <>
            <div className="flex-1 bg-white rounded-2xl border border-warm-200 p-4 sm:p-5 overflow-y-auto momentum-scroll mb-4 min-h-[360px]">
              <div className="space-y-5">
                {messages.map((m, i) => (
                  <div
                    key={i}
                    className={`flex gap-3 ${
                      m.role === "user" ? "flex-row-reverse" : "flex-row"
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                        m.role === "user" ? "bg-warm-200" : "bg-zigama-100"
                      }`}
                    >
                      {m.role === "user" ? (
                        <User className="w-4 h-4 text-warm-700" />
                      ) : (
                        <Sparkles className="w-4 h-4 text-zigama-600" />
                      )}
                    </div>
                    <div
                      className={`max-w-[85%] sm:max-w-[80%] rounded-2xl p-4 text-sm leading-relaxed whitespace-pre-wrap ${
                        m.role === "user"
                          ? "bg-zigama-600 text-white rounded-tr-sm"
                          : "bg-warm-50 text-warm-900 border border-warm-100 rounded-tl-sm"
                      }`}
                    >
                      {m.content}
                      {m.role === "assistant" && (
                        <button
                          onClick={() => handleListen(i, m.content)}
                          aria-label={
                            speakingIndex === i && isSpeaking
                              ? "Stop listening"
                              : "Listen to Mwalimu"
                          }
                          className="mt-2 inline-flex items-center gap-1 text-xs text-warm-500 hover:text-zigama-600 transition-colors tap-target"
                        >
                          {speakingIndex === i && isSpeaking ? (
                            <>
                              <VolumeX className="w-3.5 h-3.5" />
                              Stop
                            </>
                          ) : (
                            <>
                              <Volume2 className="w-3.5 h-3.5" />
                              Listen
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {sending && (
                  <div className="flex gap-3">
                    <div className="w-9 h-9 rounded-full bg-zigama-100 flex items-center justify-center shrink-0">
                      <Sparkles className="w-4 h-4 text-zigama-600" />
                    </div>
                    <div className="bg-warm-50 border border-warm-100 rounded-2xl rounded-tl-sm p-4 text-sm text-warm-500 flex items-center gap-2">
                      <div className="w-2 h-2 bg-zigama-500 rounded-full animate-pulse" />
                      Mwalimu is thinking...
                    </div>
                  </div>
                )}
                <div ref={scrollRef} />
              </div>
            </div>

            {/* Summary card */}
            {finished && summary && (
              <div className="mb-4 p-5 bg-sage-50 border-2 border-sage-200 rounded-2xl">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-10 h-10 bg-sage-600 rounded-lg flex items-center justify-center shrink-0">
                    <Check className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-display font-bold text-sage-900 text-lg">
                      Interview complete
                    </p>
                    <p className="text-sm text-sage-700">
                      Vizuri sana! You answered all {questions.length}{" "}
                      questions. Review your feedback above, then go back to
                      the module.
                    </p>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="bg-white rounded-xl p-4 border border-sage-200">
                    <p className="text-xs font-semibold text-sage-700 uppercase tracking-wide mb-2">
                      Strong points
                    </p>
                    {summary.strong.length === 0 ? (
                      <p className="text-sm text-warm-500 italic">
                        See Mwalimu's per-answer feedback above for what you
                        did well.
                      </p>
                    ) : (
                      <ul className="space-y-1.5 text-sm text-warm-700">
                        {summary.strong.slice(0, 5).map((s, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <Check className="w-3.5 h-3.5 text-sage-600 mt-0.5 shrink-0" />
                            <span>{s}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className="bg-white rounded-xl p-4 border border-warm-200">
                    <p className="text-xs font-semibold text-warm-700 uppercase tracking-wide mb-2">
                      Areas to review
                    </p>
                    {summary.review.length === 0 ? (
                      <p className="text-sm text-warm-500 italic">
                        See Mwalimu's per-answer feedback above for areas to
                        sharpen before the real interview.
                      </p>
                    ) : (
                      <ul className="space-y-1.5 text-sm text-warm-700">
                        {summary.review.slice(0, 5).map((s, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="w-3.5 h-3.5 rounded-full bg-zigama-400 mt-0.5 shrink-0" />
                            <span>{s}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                <Link
                  href={`/tracks/${trackId}/${moduleNumber}`}
                  className="tap-target mt-4 inline-flex items-center justify-center px-4 py-2.5 bg-sage-600 hover:bg-sage-700 text-white rounded-lg text-sm font-semibold"
                >
                  Back to module
                </Link>
              </div>
            )}

            {/* Input */}
            {!finished && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  submitAnswer();
                }}
                className="bg-white rounded-2xl border border-warm-200 p-3 flex items-end gap-2 safe-bottom"
              >
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      submitAnswer();
                    }
                  }}
                  placeholder={
                    sending
                      ? "Mwalimu is responding..."
                      : "Type your answer. Enter to send, Shift+Enter for a new line."
                  }
                  disabled={sending}
                  rows={2}
                  className="flex-1 bg-transparent resize-none outline-none text-warm-900 placeholder-warm-400 px-2 py-1.5"
                  style={{ fontSize: "16px" }}
                />
                <button
                  type="submit"
                  disabled={sending || !input.trim()}
                  aria-label="Send answer"
                  className="tap-target shrink-0 w-11 h-11 bg-zigama-600 hover:bg-zigama-700 disabled:bg-warm-300 text-white rounded-lg flex items-center justify-center transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            )}
          </>
        )}
      </main>
    </div>
  );
}
