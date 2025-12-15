import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import websiteSections from '@/lib/supabase/websiteSections'
import React from "react"
import { SectionRenderer, TransitionWrapper } from "@/components/editor/section-renderer"
import type { Website } from "@/lib/types"

interface PageProps {
  params: Promise<{ slug: string }>
}

export default async function PublicSitePage({ params }: PageProps) {
  console.log("[v0] PublicSitePage: Starting to load page")

  const { slug } = await params
  console.log("[v0] PublicSitePage: Slug =", slug)

  const supabase = await createClient()

  // Fetch website and normalized sections
  const { data: website, error } = await websiteSections.fetchWebsiteWithSectionsBySlug(slug, supabase)

  if (error || !website) return notFound()

  const sections = (website.website_sections || []).map((r: any) => ({
    id: r.id,
    type: r.type,
    data: r.content || {},
    styles: r.styles || {},
    transitionFromPrev: r.transition || undefined,
  }))

  const nodes: React.ReactNode[] = []
  for (let i = 0; i < sections.length; i++) {
    const section = sections[i]
    const next = sections[i + 1]

    if (next && next.transitionFromPrev?.type) {
      const t = next.transitionFromPrev.type
      nodes.push(
        <React.Fragment key={`pair-${next.id}`}>
          <TransitionWrapper type={t} position="bottom">
            <div className="relative">
              <SectionRenderer section={section} isPreview={true} wrapTransition={false} />
            </div>
          </TransitionWrapper>

          <TransitionWrapper type={t} position="top">
            <div className="relative">
              <SectionRenderer section={next} isPreview={true} wrapTransition={false} />
            </div>
          </TransitionWrapper>
        </React.Fragment>,
      )

      i++
    } else {
      nodes.push(
        <div key={section.id} className="relative">
          <SectionRenderer section={section} isPreview={true} />
        </div>,
      )
    }
  }

  return <div className="min-h-screen bg-background">{nodes}</div>
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
