"use client"

import type React from "react"

import { EditableText } from "@/components/editor/inline-editable-text"
import type { SectionStyles } from "@/lib/types"
import { getLayoutClasses } from "@/lib/section-layouts"

interface AboutSectionProps {
  data: Record<string, unknown>
  isPreview: boolean
  styles?: SectionStyles
  onUpdate?: (newData: Record<string, unknown>) => void
}

export function AboutSection({ data, isPreview, styles, onUpdate }: AboutSectionProps) {
  const title = data.title as string
  const description = data.description as string
  const layout = getLayoutClasses(data.layout)

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
    <section className={`bg-background px-4 ${layout.section} ${styles?.fontFamily || ""}`} style={sectionStyle}>
      <div className={`mx-auto ${layout.container} ${layout.layout === "card" ? "rounded-2xl border border-border bg-white/70 p-8 shadow-sm backdrop-blur" : ""}`}>
        <EditableText
          as="h2"
          data={data}
          path={["title"]}
          value={title}
          isPreview={isPreview}
          onUpdate={onUpdate}
          className={`mb-4 text-balance text-2xl font-bold text-amber-950 sm:mb-6 sm:text-3xl md:text-4xl ${layout.heading}`}
          style={textStyle}
        />
        <EditableText
          as="p"
          data={data}
          path={["description"]}
          value={description}
          isPreview={isPreview}
          onUpdate={onUpdate}
          multiline
          className={`text-pretty text-base leading-relaxed text-amber-800 sm:text-lg ${layout.layout === "split" ? "columns-1 md:columns-2 md:gap-10" : ""} ${layout.layout === "banner" ? "text-center text-xl" : ""}`}
          style={textStyle}
        />
      </div>
    </section>
  )
}
