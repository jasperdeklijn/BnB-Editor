"use client"

import React, { useEffect, useState, useRef } from "react"
import type { Section } from "@/lib/types"
import { HeroSection } from "@/components/bnb-sections/hero-section"
import { AboutSection } from "@/components/bnb-sections/about-section"
import { RoomsSection } from "@/components/bnb-sections/rooms-section"
import { GallerySection } from "@/components/bnb-sections/gallery-section"
import { AmenitiesSection } from "@/components/bnb-sections/amenities-section"
import { ContactSection } from "@/components/bnb-sections/contact-section"
import { NavSection } from "@/components/bnb-sections/nav-section"
import { FooterSection } from "@/components/bnb-sections/footer-section"

interface SectionRendererProps {
  section: Section
  isPreview: boolean
  onUpdate?: (newData: Record<string, unknown>) => void // Made onUpdate optional
  wrapTransition?: boolean
  allSections?: Section[] // All sections for nav to generate links
  device?: "desktop" | "tablet" | "mobile" // Device mode for responsive preview
}

export function TransitionWrapper({
  type,
  children,
  position = "bottom",
  fromColor = "#ffffff",
  toColor = "#fafaf9",
}: {
  type?: string
  children?: React.ReactNode
  position?: "top" | "bottom" | "both" | "center"
  fromColor?: string
  toColor?: string
}) {
  const [visible, setVisible] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setVisible(false)
    const raf = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(raf)
  }, [type, position])

  // Transition decoration that flows naturally in document flow (no absolute positioning)
  const transitionDecoration = (t?: string, isTop?: boolean) => {
    if (!t || t === "none") return null
    
    const gradientId = `grad-${t}-${isTop ? "top" : "bottom"}-${Math.random().toString(36).substr(2, 9)}`
    
    // For top position, we want fromColor -> toColor (previous section color to current)
    // For bottom position, we want toColor -> fromColor (current section color to next)
    const startColor = isTop ? fromColor : toColor
    const endColor = isTop ? toColor : fromColor

    if (t === "fade") {
      return (
        <div
          className="w-full pointer-events-none"
          style={{
            height: 80,
            background: `linear-gradient(180deg, ${startColor} 0%, ${endColor} 100%)`,
          }}
        />
      )
    }
    if (t === "gradient") {
      return (
        <div
          className="w-full pointer-events-none"
          style={{
            height: 100,
            background: `linear-gradient(180deg, ${startColor} 0%, ${startColor}dd 30%, ${endColor}dd 70%, ${endColor} 100%)`,
          }}
        />
      )
    }
    if (t === "slide") {
      return (
        <div
          className="w-full pointer-events-none"
          style={{
            height: 60,
            background: `linear-gradient(180deg, ${startColor} 0%, ${endColor} 100%)`,
          }}
        />
      )
    }
    if (t === "diagonal") {
      return (
        <svg
          className="w-full pointer-events-none block"
          viewBox="0 0 1200 120"
          preserveAspectRatio="none"
          style={{ height: 80, display: "block" }}
        >
          <rect width="1200" height="120" fill={endColor} />
          <path d="M0,0 L1200,0 L1200,120 L0,0 Z" fill={startColor} />
        </svg>
      )
    }
    if (t === "wave") {
      return (
        <svg
          className="w-full pointer-events-none block"
          viewBox="0 0 1200 120"
          preserveAspectRatio="none"
          style={{ height: 80, display: "block" }}
        >
          <rect width="1200" height="120" fill={endColor} />
          <path d="M0,0 L1200,0 L1200,30 C1000,60 900,30 600,40 C300,50 200,10 0,30 Z" fill={startColor} />
        </svg>
      )
    }
    if (t === "zigzag") {
      return (
        <svg 
          className="w-full pointer-events-none block" 
          viewBox="0 0 1200 80" 
          preserveAspectRatio="none" 
          style={{ height: 60, display: "block" }}
        >
          <rect width="1200" height="80" fill={endColor} />
          <path d="M0,0 L1200,0 L1200,40 L1120,80 L1040,0 L960,80 L880,0 L800,80 L720,0 L640,80 L560,0 L480,80 L400,0 L320,80 L240,0 L160,80 L80,0 L0,40 Z" fill={startColor} />
        </svg>
      )
    }
    if (t === "curve") {
      return (
        <svg 
          className="w-full pointer-events-none block" 
          viewBox="0 0 1200 140" 
          preserveAspectRatio="none" 
          style={{ height: 100, display: "block" }}
        >
          <rect width="1200" height="140" fill={endColor} />
          <path d="M0,0 L1200,0 L1200,20 Q900,120 600,30 Q300,60 0,20 Z" fill={startColor} />
        </svg>
      )
    }
    if (t === "split") {
      return (
        <div className="w-full flex pointer-events-none" style={{ height: 60 }}>
          <div className="flex-1" style={{ background: `linear-gradient(to bottom right, ${startColor}, ${endColor})` }} />
          <div className="flex-1" style={{ background: `linear-gradient(to bottom left, ${startColor}, ${endColor})` }} />
        </div>
      )
    }
    return null
  }

  const t = type

  // If position is "center", render as a standalone element between sections
  if (position === "center") {
    return <div className="relative w-full">{transitionDecoration(t, true)}</div>
  }

  return (
    <div className="relative">
      {(position === "top" || position === "both") && transitionDecoration(t, true)}
      {children ? (
        <div
          ref={wrapperRef}
          className={`relative pointer-events-auto ${t === "fade" ? `transition-opacity duration-700 ${visible ? "opacity-100" : "opacity-0"}` : ""} ${t === "slide" ? `transition-all duration-500 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}` : ""}`}
        >
          {children}
        </div>
      ) : null}
      {(position === "bottom" || position === "both") && transitionDecoration(t, false)}
    </div>
  )
}

export function SectionRenderer({ section, isPreview, onUpdate, wrapTransition, allSections, device }: SectionRendererProps) {
  const commonProps = {
    data: section.data,
    isPreview,
    ...(onUpdate && { onUpdate }), // Only include onUpdate if it exists
    styles: section.styles,
  }

  let inner: React.ReactElement | null = null

  switch (section.type) {
    case "hero":
      inner = <HeroSection {...commonProps} />
      break
    case "about":
      inner = <AboutSection {...commonProps} />
      break
    case "services":
    case "rooms":
      inner = <RoomsSection {...commonProps} />
      break
    case "gallery":
      inner = <GallerySection {...commonProps} />
      break
    case "features":
    case "amenities":
      inner = <AmenitiesSection {...commonProps} />
      break
    case "contact":
      inner = <ContactSection {...commonProps} />
      break
    case "nav":
      inner = <NavSection {...commonProps} allSections={allSections} device={device} />
      break
    case "footer":
      inner = <FooterSection {...commonProps} />
      break
    default:
      inner = null
  }

  // If wrapTransition is explicitly false, don't wrap
  if (wrapTransition === false) return inner

  // Otherwise just render the inner component
  return inner
}
