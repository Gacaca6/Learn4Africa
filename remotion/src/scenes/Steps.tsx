import React from "react";
import { animate, clamp, Easing, L4A, MONO, SANS, SERIF } from "../utils";
import type { SceneProps } from "../Demo";

export const SceneSteps: React.FC<SceneProps> = ({ start, dur, time }) => {
  if (time < start || time > start + dur) return null;
  const t = clamp((time - start) / dur, 0, 1);
  const titleOp = animate({ from: 0, to: 1, start: 0, end: 0.1, ease: Easing.easeOutCubic })(t);
  const exit = animate({ from: 1, to: 0, start: 0.92, end: 1, ease: Easing.easeInCubic })(t);

  const steps = [
    { n: "01", t0: 0.15, title: "Tell us a topic",
      body: '"Solar energy." "Python programming." "African kingdoms." Anything — in any language you speak.',
      sample: '"I want to learn web development in Kinyarwanda"' },
    { n: "02", t0: 0.4, title: "Mwalimu builds your course",
      body: "In seconds, our AI creates a full course with 8 learning formats, rooted in African culture.",
      sample: "Generating your 6-week path…" },
    { n: "03", t0: 0.65, title: "Learn your way",
      body: "Read, listen, play, sing, or watch comics. Switch formats anytime. Your progress travels with you.",
      sample: "📖  🎧  🎮  🎵  💬  🎬  🃏  📝" },
  ];

  return (
    <div style={{ position: "absolute", inset: 0, background: L4A.cream, opacity: exit }}>
      <div style={{
        position: "absolute", top: 80, left: 80,
        fontFamily: MONO, fontSize: 13, letterSpacing: "0.2em",
        color: L4A.terracotta, textTransform: "uppercase", opacity: titleOp,
      }}>▸ How it works</div>

      <div style={{
        position: "absolute", top: 140, left: 80,
        fontFamily: SERIF, fontSize: 100, fontWeight: 500,
        color: L4A.ink, lineHeight: 1, letterSpacing: "-0.03em", opacity: titleOp,
      }}>
        Three steps. <span style={{ fontStyle: "italic", color: L4A.brown }}>Zero barriers.</span>
      </div>

      <div style={{
        position: "absolute", top: 380, left: 80, right: 80,
        display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 32,
      }}>
        {steps.map((s, i) => {
          const op = animate({ from: 0, to: 1, start: s.t0, end: s.t0 + 0.12, ease: Easing.easeOutCubic })(t);
          const sampleOp = animate({ from: 0, to: 1, start: s.t0 + 0.15, end: s.t0 + 0.25, ease: Easing.easeOutCubic })(t);
          return (
            <div key={i} style={{
              opacity: op,
              transform: `translateY(${(1 - op) * 30}px)`,
              background: "#fff", borderRadius: 20, padding: 40, minHeight: 420,
              border: `1px solid ${L4A.hairline}`,
              boxShadow: "0 30px 60px -20px rgba(31,26,21,0.12)",
              display: "flex", flexDirection: "column",
            }}>
              <div style={{ fontFamily: MONO, fontSize: 14, color: L4A.muted, letterSpacing: "0.15em", marginBottom: 36 }}>STEP {s.n}</div>
              <div style={{
                width: 56, height: 56, borderRadius: 14,
                background: L4A.ink, color: L4A.cream,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: SERIF, fontSize: 30, fontWeight: 600, marginBottom: 28,
              }}>{s.n}</div>
              <div style={{
                fontFamily: SERIF, fontSize: 38, fontWeight: 500,
                color: L4A.ink, letterSpacing: "-0.02em", lineHeight: 1.1, marginBottom: 16,
              }}>{s.title}</div>
              <div style={{
                fontFamily: SANS, fontSize: 18, color: L4A.muted,
                lineHeight: 1.5, marginBottom: 28, flex: 1,
              }}>{s.body}</div>
              <div style={{
                opacity: sampleOp,
                fontFamily: i === 2 ? SANS : MONO, fontSize: i === 2 ? 28 : 14,
                color: i === 2 ? L4A.ink : L4A.brown,
                background: L4A.cream,
                padding: i === 2 ? "16px 20px" : "14px 18px",
                borderRadius: 10,
                letterSpacing: i === 2 ? "0.1em" : "0",
                border: `1px dashed ${L4A.hairline}`,
              }}>{s.sample}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
