import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ThemePanel } from "@/components/themes/theme-panel"
import type { ThemeConfig } from "@/lib/themes"

export const metadata = {
  title: "Thema | Website Maker",
  description: "Pas kleuren, lettertypes en uitstraling van uw website aan",
}

export default async function ThemesPage() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect("/auth/login")
  }

  const { data: website } = await supabase
    .from("websites")
    .select("id, theme_config, businesses:business_id(category)")
    .eq("user_id", data.user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  const businessRelation = website?.businesses as { category?: string } | { category?: string }[] | null | undefined
  const businessCategory = Array.isArray(businessRelation)
    ? businessRelation[0]?.category
    : businessRelation?.category

  return (
    <div className="mx-auto max-w-6xl p-4 md:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Thema</h1>
        <p className="mt-2 text-muted-foreground">
          Kies een stijl, kleurenpalet, lettertypecombinatie en spacing voor uw website.
        </p>
      </div>
      <ThemePanel
        websiteId={website?.id ?? null}
        businessCategory={businessCategory}
        currentTheme={(website?.theme_config as ThemeConfig | null) ?? null}
      />
    </div>
  )
}
