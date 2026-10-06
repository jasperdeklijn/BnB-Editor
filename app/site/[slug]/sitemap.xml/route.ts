import { createClient } from "@/lib/supabase/server"
import { isWebsiteLiveSnapshot } from "@/lib/website-snapshot"
import { websitePagePath } from "@/lib/website-links"
import { PLATFORM_BASE_URL } from "@/lib/platform"
import { isMultilingualWebsitesEnabled } from "@/lib/i18n/feature"

const xml = (value: string) => value.replace(/[<>&"']/g, (character) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[character]!)

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { data } = await (await createClient()).rpc("get_public_website", { p_slug: slug, p_domain: null }).maybeSingle()
  const website = data as { published: boolean; live_snapshot: unknown } | null
  if (!website?.published || !isWebsiteLiveSnapshot(website.live_snapshot)) return new Response("Not found", { status: 404 })
  const snapshot = website.live_snapshot
  const base = snapshot.website.customDomain ? `https://${snapshot.website.customDomain}` : `${PLATFORM_BASE_URL}/site/${slug}`
  const urls = snapshot.pages.flatMap((page) => snapshot.locales.filter((locale) => locale.isDefault || isMultilingualWebsitesEnabled()).map((locale) =>
    `<url><loc>${xml(`${base}${websitePagePath(page, locale.isDefault ? "" : locale.pathSegment)}`)}</loc><lastmod>${xml(snapshot.publishedAt)}</lastmod></url>`))
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join("")}</urlset>`, { headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=0, must-revalidate" } })
}
