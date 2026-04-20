/**
 * Learn4Africa — Mwalimu voice, powered by the browser's Web Speech API.
 *
 * Replaces the old Edge-TTS / Hugging Face TTS pipeline. Zero cost,
 * zero backend, works in every modern browser. The tradeoff is voice
 * quality (platform-dependent) — good enough for a free platform whose
 * students are often on patchy mobile data.
 *
 * `speakMwalimu` additionally strips markdown before speaking so headings,
 * asterisks, code fences, and link brackets don't get read aloud.
 */

"use client";

import { useCallback, useRef, useState } from "react";

export function useMwalimuVoice() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const speak = useCallback((text: string, language: "en" | "rw" = "en") => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language === "rw" ? "rw-RW" : "en-US";
    utterance.rate = 0.85;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, []);

  const stop = useCallback(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  const speakMwalimu = useCallback(
    (text: string, language: "en" | "rw" = "en") => {
      const clean = text
        .replace(/#{1,6}\s/g, "")
        .replace(/\*\*/g, "")
        .replace(/\*/g, "")
        .replace(/`[^`]*`/g, "")
        .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
        .replace(/\n\n/g, ". ")
        .replace(/\n/g, " ")
        .trim();

      speak(clean, language);
    },
    [speak],
  );

  return { speak, speakMwalimu, stop, isSpeaking };
}
