"use client"

import type React from "react"

import { Check } from "lucide-react"
import type { SectionStyles } from "@/lib/types"

interface AmenitiesSectionProps {
  data: Record<string, unknown>
  isPreview: boolean
  styles?: SectionStyles
}

export function AmenitiesSection({ data, styles }: AmenitiesSectionProps) {
  const title = data.title as string
  const amenities = (data.amenities as string[]) || []

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
    <section className={`bg-amber-50/50 px-4 py-10 sm:px-6 sm:py-12 md:py-16 ${styles?.fontFamily || ""}`} style={sectionStyle}>
      <div className="mx-auto max-w-4xl">
        <h2
          className="mb-8 text-balance text-center text-2xl font-bold text-amber-950 sm:mb-10 sm:text-3xl md:mb-12 md:text-4xl"
          style={textStyle}
        >
          {title}
        </h2>
        <div className="grid gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-3">
          {amenities.map((amenity, index) => (
            <div key={index} className="flex items-center gap-3">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-amber-700">
                <Check className="h-5 w-5 text-amber-50" />
              </div>
              <span className="text-amber-800" style={textStyle}>
                {amenity}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export const FeaturesSection = AmenitiesSection
