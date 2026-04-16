"use client";

import { useState, useRef, useEffect } from "react";
import { GraduationCap, Send } from "@/lib/icons";
import { IMAGES } from "@/lib/images";
import { useCourseStore } from "@/lib/courseStore";
import { TopNav } from "@/components/TopNav";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function TutorPage() {
  const currentCourse = useCourseStore((s) => s.current);
  const currentTopic = currentCourse?.outline?.title || "";

  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: currentTopic
        ? `Hello! I'm Mwalimu, your personal AI tutor.\n\nI see you're studying "${currentTopic}" — great choice! I'm here to help you understand every part of it.\n\nAsk me anything about your course, or tell me what you're stuck on.`
        : "Hello! I'm Mwalimu, your personal AI tutor.\n\nI'm here to help you learn anything — from science to programming to African history. I'll adapt to how you learn best.\n\nWhat would you like to explore today? You can ask me a question, tell me a topic you're curious about, or ask me to explain something you're stuck on.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [language, setLanguage] = useState("en");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const res = await fetch("http://localhost:8001/api/v1/tutor/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          conversation_history: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          language,
          current_topic: currentTopic,
        }),
      });

      const data = await res.json();

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.response },
      ]);

      if (data.struggle_detected) {
        const recommendations: Record<string, string> = {
          switch_to_visual: "I notice you might find this easier with visuals. Want me to explain with a comic or diagram?",
          simplify_topic: "Let me break this down into simpler pieces for you.",
          take_break: "You've been working hard. A short break might help. Come back when you're ready.",
          try_game: "Want to try learning this through a game instead? Sometimes play is the best teacher.",
        };
        const rec = recommendations[data.recommendation];
        if (rec) {
          setTimeout(() => {
            setMessages((prev) => [...prev, { role: "assistant", content: rec }]);
          }, 1500);
        }
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "I'm having trouble connecting right now. Please check that the backend server is running and try again.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="noise min-h-screen bg-warm-50 flex flex-col">
      <TopNav currentPath="/tutor" />

      {/* Mwalimu chat sub-header (specialised for the tutor room) */}
      <header
        id="main"
        className="bg-white border-b border-warm-200/60 shrink-0 mt-16"
      >
        <div className="max-w-3xl mx-auto px-5 sm:px-8 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              {/* Mwalimu avatar with image */}
              <div className="w-9 h-9 rounded-xl overflow-hidden relative">
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
              <div>
                <h1 className="font-semibold text-warm-900 text-sm">Mwalimu</h1>
                <p className="text-xs text-sage-500">Online</p>
              </div>
            </div>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              aria-label="Chat language"
              className="text-xs border border-warm-200 rounded-lg px-2 py-1.5 bg-white text-warm-700 outline-none focus:border-zigama-500"
            >
              <option value="en">English</option>
              <option value="sw">Kiswahili</option>
              <option value="fr">Fran&ccedil;ais</option>
              <option value="ha">Hausa</option>
              <option value="yo">Yor&ugrave;b&aacute;</option>
              <option value="am">Amharic</option>
              <option value="ar">Arabic</option>
            </select>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-5 sm:px-8 py-6 space-y-3">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "assistant" && (
                <div className="w-7 h-7 rounded-lg overflow-hidden relative shrink-0 mr-2 mt-1">
                  <div className="w-full h-full bg-warm-100 flex items-center justify-center">
                    <GraduationCap className="w-4 h-4 text-warm-500" />
                  </div>
                </div>
              )}
              <div
                className={`max-w-[80%] px-4 py-3 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-warm-900 text-warm-100 rounded-2xl rounded-br-md"
                    : "bg-white text-warm-700 border border-warm-200/60 rounded-2xl rounded-bl-md"
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.content}</div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="w-7 h-7 rounded-lg overflow-hidden relative shrink-0 mr-2 mt-1">
                <div className="w-full h-full bg-warm-100 flex items-center justify-center">
                  <GraduationCap className="w-4 h-4 text-warm-500" />
                </div>
              </div>
              <div className="bg-white px-4 py-3 rounded-2xl rounded-bl-md border border-warm-200/60">
                <div className="flex gap-1.5">
                  <span className="w-1.5 h-1.5 bg-warm-300 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 bg-warm-300 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 bg-warm-300 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="max-w-3xl mx-auto px-5 sm:px-8 py-2 w-full">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {[
            "Explain like I'm 10",
            "Give me an example",
            "Quiz me on this",
            "Show me a comic",
            "Make it a song",
          ].map((action) => (
            <button
              key={action}
              onClick={() => setInput(action)}
              className="shrink-0 text-xs bg-white text-warm-600 px-3 py-1.5 rounded-lg border border-warm-200/60 hover:bg-warm-50 transition-colors"
            >
              {action}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="bg-white border-t border-warm-200/60 shrink-0">
        <div className="max-w-3xl mx-auto px-5 sm:px-8 py-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Ask Mwalimu anything..."
              className="flex-1 px-4 py-2.5 rounded-xl border border-warm-200 bg-warm-50 outline-none focus:border-zigama-500 focus:ring-2 focus:ring-zigama-100 focus:bg-white text-sm text-warm-900 placeholder:text-warm-400 transition-colors"
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center gap-1.5 ${
                !input.trim() || isLoading
                  ? "bg-warm-200 text-warm-400 cursor-not-allowed"
                  : "bg-warm-900 text-warm-50 hover:bg-warm-800"
              }`}
            >
              <Send className="w-4 h-4" />
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
