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
    .select("id, title, slug, published")
    .eq("user_id", data.user.id)
    .order("created_at", { ascending: false })

  if (!websites || websites.length === 0) redirect("/editor")

  const { data: domains } = await supabase
    .from("website_domains")
    .select("id, website_id, domain, is_primary, status, last_error, created_at")
    .in("website_id", websites.map((website) => website.id))
    .order("created_at", { ascending: true })

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
          domains: (domains ?? [])
            .filter((domain) => domain.website_id === website.id)
            .map((domain) => ({
              id: domain.id,
              domain: domain.domain,
              isPrimary: domain.is_primary,
              status: domain.status,
              lastError: domain.last_error,
              createdAt: domain.created_at,
            })),
          isPublished: website.published ?? false,
        }))}
      />
    </EditorPageShell>
  )
}
