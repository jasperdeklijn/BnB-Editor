import { loadPublicWebsitePage } from "@/components/page-loader"

interface PageProps {
  params: Promise<{ slug: string }>
}

export default async function PublicSitePage({ params }: PageProps) {
  const { slug } = await params
  return loadPublicWebsitePage({ slug })
}
