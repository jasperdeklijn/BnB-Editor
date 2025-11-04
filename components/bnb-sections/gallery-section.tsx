"use client"

import type React from "react"

import { EditableText } from "@/components/editor/editable-text"
import type { SectionStyles } from "@/lib/types"

interface GallerySectionProps {
  data: Record<string, unknown>
  isPreview: boolean
  onUpdate: (newData: Record<string, unknown>) => void
  styles?: SectionStyles
}

export function GallerySection({ data, isPreview, onUpdate, styles }: GallerySectionProps) {
  const title = data.title as string
  const imageCount = data.images as number

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
      <div className="mx-auto max-w-6xl">
        <EditableText
          value={title}
          onChange={(value) => onUpdate({ title: value })}
          isPreview={isPreview}
          as="h2"
          className="mb-12 text-balance text-center text-3xl font-bold text-foreground md:text-4xl"
          style={textStyle}
        />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: imageCount }).map((_, index) => (
            <div
              key={index}
              className="aspect-square overflow-hidden rounded-lg bg-gradient-to-br from-amber-100 to-orange-200"
            >
              <img
                src={`/placeholder.svg?height=400&width=400&query=bed+and+breakfast+interior+${index + 1}`}
                alt={`Gallery image ${index + 1}`}
                className="h-full w-full object-cover"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
