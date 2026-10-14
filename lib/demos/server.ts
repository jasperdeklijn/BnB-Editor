import "server-only"
import { cache } from "react"
import { createClient } from "@/lib/supabase/server"
import { demoSlugSchema, type DemoDesign } from "./shared"

export const demoSummaryColumns = "id,title,slug,source_filename,published,thumbnail_url,created_at,updated_at"

export const publicDemo = cache(async (slug: string) => {
  if (!demoSlugSchema.safeParse(slug).success) return null
  const { data, error } = await (await createClient()).from("demo_websites")
    .select("title,slug,live_design").eq("slug", slug).eq("published", true).maybeSingle()
  // A missing migration must not break existing websites, including legacy demo- slugs.
  if (error || !data) return null
  return { title: data.title as string, slug: data.slug as string, design: data.live_design as DemoDesign }
})
