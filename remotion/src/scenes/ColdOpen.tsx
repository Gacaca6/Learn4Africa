import React from "react";
import { animate, clamp, Easing, L4A, MONO, SANS, SERIF } from "../utils";
import { BrandMark } from "../BrandMark";
import type { SceneProps } from "../Demo";

export const SceneColdOpen: React.FC<SceneProps> = ({ start, dur, time }) => {
  if (time < start || time > start + dur) return null;
  const t = clamp((time - start) / dur, 0, 1);
  const line1 = animate({ from: 40, to: 0, start: 0.05, end: 0.35, ease: Easing.easeOutCubic })(t);
  const line1op = animate({ from: 0, to: 1, start: 0.05, end: 0.35, ease: Easing.easeOutCubic })(t);
  const line2 = animate({ from: 40, to: 0, start: 0.25, end: 0.55, ease: Easing.easeOutCubic })(t);
  const line2op = animate({ from: 0, to: 1, start: 0.25, end: 0.55, ease: Easing.easeOutCubic })(t);
  const line3op = animate({ from: 0, to: 1, start: 0.55, end: 0.75, ease: Easing.easeOutCubic })(t);
  const exit = animate({ from: 1, to: 0, start: 0.88, end: 1, ease: Easing.easeInCubic })(t);

  return (
    <div style={{ position: "absolute", inset: 0, background: L4A.cream, opacity: exit }}>
      <div style={{
        position: "absolute", inset: 0,
        background: "radial-gradient(ellipse at 30% 20%, rgba(184,106,63,0.08), transparent 60%), radial-gradient(ellipse at 80% 90%, rgba(107,63,29,0.06), transparent 55%)",
      }}/>
      <div style={{ position: "absolute", top: 60, left: 80, opacity: line1op }}>
        <BrandMark size={32} />
      </div>

      <div style={{ position: "absolute", left: 80, top: 280, display: "flex", flexDirection: "column", gap: 0 }}>
        <div style={{
          fontFamily: SANS, fontSize: 18, fontWeight: 500,
          letterSpacing: "0.18em", textTransform: "uppercase",
          color: L4A.terracotta, opacity: line1op,
          transform: `translateY(${line1 * 0.3}px)`,
          marginBottom: 28,
        }}>
          A demo for every African student
        </div>
        <div style={{
          fontFamily: SERIF, fontSize: 132, fontWeight: 500,
          lineHeight: 0.98, letterSpacing: "-0.03em",
          color: L4A.ink, opacity: line1op,
          transform: `translateY(${line1}px)`,
        }}>
          Any topic.
        </div>
        <div style={{
          fontFamily: SERIF, fontSize: 132, fontWeight: 500, fontStyle: "italic",
          lineHeight: 0.98, letterSpacing: "-0.03em",
          color: L4A.brown, opacity: line2op,
          transform: `translateY(${line2}px)`,
        }}>
          Taught the African way.
        </div>

        <div style={{
          fontFamily: SANS, fontSize: 22, color: L4A.muted,
          marginTop: 40, opacity: line3op,
          letterSpacing: "-0.005em", maxWidth: 820, lineHeight: 1.4,
        }}>
          A free AI-powered learning platform that gives every African student a personal AI tutor.
        </div>
      </div>

      <div style={{
        position: "absolute", bottom: 60, left: 80,
        fontFamily: MONO, fontSize: 13, color: L4A.muted,
        letterSpacing: "0.1em", opacity: line3op,
      }}>
        LEARN4AFRICA · PRODUCT DEMO · 2026
      </div>
    </div>
  );
};
