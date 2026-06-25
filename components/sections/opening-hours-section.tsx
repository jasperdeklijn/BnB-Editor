"use client"

import { Clock } from "lucide-react"
import type { SectionStyles } from "@/lib/types"
import { getLayoutClasses } from "@/lib/section-layouts"

export interface OpeningHoursDay {
  label: string
  hours: string
  closed?: boolean
}

interface OpeningHoursSectionProps {
  data: Record<string, unknown>
  isPreview: boolean
  styles?: SectionStyles
}

const DEFAULT_HOURS: OpeningHoursDay[] = [
  { label: "Maandag", hours: "09:00 – 17:00" },
  { label: "Dinsdag", hours: "09:00 – 17:00" },
  { label: "Woensdag", hours: "09:00 – 17:00" },
  { label: "Donderdag", hours: "09:00 – 17:00" },
  { label: "Vrijdag", hours: "09:00 – 17:00" },
  { label: "Zaterdag", hours: "10:00 – 14:00" },
  { label: "Zondag", hours: "", closed: true },
]

const DAY_KEYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const

const DAY_LABELS: Record<string, string> = {
  monday: "Maandag",
  tuesday: "Dinsdag",
  wednesday: "Woensdag",
  thursday: "Donderdag",
  friday: "Vrijdag",
  saturday: "Zaterdag",
  sunday: "Zondag",
}

function getToday(): string {
  const days = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ]
  return days[new Date().getDay()]
}

export function OpeningHoursSection({ data, styles }: OpeningHoursSectionProps) {
  const title = (data.title as string) || "Openingstijden"
  const subtitle = data.subtitle as string | undefined
  const note = data.note as string | undefined
  const today = getToday()
  const layout = getLayoutClasses(data.layout)

  const sectionStyle: React.CSSProperties = {
    backgroundColor: styles?.backgroundColor,
    backgroundImage: styles?.backgroundImage ? `url(${styles.backgroundImage})` : undefined,
    backgroundSize: "cover",
    backgroundPosition: "center",
  }
  const textStyle: React.CSSProperties = { color: styles?.textColor }

  // Build rows from either structured day keys or a fallback items array
  let rows: { label: string; hours: string; closed: boolean; isToday: boolean }[] = []

  const hasDayData = DAY_KEYS.some((k) => data[k] !== undefined)
  if (hasDayData) {
    rows = DAY_KEYS.map((key) => {
      const val = data[key] as { hours?: string; closed?: boolean } | string | undefined
      let hours = ""
      let closed = false
      if (typeof val === "string") {
        hours = val
        closed = !val || val.toLowerCase() === "gesloten"
      } else if (val && typeof val === "object") {
        hours = val.hours ?? ""
        closed = val.closed ?? false
      } else {
        closed = true
      }
      return {
        label: DAY_LABELS[key],
        hours,
        closed,
        isToday: key === today,
      }
    })
  } else {
    const fallback: OpeningHoursDay[] =
      Array.isArray(data.items) && (data.items as OpeningHoursDay[]).length > 0
        ? (data.items as OpeningHoursDay[])
        : DEFAULT_HOURS
    rows = fallback.map((item, idx) => ({
      label: item.label,
      hours: item.hours,
      closed: item.closed ?? !item.hours,
      isToday: idx === new Date().getDay(),
    }))
  }

  return (
    <section
      className={`px-4 ${layout.section} sm:px-6 ${styles?.fontFamily || ""}`}
      style={sectionStyle}
    >
      <div className={`mx-auto ${layout.layout === "split" || layout.layout === "showcase" ? "max-w-4xl" : layout.container}`}>
        <div className={`mb-10 ${layout.heading}`}>
          <div className="mb-3 inline-flex items-center justify-center gap-2 rounded-full bg-amber-100 px-4 py-2 text-sm font-medium text-amber-800">
            <Clock className="h-4 w-4" />
            Openingstijden
          </div>
          <h2
            className="mb-2 text-balance text-3xl font-bold text-amber-950 md:text-4xl"
            style={textStyle}
          >
            {title}
          </h2>
          {subtitle && (
            <p className="text-muted-foreground" style={textStyle}>
              {subtitle}
            </p>
          )}
        </div>

        <div className={`overflow-hidden rounded-2xl border border-border bg-white/70 shadow-sm backdrop-blur ${layout.layout === "split" || layout.layout === "showcase" ? "grid md:grid-cols-2" : ""}`}>
          {rows.map((row, idx) => (
            <div
              key={idx}
              className={`flex items-center justify-between px-6 py-3.5 text-sm ${
                idx < rows.length - 1 ? "border-b border-border" : ""
              } ${row.isToday ? "bg-amber-50" : ""}`}
            >
              <span
                className={`font-medium ${row.isToday ? "text-amber-700" : ""}`}
                style={!row.isToday ? textStyle : undefined}
              >
                {row.label}
                {row.isToday && (
                  <span className="ml-2 rounded-full bg-amber-200 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                    Vandaag
                  </span>
                )}
              </span>
              <span
                className={row.closed ? "text-muted-foreground italic" : "text-muted-foreground"}
                style={textStyle}
              >
                {row.closed ? "Gesloten" : row.hours}
              </span>
            </div>
          ))}
        </div>

        {note && (
          <p className="mt-4 text-center text-xs text-muted-foreground" style={textStyle}>
            {note}
          </p>
        )}
      </div>
    </section>
  )
}
