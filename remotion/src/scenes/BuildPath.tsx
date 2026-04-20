import React from "react";
import { animate, clamp, Easing, L4A, MONO, SANS, SERIF } from "../utils";
import type { SceneProps } from "../Demo";

export const SceneBuildPath: React.FC<SceneProps> = ({ start, dur, time }) => {
  if (time < start || time > start + dur) return null;
  const t = clamp((time - start) / dur, 0, 1);
  const titleOp = animate({ from: 0, to: 1, start: 0, end: 0.12, ease: Easing.easeOutCubic })(t);
  const formOp = animate({ from: 0, to: 1, start: 0.12, end: 0.25, ease: Easing.easeOutCubic })(t);
  const exit = animate({ from: 1, to: 0, start: 0.92, end: 1, ease: Easing.easeInCubic })(t);

  const goalFull = "I want to become a web developer and get a job in Kigali";
  const typeStart = 0.3;
  const typeEnd = 0.6;
  const chars = Math.floor(animate({ from: 0, to: goalFull.length, start: typeStart, end: typeEnd, ease: Easing.linear })(t));
  const typed = goalFull.slice(0, chars);
  const showCaret = typed.length < goalFull.length;

  const selectHover = animate({ from: 0, to: 1, start: 0.62, end: 0.7, ease: Easing.easeOutCubic })(t);
  const btnHover = animate({ from: 0, to: 1, start: 0.72, end: 0.82, ease: Easing.easeOutCubic })(t);
  const btnGlow = t > 0.82 ? 1 : 0;

  return (
    <div style={{ position: "absolute", inset: 0, background: L4A.creamLight, opacity: exit }}>
      <div style={{
        position: "absolute", top: 80, left: 80,
        fontFamily: MONO, fontSize: 13, letterSpacing: "0.2em",
        color: L4A.terracotta, textTransform: "uppercase", opacity: titleOp,
      }}>▸ Don't see your path? Build it.</div>

      <div style={{
        position: "absolute", top: 140, left: 80, right: 80,
        fontFamily: SERIF, fontSize: 88, fontWeight: 500,
        color: L4A.ink, lineHeight: 1, letterSpacing: "-0.03em", opacity: titleOp,
      }}>
        What do you want <span style={{ fontStyle: "italic", color: L4A.brown }}>to learn?</span>
      </div>

      <div style={{
        position: "absolute", top: 380, left: 240, right: 240,
        opacity: formOp, transform: `translateY(${(1 - formOp) * 20}px)`,
      }}>
        <div style={{
          background: "#fff", borderRadius: 20, padding: 48,
          border: `1px solid ${L4A.hairline}`,
          boxShadow: "0 40px 80px -30px rgba(31,26,21,0.15)",
        }}>
          <div style={{ fontFamily: MONO, fontSize: 12, letterSpacing: "0.15em", color: L4A.muted, marginBottom: 12 }}>YOUR LEARNING GOAL</div>
          <div style={{
            fontFamily: SERIF, fontSize: 36, color: L4A.ink,
            padding: "24px 0", borderBottom: `2px solid ${L4A.hairline}`,
            minHeight: 80, letterSpacing: "-0.01em",
          }}>
            {typed}
            {showCaret && t > typeStart && (
              <span style={{
                display: "inline-block", width: 3, height: 36,
                background: L4A.terracotta, marginLeft: 3,
                verticalAlign: "middle",
                opacity: Math.floor((time - start) * 2) % 2,
              }}/>
            )}
          </div>

          <div style={{ fontFamily: MONO, fontSize: 12, letterSpacing: "0.15em", color: L4A.muted, marginTop: 40, marginBottom: 16 }}>WHAT'S YOUR CURRENT LEVEL?</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
            {["Complete beginner", "I know a little", "Intermediate — go deeper"].map((lvl, i) => {
              const active = i === 0;
              const scale = active ? 1 + selectHover * 0.02 : 1;
              return (
                <div key={i} style={{
                  padding: 24, borderRadius: 14,
                  border: `2px solid ${active && selectHover > 0.5 ? L4A.ink : L4A.hairline}`,
                  background: active && selectHover > 0.5 ? L4A.cream : "#fff",
                  fontFamily: SANS, fontSize: 18, fontWeight: 600, color: L4A.ink,
                  transform: `scale(${scale})`,
                  position: "relative",
                }}>
                  {lvl}
                  <div style={{ fontSize: 14, fontWeight: 400, color: L4A.muted, marginTop: 4 }}>
                    {["I have never learned this before", "I have some basics but want structure", "I want to build real expertise"][i]}
                  </div>
                  {active && selectHover > 0.5 && (
                    <div style={{ position: "absolute", top: 16, right: 16, color: L4A.ink, fontSize: 20 }}>✓</div>
                  )}
                </div>
              );
            })}
          </div>

          <div style={{ display: "flex", justifyContent: "center", marginTop: 40 }}>
            <div style={{
              padding: "18px 36px",
              background: btnHover > 0.5 ? L4A.ink : "#9a958d",
              color: "#fff", borderRadius: 12,
              fontFamily: SANS, fontSize: 20, fontWeight: 600,
              display: "flex", alignItems: "center", gap: 10,
              transform: `scale(${1 + btnGlow * 0.03})`,
              boxShadow: btnGlow ? "0 0 0 8px rgba(31,26,21,0.08)" : "none",
            }}>
              ✦ Build My Curriculum →
            </div>
          </div>
          <div style={{ textAlign: "center", fontFamily: SANS, fontSize: 14, color: L4A.muted, marginTop: 14 }}>
            No sign-up. Takes ~15 seconds. Free forever.
          </div>
        </div>
      </div>
    </div>
  );
};
