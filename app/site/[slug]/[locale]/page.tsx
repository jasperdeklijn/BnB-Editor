import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { loadPublicWebsitePage } from "@/components/page-loader"
import { getSeoDescription, getSeoTitle, type WebsiteSeoFields } from "@/lib/seo/metadata"
import { createClient } from "@/lib/supabase/server"
import { isWebsiteLiveSnapshot } from "@/lib/website-snapshot"
import { isMultilingualWebsitesEnabled } from "@/lib/i18n/feature"

interface PageProps {
  params: Promise<{ slug: string; locale: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  if (!isMultilingualWebsitesEnabled()) notFound()
  const { slug, locale } = await params
  const client = await createClient()
  const { data: website } = await client
    .from("websites")
    .select("slug, published, live_snapshot")
    .eq("slug", slug)
    .maybeSingle()
  const snapshot = website?.published && isWebsiteLiveSnapshot(website.live_snapshot) ? website.live_snapshot : null
  const active = snapshot?.locales?.find((entry) => entry.pathSegment === locale && !entry.isDefault)
  if (!snapshot || !active) notFound()

  const seo = active.seo as WebsiteSeoFields | null | undefined
  const rootUrl = snapshot.website.customDomain ? `https://${snapshot.website.customDomain}` : `/site/${snapshot.website.slug}`
  const url = `${rootUrl}/${active.pathSegment}`
  const title = getSeoTitle(seo, active.business?.name || snapshot.website.title)
  const description = getSeoDescription(seo, active.business?.description)
  const languages = Object.fromEntries([
    ...snapshot.locales!.map((entry) => [entry.locale, `${rootUrl}${entry.isDefault ? "" : `/${entry.pathSegment}`}`]),
    ["x-default", rootUrl],
  ])

  return {
    title,
    description,
    alternates: { canonical: seo?.canonicalUrl || url, languages },
    openGraph: { title, description, url, images: seo?.ogImage ? [{ url: seo.ogImage }] : undefined },
    twitter: {
      card: seo?.ogImage ? "summary_large_image" : "summary",
      title,
      description,
      images: seo?.ogImage ? [seo.ogImage] : undefined,
    },
  }
}

export default async function LocalizedPublicSitePage({ params }: PageProps) {
  if (!isMultilingualWebsitesEnabled()) notFound()
  const { slug, locale } = await params
  const client = await createClient()
  return loadPublicWebsitePage({ slug, locale, isPreview: false, client })
}
