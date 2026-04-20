import React from "react";

export const ChapterHUD: React.FC<{ time: number; duration: number }> = ({ time }) => {
  const chapters = [
    { t: 0, label: "Intro" },
    { t: 10, label: "The home" },
    { t: 28, label: "Why" },
    { t: 45, label: "Mwalimu" },
    { t: 65, label: "How it works" },
    { t: 88, label: "Career tracks" },
    { t: 112, label: "Build a path" },
    { t: 132, label: "AI tutor" },
    { t: 155, label: "Portfolio" },
    { t: 172, label: "Close" },
  ];
  let idx = 0;
  for (let i = 0; i < chapters.length; i++) if (time >= chapters[i].t) idx = i;
  const cur = chapters[idx];
  const mm = String(Math.floor(time / 60)).padStart(1, "0");
  const ss = String(Math.floor(time % 60)).padStart(2, "0");
  return (
    <div style={{
      position: "absolute", top: 32, right: 40,
      display: "flex", alignItems: "center", gap: 14,
      padding: "10px 18px",
      background: "rgba(0,0,0,0.35)",
      border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: 999,
      color: "rgba(255,255,255,0.9)",
      fontFamily: '"JetBrains Mono", ui-monospace, monospace',
      fontSize: 12, letterSpacing: "0.1em",
      backdropFilter: "blur(8px)",
      zIndex: 10,
    }}>
      <span style={{ opacity: 0.6 }}>{String(idx + 1).padStart(2, "0")}/{String(chapters.length).padStart(2, "0")}</span>
      <span style={{ textTransform: "uppercase" }}>{cur.label}</span>
      <span style={{ opacity: 0.6 }}>{mm}:{ss}</span>
    </div>
  );
};
