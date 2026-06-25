import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { EditorPageShell } from "@/components/editor/editor-page-shell"
import { SeoEssentialsClient } from "@/components/business/seo-essentials-client"
import type { WebsiteAnalyticsFields, WebsiteSeoFields } from "@/lib/seo/metadata"

export const metadata = {
  title: "SEO & Analytics | Website Maker",
  description: "Beheer metadata, social links en analytics voor uw website",
}

export default async function SeoPage() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect("/auth/login")
  }

  const { data: website } = await supabase
    .from("websites")
    .select("id, business_id, seo, analytics")
    .eq("user_id", data.user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!website) {
    redirect("/editor")
  }

  const { data: business } = website.business_id
    ? await supabase
        .from("businesses")
        .select("social_links")
        .eq("id", website.business_id)
        .maybeSingle()
    : { data: null }

  return (
    <EditorPageShell
      title="SEO & Analytics"
      description="Stel zoekmachinegegevens, social previews, LocalBusiness-data en analytics in."
      maxWidth="6xl"
    >
      <SeoEssentialsClient
        websiteId={website.id}
        businessId={website.business_id}
        initialSeo={(website.seo as WebsiteSeoFields | null) ?? null}
        initialAnalytics={(website.analytics as WebsiteAnalyticsFields | null) ?? null}
        initialSocialLinks={(business?.social_links as Record<string, string> | null) ?? null}
      />
    </EditorPageShell>
  )
}
