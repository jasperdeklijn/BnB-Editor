"use client"

import { Clock } from "lucide-react"
import type { SectionStyles } from "@/lib/types"

export interface OpeningHoursDay {
  day: string
  opens: string
  closes: string
  closed: boolean
  note?: string
}

interface OpeningHoursSectionProps {
  data: Record<string, unknown>
  isPreview: boolean
  styles?: SectionStyles
}

function isCurrentDay(day: string): boolean {
  const days = ["Zondag", "Maandag", "Dinsdag", "Woensdag", "Donderdag", "Vrijdag", "Zaterdag"]
  return days[new Date().getDay()] === day
}

export function OpeningHoursSection({ data, styles }: OpeningHoursSectionProps) {
  const title = (data.title as string) || "Openingstijden"
  const subtitle = (data.subtitle as string) || ""
  const hours: OpeningHoursDay[] = (data.hours as OpeningHoursDay[]) || DEFAULT_HOURS
  const layout = (data.layout as string) || "card"
  const showCurrentDay = (data.showCurrentDay as boolean) ?? true

  const sectionStyle: React.CSSProperties = {
    backgroundColor: styles?.backgroundColor,
    backgroundImage: styles?.backgroundImage ? `url(${styles.backgroundImage})` : undefined,
    backgroundSize: "cover",
    backgroundPosition: "center",
    fontFamily: styles?.fontFamily,
  }
  const textStyle: React.CSSProperties = styles?.textColor ? { color: styles.textColor } : {}

  return (
    <section className="px-4 py-16 sm:px-6 md:py-24" style={sectionStyle}>
      <div className="mx-auto max-w-3xl">
        <div className="mb-10 text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-amber-100 px-4 py-1.5 text-sm font-medium text-amber-700">
            <Clock className="h-4 w-4" />
            Openingstijden
          </div>
          <h2
            className="text-balance text-3xl font-bold text-amber-950 md:text-4xl"
            style={textStyle}
          >
            {title}
          </h2>
          {subtitle && (
            <p className="mt-3 text-muted-foreground" style={textStyle}>
              {subtitle}
            </p>
          )}
        </div>

        {layout === "card" && (
          <div className="overflow-hidden rounded-2xl border border-border bg-white/90 shadow-md backdrop-blur">
            {hours.map((row, i) => {
              const isToday = showCurrentDay && isCurrentDay(row.day)
              return (
                <div
                  key={i}
                  className={`flex items-center justify-between px-6 py-4 ${
                    i < hours.length - 1 ? "border-b border-border" : ""
                  } ${isToday ? "bg-amber-50" : ""}`}
                >
                  <div className="flex items-center gap-3">
                    {isToday && (
                      <span className="h-2 w-2 rounded-full bg-green-500" aria-label="Vandaag" />
                    )}
                    <span
                      className={`text-sm font-medium ${isToday ? "text-amber-700" : ""}`}
                      style={!isToday ? textStyle : undefined}
                    >
                      {row.day}
                    </span>
                    {isToday && (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                        Vandaag
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    {row.closed ? (
                      <span className="text-sm text-muted-foreground">Gesloten</span>
                    ) : (
                      <span className="text-sm font-medium text-amber-700">
                        {row.opens} – {row.closes}
                      </span>
                    )}
                    {row.note && (
                      <p className="text-xs text-muted-foreground">{row.note}</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {layout === "minimal" && (
          <div className="space-y-3">
            {hours.map((row, i) => {
              const isToday = showCurrentDay && isCurrentDay(row.day)
              return (
                <div key={i} className={`flex items-center justify-between ${isToday ? "font-semibold text-amber-700" : ""}`} style={!isToday ? textStyle : undefined}>
                  <span className="text-sm">{row.day}</span>
                  <span className="text-sm">
                    {row.closed ? "Gesloten" : `${row.opens} – ${row.closes}`}
                  </span>
                </div>
              )
            })}
          </div>
        )}

        {layout === "grid" && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {hours.map((row, i) => {
              const isToday = showCurrentDay && isCurrentDay(row.day)
              return (
                <div
                  key={i}
                  className={`rounded-xl border p-4 text-center ${
                    row.closed
                      ? "border-border bg-muted/30"
                      : isToday
                      ? "border-amber-300 bg-amber-50"
                      : "border-border bg-white/80"
                  }`}
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {row.day.slice(0, 2)}
                  </p>
                  <p className={`mt-1 text-sm font-medium ${row.closed ? "text-muted-foreground" : "text-amber-700"}`}>
                    {row.closed ? "Geslo." : row.opens}
                  </p>
                  {!row.closed && (
                    <p className="text-xs text-muted-foreground">{row.closes}</p>
                  )}
                  {isToday && !row.closed && (
                    <span className="mt-1 inline-block rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-700">
                      Nu
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}

export const DEFAULT_HOURS: OpeningHoursDay[] = [
  { day: "Maandag", opens: "09:00", closes: "17:30", closed: false },
  { day: "Dinsdag", opens: "09:00", closes: "17:30", closed: false },
  { day: "Woensdag", opens: "09:00", closes: "17:30", closed: false },
  { day: "Donderdag", opens: "09:00", closes: "17:30", closed: false },
  { day: "Vrijdag", opens: "09:00", closes: "17:00", closed: false },
  { day: "Zaterdag", opens: "10:00", closes: "14:00", closed: false },
  { day: "Zondag", opens: "", closes: "", closed: true },
]
