import React from "react";
import { staticFile } from "remotion";
import { animate, clamp, Easing, L4A, MONO, SANS, SERIF } from "../utils";
import type { SceneProps } from "../Demo";

export const SceneMwalimu: React.FC<SceneProps> = ({ start, dur, time }) => {
  if (time < start || time > start + dur) return null;
  const t = clamp((time - start) / dur, 0, 1);
  const imgOp = animate({ from: 0, to: 1, start: 0, end: 0.2, ease: Easing.easeOutCubic })(t);
  const textOp = animate({ from: 0, to: 1, start: 0.2, end: 0.35, ease: Easing.easeOutCubic })(t);
  const exit = animate({ from: 1, to: 0, start: 0.92, end: 1, ease: Easing.easeInCubic })(t);

  const langs = ["English", "Swahili", "Hausa", "Yoruba", "French", "Arabic", "Amharic", "Zulu", "Kinyarwanda"];
  const langBase = 0.4;
  const langStep = 0.04;

  return (
    <div style={{ position: "absolute", inset: 0, background: L4A.creamLight, opacity: exit }}>
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "48%", opacity: imgOp, overflow: "hidden" }}>
        <img src={staticFile("assets/03-mwalimu.png")} style={{
          position: "absolute", top: -60, left: -40,
          width: 1250, height: "auto",
          transform: `scale(${1.02 + t * 0.04})`,
          transformOrigin: "center",
        }}/>
        <div style={{ position: "absolute", inset: 0,
          background: "linear-gradient(90deg, transparent 65%, rgba(250,246,239,1) 100%)" }}/>
      </div>

      <div style={{
        position: "absolute", right: 80, top: 120, width: 820,
        opacity: textOp, transform: `translateY(${(1 - textOp) * 20}px)`,
      }}>
        <div style={{
          fontFamily: MONO, fontSize: 13, letterSpacing: "0.2em",
          color: L4A.terracotta, textTransform: "uppercase", marginBottom: 24,
        }}>
          ▸ Meet your tutor
        </div>
        <div style={{
          fontFamily: SERIF, fontSize: 120, fontWeight: 500,
          color: L4A.ink, lineHeight: 0.95, letterSpacing: "-0.03em",
        }}>
          Mwalimu.
        </div>
        <div style={{
          fontFamily: SANS, fontSize: 22, color: L4A.muted,
          marginTop: 20, letterSpacing: "-0.005em",
        }}>
          <span style={{ fontStyle: "italic", fontFamily: SERIF, fontSize: 26 }}>/mwa-LEE-moo/</span> — "teacher" in Swahili.
        </div>
        <div style={{
          fontFamily: SERIF, fontSize: 30, color: L4A.ink2,
          marginTop: 40, lineHeight: 1.35, letterSpacing: "-0.01em",
        }}>
          She notices when you're stuck, switches your learning format, and guides you with the patience of a caring older sibling.
        </div>

        <div style={{
          marginTop: 56,
          fontFamily: MONO, fontSize: 12, letterSpacing: "0.2em",
          color: L4A.muted, textTransform: "uppercase", marginBottom: 16,
        }}>
          Speaks nine African languages
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, maxWidth: 780 }}>
          {langs.map((l, i) => {
            const o = animate({ from: 0, to: 1, start: langBase + i * langStep, end: langBase + i * langStep + 0.1, ease: Easing.easeOutBack })(t);
            return (
              <div key={l} style={{
                opacity: o, transform: `translateY(${(1 - o) * 10}px) scale(${0.85 + o * 0.15})`,
                padding: "12px 20px", borderRadius: 999,
                background: L4A.ink, color: L4A.cream,
                fontFamily: SANS, fontSize: 18, fontWeight: 500,
              }}>{l}</div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
