import React from "react";
import { animate, clamp, Easing, L4A, MONO, SANS, SERIF } from "../utils";
import type { SceneProps } from "../Demo";

export const ScenePortfolio: React.FC<SceneProps> = ({ start, dur, time }) => {
  if (time < start || time > start + dur) return null;
  const t = clamp((time - start) / dur, 0, 1);
  const titleOp = animate({ from: 0, to: 1, start: 0, end: 0.12, ease: Easing.easeOutCubic })(t);
  const cardsOp = animate({ from: 0, to: 1, start: 0.15, end: 0.3, ease: Easing.easeOutCubic })(t);
  const exit = animate({ from: 1, to: 0, start: 0.9, end: 1, ease: Easing.easeInCubic })(t);

  const c1 = Math.floor(animate({ from: 0, to: 24, start: 0.35, end: 0.6, ease: Easing.easeOutCubic })(t));
  const c2 = Math.floor(animate({ from: 0, to: 8, start: 0.4, end: 0.65, ease: Easing.easeOutCubic })(t));
  const c3 = Math.floor(animate({ from: 0, to: 5, start: 0.45, end: 0.7, ease: Easing.easeOutCubic })(t));
  const c4 = Math.floor(animate({ from: 0, to: 12, start: 0.5, end: 0.75, ease: Easing.easeOutCubic })(t));

  const stats = [
    { icon: "📖", n: c1, label: "Modules complete" },
    { icon: "⚙︎", n: c2, label: "Hands-on projects" },
    { icon: "🎓", n: c3, label: "Mock interviews" },
    { icon: "🏆", n: c4, label: "Portfolio items" },
  ];

  const cvShine = animate({ from: 0, to: 1, start: 0.75, end: 0.9, ease: Easing.easeOutCubic })(t);

  return (
    <div style={{ position: "absolute", inset: 0, background: L4A.creamLight, opacity: exit }}>
      <div style={{
        position: "absolute", top: 70, left: 80,
        fontFamily: MONO, fontSize: 13, letterSpacing: "0.2em",
        color: L4A.terracotta, textTransform: "uppercase", opacity: titleOp,
      }}>▸ Your portfolio</div>

      <div style={{
        position: "absolute", top: 120, left: 80,
        fontFamily: SERIF, fontSize: 104, fontWeight: 500,
        color: L4A.ink, lineHeight: 1, letterSpacing: "-0.03em", opacity: titleOp,
      }}>
        Proof of what <span style={{ fontStyle: "italic", color: L4A.brown }}>you can do.</span>
      </div>

      <div style={{
        position: "absolute", top: 290, left: 80, right: 80,
        fontFamily: SANS, fontSize: 22, color: L4A.muted,
        opacity: titleOp, maxWidth: 1100, lineHeight: 1.4,
      }}>
        Every module you complete adds a real, shareable piece of work. This is what makes an employer say <em style={{ color: L4A.ink, fontFamily: SERIF, fontSize: 26 }}>yes.</em>
      </div>

      <div style={{
        position: "absolute", top: 420, left: 80, right: 80,
        display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20,
        opacity: cardsOp, transform: `translateY(${(1 - cardsOp) * 20}px)`,
      }}>
        {stats.map((s, i) => (
          <div key={i} style={{
            background: "#fff", borderRadius: 18, padding: 36,
            border: `1px solid ${L4A.hairline}`,
            boxShadow: "0 20px 50px -25px rgba(31,26,21,0.15)",
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: 12,
              background: L4A.cream,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 22, marginBottom: 24,
            }}>{s.icon}</div>
            <div style={{
              fontFamily: SERIF, fontSize: 72, fontWeight: 600,
              color: L4A.ink, lineHeight: 1, letterSpacing: "-0.03em",
              fontVariantNumeric: "tabular-nums",
            }}>{s.n}</div>
            <div style={{ fontFamily: SANS, fontSize: 16, color: L4A.muted, marginTop: 12 }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      <div style={{
        position: "absolute", bottom: 80, left: 80, right: 80,
        background: "#fff", borderRadius: 18, padding: 32,
        border: `1px solid ${L4A.hairline}`,
        boxShadow: "0 30px 60px -20px rgba(31,26,21,0.15)",
        opacity: cardsOp, transform: `translateY(${(1 - cardsOp) * 20}px)`,
        display: "flex", alignItems: "center", gap: 32,
      }}>
        <div style={{
          width: 64, height: 64, borderRadius: 14,
          background: L4A.cream, display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 28,
        }}>📄</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: SERIF, fontSize: 32, color: L4A.ink, fontWeight: 600 }}>Auto-generated CV</div>
          <div style={{ fontFamily: SANS, fontSize: 17, color: L4A.muted, marginTop: 4 }}>
            Built from your real progress. Download anytime. Share with employers.
          </div>
        </div>
        <div style={{
          padding: "14px 24px", background: L4A.brown, color: "#fff",
          borderRadius: 10, fontFamily: SANS, fontSize: 17, fontWeight: 600,
          transform: `scale(${1 + cvShine * 0.04})`,
          boxShadow: cvShine ? `0 0 0 ${cvShine * 10}px rgba(107,63,29,0.12)` : "none",
        }}>⬇ Download CV</div>
        <div style={{
          padding: "14px 24px", background: L4A.forest, color: "#fff",
          borderRadius: 10, fontFamily: SANS, fontSize: 17, fontWeight: 600,
        }}>⤴ Share profile</div>
      </div>
    </div>
  );
};
