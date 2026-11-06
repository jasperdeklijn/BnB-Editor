"use client"

import { Fragment } from "react"
import { SectionRenderer, TransitionWrapper } from "@/components/editor/section-renderer"
import type { Section, Transition } from "@/lib/types"

export function DemoSections({ sections, transitions = [], device }: { sections: Section[]; transitions?: Transition[]; device?: "desktop" | "mobile" }) {
  const byPair = new Map(transitions.map((transition) => [`${transition.fromSectionId}:${transition.toSectionId}`, transition]))
  return sections.map((section, index) => {
    const next = sections[index + 1]
    const transition = next && byPair.get(`${section.id}:${next.id}`)
    return <Fragment key={section.id}>
      <div id={`section-${section.id}`}><SectionRenderer section={section} allSections={sections} isPreview device={device} /></div>
      {transition && transition.type !== "none" && <TransitionWrapper type={transition.type} position="center" fromColor={section.styles?.backgroundColor || "#ffffff"} toColor={next.styles?.backgroundColor || "#fafaf9"} />}
    </Fragment>
  })
}
