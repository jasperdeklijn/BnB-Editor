"use client"

import { ArrowRight, Phone } from "lucide-react"
import type { SectionStyles } from "@/lib/types"
import { normalizeSectionLayout } from "@/lib/section-layouts"

interface CtaSectionProps {
  data: Record<string, unknown>
  isPreview: boolean
  styles?: SectionStyles
}

type CtaLayout = "centered" | "split" | "banner"

const ctaLayoutMap = {
  classic: "centered",
  split: "split",
  showcase: "banner",
  compact: "centered",
  card: "split",
  banner: "banner",
} as const

export function CtaSection({ data, styles }: CtaSectionProps) {
  const title = (data.title as string) || "Klaar om te beginnen?"
  const subtitle = data.subtitle as string | undefined
  const primaryText = (data.primaryCtaText as string) || "Neem contact op"
  const primaryHref = (data.primaryCtaHref as string) || "#contact"
  const secondaryText = data.secondaryCtaText as string | undefined
  const secondaryHref = (data.secondaryCtaHref as string) || "#diensten"
  const phone = data.phone as string | undefined
  const layout = (ctaLayoutMap[normalizeSectionLayout(data.layout)] ?? "centered") as CtaLayout

  const sectionStyle: React.CSSProperties = {
    backgroundColor: styles?.backgroundColor,
    backgroundImage: styles?.backgroundImage ? `url(${styles.backgroundImage})` : undefined,
    backgroundSize: "cover",
    backgroundPosition: "center",
  }
  const textStyle: React.CSSProperties = { color: styles?.textColor }

  if (layout === "banner") {
    return (
      <section
        className={`relative overflow-hidden ${styles?.fontFamily || ""}`}
        style={{
          backgroundColor: styles?.backgroundColor || "#78350f",
          backgroundImage: styles?.backgroundImage ? `url(${styles.backgroundImage})` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {styles?.backgroundImage && <div className="absolute inset-0 bg-black/50" />}
        <div className="relative z-10 flex flex-col items-center justify-between gap-6 px-6 py-10 text-center sm:flex-row sm:text-left md:px-16">
          <div>
            <h2 className="text-2xl font-bold text-white md:text-3xl" style={textStyle}>
              {title}
            </h2>
            {subtitle && (
              <p className="mt-1 text-white/80">{subtitle}</p>
            )}
          </div>
          <div className="flex flex-wrap gap-3 justify-center">
            <a
              href={primaryHref}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-amber-700 shadow hover:bg-amber-50 transition-all hover:scale-[1.02]"
            >
              {primaryText}
              <ArrowRight className="h-4 w-4" />
            </a>
            {secondaryText && (
              <a
                href={secondaryHref}
                className="inline-flex items-center gap-2 rounded-xl border border-white/40 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10 transition-all"
              >
                {secondaryText}
              </a>
            )}
          </div>
        </div>
      </section>
    )
  }

  if (layout === "split") {
    return (
      <section
        className={`px-4 py-12 sm:px-6 md:py-20 ${styles?.fontFamily || ""}`}
        style={sectionStyle}
      >
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-col items-center gap-8 rounded-2xl border border-border bg-white/70 px-8 py-12 shadow-sm backdrop-blur md:flex-row md:justify-between">
            <div className="max-w-lg text-center md:text-left">
              <h2
                className="mb-3 text-balance text-3xl font-bold text-amber-950 md:text-4xl"
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
            <div className="flex flex-col gap-3">
              <a
                href={primaryHref}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-700 px-8 py-3.5 text-sm font-semibold text-white shadow hover:bg-amber-800 transition-all hover:scale-[1.02]"
              >
                {primaryText}
                <ArrowRight className="h-4 w-4" />
              </a>
              {phone && (
                <a
                  href={`tel:${phone}`}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-8 py-3 text-sm text-muted-foreground hover:border-amber-400 hover:text-amber-700 transition-colors"
                >
                  <Phone className="h-4 w-4" />
                  {phone}
                </a>
              )}
            </div>
          </div>
        </div>
      </section>
    )
  }

  // Default: centered
  return (
    <section
      className={`px-4 py-16 sm:px-6 md:py-24 ${styles?.fontFamily || ""}`}
      style={sectionStyle}
    >
      <div className="mx-auto max-w-2xl text-center">
        <h2
          className="mb-4 text-balance text-3xl font-bold text-amber-950 md:text-5xl"
          style={textStyle}
        >
          {title}
        </h2>
        {subtitle && (
          <p className="mb-8 text-lg text-muted-foreground" style={textStyle}>
            {subtitle}
          </p>
        )}
        <div className="flex flex-wrap items-center justify-center gap-4">
          <a
            href={primaryHref}
            className="inline-flex items-center gap-2 rounded-xl bg-amber-700 px-8 py-4 text-base font-semibold text-white shadow-lg hover:bg-amber-800 transition-all hover:scale-[1.02]"
          >
            {primaryText}
            <ArrowRight className="h-5 w-5" />
          </a>
          {secondaryText && (
            <a
              href={secondaryHref}
              className="inline-flex items-center gap-2 rounded-xl border border-border px-8 py-4 text-base font-semibold text-foreground hover:border-amber-400 hover:bg-amber-50 transition-all"
            >
              {secondaryText}
            </a>
          )}
        </div>
        {phone && (
          <p className="mt-6 text-sm text-muted-foreground">
            Of bel direct:{" "}
            <a href={`tel:${phone}`} className="font-medium text-amber-700 hover:underline">
              {phone}
            </a>
          </p>
        )}
      </div>
    </section>
  )
}
