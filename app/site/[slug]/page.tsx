import type { Metadata } from "next"
import { loadPublicWebsitePage } from "@/components/page-loader"
import { createClient } from "@/lib/supabase/server"
import { getSeoDescription, getSeoTitle, type WebsiteSeoFields } from "@/lib/seo/metadata"
import { isWebsiteLiveSnapshot } from "@/lib/website-snapshot"

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const client = await createClient()
  const { data: website } = await client
    .from("websites")
    .select("slug, published, live_snapshot")
    .eq("slug", slug)
    .maybeSingle()

  const snapshot = website?.published && isWebsiteLiveSnapshot(website.live_snapshot)
    ? website.live_snapshot
    : null
  const defaultLocale = snapshot?.locales?.find((entry) => entry.isDefault)
  const business = defaultLocale?.business ?? snapshot?.business
  const seo = (defaultLocale?.seo ?? snapshot?.website.seo) as WebsiteSeoFields | null | undefined
  const title = getSeoTitle(seo, business?.name || snapshot?.website.title || "Website")
  const description = getSeoDescription(seo, business?.description)
  const customDomain = snapshot?.website.customDomain
  const url = customDomain ? `https://${customDomain}` : `/site/${snapshot?.website.slug ?? website?.slug ?? slug}`
  const languageAlternates = snapshot?.locales
    ? Object.fromEntries([
        ...snapshot.locales.map((entry) => [entry.locale, `${url}${entry.isDefault ? "" : `/${entry.pathSegment}`}`]),
        ["x-default", url],
      ])
    : undefined

  return {
    title,
    description,
    alternates: { canonical: seo?.canonicalUrl || url, languages: languageAlternates },
    openGraph: {
      title,
      description,
      url,
      images: seo?.ogImage ? [{ url: seo.ogImage }] : undefined,
    },
    twitter: {
      card: seo?.ogImage ? "summary_large_image" : "summary",
      title,
      description,
      images: seo?.ogImage ? [seo.ogImage] : undefined,
    },
  }
}

export default async function PublicSitePage({ params }: PageProps) {
  const { slug } = await params
  const client = await createClient()
  return loadPublicWebsitePage({ slug, isPreview: false, client })
}
