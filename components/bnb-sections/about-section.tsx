"use client"

import type React from "react"

import { EditableText } from "@/components/editor/editable-text"
import type { SectionStyles } from "@/lib/types"

interface AboutSectionProps {
  data: Record<string, unknown>
  isPreview: boolean
  onUpdate: (newData: Record<string, unknown>) => void
  styles?: SectionStyles
}

export function AboutSection({ data, isPreview, onUpdate, styles }: AboutSectionProps) {
  const title = data.title as string
  const description = data.description as string

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
          onChange={(value) => onUpdate({ title: value })}
          isPreview={isPreview}
          as="h2"
          className="mb-6 text-balance text-3xl font-bold text-foreground md:text-4xl"
          style={textStyle}
        />
        <EditableText
          value={description}
          onChange={(value) => onUpdate({ description: value })}
          isPreview={isPreview}
          as="p"
          className="text-pretty text-lg leading-relaxed text-muted-foreground"
          style={textStyle}
        />
      </div>
    </section>
  )
}
