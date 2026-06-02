import { notFound } from "next/navigation"
import React from "react"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import type { SupabaseClient } from "@supabase/supabase-js"
import websiteSections from "@/lib/supabase/websiteSections"
import { SectionRenderer, TransitionWrapper } from "@/components/editor/section-renderer"
import type { Section, Transition } from "@/lib/types"
import { resolveAllSections } from "@/lib/supabase/section-resolver"

interface PageLoaderOptions {
  slug: string
  isPreview?: boolean
  /** Optional pre-built client. Pass an admin client to bypass RLS (for preview). */
  client?: SupabaseClient
}

export async function loadPublicWebsitePage({
  slug,
  isPreview = true,
  client,
}: PageLoaderOptions) {
  const supabase = client ?? (await createClient())

  const { data: website, error } =
    await websiteSections.fetchWebsiteWithSectionsBySlug(slug, supabase)

  if (error || !website) return notFound()

  // Live route: only show published sites
  if (!isPreview && !website.published) return notFound()

  const adminSupabase = await createAdminClient()

  const websiteBusinessId = website.business_id ?? await (async () => {
    const { data: business, error: businessError } = await adminSupabase
      .from('businesses')
      .select('id')
      .eq('user_id', website.user_id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle()

    if (businessError) return null
    return business?.id ?? null
  })()

  // Get user email for contact form default recipient
  const { data: userData } = await adminSupabase.auth.admin.getUserById(website.user_id)
  const userEmail = userData?.user?.email

  const sections: Section[] = (website.website_sections || []).map(
    (r: any): Section => ({
      id: r.id,
      type: r.type,
      data: {
        ...(r.content ?? {}),
        bnbId: websiteBusinessId,
        businessId: websiteBusinessId,
        // Set default recipientEmail if not already set
        recipientEmail: r.content?.recipientEmail || userEmail,
      },
      styles: r.styles || {},
    })
  )

  // Resolve live data for all sections that need it (services, rooms, etc.).
  // The admin client is used so RLS does not block reads for published sites.
  // Preview shares the same resolver path — resolvers are safe for both modes.
  const resolvedSections = await resolveAllSections(sections, {
    businessId: websiteBusinessId,
    supabase: adminSupabase,
    isPreview,
  })
  sections.splice(0, sections.length, ...resolvedSections)

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

  // Build a sequence: section, transition, section, transition, ...
  type SequenceItem = { type: "section"; data: Section } | { type: "transition"; data: Transition }
  const sequence: SequenceItem[] = []

  for (let i = 0; i < sections.length; i++) {
    const current = sections[i]
    sequence.push({ type: "section", data: current })

    // Check if there's a transition to the next section
    if (i < sections.length - 1) {
      const next = sections[i + 1]
      const transition = transitions.find(
        t => t.fromSectionId === current.id && t.toSectionId === next.id
      )

      if (transition && transition.type !== "none") {
        sequence.push({ type: "transition", data: transition })
      }
    }
  }

  const nodes: React.ReactNode[] = []

  for (let i = 0; i < sequence.length; i++) {
    const item = sequence[i]

    if (item.type === "section") {
      const section = item.data

      // Check if the previous item was a transition
      const prevWasTransition = i > 0 && sequence[i - 1].type === "transition"
      const nextIsTransition = i < sequence.length - 1 && sequence[i + 1].type === "transition"

      // Determine wrapper ID for anchor navigation (not for nav/footer)
      const needsAnchorId = section.type !== "nav" && section.type !== "footer"
      const anchorId = needsAnchorId ? `section-${section.id}` : undefined
      
      // Nav sections need to be rendered without wrapper for sticky positioning
      const isNavSection = section.type === "nav"
      const navIsSticky = isNavSection && ((section.data?.isSticky as boolean) ?? true)

      if (isNavSection) {
        // Render nav directly without wrapper to preserve sticky positioning
        nodes.push(
          <SectionRenderer
            key={section.id}
            section={section}
            isPreview={isPreview}
            wrapTransition={false}
            allSections={sections}
          />
        )
      } else if (prevWasTransition) {
        // This section comes after a transition, wrap it with "top"
        const transition = (sequence[i - 1].data as Transition)
        const prevSection = sections.find(s => s.id === transition.fromSectionId)
        const fromColor = prevSection?.styles?.backgroundColor || "#ffffff"
        const toColor = section.styles?.backgroundColor || "#fafaf9"

        nodes.push(
          <TransitionWrapper
            key={`${section.id}-top`}
            type={transition.type}
            position="top"
            fromColor={fromColor}
            toColor={toColor}
          >
            <div id={anchorId}>
              <SectionRenderer
                section={section}
                isPreview={isPreview}
                wrapTransition={false}
                allSections={sections}
              />
            </div>
          </TransitionWrapper>
        )
      } else if (nextIsTransition) {
        // This section has a transition to the next, wrap it with "bottom"
        const transition = (sequence[i + 1].data as Transition)
        const nextSection = sections.find(s => s.id === transition.toSectionId)
        const fromColor = section.styles?.backgroundColor || "#ffffff"
        const toColor = nextSection?.styles?.backgroundColor || "#fafaf9"

        nodes.push(
          <TransitionWrapper
            key={`${section.id}-bottom`}
            type={transition.type}
            position="bottom"
            fromColor={fromColor}
            toColor={toColor}
          >
            <div id={anchorId}>
              <SectionRenderer
                section={section}
                isPreview={isPreview}
                wrapTransition={false}
                allSections={sections}
              />
            </div>
          </TransitionWrapper>
        )
      } else {
        // No transition before or after, render normally
        nodes.push(
          <div key={section.id} id={anchorId} className="relative">
            <SectionRenderer
              section={section}
              isPreview={isPreview}
              wrapTransition={false}
              allSections={sections}
            />
          </div>
        )
      }
    }
    // Transition items don't render themselves; they're handled by wrapping sections
  }

  return <div className="min-h-screen bg-background">{nodes}</div>
}
