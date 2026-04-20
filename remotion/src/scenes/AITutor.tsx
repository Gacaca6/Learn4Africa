import React from "react";
import { animate, clamp, Easing, L4A, MONO, SANS, SERIF } from "../utils";
import type { SceneProps } from "../Demo";

export const SceneAITutor: React.FC<SceneProps> = ({ start, dur, time }) => {
  if (time < start || time > start + dur) return null;
  const t = clamp((time - start) / dur, 0, 1);
  const localT = time - start;
  const titleOp = animate({ from: 0, to: 1, start: 0, end: 0.1, ease: Easing.easeOutCubic })(t);
  const chatOp = animate({ from: 0, to: 1, start: 0.1, end: 0.2, ease: Easing.easeOutCubic })(t);
  const exit = animate({ from: 1, to: 0, start: 0.94, end: 1, ease: Easing.easeInCubic })(t);

  const msgs = [
    { role: "ai", text: "Muraha Mikel Godwin! I am Mwalimu. What would you like to learn today?", showAt: 3.0 },
    { role: "user", text: "Teach me how to use pandas for data analysis — in Kinyarwanda please.", showAt: 5.5 },
    { role: "ai", text: "Nibyiza! Let's start simple. Pandas ni \"toolkit\" yo gusesengura amakuru — like a smart spreadsheet for Python. Would you prefer a story, a comic, or a hands-on exercise?", showAt: 8.5 },
    { role: "user", text: "A comic! With examples about MINAGRI crop prices.", showAt: 11.5 },
    { role: "ai", text: "✨ Generating your comic on pandas with Rwandan crop data…", showAt: 14, typing: true },
  ];

  return (
    <div style={{ position: "absolute", inset: 0, background: L4A.creamLight, opacity: exit }}>
      <div style={{
        position: "absolute", top: 60, left: 80,
        fontFamily: MONO, fontSize: 13, letterSpacing: "0.2em",
        color: L4A.terracotta, textTransform: "uppercase", opacity: titleOp,
      }}>▸ Free-roaming chat with Mwalimu</div>

      <div style={{
        position: "absolute", top: 110, left: 80,
        fontFamily: SERIF, fontSize: 76, fontWeight: 500,
        color: L4A.ink, lineHeight: 1, letterSpacing: "-0.03em", opacity: titleOp,
      }}>
        Ask her <span style={{ fontStyle: "italic", color: L4A.brown }}>anything.</span>
      </div>

      <div style={{
        position: "absolute", top: 250, left: 160, right: 160, bottom: 100,
        background: "#fff", borderRadius: 20,
        border: `1px solid ${L4A.hairline}`,
        boxShadow: "0 40px 80px -30px rgba(31,26,21,0.15)",
        opacity: chatOp, transform: `translateY(${(1 - chatOp) * 20}px)`,
        display: "flex", flexDirection: "column",
        overflow: "hidden",
      }}>
        <div style={{ padding: "24px 32px", borderBottom: `1px solid ${L4A.hairline}`, display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 44, height: 44, borderRadius: 22, background: L4A.brown, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: SERIF, fontSize: 22, fontWeight: 600 }}>M</div>
          <div>
            <div style={{ fontFamily: SANS, fontSize: 18, fontWeight: 700, color: L4A.ink }}>Mwalimu</div>
            <div style={{ fontFamily: SANS, fontSize: 14, color: L4A.muted }}>Free-roaming chat · speaks 9 languages</div>
          </div>
        </div>

        <div style={{ flex: 1, padding: "32px 40px", display: "flex", flexDirection: "column", gap: 20, overflow: "hidden" }}>
          {msgs.map((m, i) => {
            if (localT < m.showAt) return null;
            const age = localT - m.showAt;
            const op = clamp(age / 0.3, 0, 1);
            const ty = (1 - op) * 12;
            const isAI = m.role === "ai";
            return (
              <div key={i} style={{
                alignSelf: isAI ? "flex-start" : "flex-end",
                maxWidth: "72%",
                opacity: op, transform: `translateY(${ty}px)`,
                display: "flex", gap: 12, flexDirection: isAI ? "row" : "row-reverse", alignItems: "flex-end",
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 18,
                  background: isAI ? L4A.cream : L4A.ink,
                  color: isAI ? L4A.brown : "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: SERIF, fontSize: 16, fontWeight: 600,
                  flexShrink: 0,
                }}>{isAI ? "✿" : "M"}</div>
                <div style={{
                  background: isAI ? L4A.cream : L4A.ink,
                  color: isAI ? L4A.ink : "#fff",
                  padding: "16px 22px",
                  borderRadius: 18,
                  borderBottomLeftRadius: isAI ? 4 : 18,
                  borderBottomRightRadius: isAI ? 18 : 4,
                  fontFamily: SANS, fontSize: 18, lineHeight: 1.4,
                }}>
                  {m.text}
                  {m.typing && (
                    <span style={{ display: "inline-block", marginLeft: 6 }}>
                      {[0, 1, 2].map((d) => (
                        <span key={d} style={{
                          display: "inline-block", width: 6, height: 6, borderRadius: 3,
                          background: L4A.muted, margin: "0 2px",
                          opacity: 0.3 + 0.7 * Math.abs(Math.sin((localT + d * 0.2) * 4)),
                        }}/>
                      ))}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ padding: "20px 40px 32px" }}>
          <div style={{
            background: L4A.cream, borderRadius: 14,
            padding: "18px 22px",
            fontFamily: SANS, fontSize: 17, color: L4A.muted,
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <span>Ask Mwalimu anything…</span>
            <div style={{
              width: 36, height: 36, borderRadius: 18,
              background: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
              color: L4A.brown, fontSize: 16,
            }}>➤</div>
          </div>
        </div>
      </div>
    </div>
  );
};
