import { redirect } from "next/navigation"

export function redirectToCanonicalSignUp(searchParams?: { returnTo?: string }) {
  const returnTo = searchParams?.returnTo
  redirect(returnTo ? `/auth/sign_up?returnTo=${encodeURIComponent(returnTo)}` : "/auth/sign_up")
}

