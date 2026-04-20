import React from "react";
import { staticFile } from "remotion";
import { animate, clamp, Easing, L4A, MONO, SANS, SERIF } from "../utils";
import type { SceneProps } from "../Demo";

export const SceneHero: React.FC<SceneProps> = ({ start, dur, time }) => {
  if (time < start || time > start + dur) return null;
  const t = clamp((time - start) / dur, 0, 1);
  const imgOp = animate({ from: 0, to: 1, start: 0, end: 0.15, ease: Easing.easeOutCubic })(t);
  const imgScale = animate({ from: 1.05, to: 1.12, start: 0, end: 1, ease: Easing.linear })(t);
  const captionOp = animate({ from: 0, to: 1, start: 0.15, end: 0.3, ease: Easing.easeOutCubic })(t);
  const pill1 = animate({ from: 0, to: 1, start: 0.35, end: 0.5, ease: Easing.easeOutBack })(t);
  const pill2 = animate({ from: 0, to: 1, start: 0.45, end: 0.6, ease: Easing.easeOutBack })(t);
  const pill3 = animate({ from: 0, to: 1, start: 0.55, end: 0.7, ease: Easing.easeOutBack })(t);
  const exit = animate({ from: 1, to: 0, start: 0.9, end: 1, ease: Easing.easeInCubic })(t);

  const pills = [
    { label: "Free forever", top: 120, left: 1380, delay: pill1, color: L4A.terracotta },
    { label: "No sign-up", top: 340, left: 1420, delay: pill2, color: L4A.forest },
    { label: "Built for Africa", top: 560, left: 1360, delay: pill3, color: L4A.brown },
  ];

  return (
    <div style={{ position: "absolute", inset: 0, background: L4A.ink, opacity: exit, overflow: "hidden" }}>
      <div style={{
        position: "absolute", inset: 0,
        opacity: imgOp,
        transform: `scale(${imgScale})`,
        transformOrigin: "40% 50%",
      }}>
        <img src={staticFile("assets/01-hero.png")} style={{
          width: "100%", height: "100%", objectFit: "cover", display: "block",
        }}/>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.25) 45%, rgba(0,0,0,0.65) 100%)" }}/>
      </div>

      <div style={{ position: "absolute", left: 80, bottom: 120, opacity: captionOp, maxWidth: 880 }}>
        <div style={{
          fontFamily: MONO, fontSize: 13, letterSpacing: "0.2em",
          color: "rgba(255,255,255,0.7)", textTransform: "uppercase", marginBottom: 20,
        }}>
          ▸ The home screen
        </div>
        <div style={{
          fontFamily: SERIF, fontSize: 72, fontWeight: 500,
          color: "#fff", lineHeight: 1.02, letterSpacing: "-0.02em",
        }}>
          Open the browser.<br/>
          <span style={{ fontStyle: "italic", color: "#f5d9c2" }}>Start learning.</span>
        </div>
        <div style={{
          fontFamily: SANS, fontSize: 22, color: "rgba(255,255,255,0.8)",
          marginTop: 24, maxWidth: 760, lineHeight: 1.4,
        }}>
          No downloads. No accounts. Just Mwalimu, our African AI tutor, waiting to teach you.
        </div>
      </div>

      {pills.map((p, i) => (
        <div key={i} style={{
          position: "absolute", top: p.top, left: p.left,
          opacity: p.delay, transform: `translateY(${(1 - p.delay) * 20}px) scale(${0.8 + p.delay * 0.2})`,
          background: "rgba(255,255,255,0.95)",
          padding: "14px 22px", borderRadius: 999,
          fontFamily: SANS, fontSize: 20, fontWeight: 600,
          color: p.color,
          boxShadow: "0 20px 40px rgba(0,0,0,0.3)",
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <div style={{ width: 10, height: 10, borderRadius: 5, background: p.color }}/>
          {p.label}
        </div>
      ))}
    </div>
  );
};
