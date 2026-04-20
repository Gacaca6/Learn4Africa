import React from "react";
import { animate, clamp, Easing, L4A, MONO, SANS, SERIF } from "../utils";
import type { SceneProps } from "../Demo";

export const SceneProblem: React.FC<SceneProps> = ({ start, dur, time }) => {
  if (time < start || time > start + dur) return null;
  const t = clamp((time - start) / dur, 0, 1);
  const fadeIn = animate({ from: 0, to: 1, start: 0.05, end: 0.2, ease: Easing.easeOutCubic })(t);
  const stat1 = animate({ from: 0, to: 1, start: 0.25, end: 0.4, ease: Easing.easeOutCubic })(t);
  const stat2 = animate({ from: 0, to: 1, start: 0.4, end: 0.55, ease: Easing.easeOutCubic })(t);
  const stat3 = animate({ from: 0, to: 1, start: 0.55, end: 0.7, ease: Easing.easeOutCubic })(t);
  const concl = animate({ from: 0, to: 1, start: 0.72, end: 0.88, ease: Easing.easeOutCubic })(t);
  const exit = animate({ from: 1, to: 0, start: 0.92, end: 1, ease: Easing.easeInCubic })(t);

  const n1 = Math.floor(animate({ from: 0, to: 244, start: 0.25, end: 0.55, ease: Easing.easeOutCubic })(t));
  const n2 = Math.floor(animate({ from: 0, to: 98, start: 0.4, end: 0.7, ease: Easing.easeOutCubic })(t));
  const n3 = Math.floor(animate({ from: 0, to: 1, start: 0.55, end: 0.85, ease: Easing.easeOutCubic })(t));

  return (
    <div style={{ position: "absolute", inset: 0, background: L4A.ink, opacity: exit }}>
      <div style={{
        position: "absolute", top: 80, left: 80,
        fontFamily: MONO, fontSize: 13, letterSpacing: "0.2em",
        color: L4A.terracotta, textTransform: "uppercase", opacity: fadeIn,
      }}>
        ▸ The problem
      </div>

      <div style={{
        position: "absolute", top: 160, left: 80, right: 80,
        fontFamily: SERIF, fontSize: 84, fontWeight: 500,
        color: "#fff", lineHeight: 1.05, letterSpacing: "-0.02em",
        opacity: fadeIn, maxWidth: 1400,
      }}>
        A continent of young minds,<br/>
        <span style={{ fontStyle: "italic", color: "#e8b88f" }}>underserved by education.</span>
      </div>

      <div style={{
        position: "absolute", top: 480, left: 80, right: 80,
        display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 40,
      }}>
        {[
          { op: stat1, big: `${n1}M`, label: "Young Africans without quality learning access", tint: "#e8b88f" },
          { op: stat2, big: `${n2}%`, label: "Learn in a language that is not their own", tint: "#b86a3f" },
          { op: stat3, big: `${n3}`, label: "Tutors for every million students in some regions", tint: "#c99464" },
        ].map((s, i) => (
          <div key={i} style={{ opacity: s.op, transform: `translateY(${(1 - s.op) * 20}px)` }}>
            <div style={{
              fontFamily: SERIF, fontSize: 140, fontWeight: 500,
              color: s.tint, lineHeight: 1, letterSpacing: "-0.04em",
              fontVariantNumeric: "tabular-nums",
            }}>{s.big}</div>
            <div style={{
              fontFamily: SANS, fontSize: 18, color: "rgba(255,255,255,0.75)",
              marginTop: 20, maxWidth: 360, lineHeight: 1.4,
            }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{
        position: "absolute", bottom: 80, left: 80, right: 80,
        fontFamily: SERIF, fontSize: 34, fontStyle: "italic",
        color: "rgba(255,255,255,0.9)",
        opacity: concl, lineHeight: 1.3, maxWidth: 1200,
        transform: `translateY(${(1 - concl) * 16}px)`,
        letterSpacing: "-0.01em",
      }}>
        What if every one of them had a patient, personal tutor?
      </div>
    </div>
  );
};
