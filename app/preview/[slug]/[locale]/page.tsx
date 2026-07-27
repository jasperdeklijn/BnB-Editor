import { notFound, redirect } from "next/navigation"

import { loadPublicWebsitePage } from "@/components/page-loader"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { isMultilingualWebsitesEnabled } from "@/lib/i18n/feature"

interface PageProps {
  params: Promise<{ slug: string; locale: string }>
}

export const metadata = { title: "Website preview", robots: { index: false, follow: false } }

export default async function LocalizedPreviewSitePage({ params }: PageProps) {
  if (!isMultilingualWebsitesEnabled()) notFound()
  const { slug, locale } = await params
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    redirect(`/auth/login?next=${encodeURIComponent(`/preview/${slug}/${locale}`)}`)
  }

  const { data: website } = await supabase
    .from("websites")
    .select("id")
    .eq("slug", slug)
    .eq("user_id", user.id)
    .maybeSingle()
  if (!website) notFound()

  return loadPublicWebsitePage({ slug, locale, isPreview: true, client: await createAdminClient() })
}
