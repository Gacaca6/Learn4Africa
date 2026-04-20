import React from "react";
import { L4A, SANS } from "./utils";

export const BrandMark: React.FC<{ size?: number; color?: string }> = ({
  size = 24,
  color = L4A.ink,
}) => {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 10, color }}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10.5" stroke={color} strokeWidth="1.5" />
        <path
          d="M1.5 12h21M12 1.5c2.8 3 4.2 6.8 4.2 10.5S14.8 19.5 12 22.5M12 1.5C9.2 4.5 7.8 8.3 7.8 12s1.4 7.5 4.2 10.5"
          stroke={color}
          strokeWidth="1.2"
        />
      </svg>
      <span
        style={{
          fontFamily: SANS,
          fontWeight: 700,
          fontSize: size * 0.75,
          letterSpacing: "-0.01em",
        }}
      >
        Learn4Africa
      </span>
    </div>
  );
};
