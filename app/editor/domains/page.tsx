import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { EditorPageShell } from "@/components/editor/editor-page-shell"
import { DomainDashboard } from "@/components/domain/domain-dashboard"

export default async function DomainsPage() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) redirect("/auth/login")

  const { data: websites } = await supabase
    .from("websites")
    .select("id, title, slug, custom_domain, published")
    .eq("user_id", data.user.id)
    .order("created_at", { ascending: false })

  if (!websites || websites.length === 0) redirect("/editor")

  return (
    <EditorPageShell
      title="Domeininstellingen"
      description="Beheer hoe bezoekers uw website bereiken via het platformdomein of een eigen domein."
      maxWidth="2xl"
    >
      <DomainDashboard
        websites={websites.map((website) => ({
          id: website.id,
          title: website.title,
          slug: website.slug,
          customDomain: website.custom_domain ?? null,
          isPublished: website.published ?? false,
        }))}
      />
    </EditorPageShell>
  )
}
