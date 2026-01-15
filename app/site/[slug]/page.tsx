import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import websiteSections from '@/lib/supabase/websiteSections'
import React from "react"
import { SectionRenderer, TransitionWrapper } from "@/components/editor/section-renderer"

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
    transitionFromPrev: undefined, // Will be populated from transitions table
  }))

  // Fetch transitions for this website
  const { data: transitions = [] } = await websiteSections.getTransitionsBetweenSections(website.id, supabase)

  // Build a map of section index to next section's transition
  const transitionMap = new Map<string, any>()
  if (transitions && Array.isArray(transitions)) {
    for (const t of transitions) {
      transitionMap.set(t.from_section_id, t.transition)
    }
  }

  // Apply transitions to sections
  const sectionsWithTransitions = sections.map((s, idx) => {
    const nextSection = sections[idx + 1]
    if (nextSection && transitionMap.has(s.id)) {
      return {
        ...s,
        nextSectionTransition: transitionMap.get(s.id),
      }
    }
    return s
  })

  const nodes: React.ReactNode[] = []
  for (let i = 0; i < sectionsWithTransitions.length; i++) {
    const section = sectionsWithTransitions[i]
    const nextSection = sectionsWithTransitions[i + 1]
    const transitionType = (section as any).nextSectionTransition?.type

    if (nextSection && transitionType && transitionType !== "none") {
      const fromColor = (section.styles as any)?.backgroundColor || "#ffffff"
      const toColor = (nextSection.styles as any)?.backgroundColor || "#fafaf9"
      
      nodes.push(
        <React.Fragment key={`pair-${nextSection.id}`}>
          <TransitionWrapper type={transitionType} position="bottom" fromColor={fromColor} toColor={toColor}>
            <div className="relative">
              <SectionRenderer section={section} isPreview={true} wrapTransition={false} />
            </div>
          </TransitionWrapper>

          <TransitionWrapper type={transitionType} position="top" fromColor={fromColor} toColor={toColor}>
            <div className="relative">
              <SectionRenderer section={nextSection} isPreview={true} wrapTransition={false} />
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
