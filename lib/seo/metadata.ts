export interface WebsiteSeoFields {
  title?: string
  description?: string
  ogImage?: string
  canonicalUrl?: string
}

export interface WebsiteAnalyticsFields {
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
