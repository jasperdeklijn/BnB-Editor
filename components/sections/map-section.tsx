"use client"

import { MapPin, Phone, Mail, ExternalLink } from "lucide-react"
import { EditableText } from "@/components/editor/inline-editable-text"
import type { SectionStyles } from "@/lib/types"
import { getLayoutClasses } from "@/lib/section-layouts"
import { useWebsiteLocale } from "@/lib/site-i18n/provider"
import { getSectionColorVars } from "@/lib/section-colors"

interface MapSectionProps {
  data: Record<string, unknown>
  isPreview: boolean
  styles?: SectionStyles
  onUpdate?: (newData: Record<string, unknown>) => void
}

function buildEmbedUrl(embedUrl?: string, address?: string): string | null {
  if (embedUrl) return embedUrl
  if (address) {
    return `https://maps.google.com/maps?q=${encodeURIComponent(address)}&output=embed`
  }
  return null
}

export function MapSection({ data, styles, isPreview, onUpdate }: MapSectionProps) {
  const { messages } = useWebsiteLocale()
  const title = (data.title as string) || "Onze locatie"
  const subtitle = data.subtitle as string | undefined
  const address = data.address as string | undefined
  const phone = data.phone as string | undefined
  const email = data.email as string | undefined
  const embedUrl = data.embedUrl as string | undefined
  const showMap = data.showMap !== false
  const layout = getLayoutClasses(data.layout)

  const mapUrl = buildEmbedUrl(embedUrl, address)
  const mapsHref = address
    ? `https://maps.google.com/?q=${encodeURIComponent(address)}`
    : undefined

  const sectionStyle: React.CSSProperties = {
    ...getSectionColorVars(styles),
    backgroundColor: styles?.backgroundColor,
    backgroundImage: styles?.backgroundImage ? `url(${styles.backgroundImage})` : undefined,
    backgroundSize: "cover",
    backgroundPosition: styles?.backgroundPosition || "center",
  }
  const textStyle: React.CSSProperties = { color: styles?.textColor }

  return (
    <section
      className={`px-4 ${layout.section} sm:px-6 ${styles?.fontFamily || ""}`}
      style={sectionStyle}
    >
      <div className={`mx-auto ${layout.container}`}>
        <div className={`mb-10 ${layout.heading}`}>
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-[var(--section-accent)]">
            {messages.location}
          </p>
          <EditableText
            as="h2"
            data={data}
            path={["title"]}
            value={title}
            isPreview={isPreview}
            onUpdate={onUpdate}
            className="mb-2 text-balance text-3xl font-bold text-amber-950 md:text-4xl"
            style={textStyle}
          />
          {subtitle && (
            <EditableText as="p" data={data} path={["subtitle"]} value={subtitle} isPreview={isPreview} onUpdate={onUpdate} className="text-muted-foreground" style={textStyle} multiline />
          )}
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-[var(--section-surface)] text-[var(--section-surface-foreground)] shadow-sm">
          <div className={`grid ${layout.layout === "compact" ? "" : "md:grid-cols-5"}`}>
            {/* Info panel */}
            <div className={`flex flex-col justify-center gap-5 bg-[var(--section-accent)] px-8 py-10 text-[var(--section-accent-foreground)] ${layout.layout === "compact" ? "" : "md:col-span-2"}`}>
              <h3 className="text-lg font-semibold">{messages.visitUs}</h3>

              {address && (
                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 opacity-80" />
                  <div>
                    <EditableText as="p" data={data} path={["address"]} value={address} isPreview={isPreview} onUpdate={onUpdate} className="text-sm opacity-90" multiline />
                    {mapsHref && (
                      <a
                        href={mapsHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-flex items-center gap-1 text-xs opacity-80 transition-opacity hover:opacity-100"
                      >
                        {messages.openMaps}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
              )}

              {phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 flex-shrink-0 opacity-80" />
                  <a
                    href={`tel:${phone}`}
                    className="text-sm opacity-90 transition-opacity hover:opacity-100"
                  >
                    <EditableText data={data} path={["phone"]} value={phone} isPreview={isPreview} onUpdate={onUpdate} />
                  </a>
                </div>
              )}

              {email && (
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 flex-shrink-0 opacity-80" />
                  <a
                    href={`mailto:${email}`}
                    className="text-sm opacity-90 transition-opacity hover:opacity-100"
                  >
                    <EditableText data={data} path={["email"]} value={email} isPreview={isPreview} onUpdate={onUpdate} />
                  </a>
                </div>
              )}

              {!address && !phone && !email && (
                <p className="text-sm opacity-80">
                  Voeg een adres of contactgegevens toe via de editor.
                </p>
              )}
            </div>

            {/* Map panel */}
            <div className={`min-h-64 md:min-h-80 ${layout.layout === "compact" ? "" : "md:col-span-3"}`}>
              {showMap && mapUrl && !isPreview ? (
                <iframe
                  title="Locatiekaart"
                  src={mapUrl}
                  width="100%"
                  height="100%"
                  style={{ border: 0, minHeight: 320 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="block h-full w-full"
                />
              ) : (
                <div className="flex h-full min-h-64 items-center justify-center bg-[var(--section-surface)] text-[var(--section-surface-foreground)] md:min-h-80">
                  <div className="text-center text-muted-foreground">
                    <MapPin className="mx-auto mb-2 h-8 w-8 text-[var(--section-accent)]" />
                    <p className="text-sm">
                      {address ? (
                        <EditableText data={data} path={["address"]} value={address} isPreview={isPreview} onUpdate={onUpdate} />
                      ) : (
                        "Voer een adres in om de kaart te tonen"
                      )}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
