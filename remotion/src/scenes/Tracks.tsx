import React from "react";
import { animate, clamp, Easing, L4A, MONO, SANS, SERIF } from "../utils";
import type { SceneProps } from "../Demo";

export const SceneTracks: React.FC<SceneProps> = ({ start, dur, time }) => {
  if (time < start || time > start + dur) return null;
  const t = clamp((time - start) / dur, 0, 1);
  const titleOp = animate({ from: 0, to: 1, start: 0, end: 0.08, ease: Easing.easeOutCubic })(t);
  const gridOp = animate({ from: 0, to: 1, start: 0.08, end: 0.25, ease: Easing.easeOutCubic })(t);
  const zoomStart = 0.45;
  const zoom = animate({ from: 1, to: 1.8, start: zoomStart, end: 0.7, ease: Easing.easeInOutCubic })(t);
  const panY = animate({ from: 0, to: -280, start: zoomStart, end: 0.7, ease: Easing.easeInOutCubic })(t);
  const panX = animate({ from: 0, to: 260, start: zoomStart, end: 0.7, ease: Easing.easeInOutCubic })(t);

  const cap1Op = animate({ from: 0, to: 1, start: 0.12, end: 0.25, ease: Easing.easeOutCubic })(t) *
                 (1 - animate({ from: 0, to: 1, start: 0.4, end: 0.48, ease: Easing.easeInCubic })(t));
  const cap2Op = animate({ from: 0, to: 1, start: 0.72, end: 0.85, ease: Easing.easeOutCubic })(t);

  const badge1 = animate({ from: 0, to: 1, start: 0.78, end: 0.88, ease: Easing.easeOutBack })(t);
  const badge2 = animate({ from: 0, to: 1, start: 0.83, end: 0.93, ease: Easing.easeOutBack })(t);

  const exit = animate({ from: 1, to: 0, start: 0.95, end: 1, ease: Easing.easeInCubic })(t);

  const tracks = [
    { name: "Full-Stack Web Developer", bg: L4A.brown, weeks: 16 },
    { name: "Python for Data & AI", bg: L4A.forest, weeks: 12 },
    { name: "Digital Marketing", bg: "#8a5a2b", weeks: 10 },
    { name: "Mobile App Developer", bg: "#5a3a6b", weeks: 14 },
    { name: "UI/UX Designer", bg: "#3a5a6b", weeks: 12 },
    { name: "Cloud & DevOps", bg: "#6b3a3a", weeks: 14 },
  ];

  return (
    <div style={{ position: "absolute", inset: 0, background: L4A.cream, opacity: exit, overflow: "hidden" }}>
      <div style={{
        position: "absolute", top: 60, left: 80,
        fontFamily: MONO, fontSize: 13, letterSpacing: "0.2em",
        color: L4A.terracotta, textTransform: "uppercase", opacity: titleOp,
      }}>▸ Career tracks — built for hiring</div>

      <div style={{
        position: "absolute", top: 110, left: 80, right: 80,
        fontFamily: SERIF, fontSize: 88, fontWeight: 500,
        color: L4A.ink, lineHeight: 1, letterSpacing: "-0.03em", opacity: titleOp,
      }}>
        Pick a path. <span style={{ fontStyle: "italic", color: L4A.brown }}>Land a real job.</span>
      </div>

      <div style={{
        position: "absolute", bottom: 80, left: 80, right: 80,
        display: "flex", flexDirection: "column", gap: 8, pointerEvents: "none",
      }}>
        <div style={{ opacity: cap1Op, fontFamily: SANS, fontSize: 28, color: L4A.muted, transform: `translateY(${(1 - cap1Op) * 10}px)` }}>
          Six hand-curated tracks. Each answers: <em style={{ color: L4A.ink, fontFamily: SERIF, fontSize: 32 }}>can you get hired?</em>
        </div>
        <div style={{ opacity: cap2Op, fontFamily: SANS, fontSize: 28, color: L4A.muted, transform: `translateY(${(1 - cap2Op) * 10}px)`, position: "absolute", bottom: 0 }}>
          Every module maps to a real African job — with real salary ranges in <em style={{ color: L4A.ink, fontFamily: SERIF, fontSize: 32 }}>RWF, USD, naira.</em>
        </div>
      </div>

      <div style={{
        position: "absolute", top: 280, left: 80, right: 80, height: 640,
        transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
        transformOrigin: "50% 50%",
      }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gridTemplateRows: "repeat(2, 1fr)", gap: 24, height: "100%", opacity: gridOp }}>
          {tracks.map((tr, i) => {
            const isPython = i === 1;
            return (
              <div key={i} style={{
                background: tr.bg, color: "#fff",
                borderRadius: 20, padding: 32,
                display: "flex", flexDirection: "column", justifyContent: "space-between",
                position: "relative",
                boxShadow: isPython ? "0 40px 80px -20px rgba(46,90,60,0.5)" : "none",
                outline: isPython && t > 0.6 ? "4px solid " + L4A.terracotta : "none",
                outlineOffset: 6,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 10,
                    background: "rgba(255,255,255,0.18)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: MONO, fontSize: 16,
                  }}>{isPython ? "📊" : ["</>", "📱", "📈", "🎨", "☁️"][i > 1 ? i - 1 : 0]}</div>
                  <div style={{
                    fontFamily: MONO, fontSize: 12, letterSpacing: "0.1em",
                    background: "rgba(255,255,255,0.12)", padding: "6px 12px", borderRadius: 999,
                  }}>◷ {tr.weeks} weeks</div>
                </div>
                <div>
                  <div style={{
                    fontFamily: SERIF, fontSize: 34, fontWeight: 500,
                    lineHeight: 1.05, letterSpacing: "-0.02em",
                  }}>{tr.name}</div>
                  {isPython && (
                    <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 6 }}>
                      <div style={{ fontFamily: MONO, fontSize: 12, letterSpacing: "0.15em", opacity: 0.8 }}>TARGET ROLES</div>
                      <div style={{ fontFamily: SANS, fontSize: 17, fontWeight: 500 }}>Data Analyst · Data Scientist · AI Engineer</div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{
        position: "absolute",
        top: 360, right: 140,
        background: "#fff", padding: "16px 22px",
        borderRadius: 14, boxShadow: "0 30px 60px rgba(0,0,0,0.2)",
        opacity: badge1, transform: `translateY(${(1 - badge1) * 12}px) scale(${0.9 + badge1 * 0.1})`,
        maxWidth: 300,
      }}>
        <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: "0.15em", color: L4A.muted, marginBottom: 6 }}>DATA SCIENTIST</div>
        <div style={{ fontFamily: SERIF, fontSize: 24, color: L4A.forest, fontWeight: 600 }}>600k – 1.2M RWF/mo</div>
        <div style={{ fontFamily: SANS, fontSize: 13, color: L4A.muted, marginTop: 4 }}>CMU-Africa · AIMS Rwanda · Irembo</div>
      </div>
      <div style={{
        position: "absolute",
        bottom: 260, right: 200,
        background: "#fff", padding: "16px 22px",
        borderRadius: 14, boxShadow: "0 30px 60px rgba(0,0,0,0.2)",
        opacity: badge2, transform: `translateY(${(1 - badge2) * 12}px) scale(${0.9 + badge2 * 0.1})`,
        maxWidth: 300,
      }}>
        <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: "0.15em", color: L4A.muted, marginBottom: 6 }}>AI ENGINEER · REMOTE</div>
        <div style={{ fontFamily: SERIF, fontSize: 24, color: L4A.forest, fontWeight: 600 }}>$1,000 – $2,500/mo</div>
        <div style={{ fontFamily: SANS, fontSize: 13, color: L4A.muted, marginTop: 4 }}>Andela · Remote International</div>
      </div>
    </div>
  );
};
