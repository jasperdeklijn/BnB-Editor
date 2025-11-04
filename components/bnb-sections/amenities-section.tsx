"use client"

import type React from "react"

import { Check } from "lucide-react"
import { EditableText } from "@/components/editor/editable-text"
import type { SectionStyles } from "@/lib/types"

interface AmenitiesSectionProps {
  data: Record<string, unknown>
  isPreview: boolean
  onUpdate?: (newData: Record<string, unknown>) => void // Made onUpdate optional
  styles?: SectionStyles
}

export function AmenitiesSection({ data, isPreview, onUpdate, styles }: AmenitiesSectionProps) {
  const title = data.title as string
  const amenities = (data.amenities as string[]) || []

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
    <section className={`bg-amber-50/50 px-6 py-16 ${styles?.fontFamily || ""}`} style={sectionStyle}>
      <div className="mx-auto max-w-4xl">
        <EditableText
          value={title}
          onChange={(value) => handleUpdate({ title: value })} // Use safe handler
          isPreview={isPreview}
          as="h2"
          className="mb-12 text-balance text-center text-4xl font-bold text-amber-950"
          style={textStyle}
        />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {amenities.map((amenity, index) => (
            <div key={index} className="flex items-center gap-3">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-amber-700">
                <Check className="h-5 w-5 text-amber-50" />
              </div>
              <EditableText
                value={amenity}
                onChange={(value) => {
                  const newAmenities = [...amenities]
                  newAmenities[index] = value
                  handleUpdate({ amenities: newAmenities }) // Use safe handler
                }}
                isPreview={isPreview}
                as="span"
                className="text-amber-800"
                style={textStyle}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
