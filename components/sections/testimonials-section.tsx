"use client"

import { Star, Quote } from "lucide-react"
import { EditableText } from "@/components/editor/inline-editable-text"
import type { SectionStyles } from "@/lib/types"
import { getLayoutClasses } from "@/lib/section-layouts"

export interface TestimonialItem {
  id?: string
  name: string
  role?: string
  quote: string
  rating?: number
  image?: string
}

interface TestimonialsSectionProps {
  data: Record<string, unknown>
  isPreview: boolean
  styles?: SectionStyles
  onUpdate?: (newData: Record<string, unknown>) => void
}

const DEFAULT_TESTIMONIALS: TestimonialItem[] = [
  {
    id: "1",
    name: "Anna de Vries",
    role: "Vaste klant",
    quote: "Uitstekende service! Ik ben heel tevreden met het resultaat en de persoonlijke aanpak.",
    rating: 5,
  },
  {
    id: "2",
    name: "Mark Janssen",
    role: "Ondernemer",
    quote: "Professioneel, betrouwbaar en snel. Ik zou het iedereen aanraden.",
    rating: 5,
  },
  {
    id: "3",
    name: "Sophie Bakker",
    role: "Particuliere klant",
    quote: "Fijn contact en top vakwerk. We zijn meer dan tevreden met het eindresultaat.",
    rating: 5,
  },
]

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${i < rating ? "fill-amber-400 text-amber-400" : "text-gray-200"}`}
        />
      ))}
    </div>
  )
}

function TestimonialCard({
  item,
  data,
  index,
  isPreview,
  onUpdate,
  textStyle,
}: {
  item: TestimonialItem
  data: Record<string, unknown>
  index: number
  isPreview: boolean
  onUpdate?: (newData: Record<string, unknown>) => void
  textStyle?: React.CSSProperties
}) {
  return (
    <div className="relative flex flex-col gap-4 rounded-2xl border border-border bg-white/70 p-6 shadow-sm backdrop-blur">
      <Quote className="h-7 w-7 text-amber-300 flex-shrink-0" />
      {item.rating !== undefined && <StarRating rating={item.rating} />}
      <EditableText as="p" data={data} path={["items", index, "quote"]} value={item.quote} isPreview={isPreview} onUpdate={onUpdate} className="flex-1 text-sm leading-relaxed text-muted-foreground" style={textStyle} multiline />
      <div className="flex items-center gap-3 pt-2 border-t border-border">
        {item.image ? (
          <img
            src={item.image}
            alt={item.name}
            className="h-9 w-9 rounded-full object-cover flex-shrink-0"
          />
        ) : (
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-amber-100 text-sm font-semibold text-amber-700">
            {item.name.charAt(0)}
          </div>
        )}
        <div>
          <EditableText as="p" data={data} path={["items", index, "name"]} value={item.name} isPreview={isPreview} onUpdate={onUpdate} className="text-sm font-semibold" style={textStyle} />
          {item.role && (
            <EditableText as="p" data={data} path={["items", index, "role"]} value={item.role} isPreview={isPreview} onUpdate={onUpdate} className="text-xs text-muted-foreground" />
          )}
        </div>
      </div>
    </div>
  )
}

export function TestimonialsSection({ data, isPreview, styles, onUpdate }: TestimonialsSectionProps) {
  const title = (data.title as string) || "Wat klanten zeggen"
  const subtitle = data.subtitle as string | undefined
  const items: TestimonialItem[] =
    Array.isArray(data.items) && (data.items as TestimonialItem[]).length > 0
      ? (data.items as TestimonialItem[])
      : DEFAULT_TESTIMONIALS
  const editableData =
    Array.isArray(data.items) && (data.items as TestimonialItem[]).length > 0
      ? data
      : { ...data, items }
  const layout = getLayoutClasses(data.layout)

  const sectionStyle: React.CSSProperties = {
    backgroundColor: styles?.backgroundColor,
    backgroundImage: styles?.backgroundImage ? `url(${styles.backgroundImage})` : undefined,
    backgroundSize: "cover",
    backgroundPosition: "center",
  }
  const textStyle: React.CSSProperties = { color: styles?.textColor }

  return (
    <section
      className={`px-4 ${layout.section} sm:px-6 ${styles?.fontFamily || ""}`}
      style={sectionStyle}
    >
      <div className={`mx-auto ${layout.container}`}>
        <div className={`mb-12 ${layout.heading}`}>
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-amber-600">
            Ervaringen
          </p>
          <EditableText
            as="h2"
            data={data}
            path={["title"]}
            value={title}
            isPreview={isPreview}
            onUpdate={onUpdate}
            className="mb-3 text-balance text-3xl font-bold text-amber-950 md:text-4xl"
            style={textStyle}
          />
          {subtitle && (
            <EditableText as="p" data={data} path={["subtitle"]} value={subtitle} isPreview={isPreview} onUpdate={onUpdate} className="mx-auto max-w-xl text-muted-foreground" style={textStyle} multiline />
          )}
        </div>

        <div className={`grid gap-6 ${layout.grid}`}>
          {items.map((item, idx) => (
            <TestimonialCard key={item.id ?? idx} item={item} data={editableData} index={idx} isPreview={isPreview} onUpdate={onUpdate} textStyle={textStyle} />
          ))}
        </div>
      </div>
    </section>
  )
}
