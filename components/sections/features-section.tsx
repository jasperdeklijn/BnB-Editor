"use client"

import type React from "react"

import { EditableText } from "@/components/editor/inline-editable-text"
import { Check } from "lucide-react"
import type { SectionStyles } from "@/lib/types"
import { getLayoutClasses } from "@/lib/section-layouts"

interface FeaturesSectionProps {
  data: Record<string, unknown>
  isPreview: boolean
  styles?: SectionStyles
  onUpdate?: (newData: Record<string, unknown>) => void
}

export function FeaturesSection({ data, isPreview, styles, onUpdate }: FeaturesSectionProps) {
  const title = data.title as string
  const features = (data.features as string[]) || []
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
    <section className={`bg-amber-50/50 px-4 ${layout.section} ${styles?.fontFamily || ""}`} style={sectionStyle}>
      <div className={`mx-auto ${layout.container}`}>
        <EditableText
          as="h2"
          data={data}
          path={["title"]}
          value={title}
          isPreview={isPreview}
          onUpdate={onUpdate}
          className={`mb-8 text-balance text-2xl font-bold text-amber-950 sm:mb-10 sm:text-3xl md:mb-12 md:text-4xl ${layout.heading}`}
          style={textStyle}
        />
        <div className={`grid gap-3 sm:gap-4 ${layout.grid}`}>
          {features.map((feature, index) => (
            <div key={index} className={`flex items-center gap-3 ${layout.layout === "card" || layout.layout === "showcase" ? "rounded-2xl border border-border bg-white/70 p-5 shadow-sm backdrop-blur" : ""}`}>
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-amber-700">
                <Check className="h-5 w-5 text-amber-50" />
              </div>
              <EditableText
                data={data}
                path={["features", index]}
                value={feature}
                isPreview={isPreview}
                onUpdate={onUpdate}
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
