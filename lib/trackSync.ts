/**
 * Learn4Africa — best-effort track progress writeback.
 *
 * These helpers mirror the local zustand mutations onto the FastAPI
 * backend so that a signed-in learner's MongoDB progress stays in
 * sync with whatever they did on the device.
 *
 * Design rules:
 *   1. Never throw — a failed network call must not block the UI or
 *      the local store update. We console.warn and move on.
 *   2. Never call the backend if the learner is signed out. There is
 *      no session to authenticate the request against; logging out
 *      learners still get useful local progress.
 *   3. Every call is fire-and-forget from the caller's perspective,
 *      but awaits internally so errors are caught (we return void).
 */
import { apiPost } from "./apiClient";

interface PortfolioItemPayload {
  module_number: number;
  project_name: string;
  description?: string;
  github_url?: string;
  live_url?: string;
  tech_stack?: string[];
}

/**
 * Return the current NextAuth backend token, or null when logged
 * out / running on the server. Lazy-imports `next-auth/react` so
 * this file remains tree-shakable on the server.
 */
async function getBackendToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  try {
    const { getSession } = await import("next-auth/react");
    const session = await getSession();
    return (session as any)?.backendToken ?? null;
  } catch {
    return null;
  }
}

/** POST /api/v1/tracks/{trackId}/start */
export async function syncTrackStart(trackId: string): Promise<void> {
  const token = await getBackendToken();
  if (!token) {
    console.info("[trackSync] skipping start — no session");
    return;
  }
  try {
    await apiPost(`/api/v1/tracks/${encodeURIComponent(trackId)}/start`, {}, {
      token,
    });
  } catch (err) {
    console.warn("[trackSync] syncTrackStart failed", err);
  }
}

/** POST /api/v1/tracks/{trackId}/modules/{moduleNumber}/complete */
export async function syncModuleComplete(
  trackId: string,
  moduleNumber: number
): Promise<void> {
  const token = await getBackendToken();
  if (!token) {
    console.info("[trackSync] skipping module complete — no session");
    return;
  }
  try {
    await apiPost(
      `/api/v1/tracks/${encodeURIComponent(trackId)}/modules/${moduleNumber}/complete`,
      {},
      { token }
    );
  } catch (err) {
    console.warn("[trackSync] syncModuleComplete failed", err);
  }
}

/** POST /api/v1/tracks/{trackId}/modules/{moduleNumber}/quiz-score */
export async function syncQuizScore(
  trackId: string,
  moduleNumber: number,
  score: number,
  total: number
): Promise<void> {
  const token = await getBackendToken();
  if (!token) {
    console.info("[trackSync] skipping quiz score — no session");
    return;
  }
  try {
    await apiPost(
      `/api/v1/tracks/${encodeURIComponent(trackId)}/modules/${moduleNumber}/quiz-score`,
      { score, total },
      { token }
    );
  } catch (err) {
    console.warn("[trackSync] syncQuizScore failed", err);
  }
}

/** POST /api/v1/tracks/{trackId}/portfolio */
export async function syncPortfolioItem(
  trackId: string,
  moduleNumber: number,
  item: Omit<PortfolioItemPayload, "module_number">
): Promise<void> {
  const token = await getBackendToken();
  if (!token) {
    console.info("[trackSync] skipping portfolio — no session");
    return;
  }
  try {
    await apiPost(
      `/api/v1/tracks/${encodeURIComponent(trackId)}/portfolio`,
      { module_number: moduleNumber, ...item },
      { token }
    );
  } catch (err) {
    console.warn("[trackSync] syncPortfolioItem failed", err);
  }
}
