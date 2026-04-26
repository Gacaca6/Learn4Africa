/**
 * Legacy redirect.
 *
 * The /create page used to call a FastAPI `POST /api/v1/courses/generate`
 * endpoint that no longer ships with this repo. The Convex-native
 * equivalent is /curriculum/new, which calls
 * `api.ai.curriculum.designCurriculum` and produces a richer, career-
 * grounded curriculum. Old bookmarks and shared links still resolve
 * here and get a clean redirect.
 */
import { redirect } from "next/navigation";

export default function CreatePage() {
  redirect("/curriculum/new");
}
