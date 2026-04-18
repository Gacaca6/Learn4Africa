"use client";

/**
 * Learn4Africa — Root client providers.
 *
 * Wraps the app in the NextAuth SessionProvider so useSession() works
 * anywhere in the client tree. Keep this file tiny — if we add more
 * providers later (theme, zustand hydration), compose them here.
 */

import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";
import { DemoModeBanner } from "@/components/DemoModeBanner";
import { ConvexClientProvider } from "./ConvexClientProvider";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <ConvexClientProvider>
        <DemoModeBanner />
        {children}
      </ConvexClientProvider>
    </SessionProvider>
  );
}
