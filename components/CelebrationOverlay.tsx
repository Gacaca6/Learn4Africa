"use client";

/**
 * Learn4Africa — module-completion celebration overlay.
 *
 * Fires confetti + a fullscreen "Vizuri sana!" flash for ~2s when a
 * learner marks a module complete. Pure CSS animation (the keyframes
 * live in app/globals.css as .confetti-piece) — no library, no runtime
 * cost when idle. Designed to also be triggered after a perfect quiz.
 *
 * Usage:
 *   <CelebrationOverlay show={justCompleted} name="Amina" moduleNumber={4} onDone={...} />
 */

import { useEffect, useMemo } from "react";
import { Check } from "@/lib/icons";

const CONFETTI_COLORS = [
  "#f59e0b", // amber (zigama)
  "#d97706",
  "#ea580c",
  "#84cc16",
  "#10b981", // sage
  "#14b8a6",
  "#fbbf24",
  "#dc2626",
];

interface ConfettiPieceSpec {
  left: number;
  delay: number;
  size: number;
  color: string;
  rotateDir: 1 | -1;
}

function makeConfetti(count: number): ConfettiPieceSpec[] {
  return Array.from({ length: count }, () => ({
    left: Math.random() * 100,
    delay: Math.random() * 1000,
    size: 6 + Math.random() * 8, // 6–14 px
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    rotateDir: Math.random() > 0.5 ? 1 : -1,
  }));
}

export function ConfettiBurst({ count = 50 }: { count?: number }) {
  const pieces = useMemo(() => makeConfetti(count), [count]);
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[1000] overflow-hidden"
    >
      {pieces.map((p, i) => (
        <span
          key={i}
          className="confetti-piece"
          style={{
            left: `${p.left}vw`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: p.color,
            animationDelay: `${p.delay}ms`,
            // Randomise rotation direction so the shower feels natural
            animationName:
              p.rotateDir === 1 ? "confetti-fall" : "confetti-fall-reverse",
          }}
        />
      ))}
    </div>
  );
}

export function CelebrationOverlay({
  show,
  name,
  moduleNumber,
  moduleTitle,
  onDone,
  durationMs = 2200,
}: {
  show: boolean;
  name?: string | null;
  moduleNumber: number;
  moduleTitle?: string;
  onDone?: () => void;
  durationMs?: number;
}) {
  useEffect(() => {
    if (!show) return;
    const t = window.setTimeout(() => onDone?.(), durationMs);
    return () => window.clearTimeout(t);
  }, [show, durationMs, onDone]);

  if (!show) return null;

  return (
    <>
      <ConfettiBurst count={60} />
      <div
        role="status"
        aria-live="polite"
        className="fixed inset-0 z-[1001] flex items-center justify-center bg-warm-900/70 backdrop-blur-sm celebration-fade"
      >
        <div className="text-center px-6">
          <div className="w-24 h-24 rounded-full bg-sage-500 flex items-center justify-center mx-auto mb-5 celebration-pop">
            <Check className="w-12 h-12 text-white" />
          </div>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-2">
            Module {moduleNumber} Complete!
          </h2>
          {moduleTitle && (
            <p className="text-warm-200 text-lg mb-3">{moduleTitle}</p>
          )}
          <p className="text-zigama-300 text-xl font-semibold">
            Vizuri sana{name ? `, ${name}` : ""}!
          </p>
        </div>
      </div>
    </>
  );
}
