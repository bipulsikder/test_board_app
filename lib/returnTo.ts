export function sanitizeReturnTo(returnTo: string | null | undefined, fallback: string) {
  if (!returnTo) return fallback
  if (!returnTo.startsWith("/")) return fallback
  if (returnTo.startsWith("//")) return fallback
  if (returnTo.startsWith("/_next")) return fallback
  return returnTo
}

