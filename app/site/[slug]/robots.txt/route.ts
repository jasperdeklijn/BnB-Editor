import { createClient } from "@/lib/supabase/server"
import { isWebsiteLiveSnapshot } from "@/lib/website-snapshot"
import { publishedWebsiteBaseUrl } from "@/lib/seo/site-urls"

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { data, error } = await (await createClient()).rpc("get_public_website", { p_slug: slug, p_domain: null }).maybeSingle()
  if (error) return new Response("Robots temporarily unavailable", { status: 503, headers: { "Retry-After": "60" } })
  const website = data as { published: boolean; live_snapshot: unknown } | null
  if (!website?.published || !isWebsiteLiveSnapshot(website.live_snapshot)) return new Response("User-agent: *\nDisallow: /\n", { headers: { "Content-Type": "text/plain" } })
  const base = publishedWebsiteBaseUrl(slug, website.live_snapshot.website.customDomain)
  return new Response(`User-agent: *\nAllow: /\nDisallow: /preview/\nSitemap: ${base}/sitemap.xml\n`, { headers: { "Content-Type": "text/plain", "Cache-Control": "public, max-age=0, must-revalidate" } })
}
