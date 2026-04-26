/**
 * Legacy redirect.
 *
 * The /learn page used to mix three things: a list of the user's
 * curricula (now surfaced on /portfolio and /tracks/[trackId]), a static
 * "featured courses" grid that linked to FastAPI-backed /course/[id]
 * pages, and a "Continue Learning" card backed by the legacy
 * useCourseStore. /tracks is now the canonical browse experience for
 * the six career tracks; old bookmarks land there.
 */
import { redirect } from "next/navigation";

export default function LearnPage() {
  redirect("/tracks");
}
