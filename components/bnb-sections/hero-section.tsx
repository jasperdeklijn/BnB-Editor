"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { EditableText } from "@/components/editor/editable-text"
import type { SectionStyles } from "@/lib/types"

export type HeroLayout = "centered" | "split" | "fullwidth" | "minimal" | "card" | "split-reverse"

interface HeroSectionProps {
  data: Record<string, unknown>
  isPreview: boolean
  onUpdate?: (newData: Record<string, unknown>) => void
  styles?: SectionStyles
}

export function HeroSection({ data, isPreview, onUpdate, styles }: HeroSectionProps) {
  const title = data.title as string
  const subtitle = data.subtitle as string
  const ctaText = data.ctaText as string
  const layout = (data.layout as HeroLayout) || "centered"

  const handleUpdate = (newData: Record<string, unknown>) => {
    if (onUpdate) {
      onUpdate(newData)
    }
  }

  const sectionStyle: React.CSSProperties = {
    backgroundColor: styles?.backgroundColor,
    backgroundImage: styles?.backgroundImage ? `url(${styles.backgroundImage})` : undefined,
    backgroundSize: "cover",
    backgroundPosition: "center",
  }

  const textStyle: React.CSSProperties = {
    color: styles?.textColor,
  }

  // Layout: Simple/Centered (clean, text-focused, no image)
  if (layout === "centered") {
    return (
      <section
        className={`relative flex min-h-[400px] items-center justify-center overflow-hidden px-4 py-12 sm:min-h-[500px] sm:px-6 sm:py-16 md:min-h-[600px] md:py-24 ${styles?.fontFamily || ""}`}
        style={{
          backgroundColor: styles?.backgroundColor || "#fffbeb",
          backgroundImage: styles?.backgroundImage ? `linear-gradient(to bottom right, rgba(255,251,235,0.9), rgba(254,243,199,0.9)), url(${styles.backgroundImage})` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {/* Subtle decorative element */}
        <div className="absolute inset-0 bg-gradient-to-br from-amber-50 to-orange-100 opacity-80" />
        <div className="relative z-10 max-w-3xl px-2 text-center">
          <EditableText
            value={title}
            onChange={(value) => handleUpdate({ title: value })}
            isPreview={isPreview}
            as="h1"
            className="mb-4 text-balance text-3xl font-bold tracking-tight text-amber-950 sm:mb-6 sm:text-4xl md:text-5xl lg:text-6xl"
            style={textStyle}
          />
          <EditableText
            value={subtitle}
            onChange={(value) => handleUpdate({ subtitle: value })}
            isPreview={isPreview}
            as="p"
            className="mb-6 text-pretty text-base text-amber-900 sm:mb-8 sm:text-lg md:text-xl"
            style={textStyle}
          />
          <Button size="lg" className="bg-amber-700 text-amber-50 hover:bg-amber-800">
            <EditableText
              value={ctaText}
              onChange={(value) => handleUpdate({ ctaText: value })}
              isPreview={isPreview}
              as="span"
              className="bg-transparent text-amber-50 hover:bg-transparent"
            />
          </Button>
        </div>
      </section>
    )
  }

  // Layout: Split (image on left half, text on right half)
  if (layout === "split") {
    return (
      <section
        className={`relative min-h-[400px] overflow-hidden sm:min-h-[500px] lg:min-h-[600px] ${styles?.fontFamily || ""}`}
      >
        <div className="flex min-h-[inherit] flex-col md:flex-row">
          {/* Image Side - Full left half */}
          <div 
            className="relative min-h-[280px] w-full sm:min-h-[400px] md:min-h-[500px] lg:min-h-[600px] md:w-1/2"
            style={{
              backgroundImage: styles?.backgroundImage 
                ? `url(${styles.backgroundImage})` 
                : "url('/placeholder.svg?height=800&width=800')",
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            {/* Subtle overlay for depth */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/5" />
          </div>
          
          {/* Text Side - Clean background */}
          <div 
            className="flex w-full flex-col justify-center px-8 py-12 md:w-1/2 md:px-12 lg:px-16"
            style={{ backgroundColor: styles?.backgroundColor || "#fffbeb" }}
          >
            <EditableText
              value={title}
              onChange={(value) => handleUpdate({ title: value })}
              isPreview={isPreview}
              as="h1"
              className="mb-4 text-balance text-3xl font-bold tracking-tight text-amber-950 sm:text-4xl md:text-5xl"
              style={textStyle}
            />
            <EditableText
              value={subtitle}
              onChange={(value) => handleUpdate({ subtitle: value })}
              isPreview={isPreview}
              as="p"
              className="mb-6 text-pretty text-base text-amber-800 sm:text-lg md:text-xl"
              style={textStyle}
            />
            <div>
              <Button size="lg" className="bg-amber-700 text-amber-50 hover:bg-amber-800">
                <EditableText
                  value={ctaText}
                  onChange={(value) => handleUpdate({ ctaText: value })}
                  isPreview={isPreview}
                  as="span"
                  className="bg-transparent text-amber-50 hover:bg-transparent"
                />
              </Button>
            </div>
          </div>
        </div>
      </section>
    )
  }

  // Layout: Full Image (full background with elegant overlay)
  if (layout === "fullwidth") {
    return (
      <section
        className={`relative flex min-h-[500px] items-center justify-center overflow-hidden sm:min-h-[600px] md:min-h-[700px] ${styles?.fontFamily || ""}`}
        style={{
          backgroundImage: styles?.backgroundImage 
            ? `url(${styles.backgroundImage})` 
            : "url('/placeholder.svg?height=900&width=1600')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {/* Gradient Overlay for readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/50 to-black/60" />
        
        {/* Content */}
        <div className="relative z-10 mx-auto max-w-4xl px-6 text-center">
          <EditableText
            value={title}
            onChange={(value) => handleUpdate({ title: value })}
            isPreview={isPreview}
            as="h1"
            className="mb-6 text-balance text-4xl font-bold tracking-tight text-white drop-shadow-lg sm:text-5xl md:text-6xl lg:text-7xl"
            style={styles?.textColor ? textStyle : undefined}
          />
          <EditableText
            value={subtitle}
            onChange={(value) => handleUpdate({ subtitle: value })}
            isPreview={isPreview}
            as="p"
            className="mb-8 text-pretty text-lg text-white/90 drop-shadow-md sm:text-xl md:text-2xl"
            style={styles?.textColor ? textStyle : undefined}
          />
          <Button size="lg" className="bg-white text-amber-900 shadow-lg hover:bg-white/95 hover:shadow-xl transition-all">
            <EditableText
              value={ctaText}
              onChange={(value) => handleUpdate({ ctaText: value })}
              isPreview={isPreview}
              as="span"
              className="bg-transparent hover:bg-transparent"
            />
          </Button>
        </div>
      </section>
    )
  }

  // Layout: Minimal (text-only, no image)
  if (layout === "minimal") {
    return (
      <section
        className={`relative flex min-h-[400px] items-center justify-center px-4 py-12 sm:px-6 sm:py-16 md:py-24 ${styles?.fontFamily || ""}`}
        style={{
          backgroundColor: styles?.backgroundColor || "#ffffff",
        }}
      >
        <div className="max-w-3xl px-2 text-center">
          <EditableText
            value={title}
            onChange={(value) => handleUpdate({ title: value })}
            isPreview={isPreview}
            as="h1"
            className="mb-4 text-balance text-3xl font-bold tracking-tight sm:mb-6 sm:text-4xl md:text-5xl lg:text-6xl"
            style={textStyle}
          />
          <EditableText
            value={subtitle}
            onChange={(value) => handleUpdate({ subtitle: value })}
            isPreview={isPreview}
            as="p"
            className="mb-6 text-pretty text-base sm:mb-8 sm:text-lg md:text-xl"
            style={textStyle}
          />
          <Button size="lg" className="bg-amber-700 text-amber-50 hover:bg-amber-800">
            <EditableText
              value={ctaText}
              onChange={(value) => handleUpdate({ ctaText: value })}
              isPreview={isPreview}
              as="span"
              className="bg-transparent text-amber-50 hover:bg-transparent"
            />
          </Button>
        </div>
      </section>
    )
  }

  // Layout: Card (image background with text card)
  if (layout === "card") {
    return (
      <section
        className={`relative flex min-h-[500px] items-center justify-center overflow-hidden sm:min-h-[600px] md:min-h-[700px] ${styles?.fontFamily || ""}`}
        style={{
          backgroundImage: styles?.backgroundImage 
            ? `url(${styles.backgroundImage})` 
            : "url('/placeholder.svg?height=900&width=1600')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {/* Overlay for readability */}
        <div className="absolute inset-0 bg-black/30" />
        
        {/* Content Card */}
        <div className="relative z-10 mx-auto max-w-lg bg-white/95 backdrop-blur-sm rounded-lg p-8 shadow-xl">
          <EditableText
            value={title}
            onChange={(value) => handleUpdate({ title: value })}
            isPreview={isPreview}
            as="h1"
            className="mb-4 text-balance text-2xl font-bold tracking-tight text-amber-950 sm:text-3xl md:text-4xl"
            style={textStyle}
          />
          <EditableText
            value={subtitle}
            onChange={(value) => handleUpdate({ subtitle: value })}
            isPreview={isPreview}
            as="p"
            className="mb-6 text-pretty text-sm text-amber-800 sm:text-base"
            style={textStyle}
          />
          <Button size="lg" className="bg-amber-700 text-amber-50 hover:bg-amber-800 w-full">
            <EditableText
              value={ctaText}
              onChange={(value) => handleUpdate({ ctaText: value })}
              isPreview={isPreview}
              as="span"
              className="bg-transparent text-amber-50 hover:bg-transparent"
            />
          </Button>
        </div>
      </section>
    )
  }

  // Layout: Split Reverse (text on left, image on right)
  if (layout === "split-reverse") {
    return (
      <section
        className={`relative min-h-[400px] overflow-hidden sm:min-h-[500px] lg:min-h-[600px] ${styles?.fontFamily || ""}`}
      >
        <div className="flex min-h-[inherit] flex-col md:flex-row">
          {/* Text Side - Clean background */}
          <div 
            className="flex w-full flex-col justify-center px-8 py-12 md:w-1/2 md:px-12 lg:px-16"
            style={{ backgroundColor: styles?.backgroundColor || "#fffbeb" }}
          >
            <EditableText
              value={title}
              onChange={(value) => handleUpdate({ title: value })}
              isPreview={isPreview}
              as="h1"
              className="mb-4 text-balance text-3xl font-bold tracking-tight text-amber-950 sm:text-4xl md:text-5xl"
              style={textStyle}
            />
            <EditableText
              value={subtitle}
              onChange={(value) => handleUpdate({ subtitle: value })}
              isPreview={isPreview}
              as="p"
              className="mb-6 text-pretty text-base text-amber-800 sm:text-lg md:text-xl"
              style={textStyle}
            />
            <div>
              <Button size="lg" className="bg-amber-700 text-amber-50 hover:bg-amber-800">
                <EditableText
                  value={ctaText}
                  onChange={(value) => handleUpdate({ ctaText: value })}
                  isPreview={isPreview}
                  as="span"
                  className="bg-transparent text-amber-50 hover:bg-transparent"
                />
              </Button>
            </div>
          </div>
          
          {/* Image Side - Full right half */}
          <div 
            className={`relative min-h-[280px] w-full sm:min-h-[400px] md:min-h-[500px] lg:min-h-[600px] md:w-1/2`}
            style={{
              backgroundImage: styles?.backgroundImage 
                ? `url(${styles.backgroundImage})` 
                : "url('/placeholder.svg?height=800&width=800')",
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            {/* Subtle overlay for depth */}
            <div className="absolute inset-0 bg-gradient-to-l from-transparent to-black/5" />
          </div>
        </div>
      </section>
    )
  }

  // Fallback to centered
  return null
}
