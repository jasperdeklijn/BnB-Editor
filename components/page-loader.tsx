import { notFound } from "next/navigation"
import React from "react"
import { createClient } from "@/lib/supabase/server"
import websiteSections from "@/lib/supabase/websiteSections"
import { SectionRenderer, TransitionWrapper } from "@/components/editor/section-renderer"
import type { Section, Transition } from "@/lib/types"
import { resolveTransitionToNext } from "@/lib/transitions/resolveTransition"

interface PageLoaderOptions {
  slug: string
  isPreview?: boolean
}

export async function loadPublicWebsitePage({
  slug,
  isPreview = true,
}: PageLoaderOptions) {
  const supabase = await createClient()

  const { data: website, error } =
    await websiteSections.fetchWebsiteWithSectionsBySlug(slug, supabase)

  if (error || !website) return notFound()

  const sections: Section[] = (website.website_sections || []).map(
    (r: any): Section => ({
      id: r.id,
      type: r.type,
      data: r.content || {},
      styles: r.styles || {},
    })
  )

  // Fetch transitions from section_transitions table
  const { data: transitionRows } = await supabase
    .from("section_transitions")
    .select("from_section_id, to_section_id, transition")
    .eq("website_id", website.id)

  // Map transitions to Transition objects
  const transitions: Transition[] = (transitionRows || []).map((t: any) => ({
    id: `${t.from_section_id}-${t.to_section_id}`,
    fromSectionId: t.from_section_id,
    toSectionId: t.to_section_id,
    type: t.transition?.type || "none",
  }))
console.log("transitions", transitions);

console.log("sections", sections);
  const nodes: React.ReactNode[] = []

  for (let i = 0; i < sections.length; i++) {
    const current = sections[i]
    const next = sections[i + 1]

    // Find transition between current and next section
    const transition = transitions.find(
      t => t.fromSectionId === current.id && t.toSectionId === next?.id
    )
    const hasTransition = next && transition && transition.type !== "none"

    if (!hasTransition) {
      nodes.push(
        <div key={current.id} className="relative">
          <SectionRenderer
            section={current}
            isPreview={isPreview}
            wrapTransition={false}
          />
        </div>
      )
      continue
    }

    const fromColor = current.styles?.backgroundColor || "#ffffff"
    const toColor = next.styles?.backgroundColor || "#fafaf9"

    nodes.push(
      <TransitionWrapper
        key={`${current.id}-bottom`}
        type={transition.type}
        position="bottom"
        fromColor={fromColor}
        toColor={toColor}
      >
        <SectionRenderer
          section={current}
          isPreview={isPreview}
          wrapTransition={false}
        />
      </TransitionWrapper>
    )

    nodes.push(
      <TransitionWrapper
        key={`${next.id}-top`}
        type={transition.type}
        position="top"
        fromColor={fromColor}
        toColor={toColor}
      >
        <SectionRenderer
          section={next}
          isPreview={isPreview}
          wrapTransition={false}
        />
      </TransitionWrapper>
    )

    i++ // skip next (already rendered)
  }

  return <div className="min-h-screen bg-background">{nodes}</div>
}
