import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { DomainDashboard } from "@/components/domain/domain-dashboard"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default async function DomainsPage() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) redirect("/auth/login")

  const { data: website } = await supabase
    .from("websites")
    .select("id, slug, custom_domain, published")
    .eq("user_id", data.user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single()

  if (!website) redirect("/editor")

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background px-6 py-4 flex items-center gap-4">
        <Link
          href="/editor"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to editor
        </Link>
        <span className="text-border">|</span>
        <h1 className="text-sm font-semibold text-foreground">Domain Settings</h1>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-foreground text-balance">Your website domains</h2>
          <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
            Manage how visitors reach your B&amp;B website — via the platform subdomain or your own custom domain.
          </p>
        </div>

        <DomainDashboard
          slug={website.slug}
          currentCustomDomain={website.custom_domain ?? null}
          isPublished={website.published ?? false}
        />
      </main>
    </div>
  )
}
