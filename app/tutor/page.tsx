"use client";

/**
 * Learn4Africa — free-roaming tutor chat with Mwalimu.
 *
 * All AI goes through Convex actions (api.ai.tutor.chat) — no legacy
 * fetches. Each user→Mwalimu exchange is persisted to the conversations
 * table for signed-in learners so chat history survives reloads and
 * device switches. A "Listen" button on every Mwalimu reply uses the
 * browser's Web Speech API.
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { GraduationCap, Send, Volume2, VolumeX } from "@/lib/icons";
import { IMAGES } from "@/lib/images";
import { TopNav } from "@/components/TopNav";
import { useAuth } from "@/lib/useAuth";
import { useMwalimuVoice } from "@/lib/useSpeech";
import { useCurriculumStore } from "@/lib/curriculumStore";

interface Message {
  role: "user" | "assistant";
  content: string;
}

function openingGreeting(name?: string | null, trackId?: string | null): string {
  const nameBit = name ? ` ${name}` : "";
  if (trackId) {
    const trackName = trackId.replace(/_/g, " ");
    return `Muraho${nameBit}! I see you are studying ${trackName}. What questions do you have — or what are you stuck on?`;
  }
  return `Muraho${nameBit}! I am Mwalimu. What would you like to learn today?`;
}

export default function TutorPage() {
  const { user, isAuthenticated } = useAuth();
  const userId = user?.id as Id<"users"> | undefined;
  const activeTrack = useCurriculumStore((s) =>
    user?.activeTrackId ?? Object.keys(s.tracks)[0] ?? null,
  );

  const sendMessage = useAction(api.ai.tutor.chat);
  const appendExchange = useMutation(api.conversations.appendExchange);
  const persisted = useQuery(
    api.conversations.getConversation,
    userId
      ? { userId, type: "tutor", trackId: activeTrack ?? undefined }
      : "skip",
  );

  const { speakMwalimu, stop, isSpeaking } = useMwalimuVoice();
  const [speakingIndex, setSpeakingIndex] = useState<number | null>(null);

  const greeting = openingGreeting(user?.name ?? null, activeTrack);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: greeting },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Hydrate from Convex once on mount for signed-in users.
  useEffect(() => {
    if (hydrated) return;
    if (!persisted) return;
    if (persisted.messages && persisted.messages.length > 0) {
      setMessages(
        persisted.messages.map((m: any) => ({
          role: m.role,
          content: m.content,
        })),
      );
    }
    setHydrated(true);
  }, [persisted, hydrated]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleListen = useCallback(
    (index: number, text: string) => {
      if (speakingIndex === index && isSpeaking) {
        stop();
        setSpeakingIndex(null);
        return;
      }
      setSpeakingIndex(index);
      speakMwalimu(text);
    },
    [speakMwalimu, stop, isSpeaking, speakingIndex],
  );

  // Clear the "currently speaking" highlight when synthesis ends.
  useEffect(() => {
    if (!isSpeaking && speakingIndex !== null) {
      // Give the synth a beat to settle, then drop the highlight.
      const t = window.setTimeout(() => setSpeakingIndex(null), 300);
      return () => window.clearTimeout(t);
    }
  }, [isSpeaking, speakingIndex]);

  async function handleSend() {
    const text = input.trim();
    if (!text || isLoading) return;

    const historyForAction = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setInput("");
    setIsLoading(true);

    try {
      const result = await sendMessage({
        message: text,
        trackId: activeTrack ?? undefined,
        conversationHistory: historyForAction,
        studentName: user?.name ?? undefined,
        preferredLanguage: user?.preferredLanguage === "rw" ? "rw" : "en",
      });

      const assistantReply = result.response;
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: assistantReply },
      ]);

      if (isAuthenticated && userId) {
        void appendExchange({
          userId,
          type: "tutor",
          trackId: activeTrack ?? undefined,
          userMessage: text,
          assistantMessage: assistantReply,
        }).catch(() => {
          // Non-fatal; chat still works without persistence.
        });
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "I am sorry, I could not respond right now. Please try again.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="noise min-h-screen bg-warm-50 flex flex-col">
      <TopNav currentPath="/tutor" />

      <header
        id="main"
        className="bg-white border-b border-warm-200/60 shrink-0 mt-16"
      >
        <div className="max-w-3xl mx-auto px-4 sm:px-8 py-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl overflow-hidden relative shrink-0">
              <picture>
                <source
                  type="image/webp"
                  srcSet={`${IMAGES.mwalimu.srcSmall}&fm=webp&w=72&h=72&fit=crop 1x, ${IMAGES.mwalimu.srcSmall}&fm=webp&w=144&h=144&fit=crop 2x`}
                />
                <img
                  src={`${IMAGES.mwalimu.srcSmall}&w=72&h=72&fit=crop`}
                  alt="Mwalimu AI Tutor"
                  className="w-full h-full object-cover"
                  loading="eager"
                />
              </picture>
              <div className="absolute inset-0 bg-warm-900/20" />
            </div>
            <div className="min-w-0">
              <h1 className="font-semibold text-warm-900 text-sm truncate">
                Mwalimu
              </h1>
              <p className="text-xs text-sage-500">
                {activeTrack
                  ? `On track: ${activeTrack.replace(/_/g, " ")}`
                  : "Free-roaming chat"}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto momentum-scroll pb-28">
        <div className="max-w-3xl mx-auto px-4 sm:px-8 py-6 space-y-3">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {msg.role === "assistant" && (
                <div className="w-7 h-7 rounded-lg overflow-hidden relative shrink-0 mr-2 mt-1 bg-warm-100 flex items-center justify-center">
                  <GraduationCap className="w-4 h-4 text-warm-500" />
                </div>
              )}
              <div
                className={`max-w-[85%] sm:max-w-[80%] px-4 py-3 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-warm-900 text-warm-100 rounded-2xl rounded-br-md"
                    : "bg-white text-warm-700 border border-warm-200/60 rounded-2xl rounded-bl-md"
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.content}</div>

                {msg.role === "assistant" && i > 0 && (
                  <button
                    onClick={() => handleListen(i, msg.content)}
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

          {isLoading && (
            <div className="flex justify-start">
              <div className="w-7 h-7 rounded-lg bg-warm-100 flex items-center justify-center shrink-0 mr-2 mt-1">
                <GraduationCap className="w-4 h-4 text-warm-500" />
              </div>
              <div className="bg-white px-4 py-3 rounded-2xl rounded-bl-md border border-warm-200/60">
                <div className="flex gap-1.5">
                  <span
                    className="w-1.5 h-1.5 bg-warm-300 rounded-full animate-bounce"
                    style={{ animationDelay: "0ms" }}
                  />
                  <span
                    className="w-1.5 h-1.5 bg-warm-300 rounded-full animate-bounce"
                    style={{ animationDelay: "150ms" }}
                  />
                  <span
                    className="w-1.5 h-1.5 bg-warm-300 rounded-full animate-bounce"
                    style={{ animationDelay: "300ms" }}
                  />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Fixed input bar — sits above the keyboard on mobile. */}
      <div className="fixed bottom-0 inset-x-0 bg-white border-t border-warm-200/60 safe-bottom z-30">
        <div className="max-w-3xl mx-auto px-4 sm:px-8 py-3">
          <div className="flex gap-2 items-end">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Ask Mwalimu anything..."
              className="flex-1 px-4 rounded-xl border border-warm-200 bg-warm-50 outline-none focus:border-zigama-500 focus:ring-2 focus:ring-zigama-100 focus:bg-white text-warm-900 placeholder:text-warm-400 transition-colors"
              style={{ height: "48px", fontSize: "16px" }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              aria-label="Send message"
              className={`tap-target rounded-xl font-medium transition-colors flex items-center justify-center ${
                !input.trim() || isLoading
                  ? "bg-warm-200 text-warm-400 cursor-not-allowed"
                  : "bg-warm-900 text-warm-50 hover:bg-warm-800"
              }`}
              style={{ width: "48px", height: "48px" }}
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
