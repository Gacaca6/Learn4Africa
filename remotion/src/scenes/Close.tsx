import React from "react";
import { animate, clamp, Easing, L4A, MONO, SANS, SERIF } from "../utils";
import { BrandMark } from "../BrandMark";
import type { SceneProps } from "../Demo";

export const SceneClose: React.FC<SceneProps> = ({ start, dur, time }) => {
  if (time < start || time > start + dur) return null;
  const t = clamp((time - start) / dur, 0, 1);
  const logoOp = animate({ from: 0, to: 1, start: 0.05, end: 0.25, ease: Easing.easeOutCubic })(t);
  const line1 = animate({ from: 0, to: 1, start: 0.2, end: 0.4, ease: Easing.easeOutCubic })(t);
  const line2 = animate({ from: 0, to: 1, start: 0.35, end: 0.55, ease: Easing.easeOutCubic })(t);
  const url = animate({ from: 0, to: 1, start: 0.5, end: 0.7, ease: Easing.easeOutCubic })(t);

  return (
    <div style={{ position: "absolute", inset: 0, background: L4A.ink, overflow: "hidden" }}>
      <div style={{
        position: "absolute", inset: 0,
        background: "radial-gradient(ellipse at 50% 40%, rgba(184,106,63,0.25), transparent 60%)",
      }}/>

      <div style={{
        position: "absolute", top: 140, left: "50%", transform: "translateX(-50%)",
        opacity: logoOp,
      }}>
        <BrandMark size={56} color={L4A.cream}/>
      </div>

      <div style={{
        position: "absolute", top: 320, left: 0, right: 0,
        textAlign: "center",
        fontFamily: SERIF, fontSize: 140, fontWeight: 500,
        color: "#fff", lineHeight: 0.95, letterSpacing: "-0.03em",
        opacity: line1, transform: `translateY(${(1 - line1) * 20}px)`,
      }}>
        Any topic.
      </div>
      <div style={{
        position: "absolute", top: 470, left: 0, right: 0,
        textAlign: "center",
        fontFamily: SERIF, fontSize: 140, fontWeight: 500, fontStyle: "italic",
        color: "#e8b88f", lineHeight: 0.95, letterSpacing: "-0.03em",
        opacity: line2, transform: `translateY(${(1 - line2) * 20}px)`,
      }}>
        Taught the African way.
      </div>

      <div style={{
        position: "absolute", top: 700, left: 0, right: 0,
        textAlign: "center",
        fontFamily: SANS, fontSize: 24, letterSpacing: "0.15em",
        color: "rgba(255,255,255,0.75)", textTransform: "uppercase",
        opacity: url,
      }}>
        Free forever · No sign-up
      </div>
      <div style={{
        position: "absolute", top: 760, left: 0, right: 0,
        textAlign: "center",
        fontFamily: MONO, fontSize: 32,
        color: L4A.terracotta, opacity: url,
      }}>
        learn4africa.com
      </div>

      <div style={{
        position: "absolute", bottom: 60, left: 0, right: 0,
        textAlign: "center",
        fontFamily: MONO, fontSize: 12, letterSpacing: "0.2em",
        color: "rgba(255,255,255,0.4)", opacity: url,
      }}>
        POWERED BY MWALIMU AI · BUILT IN KIGALI
      </div>
    </div>
  );
};
