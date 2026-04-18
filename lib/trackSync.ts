/**
 * Learn4Africa — track progress writeback via Convex.
 *
 * Writes the learner's zustand track actions (start, complete module,
 * quiz score, portfolio entry) into Convex so progress follows them
 * across devices.
 *
 * Design rules (unchanged from the FastAPI era):
 *   1. Never throw — a failed network call must not block the UI.
 *      We console.warn and move on.
 *   2. Never write for signed-out learners; their progress stays
 *      device-local in zustand.
 *   3. Fire-and-forget from the caller: `void syncModuleComplete(...)`.
 */
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL;

// One client, reused — keeps cookies / connection state consistent.
const client: ConvexHttpClient | null = CONVEX_URL
  ? new ConvexHttpClient(CONVEX_URL)
  : null;

/**
 * Pull the signed-in user's Convex `_id` out of the NextAuth session.
 * Returns null when logged out, when running on the server, or when
 * the session hasn't been populated with an id yet.
 */
async function getUserId(): Promise<Id<"users"> | null> {
  if (typeof window === "undefined") return null;
  try {
    const { getSession } = await import("next-auth/react");
    const session = await getSession();
    const id = (session?.user as any)?.id;
    return id ? (id as Id<"users">) : null;
  } catch {
    return null;
  }
}

/** Guard that short-circuits when we can't write. */
async function ensureReady(): Promise<
  { userId: Id<"users">; client: ConvexHttpClient } | null
> {
  if (!client) {
    console.warn("[trackSync] NEXT_PUBLIC_CONVEX_URL not set; skipping write");
    return null;
  }
  const userId = await getUserId();
  if (!userId) return null;
  return { userId, client };
}

export async function syncTrackStart(trackId: string): Promise<void> {
  const ready = await ensureReady();
  if (!ready) return;
  try {
    await ready.client.mutation(api.progress.startTrack, {
      userId: ready.userId,
      trackId,
    });
  } catch (err) {
    console.warn("[trackSync] syncTrackStart failed", err);
  }
}

export async function syncModuleComplete(
  trackId: string,
  moduleNumber: number,
): Promise<void> {
  const ready = await ensureReady();
  if (!ready) return;
  try {
    await ready.client.mutation(api.progress.completeModule, {
      userId: ready.userId,
      trackId,
      moduleNumber,
    });
  } catch (err) {
    console.warn("[trackSync] syncModuleComplete failed", err);
  }
}

export async function syncQuizScore(
  trackId: string,
  moduleNumber: number,
  score: number,
  total: number,
): Promise<void> {
  const ready = await ensureReady();
  if (!ready) return;
  try {
    await ready.client.mutation(api.progress.recordQuizScore, {
      userId: ready.userId,
      trackId,
      moduleNumber,
      score,
      total,
    });
  } catch (err) {
    console.warn("[trackSync] syncQuizScore failed", err);
  }
}

interface PortfolioItemPayload {
  project_name: string;
  description?: string;
  github_url?: string;
  live_url?: string;
  tech_stack?: string[];
}

export async function syncPortfolioItem(
  trackId: string,
  moduleNumber: number,
  item: PortfolioItemPayload,
): Promise<void> {
  const ready = await ensureReady();
  if (!ready) return;
  try {
    await ready.client.mutation(api.progress.addPortfolioItem, {
      userId: ready.userId,
      trackId,
      moduleNumber,
      projectName: item.project_name,
      description: item.description,
      githubUrl: item.github_url,
      liveUrl: item.live_url,
      techStack: item.tech_stack,
    });
  } catch (err) {
    console.warn("[trackSync] syncPortfolioItem failed", err);
  }
}
