"use client";

/**
 * Learn4Africa — Demo-mode banner.
 *
 * Surfaces a small amber strip at the top of the viewport when the
 * backend is running against the local_json fallback store instead
 * of a real MongoDB. Written progress still works, but it is
 * device-local. We want learners to know that before they invest
 * hours of study time.
 *
 * Behaviour:
 *   - On mount, fetches GET /status (no auth).
 *   - If response.mongo.backend === "local_json", the banner renders.
 *   - A close button dismisses the banner for the rest of this tab
 *     (sessionStorage — returns next time a fresh tab is opened).
 */

import { useEffect, useState } from "react";

const DISMISS_KEY = "learn4africa_demo_banner_dismissed";

// We do NOT use apiFetch here — the client injects NextAuth bearer
// headers and we want this call to be strictly unauthenticated so
// it is visible to logged-out visitors too.
const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";

interface StatusResponse {
  mongo?: {
    backend?: string;
    available?: boolean;
  };
}

export function DemoModeBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Respect session-scoped dismissals before touching the network.
    if (typeof window !== "undefined") {
      try {
        if (sessionStorage.getItem(DISMISS_KEY) === "1") return;
      } catch {
        /* sessionStorage may be unavailable (privacy mode) — proceed */
      }
    }

    let cancelled = false;
    async function probe() {
      try {
        const res = await fetch(`${API_URL}/status`, {
          method: "GET",
          headers: { Accept: "application/json" },
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = (await res.json()) as StatusResponse;
        if (!cancelled && data?.mongo?.backend === "local_json") {
          setShow(true);
        }
      } catch {
        // Network error — stay silent. Offline visitors do not need
        // another error banner.
      }
    }
    probe();
    return () => {
      cancelled = true;
    };
  }, []);

  function dismiss() {
    setShow(false);
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
  }

  if (!show) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-0 left-0 right-0 z-[60] bg-amber-100 border-b border-amber-300 text-amber-900 text-xs sm:text-sm"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2 flex items-center justify-between gap-3">
        <span className="leading-snug">
          <span className="font-semibold">Demo mode:</span> your progress is
          saved locally on this device only.
        </span>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss demo-mode banner"
          className="shrink-0 text-amber-700 hover:text-amber-900 font-bold text-base leading-none px-2 py-1 rounded hover:bg-amber-200/60 transition-colors"
        >
          &times;
        </button>
      </div>
    </div>
  );
}
