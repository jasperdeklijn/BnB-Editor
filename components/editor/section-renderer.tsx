"use client"

import React, { useEffect, useState, useRef } from "react"
import type { Section } from "@/lib/types"
import type { BusinessCategory } from "@/lib/business/categories"
import { getSectionDefinition } from "@/components/editor/section-registry"
import { normalizeSectionStyleType } from "@/lib/section-style-types"
import { getSectionColorVars } from "@/lib/section-colors"

interface SectionRendererProps {
  section: Section
  isPreview: boolean
  onUpdate?: (newData: Record<string, unknown>) => void // Made onUpdate optional
  wrapTransition?: boolean
  allSections?: Section[] // All sections for nav to generate links
  device?: "desktop" | "tablet" | "mobile" // Device mode for responsive preview
  websiteId?: string | null
  businessId?: string | null
  businessCategory?: BusinessCategory | null
  activeLocale?: string
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
    if (t === "paint") {
      return (
        <svg
          aria-hidden="true"
          focusable="false"
          className="block w-full pointer-events-none"
          viewBox="0 0 1200 140"
          preserveAspectRatio="none"
          style={{ height: "clamp(64px, 8vw, 112px)" }}
        >
          <rect width="1200" height="140" fill={toColor} />
          <path
            d="M0 0H1200V38C1180 24 1178 54 1162 49C1152 46 1158 94 1144 93C1127 90 1139 42 1118 49C1098 58 1093 26 1072 39C1058 48 1064 72 1048 67C1029 60 1016 40 996 49C978 56 985 117 967 113C951 108 965 67 943 64C922 60 924 40 900 46C881 52 883 79 864 70C843 59 830 46 808 52C789 58 793 91 778 85C760 78 777 43 751 47C726 52 722 30 701 39C681 49 693 101 674 99C654 97 668 61 643 63C619 67 612 45 591 52C569 60 580 121 561 119C541 116 556 71 533 68C511 66 503 42 481 47C459 53 468 80 450 76C430 71 438 39 413 46C391 52 384 32 362 41C341 50 354 105 334 101C314 98 330 65 306 61C285 57 280 41 257 48C233 55 241 88 223 83C205 79 214 46 189 50C166 56 163 33 141 44C122 54 135 115 116 110C95 105 110 67 88 64C68 61 63 42 43 49C25 55 14 40 0 48Z"
            fill={fromColor}
          />
          <g fill={fromColor}>
            <ellipse cx="104" cy="109" rx="12" ry="7" transform="rotate(-22 104 109)" />
            <circle cx="136" cy="123" r="4" />
            <circle cx="360" cy="112" r="6" />
            <ellipse cx="576" cy="116" rx="15" ry="8" transform="rotate(18 576 116)" />
            <circle cx="604" cy="130" r="3" />
            <ellipse cx="854" cy="113" rx="10" ry="6" />
            <circle cx="1090" cy="117" r="8" />
            <circle cx="1116" cy="129" r="3" />
          </g>
          <g fill={toColor}>
            <ellipse cx="244" cy="30" rx="8" ry="5" />
            <circle cx="690" cy="25" r="5" />
            <ellipse cx="1060" cy="28" rx="11" ry="5" />
          </g>
        </svg>
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

function SectionRendererComponent({
  section,
  isPreview,
  onUpdate,
  wrapTransition,
  allSections,
  device,
  websiteId,
  businessId,
  businessCategory,
  activeLocale,
}: SectionRendererProps) {
  const commonProps = {
    data: section.data,
    isPreview,
    ...(onUpdate && { onUpdate }), // Only include onUpdate if it exists
    styles: section.styles,
    websiteId,
    businessId,
    businessCategory,
    activeLocale,
  }

  const definition = getSectionDefinition(section.type)
  const Renderer = definition?.Renderer
  const inner = Renderer ? (
    <Renderer {...commonProps} allSections={allSections} device={device} />
  ) : null
  const styleType = normalizeSectionStyleType(section.data.styleType)
  const rendererHandlesStyleType = section.type === "hero" || section.type === "nav"
  const styledInner = inner && !rendererHandlesStyleType ? (
    <div className="section-style-shell" data-section-style-type={styleType} style={getSectionColorVars(section.styles)}>
      {inner}
    </div>
  ) : inner

  // If wrapTransition is explicitly false, don't wrap
  if (wrapTransition === false) return styledInner

  // Otherwise just render the inner component
  return styledInner
}

export const SectionRenderer = React.memo(
  SectionRendererComponent,
  (previous, next) =>
    previous.section === next.section &&
    previous.isPreview === next.isPreview &&
    previous.wrapTransition === next.wrapTransition &&
    previous.allSections === next.allSections &&
    previous.device === next.device &&
    previous.websiteId === next.websiteId &&
    previous.businessId === next.businessId &&
    previous.businessCategory === next.businessCategory &&
    previous.activeLocale === next.activeLocale,
)
