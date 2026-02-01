"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { EditableText } from "@/components/editor/editable-text"
import type { SectionStyles } from "@/lib/types"

export type HeroLayout = "centered" | "split" | "fullwidth"

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

  // Layout: Centered (default)
  if (layout === "centered") {
    return (
      <section
        className={`relative flex min-h-[400px] items-center justify-center overflow-hidden bg-gradient-to-br from-amber-50 to-orange-100 px-4 py-12 sm:min-h-[500px] sm:px-6 sm:py-16 md:min-h-[600px] md:py-24 ${styles?.fontFamily || ""}`}
        style={sectionStyle}
      >
        {!styles?.backgroundImage && (
          <div className="absolute inset-0 bg-[url('/placeholder.svg?height=600&width=1200')] bg-cover bg-center opacity-20" />
        )}
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

  // Layout: Split (image left, text right)
  if (layout === "split") {
    return (
      <section
        className={`relative min-h-[400px] overflow-hidden bg-gradient-to-br from-amber-50 to-orange-100 sm:min-h-[500px] md:min-h-[600px] ${styles?.fontFamily || ""}`}
        style={{ backgroundColor: styles?.backgroundColor }}
      >
        <div className="flex min-h-[inherit] flex-col md:flex-row">
          {/* Image Side */}
          <div 
            className="relative min-h-[200px] w-full md:min-h-[inherit] md:w-1/2"
            style={{
              backgroundImage: styles?.backgroundImage 
                ? `url(${styles.backgroundImage})` 
                : "url('/placeholder.svg?height=600&width=800')",
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            <div className="absolute inset-0 bg-amber-900/10" />
          </div>
          
          {/* Text Side */}
          <div className="flex w-full flex-col justify-center px-6 py-12 md:w-1/2 md:px-12 lg:px-16">
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
              className="mb-6 text-pretty text-base text-amber-900 sm:text-lg md:text-xl"
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

  // Layout: Full-width with dark overlay
  if (layout === "fullwidth") {
    return (
      <section
        className={`relative flex min-h-[500px] items-center justify-center overflow-hidden sm:min-h-[600px] md:min-h-[700px] ${styles?.fontFamily || ""}`}
        style={{
          backgroundImage: styles?.backgroundImage 
            ? `url(${styles.backgroundImage})` 
            : "url('/placeholder.svg?height=800&width=1600')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {/* Dark Overlay */}
        <div className="absolute inset-0 bg-black/50" />
        
        {/* Content */}
        <div className="relative z-10 mx-auto max-w-4xl px-6 text-center">
          <EditableText
            value={title}
            onChange={(value) => handleUpdate({ title: value })}
            isPreview={isPreview}
            as="h1"
            className="mb-6 text-balance text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl"
            style={styles?.textColor ? textStyle : undefined}
          />
          <EditableText
            value={subtitle}
            onChange={(value) => handleUpdate({ subtitle: value })}
            isPreview={isPreview}
            as="p"
            className="mb-8 text-pretty text-lg text-white/90 sm:text-xl md:text-2xl"
            style={styles?.textColor ? textStyle : undefined}
          />
          <Button size="lg" className="bg-white text-amber-900 hover:bg-white/90">
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

  // Fallback to centered
  return null
}
