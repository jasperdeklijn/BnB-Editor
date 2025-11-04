import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { SectionRenderer } from "@/components/editor/section-renderer"
import type { Website } from "@/lib/types"

interface PageProps {
  params: Promise<{ slug: string }>
}

export default async function PublicSitePage({ params }: PageProps) {
  console.log("[v0] PublicSitePage: Starting to load page")

  const { slug } = await params
  console.log("[v0] PublicSitePage: Slug =", slug)

  const supabase = await createClient()
  console.log("[v0] PublicSitePage: Supabase client created")

  // Fetch the published website by slug
  const { data: website, error } = await supabase
    .from("websites")
    .select("*")
    .eq("slug", slug)
    .eq("published", true)
    .single()

  console.log("[v0] PublicSitePage: Query result", { website, error })

  if (error || !website) {
    console.log("[v0] PublicSitePage: Website not found, showing 404")
    notFound()
  }

  const typedWebsite = website as unknown as Website
  console.log("[v0] PublicSitePage: Rendering", typedWebsite.sections.length, "sections")

  return (
    <div className="min-h-screen bg-background">
      {typedWebsite.sections.map((section) => (
        <SectionRenderer key={section.id} section={section} isPreview={true} />
      ))}
    </div>
  )
}

export async function generateMetadata({ params }: PageProps) {
  console.log("[v0] generateMetadata: Starting")

  const { slug } = await params
  console.log("[v0] generateMetadata: Slug =", slug)

  const supabase = await createClient()

  const { data: website } = await supabase
    .from("websites")
    .select("title")
    .eq("slug", slug)
    .eq("published", true)
    .single()

  console.log("[v0] generateMetadata: Website title =", website?.title)

  return {
    title: website?.title || "BnB Website",
    description: "A beautiful bed and breakfast website",
  }
}
