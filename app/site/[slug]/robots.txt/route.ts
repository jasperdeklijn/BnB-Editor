import { createClient } from "@/lib/supabase/server"
import { isWebsiteLiveSnapshot } from "@/lib/website-snapshot"
import { PLATFORM_BASE_URL } from "@/lib/platform"

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { data } = await (await createClient()).rpc("get_public_website", { p_slug: slug, p_domain: null }).maybeSingle()
  const website = data as { published: boolean; live_snapshot: unknown } | null
  if (!website?.published || !isWebsiteLiveSnapshot(website.live_snapshot)) return new Response("User-agent: *\nDisallow: /\n", { headers: { "Content-Type": "text/plain" } })
  const base = website.live_snapshot.website.customDomain ? `https://${website.live_snapshot.website.customDomain}` : `${PLATFORM_BASE_URL}/site/${slug}`
  return new Response(`User-agent: *\nAllow: /\nDisallow: /preview/\nSitemap: ${base}/sitemap.xml\n`, { headers: { "Content-Type": "text/plain", "Cache-Control": "public, max-age=0, must-revalidate" } })
}
