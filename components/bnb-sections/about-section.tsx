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
    <section className={`bg-background px-6 py-16 ${styles?.fontFamily || ""}`} style={sectionStyle}>
      <div className="mx-auto max-w-4xl">
        <EditableText
          value={title}
          onChange={(value) => handleUpdate({ title: value })} // Use safe handler
          isPreview={isPreview}
          as="h2"
          className="mb-6 text-balance text-4xl font-bold text-amber-950"
          style={textStyle}
        />
        <EditableText
          value={description}
          onChange={(value) => handleUpdate({ description: value })} // Use safe handler
          isPreview={isPreview}
          as="p"
          className="text-pretty text-lg leading-relaxed text-amber-800"
          style={textStyle}
        />
      </div>
    </section>
  )
}
