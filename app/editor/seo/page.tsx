import { getUserSubscription, hasSubscriptionCapability } from "@/lib/subscriptions"
import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { EditorPageShell } from "@/components/editor/editor-page-shell"
import { SeoEssentialsClient } from "@/components/business/seo-essentials-client"
import type { WebsiteAnalyticsFields, WebsiteSeoFields } from "@/lib/seo/metadata"

export const metadata = {
  title: "SEO & Analytics | Website Maker",
  description: "Beheer metadata, social links en analytics voor uw website",
}

export default async function SeoPage({ searchParams }: { searchParams: Promise<{ websiteId?: string; pageId?: string }> }) {
  const params = await searchParams
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect("/auth/login")
  }

  const subscription = await getUserSubscription(supabase, data.user.id)
  let websiteQuery = supabase
    .from("websites")
    .select("id, business_id, seo, analytics")
    .eq("user_id", data.user.id)
  if (params.websiteId) websiteQuery = websiteQuery.eq("id", params.websiteId)
  const { data: website } = await websiteQuery
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!website) {
    redirect("/editor")
  }
  const { data: page } = params.pageId ? await supabase.from("website_pages").select("id,title,seo").eq("website_id", website.id).eq("id", params.pageId).maybeSingle() : { data: null }
  if (params.pageId && !page) redirect(`/editor?websiteId=${website.id}`)

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
      description={page ? `SEO voor pagina ${page.title}. Social links en analytics gelden voor de hele website.` : "Websitebrede SEO-standaarden, social links en analytics."}
      maxWidth="6xl"
    >
      <Link className="mb-4 inline-flex min-h-11 items-center text-sm underline" href={`/editor?websiteId=${website.id}${page ? `&pageId=${page.id}` : ""}`}>Terug naar {page?.title ?? "de editor"}</Link>
      <SeoEssentialsClient
        advancedAllowed={hasSubscriptionCapability(subscription, "advanced_seo")}
        websiteId={website.id}
        pageId={page?.id}
        businessId={website.business_id}
        initialSeo={((page ? page.seo : website.seo) as WebsiteSeoFields | null) ?? null}
        initialAnalytics={(website.analytics as WebsiteAnalyticsFields | null) ?? null}
        initialSocialLinks={(business?.social_links as Record<string, string> | null) ?? null}
      />
    </EditorPageShell>
  )
}
