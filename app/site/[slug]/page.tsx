import { loadPublicWebsitePage } from "@/components/page-loader"
import { createClient } from "@/lib/supabase/server"

interface PageProps {
  params: Promise<{ slug: string }>
}

export default async function PublicSitePage({ params }: PageProps) {
  const { slug } = await params
  // Live site: anon client respects RLS — only published websites are visible.
  const client = await createClient()
  return loadPublicWebsitePage({ slug, isPreview: false, client })
}
