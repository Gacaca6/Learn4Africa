/**
 * Legacy redirect — see app/course/[id]/page.tsx.
 *
 * The "course completed" celebration moved to /portfolio, where every
 * completed module/track shows up as a portfolio item.
 */
import { redirect } from "next/navigation";

export default function CourseCompletedPage() {
  redirect("/portfolio");
}
