"use client"

import type React from "react"

import type { SectionStyles } from "@/lib/types"
import { getLayoutClasses } from "@/lib/section-layouts"

interface AboutSectionProps {
  data: Record<string, unknown>
  isPreview: boolean
  styles?: SectionStyles
}

export function AboutSection({ data, styles }: AboutSectionProps) {
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
        <h2
          className={`mb-4 text-balance text-2xl font-bold text-amber-950 sm:mb-6 sm:text-3xl md:text-4xl ${layout.heading}`}
          style={textStyle}
        >
          {title}
        </h2>
        <p
          className={`text-pretty text-base leading-relaxed text-amber-800 sm:text-lg ${layout.layout === "split" ? "columns-1 md:columns-2 md:gap-10" : ""} ${layout.layout === "banner" ? "text-center text-xl" : ""}`}
          style={textStyle}
        >
          {description}
        </p>
      </div>
    </section>
  )
}
