export interface WebsiteSeoFields {
  title?: string
  description?: string
  ogImage?: string
  canonicalUrl?: string
}

export interface WebsiteAnalyticsFields {
  firstPartyEnabled?: boolean
  provider?: string
  measurementId?: string
  consentMode?: boolean
}

export function getSeoTitle(seo: WebsiteSeoFields | null | undefined, fallback: string) {
  return seo?.title?.trim() || fallback
}

export function getSeoDescription(
  seo: WebsiteSeoFields | null | undefined,
  fallback?: string | null,
) {
  return seo?.description?.trim() || fallback || "Professionele website voor een lokaal bedrijf."
}

export function safeMetadataUrl(value?: string): string {
  try { const url = new URL(value ?? ""); return ["https:","http:"].includes(url.protocol) && !url.username && !url.password ? url.toString() : "" } catch { return "" }
}
