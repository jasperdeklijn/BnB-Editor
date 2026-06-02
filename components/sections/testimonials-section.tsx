"use client"

import { Star } from "lucide-react"
import type { SectionStyles } from "@/lib/types"

export interface TestimonialItem {
  name: string
  role?: string
  quote: string
  rating?: number
  avatar?: string
}

interface TestimonialsSectionProps {
  data: Record<string, unknown>
  isPreview: boolean
  styles?: SectionStyles
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5" aria-label={`${rating} van 5 sterren`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${i < rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`}
        />
      ))}
    </div>
  )
}

function Avatar({ name, url }: { name: string; url?: string }) {
  if (url) {
    return (
      <img
        src={url}
        alt={name}
        className="h-12 w-12 rounded-full object-cover ring-2 ring-border"
      />
    )
  }
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
  return (
    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-sm font-semibold text-amber-700 ring-2 ring-border">
      {initials}
    </div>
  )
}

export function TestimonialsSection({ data, styles }: TestimonialsSectionProps) {
  const title = (data.title as string) || "Wat klanten zeggen"
  const subtitle = (data.subtitle as string) || ""
  const items: TestimonialItem[] = (data.items as TestimonialItem[]) || DEFAULT_TESTIMONIALS
  const layout = (data.layout as string) || "grid"

  const sectionStyle: React.CSSProperties = {
    backgroundColor: styles?.backgroundColor,
    backgroundImage: styles?.backgroundImage ? `url(${styles.backgroundImage})` : undefined,
    backgroundSize: "cover",
    backgroundPosition: "center",
    fontFamily: styles?.fontFamily,
    color: styles?.textColor,
  }

  return (
    <section
      className="px-4 py-16 sm:px-6 md:py-24"
      style={sectionStyle}
    >
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 text-center">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-amber-600">
            Ervaringen
          </p>
          <h2 className="text-balance text-3xl font-bold text-amber-950 md:text-4xl" style={styles?.textColor ? { color: styles.textColor } : undefined}>
            {title}
          </h2>
          {subtitle && (
            <p className="mt-3 text-muted-foreground" style={styles?.textColor ? { color: styles.textColor } : undefined}>
              {subtitle}
            </p>
          )}
        </div>

        {layout === "grid" && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item, i) => (
              <div
                key={i}
                className="flex flex-col gap-4 rounded-2xl border border-border bg-white/80 p-6 shadow-sm backdrop-blur"
              >
                {item.rating != null && <StarRating rating={item.rating} />}
                <p className="flex-1 text-sm leading-relaxed text-muted-foreground">
                  &ldquo;{item.quote}&rdquo;
                </p>
                <div className="flex items-center gap-3 border-t border-border pt-4">
                  <Avatar name={item.name} url={item.avatar} />
                  <div>
                    <p className="text-sm font-semibold">{item.name}</p>
                    {item.role && (
                      <p className="text-xs text-muted-foreground">{item.role}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {layout === "list" && (
          <div className="mx-auto max-w-3xl space-y-6">
            {items.map((item, i) => (
              <div
                key={i}
                className="flex gap-5 rounded-2xl border border-border bg-white/80 p-6 shadow-sm"
              >
                <Avatar name={item.name} url={item.avatar} />
                <div className="flex-1">
                  <div className="mb-1 flex items-center gap-3">
                    <p className="font-semibold">{item.name}</p>
                    {item.rating != null && <StarRating rating={item.rating} />}
                  </div>
                  {item.role && (
                    <p className="mb-2 text-xs text-amber-600">{item.role}</p>
                  )}
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    &ldquo;{item.quote}&rdquo;
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {layout === "highlight" && (
          <div className="space-y-8">
            {/* First item large */}
            {items[0] && (
              <div className="rounded-3xl bg-amber-700 p-8 text-white md:p-12">
                {items[0].rating != null && <StarRating rating={items[0].rating} />}
                <p className="mt-4 text-xl font-medium leading-relaxed md:text-2xl">
                  &ldquo;{items[0].quote}&rdquo;
                </p>
                <div className="mt-6 flex items-center gap-3">
                  <Avatar name={items[0].name} url={items[0].avatar} />
                  <div>
                    <p className="font-semibold">{items[0].name}</p>
                    {items[0].role && (
                      <p className="text-sm text-amber-200">{items[0].role}</p>
                    )}
                  </div>
                </div>
              </div>
            )}
            {/* Rest in grid */}
            {items.length > 1 && (
              <div className="grid gap-6 sm:grid-cols-2">
                {items.slice(1).map((item, i) => (
                  <div
                    key={i}
                    className="rounded-2xl border border-border bg-white/80 p-6 shadow-sm"
                  >
                    {item.rating != null && <StarRating rating={item.rating} />}
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                      &ldquo;{item.quote}&rdquo;
                    </p>
                    <div className="mt-4 flex items-center gap-3 border-t border-border pt-4">
                      <Avatar name={item.name} url={item.avatar} />
                      <div>
                        <p className="text-sm font-semibold">{item.name}</p>
                        {item.role && (
                          <p className="text-xs text-muted-foreground">{item.role}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  )
}

export const DEFAULT_TESTIMONIALS: TestimonialItem[] = [
  {
    name: "Sophie de Vries",
    role: "Klant",
    quote: "Ontzettend tevreden met het resultaat. Professioneel, snel en vriendelijk. Ik beveel dit zeker aan!",
    rating: 5,
  },
  {
    name: "Mark Jansen",
    role: "Vaste klant",
    quote: "Al jaren klant en nog steeds even blij. De kwaliteit is altijd top en de service is uitstekend.",
    rating: 5,
  },
  {
    name: "Linda Bakker",
    role: "Klant",
    quote: "Fijne samenwerking, duidelijke communicatie en een prachtig eindresultaat. Dank jullie wel!",
    rating: 4,
  },
]
