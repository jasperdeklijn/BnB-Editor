"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { EditableText } from "@/components/editor/editable-text"
import type { SectionStyles } from "@/lib/types"

interface HeroSectionProps {
  data: Record<string, unknown>
  isPreview: boolean
  onUpdate?: (newData: Record<string, unknown>) => void // Made onUpdate optional
  styles?: SectionStyles
}

export function HeroSection({ data, isPreview, onUpdate, styles }: HeroSectionProps) {
  const title = data.title as string
  const subtitle = data.subtitle as string
  const ctaText = data.ctaText as string

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
          onChange={(value) => handleUpdate({ title: value })} // Use safe handler
          isPreview={isPreview}
          as="h1"
          className="mb-4 text-balance text-3xl font-bold tracking-tight text-amber-950 sm:mb-6 sm:text-4xl md:text-5xl lg:text-6xl"
          style={textStyle}
        />
        <EditableText
          value={subtitle}
          onChange={(value) => handleUpdate({ subtitle: value })} // Use safe handler
          isPreview={isPreview}
          as="p"
          className="mb-6 text-pretty text-base text-amber-900 sm:mb-8 sm:text-lg md:text-xl"
          style={textStyle}
        />
        <Button size="lg" className="bg-amber-700 text-amber-50 hover:bg-amber-800">
          <EditableText
            value={ctaText}
            onChange={(value) => handleUpdate({ ctaText: value })} // Use safe handler
            isPreview={isPreview}
            as="span"
            className="bg-transparent text-amber-50 hover:bg-transparent"
          />
        </Button>
      </div>
    </section>
  )
}
