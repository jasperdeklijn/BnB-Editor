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

  // Standalone centered transition decorations (for use between sections)
  const centerDecoration = (t?: string) => {
    if (!t) return null
    
    const gradientId = `grad-${t}-${Math.random().toString(36).substr(2, 9)}`
    const height = 80

    if (t === "fade") {
      return (
        <div
          className="w-full pointer-events-none"
          style={{
            height,
            background: `linear-gradient(180deg, ${fromColor} 0%, ${toColor} 100%)`,
          }}
        />
      )
    }
    if (t === "gradient") {
      return (
        <div
          className="w-full pointer-events-none"
          style={{
            height: height + 20,
            background: `linear-gradient(180deg, ${fromColor} 0%, ${toColor}dd 50%, ${toColor} 100%)`,
          }}
        />
      )
    }
    if (t === "slide") {
      return (
        <div
          className="w-full pointer-events-none"
          style={{
            height,
            background: `linear-gradient(180deg, ${fromColor} 0%, ${toColor}99 100%)`,
          }}
        />
      )
    }
    if (t === "diagonal") {
      return (
        <svg
          className="w-full pointer-events-none"
          viewBox="0 0 1200 120"
          preserveAspectRatio="none"
          style={{ height }}
        >
          <defs>
            <linearGradient id={gradientId} x1="0%" x2="0%" y1="0%" y2="100%">
              <stop offset="0%" stopColor={fromColor} />
              <stop offset="100%" stopColor={toColor} />
            </linearGradient>
          </defs>
          <path d="M0,0 L1200,120 L1200,120 L0,120 Z" fill={`url(#${gradientId})`} />
        </svg>
      )
    }
    if (t === "wave") {
      return (
        <svg
          className="w-full pointer-events-none"
          viewBox="0 0 1200 120"
          preserveAspectRatio="none"
          style={{ height }}
        >
          <defs>
            <linearGradient id={gradientId} x1="0%" x2="0%" y1="0%" y2="100%">
              <stop offset="0%" stopColor={fromColor} />
              <stop offset="100%" stopColor={toColor} />
            </linearGradient>
          </defs>
          <path d="M0,30 C200,10 300,50 600,40 C900,30 1000,60 1200,30 L1200,120 L0,120 Z" fill={`url(#${gradientId})`} />
        </svg>
      )
    }
    if (t === "zigzag") {
      return (
        <svg className="w-full pointer-events-none" viewBox="0 0 1200 80" preserveAspectRatio="none" style={{ height }}>
          <defs>
            <linearGradient id={gradientId} x1="0%" x2="0%" y1="0%" y2="100%">
              <stop offset="0%" stopColor={fromColor} />
              <stop offset="100%" stopColor={toColor} />
            </linearGradient>
          </defs>
          <path d="M0,40 L80,0 L160,80 L240,0 L320,80 L400,0 L480,80 L560,0 L640,80 L720,0 L800,80 L880,0 L960,80 L1040,0 L1120,80 L1200,40 L1200,80 L0,80 Z" fill={`url(#${gradientId})`} />
        </svg>
      )
    }
    if (t === "curve") {
      return (
        <svg className="w-full pointer-events-none" viewBox="0 0 1200 140" preserveAspectRatio="none" style={{ height: height + 60 }}>
          <defs>
            <linearGradient id={gradientId} x1="0%" x2="0%" y1="0%" y2="100%">
              <stop offset="0%" stopColor={fromColor} />
              <stop offset="100%" stopColor={toColor} />
            </linearGradient>
          </defs>
          <path d="M0,20 Q300,120 600,30 T1200,20 L1200,140 L0,140 Z" fill={`url(#${gradientId})`} />
        </svg>
      )
    }
    if (t === "split") {
      return (
        <div className="w-full flex pointer-events-none" style={{ height }}>
          <div className="flex-1" style={{ background: `linear-gradient(to bottom right, ${fromColor}, ${toColor})` }} />
          <div className="flex-1" style={{ background: `linear-gradient(to bottom left, ${fromColor}, ${toColor})` }} />
        </div>
      )
    }
    return null
  }

  const topDecoration = (t?: string) => {
    if (!t) return null
    
    const gradientId = `grad-${t}-${Math.random().toString(36).substr(2, 9)}`
    
    if (t === "fade") {
      return (
        <div
          className="absolute inset-x-0 top-0 h-32 pointer-events-none z-10 -translate-y-32"
          style={{
            background: `linear-gradient(180deg, ${fromColor} 0%, ${toColor} 100%)`,
          }}
        />
      )
    }
    if (t === "gradient") {
      return (
        <div
          className="absolute inset-x-0 top-0 h-40 pointer-events-none z-10 -translate-y-40"
          style={{
            background: `linear-gradient(180deg, ${fromColor} 0%, ${toColor}dd 50%, ${toColor} 100%)`,
          }}
        />
      )
    }
    if (t === "slide") {
      return (
        <div
          className="absolute inset-x-0 top-0 h-24 pointer-events-none z-10 -translate-y-24"
          style={{
            background: `linear-gradient(180deg, ${fromColor} 0%, ${toColor}99 100%)`,
          }}
        />
      )
    }
    if (t === "diagonal") {
      return (
        <div
          className="absolute inset-x-0 top-0 h-32 pointer-events-none z-10 -translate-y-32"
          style={{
            background: `linear-gradient(145deg, ${fromColor} 0%, ${fromColor}88 45%, ${toColor}88 55%, ${toColor} 100%)`,
          }}
        />
      )
    }
    if (t === "wave") {
      return (
        <svg
          className="absolute inset-x-0 top-0 w-full h-28 -translate-y-28 pointer-events-none z-10"
          viewBox="0 0 1200 120"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id={gradientId} x1="0%" x2="0%" y1="0%" y2="100%">
              <stop offset="0%" stopColor={fromColor} />
              <stop offset="100%" stopColor={toColor} />
            </linearGradient>
          </defs>
          <path d="M0,30 C200,10 300,50 600,40 C900,30 1000,60 1200,30 L1200,120 L0,120 Z" fill={`url(#${gradientId})`} />
        </svg>
      )
    }
    if (t === "zigzag") {
      return (
        <svg className="absolute inset-x-0 top-0 w-full h-20 -translate-y-20 pointer-events-none z-10" viewBox="0 0 1200 80" preserveAspectRatio="none">
          <defs>
            <linearGradient id={gradientId} x1="0%" x2="0%" y1="0%" y2="100%">
              <stop offset="0%" stopColor={fromColor} />
              <stop offset="100%" stopColor={toColor} />
            </linearGradient>
          </defs>
          <path d="M0,40 L80,0 L160,80 L240,0 L320,80 L400,0 L480,80 L560,0 L640,80 L720,0 L800,80 L880,0 L960,80 L1040,0 L1120,80 L1200,40 L1200,80 L0,80 Z" fill={`url(#${gradientId})`} />
        </svg>
      )
    }
    if (t === "curve") {
      return (
        <svg className="absolute inset-x-0 top-0 w-full h-36 -translate-y-36 pointer-events-none z-10" viewBox="0 0 1200 140" preserveAspectRatio="none">
          <defs>
            <linearGradient id={gradientId} x1="0%" x2="0%" y1="0%" y2="100%">
              <stop offset="0%" stopColor={fromColor} />
              <stop offset="100%" stopColor={toColor} />
            </linearGradient>
          </defs>
          <path d="M0,20 Q300,120 600,30 T1200,20 L1200,140 L0,140 Z" fill={`url(#${gradientId})`} />
        </svg>
      )
    }
    if (t === "split") {
      return (
        <div className="absolute inset-x-0 top-0 h-24 pointer-events-none z-10 -translate-y-24 flex" style={{ background: fromColor }}>
          <div className="flex-1" style={{ background: `linear-gradient(to bottom right, ${fromColor}, ${toColor})` }} />
          <div className="flex-1" style={{ background: `linear-gradient(to bottom left, ${fromColor}, ${toColor})` }} />
        </div>
      )
    }
    return null
  }

  const t = type

  // If position is "center", render as a standalone element between sections
  if (position === "center") {
    return <div className="relative w-full">{centerDecoration(t)}</div>
  }

  return (
    <div className="relative">
      {position === "top" || position === "both" ? topDecoration(t) : null}
      {children ? (
        <div
          ref={wrapperRef}
          className={`relative pointer-events-auto ${t === "fade" ? `transition-opacity duration-700 ${visible ? "opacity-100" : "opacity-0"}` : ""} ${t === "slide" ? `transition-all duration-500 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}` : ""}`}
        >
          {children}
        </div>
      ) : null}
      {position === "bottom" || position === "both" ? (
        // reuse topDecoration but flipped vertically via transform
        <div className="relative">
          <div className="pointer-events-none">
            <div className="transform rotate-180">{topDecoration(t)}</div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export function SectionRenderer({ section, isPreview, onUpdate, wrapTransition }: SectionRendererProps) {
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
    case "nav":
      inner = <NavSection {...commonProps} />
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

