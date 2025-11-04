import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { SectionRenderer } from "@/components/editor/section-renderer"
import type { Website } from "@/lib/types"

interface PageProps {
  params: Promise<{ slug: string }>
}

export default async function PublicSitePage({ params }: PageProps) {
  const { slug } = await params
  const supabase = await createClient()

  // Fetch the published website by slug
  const { data: website, error } = await supabase
    .from("websites")
    .select("*")
    .eq("slug", slug)
    .eq("published", true)
    .single()

  if (error || !website) {
    notFound()
  }

  const typedWebsite = website as unknown as Website

  return (
    <div className="min-h-screen bg-background">
      {typedWebsite.sections.map((section) => (
        <SectionRenderer key={section.id} section={section} isPreview={true} onUpdate={() => {}} />
      ))}
    </div>
  )
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: website } = await supabase
    .from("websites")
    .select("title")
    .eq("slug", slug)
    .eq("published", true)
    .single()

  return {
    title: website?.title || "BnB Website",
    description: "A beautiful bed and breakfast website",
  }
}
