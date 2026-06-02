"use client"

import { ArrowRight, Phone, MessageSquare } from "lucide-react"
import type { SectionStyles } from "@/lib/types"

interface CtaSectionProps {
  data: Record<string, unknown>
  isPreview: boolean
  styles?: SectionStyles
}

export function CtaSection({ data, styles }: CtaSectionProps) {
  const title = (data.title as string) || "Klaar om te starten?"
  const subtitle =
    (data.subtitle as string) || "Neem vandaag nog contact op en we helpen je verder."
  const primaryText = (data.primaryCtaText as string) || "Neem contact op"
  const primaryHref = (data.primaryCtaHref as string) || "#contact"
  const secondaryText = (data.secondaryCtaText as string) || ""
  const secondaryHref = (data.secondaryCtaHref as string) || ""
  const layout = (data.layout as string) || "centered"
  const phone = (data.phone as string) || ""
  const whatsapp = (data.whatsapp as string) || ""

  const bg = styles?.backgroundColor || "#78350f"
  const textColor = styles?.textColor || "#ffffff"
  const sectionStyle: React.CSSProperties = {
    backgroundColor: bg,
    backgroundImage: styles?.backgroundImage ? `url(${styles.backgroundImage})` : undefined,
    backgroundSize: "cover",
    backgroundPosition: "center",
    fontFamily: styles?.fontFamily,
  }

  if (layout === "banner") {
    return (
      <section className="relative overflow-hidden px-4 py-14 sm:px-6" style={sectionStyle}>
        {styles?.backgroundImage && <div className="absolute inset-0 bg-black/50" />}
        <div className="relative z-10 mx-auto flex max-w-6xl flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-balance text-2xl font-bold md:text-3xl" style={{ color: textColor }}>
              {title}
            </h2>
            <p className="mt-2 max-w-xl text-sm opacity-80" style={{ color: textColor }}>
              {subtitle}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <a
              href={primaryHref}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-amber-800 hover:bg-amber-50 transition-colors"
            >
              {primaryText}
              <ArrowRight className="h-4 w-4" />
            </a>
            {secondaryText && (
              <a
                href={secondaryHref || "#"}
                className="inline-flex items-center gap-2 rounded-xl border border-white/40 bg-white/10 px-5 py-3 text-sm font-semibold text-white hover:bg-white/20 transition-colors"
              >
                {secondaryText}
              </a>
            )}
          </div>
        </div>
      </section>
    )
  }

  if (layout === "minimal") {
    return (
      <section className="px-4 py-16 sm:px-6 md:py-24" style={{ backgroundColor: styles?.backgroundColor || "#fff7ed", fontFamily: styles?.fontFamily }}>
        <div className="mx-auto max-w-2xl text-center">
          <h2
            className="text-balance text-3xl font-bold text-amber-950 md:text-4xl"
            style={styles?.textColor ? { color: styles.textColor } : undefined}
          >
            {title}
          </h2>
          <p className="mt-4 text-muted-foreground" style={styles?.textColor ? { color: styles.textColor } : undefined}>
            {subtitle}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <a
              href={primaryHref}
              className="inline-flex items-center gap-2 rounded-xl bg-amber-700 px-6 py-3 text-sm font-semibold text-white hover:bg-amber-800 transition-colors"
            >
              {primaryText}
              <ArrowRight className="h-4 w-4" />
            </a>
            {secondaryText && (
              <a
                href={secondaryHref || "#"}
                className="inline-flex items-center gap-2 rounded-xl border border-amber-300 bg-transparent px-6 py-3 text-sm font-semibold text-amber-700 hover:bg-amber-50 transition-colors"
              >
                {secondaryText}
              </a>
            )}
          </div>
          {(phone || whatsapp) && (
            <div className="mt-6 flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
              {phone && (
                <a href={`tel:${phone}`} className="flex items-center gap-1.5 hover:text-amber-700 transition-colors">
                  <Phone className="h-4 w-4" />
                  {phone}
                </a>
              )}
              {whatsapp && (
                <a
                  href={`https://wa.me/${whatsapp.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 hover:text-green-600 transition-colors"
                >
                  <MessageSquare className="h-4 w-4" />
                  WhatsApp
                </a>
              )}
            </div>
          )}
        </div>
      </section>
    )
  }

  // Default: centered (dark background)
  return (
    <section className="relative overflow-hidden px-4 py-20 sm:px-6 md:py-28" style={sectionStyle}>
      {styles?.backgroundImage && <div className="absolute inset-0 bg-black/50" />}
      <div className="relative z-10 mx-auto max-w-3xl text-center">
        <h2
          className="text-balance text-4xl font-extrabold leading-tight md:text-5xl"
          style={{ color: textColor }}
        >
          {title}
        </h2>
        <p className="mt-5 text-lg opacity-80" style={{ color: textColor }}>
          {subtitle}
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <a
            href={primaryHref}
            className="inline-flex items-center gap-2 rounded-2xl bg-white px-8 py-4 text-base font-bold text-amber-800 shadow-lg hover:bg-amber-50 transition-colors"
          >
            {primaryText}
            <ArrowRight className="h-5 w-5" />
          </a>
          {secondaryText && (
            <a
              href={secondaryHref || "#"}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/40 bg-white/10 px-8 py-4 text-base font-semibold text-white backdrop-blur hover:bg-white/20 transition-colors"
            >
              {secondaryText}
            </a>
          )}
        </div>
        {(phone || whatsapp) && (
          <div className="mt-8 flex flex-wrap justify-center gap-6 opacity-70" style={{ color: textColor }}>
            {phone && (
              <a href={`tel:${phone}`} className="flex items-center gap-1.5 text-sm hover:opacity-100 transition-opacity" style={{ color: textColor }}>
                <Phone className="h-4 w-4" />
                {phone}
              </a>
            )}
            {whatsapp && (
              <a
                href={`https://wa.me/${whatsapp.replace(/\D/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm hover:opacity-100 transition-opacity"
                style={{ color: textColor }}
              >
                <MessageSquare className="h-4 w-4" />
                WhatsApp
              </a>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
