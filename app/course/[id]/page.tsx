/**
 * Legacy redirect.
 *
 * /course/[id] was the FastAPI-backed course-viewer (reading,
 * flashcards, quiz, podcast, comic, song tabs). The Convex-native
 * replacement is /tracks/[trackId]/[moduleNumber], which delivers the
 * same multi-format learning grounded in a real career track. Bookmarks
 * land on /tracks where the user can pick a track and start a module.
 */
import { redirect } from "next/navigation";

export default function CoursePage() {
  redirect("/tracks");
}
