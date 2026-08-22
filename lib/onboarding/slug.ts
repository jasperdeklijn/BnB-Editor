export const RESERVED_ONBOARDING_SLUGS = new Set([
  "www",
  "admin",
  "api",
  "dashboard",
  "editor",
  "login",
  "onboarding",
  "auth",
  "preview",
  "site",
])

export function normalizeOnboardingSlug(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 63)
}

export function isReservedOnboardingSlug(value: string) {
  return RESERVED_ONBOARDING_SLUGS.has(normalizeOnboardingSlug(value))
}

export function isValidOnboardingSlug(value: string) {
  const normalized = normalizeOnboardingSlug(value)
  return (
    normalized === value &&
    normalized.length >= 3 &&
    normalized.length <= 63 &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalized) &&
    !isReservedOnboardingSlug(normalized)
  )
}

