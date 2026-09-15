import { redirect } from "next/navigation"
import { EditorPageShell } from "@/components/editor/editor-page-shell"
import { ReviewsClient } from "@/components/reviews/reviews-client"
import { createClient } from "@/lib/supabase/server"
export default async function ReviewsPage({ searchParams }: { searchParams: Promise<{ websiteId?: string }> }) {
  const client = await createClient(), { data: { user } } = await client.auth.getUser()
  if (!user) redirect("/auth/login")
  const { data: websites, error } = await client.from("websites").select("id,title").eq("user_id", user.id).order("created_at")
  if (error) throw new Error("Websites konden niet worden geladen.")
  const { websiteId } = await searchParams
  return <EditorPageShell title="Recensies" description="Beoordeel klantreacties en beheer hun publicatie op je website."><ReviewsClient websites={websites ?? []} initialWebsiteId={websiteId} /></EditorPageShell>
}
