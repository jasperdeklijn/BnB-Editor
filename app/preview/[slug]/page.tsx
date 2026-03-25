import { loadPublicWebsitePage } from "@/components/page-loader"
import { createAdminClient } from "@/lib/supabase/admin"

interface PageProps {
  params: Promise<{ slug: string }>
}

export default async function PreviewSitePage({ params }: PageProps) {
  const { slug } = await params
  // Preview shows the latest editor version regardless of published state.
  // We use the admin client to bypass RLS so unpublished websites are readable.
  const client = createAdminClient()
  return loadPublicWebsitePage({ slug, isPreview: true, client })
}
