"use client"

import React, { useEffect, useState } from "react"
import type { Section } from "@/lib/types"
import { HeroSection } from "@/components/bnb-sections/hero-section"
import { AboutSection } from "@/components/bnb-sections/about-section"
import { RoomsSection } from "@/components/bnb-sections/rooms-section"
import { GallerySection } from "@/components/bnb-sections/gallery-section"
import { AmenitiesSection } from "@/components/bnb-sections/amenities-section"
import { ContactSection } from "@/components/bnb-sections/contact-section"

interface SectionRendererProps {
  section: Section
  isPreview: boolean
  onUpdate?: (newData: Record<string, unknown>) => void // Made onUpdate optional
}

function TransitionWrapper({ type, children }: { type?: string; children: React.ReactNode }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Trigger the transition on mount or when type changes
    setVisible(false)
    const raf = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(raf)
  }, [type])

  if (type === "fade") {
    return (
      <div className={`transition-opacity duration-700 ${visible ? "opacity-100" : "opacity-0"}`}>{children}</div>
    )
  }

  // Default: no wrapper animation
  return <>{children}</>
}

export function SectionRenderer({ section, isPreview, onUpdate }: SectionRendererProps) {
  const commonProps = {
    data: section.data,
    isPreview,
    ...(onUpdate && { onUpdate }), // Only include onUpdate if it exists
    styles: section.styles,
  }

  const transitionType = section.transitionFromPrev?.type

  let inner: React.ReactElement | null = null

  switch (section.type) {
    case "hero":
      inner = <HeroSection {...commonProps} />
      break
    case "about":
      inner = <AboutSection {...commonProps} />
      break
    case "rooms":
      inner = <RoomsSection {...commonProps} />
      break
    case "gallery":
      inner = <GallerySection {...commonProps} />
      break
    case "amenities":
      inner = <AmenitiesSection {...commonProps} />
      break
    case "contact":
      inner = <ContactSection {...commonProps} />
      break
    default:
      inner = null
  }

  return <TransitionWrapper type={transitionType}>{inner}</TransitionWrapper>
}
