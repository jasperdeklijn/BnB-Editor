import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"
import { loadPublicWebsitePage } from "@/components/page-loader"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { getSeoDescription, getSeoTitle, type WebsiteSeoFields } from "@/lib/seo/metadata"

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      title: "Website preview",
      robots: { index: false, follow: false },
    }
  }

  const { data: website } = await supabase
    .from("websites")
    .select("title, slug, custom_domain, seo, businesses:business_id(name, description)")
    .eq("slug", slug)
    .eq("user_id", user.id)
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
    robots: { index: false, follow: false },
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
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    redirect(`/auth/login?next=${encodeURIComponent(`/preview/${slug}`)}`)
  }

  const { data: website } = await supabase
    .from("websites")
    .select("id")
    .eq("slug", slug)
    .eq("user_id", user.id)
    .maybeSingle()

  if (!website) {
    notFound()
  }

  const client = await createAdminClient()
  return loadPublicWebsitePage({ slug, isPreview: true, client })
}
