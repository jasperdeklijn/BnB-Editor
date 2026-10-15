import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { loadPublicWebsitePage } from "@/components/page-loader"
import { createClient } from "@/lib/supabase/server"
import { isWebsiteLiveSnapshot } from "@/lib/website-snapshot"
import { snapshotPageRoute } from "@/lib/website-routing"
import { websitePagePath } from "@/lib/website-links"
import { getSeoDescription, getSeoTitle, type WebsiteSeoFields } from "@/lib/seo/metadata"
import { publicAnalyticsSettings } from "@/lib/analytics/public-settings"
import { safeMetadataUrl } from "@/lib/seo/metadata"
import { publishedWebsiteBaseUrl } from "@/lib/seo/site-urls"
import { isMultilingualWebsitesEnabled } from "@/lib/i18n/feature"
import { headers } from "next/headers"
import { publicDemo } from "@/lib/demos/server"
import { demoPages } from "@/lib/demos/shared"
import { customerSiteBase, resolveWebsiteRoute } from "@/lib/website-routing"
import { DemoSite } from "@/components/demos/demo-site"

interface Props { params: Promise<{ slug: string; path?: string[] }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, path } = await params
  const demo = await publicDemo(slug)
  if (demo) return { title: demo.title, robots: { index: false, follow: false } }
  const client = await createClient()
  const { data: website } = await client.rpc("get_public_website", { p_slug: slug, p_domain: null }).maybeSingle()
  const publicWebsite = website as { published: boolean; live_snapshot: unknown } | null
  if (!publicWebsite?.published || !isWebsiteLiveSnapshot(publicWebsite.live_snapshot)) return { title: "Website", robots: { index: false, follow: false } }
  const snapshot = publicWebsite.live_snapshot
  const route = snapshotPageRoute(snapshot, path)
  if (!route) return { robots: { index: false, follow: false } }
  if (!route.locale.isDefault && !isMultilingualWebsitesEnabled()) notFound()
  const page = snapshot.pages.find((page) => page.id === route.page.id)!
  const bundle = page.locales.find((entry) => entry.locale === route.locale.locale)
  const localeBundle = snapshot.locales.find((entry) => entry.locale === route.locale.locale)!
  const { advancedAllowed: advanced } = await publicAnalyticsSettings(snapshot.website.id)
  const savedSeo = bundle?.seo as WebsiteSeoFields | undefined
  const seo = advanced ? savedSeo : { title: savedSeo?.title, description: savedSeo?.description }
  const base = publishedWebsiteBaseUrl(slug, snapshot.website.customDomain)
  const url = `${base}${websitePagePath(page, route.locale.isDefault ? "" : route.locale.pathSegment)}`
  const title = getSeoTitle(seo, bundle?.title || page.title)
  const description = getSeoDescription(seo, localeBundle.business?.description)
  const languages = Object.fromEntries(snapshot.locales.filter((locale) => locale.isDefault || isMultilingualWebsitesEnabled())
    .map((locale) => [locale.locale, `${base}${websitePagePath(page, locale.isDefault ? "" : locale.pathSegment)}`]))
  languages["x-default"] = `${base}${websitePagePath(page)}`
  return { title, description, robots: { index: true, follow: true }, alternates: { canonical: advanced ? safeMetadataUrl(seo?.canonicalUrl) || url : url, languages },
    openGraph: { title, description, url, images: safeMetadataUrl(seo?.ogImage) ? [{ url: safeMetadataUrl(seo?.ogImage) }] : undefined },
    twitter: { card: seo?.ogImage ? "summary_large_image" : "summary", title, description, images: seo?.ogImage ? [seo.ogImage] : undefined } }
}

export default async function PublicSitePage({ params }: Props) {
  const { slug, path } = await params
  const demo = await publicDemo(slug)
  if (demo) {
    const route = resolveWebsiteRoute(demoPages(demo.design), [{ locale: "nl-NL", pathSegment: "nl", isDefault: true }], path)
    if (!route) notFound()
    const basePath = customerSiteBase(slug, (await headers()).get("host") ?? "localhost")
    return <DemoSite design={demo.design} pageId={route.page.id} basePath={basePath} />
  }
  return loadPublicWebsitePage({ slug, path, isPreview: false, client: await createClient() })
}
