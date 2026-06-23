import type { Metadata } from "next"
import { loadPublicWebsitePage } from "@/components/page-loader"
import { createAdminClient } from "@/lib/supabase/admin"
import { getSeoDescription, getSeoTitle, type WebsiteSeoFields } from "@/lib/seo/metadata"

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const client = await createAdminClient()
  const { data: website } = await client
    .from("websites")
    .select("title, slug, custom_domain, seo, businesses:business_id(name, description)")
    .eq("slug", slug)
    .maybeSingle()

  const businessRelation = website?.businesses as { name?: string; description?: string } | { name?: string; description?: string }[] | null | undefined
  const business = Array.isArray(businessRelation) ? businessRelation[0] : businessRelation
  const seo = website?.seo as WebsiteSeoFields | null | undefined
  const title = getSeoTitle(seo, business?.name || website?.title || "Website preview")
  const description = getSeoDescription(seo, business?.description)
  const url = website?.custom_domain ? `https://${website.custom_domain}` : `/preview/${website?.slug ?? slug}`

  return {
    title,
    description,
    alternates: { canonical: seo?.canonicalUrl || url },
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

export default async function PreviewSitePage({ params }: PageProps) {
  const { slug } = await params
  const client = await createAdminClient()
  return loadPublicWebsitePage({ slug, isPreview: true, client })
}
