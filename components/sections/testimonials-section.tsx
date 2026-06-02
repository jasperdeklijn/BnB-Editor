"use client"

import { Star, Quote } from "lucide-react"
import type { SectionStyles } from "@/lib/types"

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
  textStyle,
}: {
  item: TestimonialItem
  textStyle?: React.CSSProperties
}) {
  return (
    <div className="relative flex flex-col gap-4 rounded-2xl border border-border bg-white/70 p-6 shadow-sm backdrop-blur">
      <Quote className="h-7 w-7 text-amber-300 flex-shrink-0" />
      {item.rating !== undefined && <StarRating rating={item.rating} />}
      <p className="flex-1 text-sm leading-relaxed text-muted-foreground" style={textStyle}>
        {item.quote}
      </p>
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
          <p className="text-sm font-semibold" style={textStyle}>
            {item.name}
          </p>
          {item.role && (
            <p className="text-xs text-muted-foreground">{item.role}</p>
          )}
        </div>
      </div>
    </div>
  )
}

export function TestimonialsSection({ data, styles }: TestimonialsSectionProps) {
  const title = (data.title as string) || "Wat klanten zeggen"
  const subtitle = data.subtitle as string | undefined
  const items: TestimonialItem[] =
    Array.isArray(data.items) && (data.items as TestimonialItem[]).length > 0
      ? (data.items as TestimonialItem[])
      : DEFAULT_TESTIMONIALS

  const sectionStyle: React.CSSProperties = {
    backgroundColor: styles?.backgroundColor,
    backgroundImage: styles?.backgroundImage ? `url(${styles.backgroundImage})` : undefined,
    backgroundSize: "cover",
    backgroundPosition: "center",
  }
  const textStyle: React.CSSProperties = { color: styles?.textColor }

  return (
    <section
      className={`px-4 py-12 sm:px-6 md:py-20 ${styles?.fontFamily || ""}`}
      style={sectionStyle}
    >
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 text-center">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-amber-600">
            Ervaringen
          </p>
          <h2
            className="mb-3 text-balance text-3xl font-bold text-amber-950 md:text-4xl"
            style={textStyle}
          >
            {title}
          </h2>
          {subtitle && (
            <p className="mx-auto max-w-xl text-muted-foreground" style={textStyle}>
              {subtitle}
            </p>
          )}
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item, idx) => (
            <TestimonialCard key={item.id ?? idx} item={item} textStyle={textStyle} />
          ))}
        </div>
      </div>
    </section>
  )
}
