import { notFound, redirect } from "next/navigation"
import { loadPublicWebsitePage } from "@/components/page-loader"
import { createClient } from "@/lib/supabase/server"

export const metadata = { title: "Website preview", robots: { index: false, follow: false } }
interface Props { params: Promise<{ slug: string; path?: string[] }> }

export default async function PreviewPage({ params }: Props) {
  const { slug, path = [] } = await params
  const client = await createClient()
  const { data: { user }, error } = await client.auth.getUser()
  const next = `/preview/${encodeURIComponent(slug)}${path.length ? `/${path.map(encodeURIComponent).join("/")}` : ""}`
  if (error || !user) redirect(`/auth/login?next=${encodeURIComponent(next)}`)
  const { data: website } = await client.from("websites").select("id").eq("slug", slug).eq("user_id", user.id).maybeSingle()
  if (!website) notFound()
  return loadPublicWebsitePage({ slug, path, isPreview: true, client })
}
