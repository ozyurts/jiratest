/**
 * Root route — middleware handles the redirect (/ → /login or /entry).
 * This component is a fallback only.
 */
import { redirect } from "next/navigation";

export default function RootPage() {
  redirect("/login");
}
