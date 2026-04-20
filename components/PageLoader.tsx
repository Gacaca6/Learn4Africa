"use client";

/**
 * Learn4Africa — thin global progress bar at the top of every page.
 *
 * Fires on every pathname change. 600ms shimmer — visible enough to
 * confirm navigation, short enough not to get in the way. Modelled
 * after YouTube / GitHub. Prevents the "did it click?" hesitation
 * between page transitions on slower connections.
 */

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export function PageLoader() {
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const timer = window.setTimeout(() => setLoading(false), 600);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  if (!loading) return null;

  return (
    <div
      aria-hidden
      className="fixed top-0 left-0 right-0 h-[3px] z-[9999] page-loader-shimmer"
    />
  );
}
