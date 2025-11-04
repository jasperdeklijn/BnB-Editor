"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { EditableText } from "@/components/editor/editable-text"
import type { SectionStyles } from "@/lib/types"

interface HeroSectionProps {
  data: Record<string, unknown>
  isPreview: boolean
  onUpdate: (newData: Record<string, unknown>) => void
  styles?: SectionStyles
}

export function HeroSection({ data, isPreview, onUpdate, styles }: HeroSectionProps) {
  const title = data.title as string
  const subtitle = data.subtitle as string
  const ctaText = data.ctaText as string

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
      className={`relative flex min-h-[600px] items-center justify-center overflow-hidden bg-gradient-to-br from-amber-50 to-orange-100 px-6 py-24 ${styles?.fontFamily || ""}`}
      style={sectionStyle}
    >
      {!styles?.backgroundImage && (
        <div className="absolute inset-0 bg-[url('/placeholder.svg?height=600&width=1200')] bg-cover bg-center opacity-20" />
      )}
      <div className="relative z-10 max-w-3xl text-center">
        <EditableText
          value={title}
          onChange={(value) => onUpdate({ title: value })}
          isPreview={isPreview}
          as="h1"
          className="mb-6 text-balance text-5xl font-bold tracking-tight text-amber-950 md:text-6xl"
          style={textStyle}
        />
        <EditableText
          value={subtitle}
          onChange={(value) => onUpdate({ subtitle: value })}
          isPreview={isPreview}
          as="p"
          className="mb-8 text-pretty text-xl text-amber-900"
          style={textStyle}
        />
        <Button size="lg" className="bg-amber-700 text-amber-50 hover:bg-amber-800">
          <EditableText
            value={ctaText}
            onChange={(value) => onUpdate({ ctaText: value })}
            isPreview={isPreview}
            as="span"
            className="bg-transparent text-amber-50 hover:bg-transparent"
          />
        </Button>
      </div>
    </section>
  )
}
