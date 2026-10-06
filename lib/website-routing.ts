import type { WebsiteLiveSnapshot } from "./website-snapshot"
import { RESERVED_PAGE_SLUGS, type WebsitePage } from "./website-pages"
import { websitePagePath } from "./website-links"
import { PLATFORM_DOMAIN } from "./platform"

export interface RouteLocale { locale: string; pathSegment: string; isDefault: boolean }

/** One flat page and an optional enabled locale. Unknown/reserved paths fail closed. */
export function resolveWebsiteRoute(pages: WebsitePage[], locales: RouteLocale[], path: string[] = []) {
  const segments = [...path]
  let locale = locales.find((entry) => entry.isDefault)
  const localized = locales.find((entry) => !entry.isDefault && entry.pathSegment === segments[0])
  if (localized) { locale = localized; segments.shift() }
  else if (segments[0] && RESERVED_PAGE_SLUGS.has(segments[0])) return null
  if (!locale || segments.length > 1) return null
  const slug = segments[0] ?? ""
  const page = pages.find((entry) => entry.isHome ? !slug : entry.slug === slug)
  return page ? { page, locale } : null
}

export function snapshotPageRoute(snapshot: WebsiteLiveSnapshot, path: string[] = []) {
  return resolveWebsiteRoute(snapshot.pages, snapshot.locales, path)
}

export function snapshotRedirect(snapshot: WebsiteLiveSnapshot, path: string[] = []) {
  const segments = [...path]
  const locale = snapshot.locales.find((entry) => !entry.isDefault && entry.pathSegment === segments[0])
  if (locale) segments.shift()
  else if (segments[0] && RESERVED_PAGE_SLUGS.has(segments[0])) return null
  if (segments.length !== 1) return null
  const entry = snapshot.redirects.find((redirect) => redirect.fromSlug === segments[0])
  const page = snapshot.pages.find((page) => page.id === entry?.toPageId)
  return page ? websitePagePath(page, locale?.pathSegment ?? "") : null
}

export function customerSiteBase(slug: string, host: string, preview = false) {
  const hostname = host.split(":")[0].toLowerCase()
  // Middleware rewrites preserve the visitor's host. Internal platform paths need a prefix.
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname.includes("vercel.app")
    || hostname === PLATFORM_DOMAIN.toLowerCase().replace(/^www\./, "") || hostname === `www.${PLATFORM_DOMAIN.toLowerCase().replace(/^www\./, "")}`
    ? `/${preview ? "preview" : "site"}/${encodeURIComponent(slug)}` : ""
}
