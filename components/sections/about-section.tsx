"use client"

import { isVideoSource } from "@/lib/media"

import { BackgroundMedia } from "@/components/images/background-media"

import { SectionImage } from "@/components/editor/section-content-context"

import { ImageIcon } from "lucide-react"
import { EditableText } from "@/components/editor/inline-editable-text"
import type { SectionStyles } from "@/lib/types"
import { getLayoutClasses } from "@/lib/section-layouts"
import { useWebsiteLocale } from "@/lib/site-i18n/provider"
import { getSectionColorVars } from "@/lib/section-colors"

export function AboutSection({ data, isPreview, styles, onUpdate }: { data: Record<string, unknown>; isPreview: boolean; styles?: SectionStyles; onUpdate?: (newData: Record<string, unknown>) => void }) {
  const { messages } = useWebsiteLocale()
  const title = (data.title as string) || "Over ons"
  const description = (data.description as string) || "Vertel wie je bent, wat je doet en waarom klanten voor je kiezen."
  const images = Array.isArray(data.images) ? data.images.filter((image): image is string => typeof image === "string" && image.trim().length > 0) : []
  const layout = getLayoutClasses(data.layout)
  const isSplit = layout.layout === "split" || layout.layout === "showcase"
  const textStyle: React.CSSProperties = { color: styles?.textColor }
  const sectionStyle: React.CSSProperties = { ...getSectionColorVars(styles), backgroundColor: styles?.backgroundColor, backgroundImage: styles?.backgroundImage && !isVideoSource(styles.backgroundImage) ? `url(${styles.backgroundImage})` : undefined, backgroundSize: "cover", backgroundPosition: styles?.backgroundPosition || "center" }

  const imageGallery = images.length > 0 ? (
    <div data-section-content className={`mx-auto grid w-full gap-3 ${images.length === 1 ? "max-w-lg grid-cols-1" : "max-w-4xl grid-cols-2"}`}>
      {images.map((image, index) => (
        <div
          key={`${image}-${index}`}
          data-about-image-index={index}
          className="aspect-square overflow-hidden rounded-2xl border border-[var(--section-accent)] shadow-sm"
        >
          <SectionImage data-section-image contentPath={["images", index]} src={image} alt={`${title} ${index + 1}`} className="h-full w-full object-cover" />
        </div>
      ))}
    </div>
  ) : isPreview ? null : (
    <div className="flex min-h-44 items-center justify-center rounded-2xl border border-dashed border-[var(--section-accent)] text-muted-foreground"><ImageIcon className="mr-2 h-5 w-5 text-[var(--section-accent)]" />{messages.imagePlaceholder}</div>
  )

  return (
    <section className={`px-4 ${layout.section} sm:px-6 ${styles?.fontFamily || ""}`} style={sectionStyle} data-media-host><BackgroundMedia src={styles?.backgroundImage} position={styles?.backgroundPosition} />
      <div data-section-columns={isSplit || undefined} data-section-content className={`mx-auto ${layout.container} ${isSplit ? "grid items-center gap-10 md:grid-cols-2" : ""} ${layout.layout === "card" ? "rounded-2xl border border-border bg-[var(--section-surface)] p-8 text-[var(--section-surface-foreground)] shadow-sm" : ""}`} data-media-content>
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
