export type ReviewMode = "google" | "collection"
export type ReviewStatus = "unconfirmed" | "pending" | "published" | "rejected" | "withdrawn"
export interface PublicReview { id: string; display_name: string; rating: number; body: string; created_at: string }
export const REVIEW_STATUS_LABELS: Record<ReviewStatus, string> = { unconfirmed: "E-mail niet bevestigd", pending: "Te beoordelen", published: "Gepubliceerd", rejected: "Afgewezen", withdrawn: "Ingetrokken" }
export function reviewMode(data: Record<string, unknown>): ReviewMode { return data.reviewMode === "collection" ? "collection" : "google" }
export function reviewLimit(value: unknown): number { return typeof value === "number" && Number.isInteger(value) ? Math.max(1, Math.min(12, value)) : 6 }
export function googleReviewUrl(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 2048) return null
  try {
    const url = new URL(value)
    if (url.protocol !== "https:" || url.username || url.password || url.port) return null
    const host = url.hostname.toLowerCase()
    const valid = ((host === "www.google.com" || host === "google.com" || host === "www.google.nl" || host === "google.nl") && (url.pathname === "/maps" || url.pathname.startsWith("/maps/")))
      || (host === "search.google.com" && url.pathname === "/local/reviews" && Boolean(url.searchParams.get("placeid")))
      || (host === "maps.google.com" && url.pathname === "/")
      || ((host === "maps.app.goo.gl" || host === "g.page") && /^\/[A-Za-z0-9_-]+(?:\/review)?\/?$/.test(url.pathname))
    return valid ? url.href : null
  } catch { return null }
}
export function hasReviewCollectionAccess(subscription: { planId: string }): boolean {
  // Use the same resolved plan as billing and every other Gold capability.
  return subscription.planId === "gold"
}
export function validateReview(input: Record<string, unknown>) {
  const name = typeof input.name === "string" ? input.name.trim() : ""
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : ""
  const body = typeof input.body === "string" ? input.body.trim() : ""
  if (!name || name.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254
    || body.length < 10 || body.length > 3000 || !Number.isInteger(input.rating) || Number(input.rating) < 1 || Number(input.rating) > 5 || input.consent !== true) {
    throw new Error("Vul je naam, e-mail, 1–5 sterren en een recensie van 10–3000 tekens in en geef toestemming voor publicatie.")
  }
  return { display_name: name, email, body, rating: Number(input.rating) }
}
