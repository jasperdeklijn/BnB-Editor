import { loadPublicWebsitePage } from "@/components/page-loader"

interface PageProps {
  params: Promise<{ slug: string }>
}

export default async function PreviewSitePage({ params }: PageProps) {
  const { slug } = await params
  // Preview shows latest editor version (not just published)
  return loadPublicWebsitePage({ slug, isPreview: true })
}
