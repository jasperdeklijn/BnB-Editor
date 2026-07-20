"use client"

import { ImageIcon } from "lucide-react"
import { EditableText } from "@/components/editor/inline-editable-text"
import type { SectionStyles } from "@/lib/types"
import { getLayoutClasses } from "@/lib/section-layouts"
import { useWebsiteLocale } from "@/lib/site-i18n/provider"

export function AboutSection({ data, isPreview, styles, onUpdate }: { data: Record<string, unknown>; isPreview: boolean; styles?: SectionStyles; onUpdate?: (newData: Record<string, unknown>) => void }) {
  const { messages } = useWebsiteLocale()
  const title = (data.title as string) || "Over ons"
  const description = (data.description as string) || "Vertel wie je bent, wat je doet en waarom klanten voor je kiezen."
  const images = Array.isArray(data.images) ? data.images.filter((image): image is string => typeof image === "string" && image.trim().length > 0) : []
  const layout = getLayoutClasses(data.layout)
  const isSplit = layout.layout === "split" || layout.layout === "showcase"
  const textStyle: React.CSSProperties = { color: styles?.textColor }
  const sectionStyle: React.CSSProperties = { backgroundColor: styles?.backgroundColor, backgroundImage: styles?.backgroundImage ? `url(${styles.backgroundImage})` : undefined, backgroundSize: "cover", backgroundPosition: "center" }

  const imageGallery = images.length > 0 ? (
    <div className={`grid gap-3 ${images.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
      {images.map((image, index) => (
        <div
          key={`${image}-${index}`}
          data-about-image-index={index}
          className={`${images.length > 2 && index === 0 ? "col-span-2 h-64" : "h-44"} overflow-hidden rounded-2xl shadow-sm`}
        >
          <img src={image} alt={`${title} ${index + 1}`} className="h-full w-full object-cover" />
        </div>
      ))}
    </div>
  ) : isPreview ? null : (
    <div className="flex min-h-44 items-center justify-center rounded-2xl border border-dashed text-muted-foreground"><ImageIcon className="mr-2 h-5 w-5" />{messages.imagePlaceholder}</div>
  )

  return (
    <section className={`px-4 ${layout.section} sm:px-6 ${styles?.fontFamily || ""}`} style={sectionStyle}>
      <div className={`mx-auto ${layout.container} ${isSplit ? "grid items-center gap-10 md:grid-cols-2" : ""} ${layout.layout === "card" ? "rounded-2xl border border-border p-8 shadow-sm" : ""}`} style={layout.layout === "card" ? { backgroundColor: styles?.surfaceColor || "rgba(255,255,255,0.85)" } : undefined}>
        {isSplit && layout.layout === "showcase" ? imageGallery : null}
        <div className={layout.heading}>
          <EditableText as="h2" data={data} path={["title"]} value={title} isPreview={isPreview} onUpdate={onUpdate} className="mb-5 text-3xl font-bold md:text-4xl" style={textStyle} />
          <EditableText as="p" data={data} path={["description"]} value={description} isPreview={isPreview} onUpdate={onUpdate} multiline className="text-base leading-relaxed text-muted-foreground sm:text-lg" style={textStyle} />
        </div>
        {isSplit && layout.layout !== "showcase" ? imageGallery : null}
        {!isSplit && imageGallery ? <div className="mt-8">{imageGallery}</div> : null}
      </div>
    </section>
  )
}
