"use client";

/**
 * Learn4Africa — reusable skeleton shown while Mwalimu is thinking.
 *
 * Used anywhere AI content is loading so the student never sees an
 * empty panel. A small pulsing "M" avatar + animated lines + honest
 * "Mwalimu is thinking..." label.
 */

interface MwalimuSkeletonProps {
  lines?: number;
  label?: string;
}

export function MwalimuSkeleton({
  lines = 4,
  label = "Mwalimu is thinking...",
}: MwalimuSkeletonProps) {
  return (
    <div className="p-4 sm:p-5">
      <div className="w-9 h-9 rounded-full bg-zigama-100 flex items-center justify-center mb-3 animate-pulse text-zigama-800 font-bold text-sm">
        M
      </div>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-3.5 rounded bg-warm-100 mb-2 animate-pulse"
          style={{
            width: i === lines - 1 ? "60%" : "100%",
            animationDelay: `${i * 100}ms`,
          }}
        />
      ))}
      <p className="text-xs text-warm-400 mt-2">{label}</p>
    </div>
  );
}
