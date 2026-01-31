"use client"

import type React from "react"

import { EditableText } from "@/components/editor/editable-text"
import type { SectionStyles } from "@/lib/types"

interface AboutSectionProps {
  data: Record<string, unknown>
  isPreview: boolean
  onUpdate?: (newData: Record<string, unknown>) => void // Made onUpdate optional
  styles?: SectionStyles
}

export function AboutSection({ data, isPreview, onUpdate, styles }: AboutSectionProps) {
  const title = data.title as string
  const description = data.description as string

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
    <section className={`bg-background px-4 py-10 sm:px-6 sm:py-12 md:py-16 ${styles?.fontFamily || ""}`} style={sectionStyle}>
      <div className="mx-auto max-w-4xl">
        <EditableText
          value={title}
          onChange={(value) => handleUpdate({ title: value })} // Use safe handler
          isPreview={isPreview}
          as="h2"
          className="mb-4 text-balance text-2xl font-bold text-amber-950 sm:mb-6 sm:text-3xl md:text-4xl"
          style={textStyle}
        />
        <EditableText
          value={description}
          onChange={(value) => handleUpdate({ description: value })} // Use safe handler
          isPreview={isPreview}
          as="p"
          className="text-pretty text-base leading-relaxed text-amber-800 sm:text-lg"
          style={textStyle}
        />
      </div>
    </section>
  )
}
