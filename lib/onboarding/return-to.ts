export function getSafeOnboardingReturnTo(value: unknown) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) return null
  if (value === "/onboarding" || value.startsWith("/onboarding?")) return null
  if (value === "/auth" || value.startsWith("/auth/")) return null
  return value
}

