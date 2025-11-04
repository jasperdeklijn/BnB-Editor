"use client"

import type React from "react"

import { Check } from "lucide-react"
import { EditableText } from "@/components/editor/editable-text"
import type { SectionStyles } from "@/lib/types"

interface AmenitiesSectionProps {
  data: Record<string, unknown>
  isPreview: boolean
  onUpdate: (newData: Record<string, unknown>) => void
  styles?: SectionStyles
}

export function AmenitiesSection({ data, isPreview, onUpdate, styles }: AmenitiesSectionProps) {
  const title = data.title as string
  const items = data.items as string[]

  const updateItem = (index: number, value: string) => {
    const newItems = [...items]
    newItems[index] = value
    onUpdate({ items: newItems })
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
    <section className={`bg-amber-50/50 px-6 py-16 ${styles?.fontFamily || ""}`} style={sectionStyle}>
      <div className="mx-auto max-w-4xl">
        <EditableText
          value={title}
          onChange={(value) => onUpdate({ title: value })}
          isPreview={isPreview}
          as="h2"
          className="mb-12 text-balance text-center text-3xl font-bold text-foreground md:text-4xl"
          style={textStyle}
        />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {items.map((item, index) => (
            <div key={index} className="flex items-center gap-3">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-amber-700">
                <Check className="h-5 w-5 text-amber-50" />
              </div>
              <EditableText
                value={item}
                onChange={(value) => updateItem(index, value)}
                isPreview={isPreview}
                as="span"
                className="text-lg text-foreground"
                style={textStyle}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
