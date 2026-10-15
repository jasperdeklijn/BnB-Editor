import { createClient } from "@/lib/supabase/server"
import { isWebsiteLiveSnapshot } from "@/lib/website-snapshot"
import { websitePagePath } from "@/lib/website-links"
import { publishedWebsiteBaseUrl } from "@/lib/seo/site-urls"
import { isMultilingualWebsitesEnabled } from "@/lib/i18n/feature"

const xml = (value: string) => value.replace(/[<>&"']/g, (character) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[character]!)

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { data, error } = await (await createClient()).rpc("get_public_website", { p_slug: slug, p_domain: null }).maybeSingle()
  if (error) return new Response("Sitemap temporarily unavailable", { status: 503, headers: { "Retry-After": "60" } })
  const website = data as { published: boolean; live_snapshot: unknown } | null
  if (!website?.published || !isWebsiteLiveSnapshot(website.live_snapshot)) return new Response("Not found", { status: 404 })
  const snapshot = website.live_snapshot
  const base = publishedWebsiteBaseUrl(slug, snapshot.website.customDomain)
  const locales = snapshot.locales.filter((locale) => locale.isDefault || isMultilingualWebsitesEnabled())
  const pageUrl = (page: (typeof snapshot.pages)[number], localePath = "") => `${base}${websitePagePath(page, localePath)}`
  const urls = snapshot.pages.flatMap((page) => {
    const alternates = locales.map((locale) => `<xhtml:link rel="alternate" hreflang="${xml(locale.locale)}" href="${xml(pageUrl(page, locale.isDefault ? "" : locale.pathSegment))}"/>`).join("")
      + `<xhtml:link rel="alternate" hreflang="x-default" href="${xml(pageUrl(page))}"/>`
    return locales.map((locale) => `<url><loc>${xml(pageUrl(page, locale.isDefault ? "" : locale.pathSegment))}</loc><lastmod>${xml(snapshot.publishedAt)}</lastmod>${alternates}</url>`)
  })
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${urls.join("")}</urlset>`, { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=0, must-revalidate" } })
}
