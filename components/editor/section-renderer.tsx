"use client"

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

export function SectionRenderer({ section, isPreview, onUpdate }: SectionRendererProps) {
  const commonProps = {
    data: section.data,
    isPreview,
    ...(onUpdate && { onUpdate }), // Only include onUpdate if it exists
    styles: section.styles,
  }

  switch (section.type) {
    case "hero":
      return <HeroSection {...commonProps} />
    case "about":
      return <AboutSection {...commonProps} />
    case "rooms":
      return <RoomsSection {...commonProps} />
    case "gallery":
      return <GallerySection {...commonProps} />
    case "amenities":
      return <AmenitiesSection {...commonProps} />
    case "contact":
      return <ContactSection {...commonProps} />
    default:
      return null
  }
}
