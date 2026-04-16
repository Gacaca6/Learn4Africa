"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Globe,
  ArrowLeft,
  Send,
  MessageSquare,
  Sparkles,
  Briefcase,
  Check,
  User,
} from "@/lib/icons";
import { useCurriculumStore } from "@/lib/curriculumStore";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ModuleResponse {
  track_id: string;
  track_title: string;
  total_modules: number;
  module: {
    module_number: number;
    title: string;
  };
}

export default function MockInterviewPage() {
  const params = useParams<{ trackId: string; moduleNumber: string }>();
  const trackId = params.trackId;
  const moduleNumber = parseInt(params.moduleNumber, 10);

  const [moduleData, setModuleData] = useState<ModuleResponse | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const recordInterviewPracticed = useCurriculumStore(
    (s) => s.recordInterviewPracticed
  );

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(
          `/api/v1/tracks/${trackId}/modules/${moduleNumber}`
        );
        if (!res.ok) return;
        const j = await res.json();
        if (!cancelled) setModuleData(j);
      } catch {
        // noop
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [trackId, moduleNumber]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(content: string) {
    if (!content.trim() || sending) return;
    const userMessage: ChatMessage = { role: "user", content: content.trim() };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setSending(true);
    try {
      const res = await fetch(
        `/api/v1/tracks/${trackId}/modules/${moduleNumber}/interview`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: content.trim(),
            conversation_history: messages,
            student_name: "",
            language: "en",
          }),
        }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const j = await res.json();
      const reply: ChatMessage = {
        role: "assistant",
        content: j.response || "",
      };
      setMessages((prev) => [...prev, reply]);

      // Heuristic: detect "wrap up" assessments
      const txt = reply.content.toLowerCase();
      if (
        txt.includes("out of 10") ||
        txt.includes("/10") ||
        txt.includes("assessment") ||
        (txt.includes("did well") && txt.includes("improve"))
      ) {
        setFinished(true);
        recordInterviewPracticed(trackId, moduleNumber);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Sorry, I could not reach the interview server. Please try again in a moment.",
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  async function startInterview() {
    setStarted(true);
    await sendMessage(
      "Hello Mwalimu, I am ready for my mock interview for this module. Please begin."
    );
  }

  const moduleTitle = moduleData?.module.title || "";
  const trackTitle = moduleData?.track_title || "";

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
            Back to module
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto px-5 sm:px-8 py-8 flex flex-col">
        {/* Title */}
        <div className="mb-6">
          <div className="flex items-center gap-2 text-xs font-semibold text-warm-500 uppercase tracking-wide mb-1.5">
            <Briefcase className="w-3.5 h-3.5" />
            Mock Interview • {trackTitle}
          </div>
          <h1 className="font-display text-3xl font-bold text-warm-900 mb-1">
            Live interview with Mwalimu
          </h1>
          <p className="text-sm text-warm-500">
            Module: {moduleTitle || "…"}
          </p>
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
                Kigali tech company. Expect 5–6 questions mixing technical and
                behavioural.
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
                  Final assessment with a score out of 10.
                </li>
              </ul>
              <button
                onClick={startInterview}
                className="w-full px-5 py-3 bg-zigama-600 hover:bg-zigama-700 text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors"
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
            <div className="flex-1 bg-white rounded-2xl border border-warm-200 p-5 overflow-y-auto mb-4 min-h-[360px]">
              {messages.length === 0 && sending && (
                <div className="text-warm-500 text-sm flex items-center gap-2">
                  <div className="w-2 h-2 bg-zigama-500 rounded-full animate-pulse" />
                  Mwalimu is preparing your first question...
                </div>
              )}

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
                        m.role === "user"
                          ? "bg-warm-200"
                          : "bg-zigama-100"
                      }`}
                    >
                      {m.role === "user" ? (
                        <User className="w-4 h-4 text-warm-700" />
                      ) : (
                        <Sparkles className="w-4 h-4 text-zigama-600" />
                      )}
                    </div>
                    <div
                      className={`max-w-[80%] rounded-2xl p-4 text-sm leading-relaxed whitespace-pre-wrap ${
                        m.role === "user"
                          ? "bg-zigama-600 text-white rounded-tr-sm"
                          : "bg-warm-50 text-warm-900 border border-warm-100 rounded-tl-sm"
                      }`}
                    >
                      {m.content}
                    </div>
                  </div>
                ))}

                {sending && messages.length > 0 && (
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

            {/* Finished banner */}
            {finished && (
              <div className="mb-4 p-4 bg-sage-50 border-2 border-sage-200 rounded-xl flex items-start gap-3">
                <div className="w-9 h-9 bg-sage-600 rounded-lg flex items-center justify-center shrink-0">
                  <Check className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sage-900 mb-0.5">
                    Interview complete
                  </p>
                  <p className="text-sm text-sage-700">
                    You have completed a full mock interview for this module. Use
                    Mwalimu's feedback above to sharpen your answers before the
                    real thing.
                  </p>
                </div>
                <Link
                  href={`/tracks/${trackId}/${moduleNumber}`}
                  className="shrink-0 px-3 py-2 bg-sage-600 hover:bg-sage-700 text-white rounded-lg text-xs font-semibold"
                >
                  Back to module
                </Link>
              </div>
            )}

            {/* Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage(input);
              }}
              className="bg-white rounded-2xl border border-warm-200 p-3 flex items-end gap-2"
            >
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage(input);
                  }
                }}
                placeholder={
                  sending
                    ? "Mwalimu is responding..."
                    : "Type your answer. Enter to send, Shift+Enter for a new line."
                }
                disabled={sending}
                rows={2}
                className="flex-1 bg-transparent resize-none outline-none text-sm text-warm-900 placeholder-warm-400 px-2 py-1.5"
              />
              <button
                type="submit"
                disabled={sending || !input.trim()}
                className="shrink-0 w-10 h-10 bg-zigama-600 hover:bg-zigama-700 disabled:bg-warm-300 text-white rounded-lg flex items-center justify-center transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </>
        )}
      </main>
    </div>
  );
}
