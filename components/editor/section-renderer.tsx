"use client"

import React, { useEffect, useState, useRef } from "react"
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
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setVisible(false)
    const raf = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(raf)
  }, [type])

  if (type === "fade") {
    return (
      <div className="relative">
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-background/80 via-background/40 to-transparent pointer-events-none z-10 -translate-y-24" />
        <div
          ref={wrapperRef}
          className={`transition-opacity duration-1000 ${visible ? "opacity-100" : "opacity-0"}`}
        >
          {children}
        </div>
      </div>
    )
  }

  if (type === "gradient") {
    return (
      <div className="relative">
        <div className="absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-amber-50/0 via-amber-100/30 to-transparent pointer-events-none z-10 -translate-y-32" />
        {children}
      </div>
    )
  }

  if (type === "slide") {
    return (
      <div className="relative">
        <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-transparent to-background/20 pointer-events-none z-10 -translate-y-16" />
        <div
          ref={wrapperRef}
          className={`transition-all duration-700 ${
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          {children}
        </div>
      </div>
    )
  }

  if (type === "diagonal") {
    return (
      <div className="relative">
        <div
          className="absolute inset-x-0 top-0 h-32 pointer-events-none z-10 -translate-y-32"
          style={{
            background: 'linear-gradient(165deg, transparent 0%, transparent 48%, rgba(251, 191, 36, 0.15) 48%, rgba(251, 191, 36, 0.15) 52%, transparent 52%, transparent 100%)'
          }}
        />
        {children}
      </div>
    )
  }

  if (type === "wave") {
    return (
      <div className="relative">
        <svg
          className="absolute inset-x-0 top-0 w-full h-24 -translate-y-24 pointer-events-none z-10"
          viewBox="0 0 1200 120"
          preserveAspectRatio="none"
        >
          <path
            d="M0,0 C150,60 350,0 600,40 C850,80 1050,20 1200,60 L1200,120 L0,120 Z"
            fill="currentColor"
            className="text-background/30"
          />
        </svg>
        {children}
      </div>
    )
  }

  if (type === "zigzag") {
    return (
      <div className="relative">
        <svg
          className="absolute inset-x-0 top-0 w-full h-16 -translate-y-16 pointer-events-none z-10"
          viewBox="0 0 1200 60"
          preserveAspectRatio="none"
        >
          <path
            d="M0,30 L100,0 L200,60 L300,0 L400,60 L500,0 L600,60 L700,0 L800,60 L900,0 L1000,60 L1100,0 L1200,30 L1200,60 L0,60 Z"
            fill="currentColor"
            className="text-amber-200/40"
          />
        </svg>
        {children}
      </div>
    )
  }

  if (type === "curve") {
    return (
      <div className="relative">
        <svg
          className="absolute inset-x-0 top-0 w-full h-32 -translate-y-32 pointer-events-none z-10"
          viewBox="0 0 1200 120"
          preserveAspectRatio="none"
        >
          <path
            d="M0,0 Q600,120 1200,0 L1200,120 L0,120 Z"
            fill="currentColor"
            className="text-background/25"
          />
        </svg>
        {children}
      </div>
    )
  }

  if (type === "split") {
    return (
      <div className="relative">
        <div className="absolute inset-x-0 top-0 h-20 pointer-events-none z-10 -translate-y-20 flex">
          <div className="flex-1 bg-gradient-to-br from-amber-100/40 to-transparent" />
          <div className="flex-1 bg-gradient-to-bl from-orange-100/40 to-transparent" />
        </div>
        {children}
      </div>
    )
  }

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
