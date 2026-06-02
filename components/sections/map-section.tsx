"use client"

import { MapPin, Phone, Mail, ExternalLink } from "lucide-react"
import type { SectionStyles } from "@/lib/types"

interface MapSectionProps {
  data: Record<string, unknown>
  isPreview: boolean
  styles?: SectionStyles
}

export function MapSection({ data, styles }: MapSectionProps) {
  const title = (data.title as string) || "Locatie"
  const subtitle = (data.subtitle as string) || ""
  const address = (data.address as string) || ""
  const phone = (data.phone as string) || ""
  const email = (data.email as string) || ""
  const embedUrl = (data.embedUrl as string) || ""
  const layout = (data.layout as string) || "split"

  // Build a Google Maps search URL as the embed src if no custom embedUrl is given
  const mapSrc = embedUrl || (address
    ? `https://maps.google.com/maps?q=${encodeURIComponent(address)}&output=embed&z=15`
    : "")

  const mapsLink = address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
    : "#"

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
      <div className="mx-auto max-w-6xl">
        {(title || subtitle) && (
          <div className="mb-10 text-center">
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
        )}

        {layout === "split" && (
          <div className="grid overflow-hidden rounded-2xl border border-border shadow-md md:grid-cols-2">
            {/* Info panel */}
            <div className="flex flex-col justify-center gap-6 bg-amber-700 px-8 py-10 text-white">
              <div className="flex items-start gap-3">
                <div className="mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-amber-600">
                  <MapPin className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-200">Adres</p>
                  {address ? (
                    <a
                      href={mapsLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-0.5 text-sm text-white/90 hover:text-white hover:underline"
                    >
                      {address}
                    </a>
                  ) : (
                    <p className="mt-0.5 text-sm text-white/70 italic">Nog geen adres ingevuld</p>
                  )}
                </div>
              </div>
              {phone && (
                <div className="flex items-start gap-3">
                  <div className="mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-amber-600">
                    <Phone className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-200">Telefoon</p>
                    <a href={`tel:${phone}`} className="mt-0.5 text-sm text-white/90 hover:text-white">
                      {phone}
                    </a>
                  </div>
                </div>
              )}
              {email && (
                <div className="flex items-start gap-3">
                  <div className="mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-amber-600">
                    <Mail className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-200">E-mail</p>
                    <a href={`mailto:${email}`} className="mt-0.5 text-sm text-white/90 hover:text-white">
                      {email}
                    </a>
                  </div>
                </div>
              )}
              {address && (
                <a
                  href={mapsLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg border border-white/30 bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20 transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Routebeschrijving
                </a>
              )}
            </div>
            {/* Map */}
            <div className="relative min-h-[300px] md:min-h-[400px]">
              {mapSrc ? (
                <iframe
                  src={mapSrc}
                  className="absolute inset-0 h-full w-full border-0"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Locatie kaart"
                  allowFullScreen
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-muted/50">
                  <MapPin className="h-10 w-10 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">Vul een adres in om de kaart te laden</p>
                </div>
              )}
            </div>
          </div>
        )}

        {layout === "fullwidth" && (
          <div className="space-y-6">
            <div className="overflow-hidden rounded-2xl border border-border shadow-md" style={{ minHeight: 400 }}>
              {mapSrc ? (
                <iframe
                  src={mapSrc}
                  className="h-96 w-full border-0"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Locatie kaart"
                  allowFullScreen
                />
              ) : (
                <div className="flex h-96 flex-col items-center justify-center gap-3 bg-muted/50">
                  <MapPin className="h-10 w-10 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">Vul een adres in om de kaart te laden</p>
                </div>
              )}
            </div>
            {(address || phone || email) && (
              <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
                {address && (
                  <a
                    href={mapsLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 hover:text-amber-700 transition-colors"
                  >
                    <MapPin className="h-3.5 w-3.5" />
                    {address}
                  </a>
                )}
                {phone && (
                  <a href={`tel:${phone}`} className="flex items-center gap-1.5 hover:text-amber-700 transition-colors">
                    <Phone className="h-3.5 w-3.5" />
                    {phone}
                  </a>
                )}
                {email && (
                  <a href={`mailto:${email}`} className="flex items-center gap-1.5 hover:text-amber-700 transition-colors">
                    <Mail className="h-3.5 w-3.5" />
                    {email}
                  </a>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
