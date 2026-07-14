"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { EditableText } from "@/components/editor/inline-editable-text"
import type { SectionStyles } from "@/lib/types"
import Link from "next/link"
import { AlertCircle, Briefcase, CalendarDays, CheckCircle, ChevronLeft, ChevronRight, DollarSign, Send, Users, X } from "lucide-react"
import { normalizeSectionLayout } from "@/lib/section-layouts"

export type ServicesLayout = "grid" | "list" | "featured" | "magazine" | "minimal" | "carousel"

const servicesLayoutMap = {
  classic: "grid",
  split: "list",
  showcase: "featured",
  compact: "minimal",
  card: "magazine",
  banner: "carousel",
} as const

interface ServicesSectionProps {
  data: Record<string, unknown>
  isPreview: boolean
  styles?: SectionStyles
  onUpdate?: (newData: Record<string, unknown>) => void
}

interface ServiceDisplay {
  id: string
  name: string
  description: string | null
  price: string | null
  capacity: number | null
  images: string[]
  position?: number | null
  created_at?: string | null
  updated_at?: string | null
}

interface ServiceInfoPopupSettings {
  buttonLabel: string
  eyebrow: string
  title: string
  intro: string
  ctaLabel: string
  ctaHref: string
  helperText: string
  showImage: boolean
  showPrice: boolean
}

interface ServiceLayoutActions {
  buttonLabel: string
  onMoreInfo: (service: ServiceDisplay) => void
}

type BookingSpaceMode = "inline" | "cta" | "calendar"
type BookingSpaceRequestType = "appointment" | "booking_request"

interface BookingSpaceSettings {
  enabled: boolean
  mode: BookingSpaceMode
  heading: string
  intro: string
  buttonLabel: string
  successText: string
  helperText: string
  targetHref: string
  requestType: BookingSpaceRequestType
  serviceIds: string[]
}

interface BookingFormState {
  name: string
  email: string
  phone: string
  date: string
  message: string
  serviceId: string
  company: string
}

// ---- Shared helpers ----

function getBookingDefaults(isAccommodation: boolean) {
  return isAccommodation
    ? {
        heading: "Boek je verblijf",
        intro: "Kies een accommodatie en stuur een boekingsaanvraag met je gewenste check-in datum.",
        buttonLabel: "Boeking aanvragen",
        successText: "Boekingsaanvraag ontvangen. We nemen zo snel mogelijk contact met je op.",
        helperText: "Je aanvraag wordt als voorlopige boeking in de planning gezet.",
        requestType: "booking_request" as BookingSpaceRequestType,
      }
    : {
        heading: "Plan een afspraak",
        intro: "Kies een dienst en stuur een aanvraag met je gewenste datum en tijd.",
        buttonLabel: "Afspraak aanvragen",
        successText: "Aanvraag ontvangen. We nemen zo snel mogelijk contact met je op.",
        helperText: "Je aanvraag wordt als voorlopige afspraak in de planning gezet.",
        requestType: "appointment" as BookingSpaceRequestType,
      }
}

function getBookingSpaceSettings(data: Record<string, unknown>): BookingSpaceSettings {
  const isAccommodation = data.businessCategory === "bnb" || data.bookingSpaceRequestType === "booking_request"
  const defaults = getBookingDefaults(isAccommodation)
  const mode = data.bookingSpaceMode === "cta" || data.bookingSpaceMode === "calendar"
    ? data.bookingSpaceMode
    : "inline"
  const serviceIds = Array.isArray(data.bookingSpaceServiceIds)
    ? data.bookingSpaceServiceIds.filter((id): id is string => typeof id === "string")
    : []

  return {
    enabled: Boolean(data.bookingSpaceEnabled),
    mode,
    heading: (data.bookingSpaceHeading as string) || defaults.heading,
    intro: (data.bookingSpaceIntro as string) || defaults.intro,
    buttonLabel: (data.bookingSpaceButtonLabel as string) || defaults.buttonLabel,
    successText: (data.bookingSpaceSuccessText as string) || defaults.successText,
    helperText: (data.bookingSpaceHelperText as string) || defaults.helperText,
    targetHref: (data.bookingSpaceTargetHref as string) || "",
    requestType: data.bookingSpaceRequestType === "booking_request" ? "booking_request" : defaults.requestType,
    serviceIds,
  }
}

function handleSectionAnchorClick(
  event: React.MouseEvent<HTMLAnchorElement>,
  href: string,
  afterNavigate?: () => void,
) {
  if (!href.startsWith("#")) {
    afterNavigate?.()
    return
  }

  event.preventDefault()
  const targetId = href.replace("#", "")
  const element = document.getElementById(targetId)

  afterNavigate?.()

  if (element) {
    window.requestAnimationFrame(() => {
      element.scrollIntoView({ behavior: "smooth" })
    })
  }
}

function ServiceImage({
  images,
  name,
  className,
}: {
  images: string[]
  name: string
  className?: string
}) {
  if (images.length > 0) {
    return (
      <img
        src={images[0]}
        alt={name}
        className={className ?? "w-full h-full object-cover"}
      />
    )
  }
  return (
    <div
      className={`flex items-center justify-center bg-secondary ${className ?? "w-full h-full"}`}
    >
      <Briefcase className="h-10 w-10 text-primary/45" />
    </div>
  )
}

// ---- Layout: Grid ----

function GridLayout({
  services,
  textStyle,
  buttonLabel,
  onMoreInfo,
}: {
  services: ServiceDisplay[]
  textStyle: React.CSSProperties
} & ServiceLayoutActions) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {services.map((service) => (
        <div
          key={service.id}
          className="group overflow-hidden rounded-2xl border border-border bg-[var(--section-surface)] shadow-sm transition-shadow hover:shadow-md"
        >
          <div className="relative h-52 overflow-hidden">
            <ServiceImage
              images={service.images}
              name={service.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            {service.price && (
              <div className="absolute bottom-3 right-3 rounded-full bg-white/90 px-3 py-1 text-sm font-bold text-primary shadow backdrop-blur-sm">
                {service.price}
              </div>
            )}
          </div>
          <div className="p-5">
            <h3 className="mb-1 text-lg font-bold text-foreground" style={textStyle}>
              {service.name}
            </h3>
            {service.description && (
              <p className="mb-4 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                {service.description}
              </p>
            )}
            <div className="flex items-center justify-between">
              {service.capacity && (
                <span className="flex items-center gap-1 text-xs text-primary">
                  <Users className="h-3.5 w-3.5" />
                  {service.capacity} deelnemers
                </span>
              )}
              {buttonLabel ? <Button
                type="button"
                size="sm"
                variant="outline"
                className="ml-auto border-border text-primary hover:bg-secondary"
                onClick={() => {
                  onMoreInfo(service)
                }}
              >
                {buttonLabel}
              </Button> : null}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ---- Layout: List ----

function ListLayout({
  services,
  textStyle,
  buttonLabel,
  onMoreInfo,
}: {
  services: ServiceDisplay[]
  textStyle: React.CSSProperties
} & ServiceLayoutActions) {
  return (
    <div className="space-y-5">
      {services.map((service) => (
        <div
          key={service.id}
          className="group flex overflow-hidden rounded-2xl border border-border bg-[var(--section-surface)] shadow-sm transition-shadow hover:shadow-md"
        >
          <div className="relative w-2/5 flex-shrink-0 min-h-[180px] overflow-hidden">
            <ServiceImage
              images={service.images}
              name={service.name}
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </div>
          <div className="flex-1 p-6 flex flex-col justify-between">
            <div>
              <h3 className="mb-2 text-xl font-bold text-foreground" style={textStyle}>
                {service.name}
              </h3>
              {service.description && (
                <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                  {service.description}
                </p>
              )}
            </div>
            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center gap-4">
                {service.capacity && (
                  <span className="flex items-center gap-1 text-xs text-primary">
                    <Users className="h-3.5 w-3.5" />
                    {service.capacity} deelnemers
                  </span>
                )}
                {service.price && (
                  <span className="flex items-center gap-1 text-xs text-primary">
                    <DollarSign className="h-3.5 w-3.5" />
                    {service.price}
                  </span>
                )}
              </div>
              {buttonLabel ? <Button
                type="button"
                size="sm"
                className="bg-[var(--section-accent)] text-white brightness-100 hover:brightness-90"
                onClick={() => {
                  onMoreInfo(service)
                }}
              >
                {buttonLabel}
              </Button> : null}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ---- Layout: Featured ----

function FeaturedLayout({
  services,
  textStyle,
  buttonLabel,
  onMoreInfo,
}: {
  services: ServiceDisplay[]
  textStyle: React.CSSProperties
} & ServiceLayoutActions) {
  const [featured, ...rest] = services
  if (!featured) return null
  return (
    <div className="space-y-6">
      {/* Featured hero card */}
      <div className="group relative flex min-h-[380px] overflow-hidden rounded-3xl border border-border bg-[var(--section-surface)] shadow-md transition-shadow hover:shadow-xl">
        <div className="relative w-1/2 overflow-hidden">
          <ServiceImage
            images={featured.images}
            name={featured.name}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        </div>
        <div className="flex-1 p-10 flex flex-col justify-between">
          <div>
            <span className="mb-4 inline-block rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-primary">
              Uitgelicht
            </span>
            <h3
              className="mb-3 text-balance text-3xl font-bold text-foreground"
              style={textStyle}
            >
              {featured.name}
            </h3>
            {featured.description && (
              <p className="leading-relaxed text-muted-foreground">{featured.description}</p>
            )}
          </div>
          <div className="flex items-center justify-between mt-6">
            <div className="space-y-1">
              {featured.price && (
                <span className="text-xl font-bold text-primary" style={textStyle}>
                  {featured.price}
                </span>
              )}
              {featured.capacity && (
                <p className="flex items-center gap-1 text-xs text-primary">
                  <Users className="h-3.5 w-3.5" />
                  {featured.capacity} deelnemers
                </p>
              )}
            </div>
            {buttonLabel ? <Button
              type="button"
              className="bg-[var(--section-accent)] text-white brightness-100 hover:brightness-90"
              onClick={() => {
                onMoreInfo(featured)
              }}
            >
              {buttonLabel}
            </Button> : null}
          </div>
        </div>
      </div>

      {/* Rest in grid */}
      {rest.length > 0 && (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {rest.map((service) => (
            <div
              key={service.id}
              className="group overflow-hidden rounded-2xl border border-border bg-white shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="relative h-44 overflow-hidden">
                <ServiceImage
                  images={service.images}
                  name={service.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="p-4">
                <h3 className="mb-1 font-bold text-foreground" style={textStyle}>
                  {service.name}
                </h3>
                {service.description && (
                  <p className="mb-3 line-clamp-2 text-xs text-muted-foreground">{service.description}</p>
                )}
                <div className="flex items-center justify-between">
                  {service.price && (
                    <span className="text-sm font-bold text-primary">{service.price}</span>
                  )}
                  {buttonLabel ? <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="border-border text-xs text-primary hover:bg-secondary"
                    onClick={() => {
                      onMoreInfo(service)
                    }}
                  >
                    {buttonLabel}
                  </Button> : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ---- Layout: Magazine ----

function MagazineLayout({
  services,
  textStyle,
  buttonLabel,
  onMoreInfo,
}: {
  services: ServiceDisplay[]
  textStyle: React.CSSProperties
} & ServiceLayoutActions) {
  return (
    <div className="space-y-8">
      {services.map((service, i) => {
        const isReversed = i % 2 !== 0
        return (
          <div
            key={service.id}
            className={`group flex flex-col overflow-hidden rounded-2xl bg-[var(--section-surface)] shadow-sm hover:shadow-md transition-shadow ${
              isReversed ? "sm:flex-row-reverse" : "sm:flex-row"
            }`}
          >
            <div className="relative h-64 sm:h-auto sm:w-1/2 overflow-hidden">
              <ServiceImage
                images={service.images}
                name={service.name}
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            </div>
            <div className="sm:w-1/2 p-8 sm:p-10 flex flex-col justify-center">
              <span className="mb-3 text-xs font-semibold uppercase tracking-widest text-primary">
                Dienst {i + 1}
              </span>
              <h3
                className="mb-3 text-balance text-2xl font-bold text-foreground"
                style={textStyle}
              >
                {service.name}
              </h3>
              {service.description && (
                <p className="mb-6 leading-relaxed text-muted-foreground">{service.description}</p>
              )}
              <div className="flex items-center gap-4 flex-wrap">
                {service.price && (
                  <span className="text-lg font-bold text-primary" style={textStyle}>
                    {service.price}
                  </span>
                )}
                {service.capacity && (
                  <span className="flex items-center gap-1 text-xs text-primary">
                    <Users className="h-3.5 w-3.5" />
                    {service.capacity} deelnemers
                  </span>
                )}
              </div>
              {buttonLabel ? <Button
                type="button"
                className="mt-6 w-fit bg-[var(--section-accent)] text-white brightness-100 hover:brightness-90"
                onClick={() => {
                  onMoreInfo(service)
                }}
              >
                {buttonLabel}
              </Button> : null}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ---- Layout: Minimal ----

function MinimalLayout({
  services,
  textStyle,
  buttonLabel,
  onMoreInfo,
}: {
  services: ServiceDisplay[]
  textStyle: React.CSSProperties
} & ServiceLayoutActions) {
  return (
    <div className="divide-y divide-border">
      {services.map((service) => (
        <div key={service.id} className="flex items-center justify-between py-6 group">
          <div className="flex items-center gap-5">
            <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl">
              <ServiceImage images={service.images} name={service.name} />
            </div>
            <div>
              <h3
                className="font-bold text-foreground transition-colors group-hover:text-primary"
                style={textStyle}
              >
                {service.name}
              </h3>
              {service.description && (
                <p className="mt-0.5 line-clamp-1 max-w-md text-sm text-muted-foreground">
                  {service.description}
                </p>
              )}
              {service.capacity && (
                <span className="mt-1 flex items-center gap-1 text-xs text-primary">
                  <Users className="h-3 w-3" />
                  {service.capacity} deelnemers
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-6 pl-4 flex-shrink-0">
            {service.price && (
              <span className="whitespace-nowrap text-lg font-bold text-primary" style={textStyle}>
                {service.price}
              </span>
            )}
            {buttonLabel ? <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-primary hover:bg-secondary hover:text-foreground"
              onClick={() => {
                onMoreInfo(service)
              }}
            >
              {buttonLabel} &rarr;
            </Button> : null}
          </div>
        </div>
      ))}
    </div>
  )
}

// ---- Layout: Carousel ----

function CarouselLayout({
  services,
  textStyle,
  buttonLabel,
  onMoreInfo,
}: {
  services: ServiceDisplay[]
  textStyle: React.CSSProperties
} & ServiceLayoutActions) {
  const containerRef = useRef<HTMLDivElement>(null)

  const scroll = (dir: "left" | "right") => {
    if (!containerRef.current) return
    containerRef.current.scrollBy({
      left: dir === "left" ? -320 : 320,
      behavior: "smooth",
    })
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => scroll("left")}
        className="absolute left-0 top-1/2 z-10 flex h-10 w-10 -translate-x-4 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-white shadow-md transition-colors hover:bg-secondary"
        aria-label="Vorige"
      >
        <ChevronLeft className="h-5 w-5 text-primary" />
      </button>

      <div
        ref={containerRef}
        className="flex gap-5 overflow-x-auto scroll-smooth pb-2 px-1"
        style={{ scrollSnapType: "x mandatory", scrollbarWidth: "none" }}
      >
        {services.map((service) => (
          <div
            key={service.id}
            className="group w-72 flex-shrink-0 overflow-hidden rounded-2xl border border-border bg-[var(--section-surface)] shadow-sm transition-shadow hover:shadow-md"
            style={{ scrollSnapAlign: "start" }}
          >
            <div className="relative h-48 overflow-hidden">
              <ServiceImage
                images={service.images}
                name={service.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              {service.price && (
                <div className="absolute bottom-3 right-3 rounded-full bg-white/90 px-3 py-1 text-sm font-bold text-primary shadow backdrop-blur-sm">
                  {service.price}
                </div>
              )}
            </div>
            <div className="p-4">
              <h3 className="mb-1 truncate font-bold text-foreground" style={textStyle}>
                {service.name}
              </h3>
              {service.description && (
                <p className="mb-3 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                  {service.description}
                </p>
              )}
              <div className="flex items-center justify-between">
                {service.capacity && (
                  <span className="flex items-center gap-1 text-xs text-primary">
                    <Users className="h-3.5 w-3.5" />
                    {service.capacity} pers.
                  </span>
                )}
                {buttonLabel ? <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="ml-auto border-border text-primary hover:bg-secondary"
                  onClick={() => {
                    onMoreInfo(service)
                  }}
                >
                  {buttonLabel}
                </Button> : null}
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => scroll("right")}
        className="absolute right-0 top-1/2 z-10 flex h-10 w-10 translate-x-4 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-white shadow-md transition-colors hover:bg-secondary"
        aria-label="Volgende"
      >
        <ChevronRight className="h-5 w-5 text-primary" />
      </button>
    </div>
  )
}

function ServiceInfoPopup({
  service,
  settings,
  onClose,
}: {
  service: ServiceDisplay
  settings: ServiceInfoPopupSettings
  onClose: () => void
}) {
  const title = settings.title || service.name
  const intro = settings.intro || service.description

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="service-info-popup-title"
      onClick={(event) => {
        event.stopPropagation()
        onClose()
      }}
    >
      <div
        className="max-h-[92vh] w-full max-w-3xl overflow-hidden rounded-2xl border border-border bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
              {settings.eyebrow}
            </p>
            <h3 id="service-info-popup-title" className="truncate text-lg font-bold text-foreground">
              {title}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Popup sluiten"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid max-h-[calc(92vh-4rem)] overflow-y-auto md:grid-cols-[0.9fr_1.1fr]">
          {settings.showImage ? (
            <div className="min-h-64 bg-muted md:min-h-full">
              <ServiceImage images={service.images} name={service.name} className="h-full min-h-64 w-full object-cover" />
            </div>
          ) : null}
          <div className={`p-5 sm:p-6 ${settings.showImage ? "" : "md:col-span-2"}`}>
            {service.name !== title ? (
              <p className="mb-2 text-sm font-semibold text-primary">{service.name}</p>
            ) : null}
            {intro ? (
              <p className="text-sm leading-7 text-muted-foreground">{intro}</p>
            ) : (
              <p className="text-sm leading-7 text-muted-foreground">
                Bekijk de details en neem contact op voor meer informatie.
              </p>
            )}

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {settings.showPrice && service.price ? (
                <div className="rounded-xl border border-border bg-muted/50 p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-primary">Prijs</p>
                  <p className="mt-1 font-bold text-foreground">{service.price}</p>
                </div>
              ) : null}
              {service.capacity ? (
                <div className="rounded-xl border border-border bg-muted/50 p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-primary">Capaciteit</p>
                  <p className="mt-1 font-bold text-foreground">{service.capacity} deelnemers</p>
                </div>
              ) : null}
            </div>

            {settings.helperText ? (
              <p className="mt-5 rounded-xl bg-primary/10 p-3 text-xs leading-6 text-primary">
                {settings.helperText}
              </p>
            ) : null}

            {settings.ctaLabel && settings.ctaHref ? (
              <a
                href={settings.ctaHref}
                onClick={(event) => handleSectionAnchorClick(event, settings.ctaHref, onClose)}
                className="mt-5 inline-flex w-full items-center justify-center rounded-full bg-[var(--section-accent)] px-5 py-3 text-sm font-semibold text-white transition-all hover:brightness-90 sm:w-auto"
              >
                {settings.ctaLabel}
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}

function ServicesBookingSpace({
  settings,
  services,
  businessId,
  websiteId,
  recipientEmail,
  isPreview,
}: {
  settings: BookingSpaceSettings
  services: ServiceDisplay[]
  businessId?: string | null
  websiteId?: string | null
  recipientEmail?: string
  isPreview?: boolean
}) {
  const [form, setForm] = useState<BookingFormState>({
    name: "",
    email: "",
    phone: "",
    date: "",
    message: "",
    serviceId: services[0]?.id ?? "",
    company: "",
  })
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [errorMsg, setErrorMsg] = useState("")
  const isAccommodation = settings.requestType === "booking_request"

  useEffect(() => {
    if (!form.serviceId && services[0]?.id) {
      setForm((prev) => ({ ...prev, serviceId: services[0].id }))
    }
  }, [form.serviceId, services])

  const update = (field: keyof BookingFormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const selectedService = services.find((service) => service.id === form.serviceId) ?? null

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setStatus("loading")
    setErrorMsg("")

    if (isPreview) {
      setStatus("success")
      return
    }

    try {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone,
          date: form.date,
          message: form.message,
          service: selectedService?.name ?? "",
          serviceId: selectedService?.id ?? "",
          company: form.company,
          requestType: settings.requestType,
          businessId,
          websiteId,
          recipientEmail,
          source: "services_booking_space",
        }),
      })
      const json = await res.json()

      if (!res.ok) {
        setErrorMsg(json.error || "Aanvraag kon niet worden verzonden.")
        setStatus("error")
        return
      }

      setStatus("success")
      setForm({
        name: "",
        email: "",
        phone: "",
        date: "",
        message: "",
        serviceId: services[0]?.id ?? "",
        company: "",
      })
    } catch {
      setErrorMsg("Aanvraag kon niet worden verzonden. Probeer het opnieuw.")
      setStatus("error")
    }
  }

  if (!settings.enabled) return null

  if (settings.mode === "cta") {
    return (
      <div className="mt-10 rounded-2xl border border-border bg-secondary p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-primary">
              <CalendarDays className="h-3.5 w-3.5" />
              {isAccommodation ? "Boeking" : "Afspraak"}
            </div>
            <h3 className="text-xl font-bold text-foreground">{settings.heading}</h3>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">{settings.intro}</p>
            {settings.helperText ? (
              <p className="mt-2 text-xs font-medium text-primary">{settings.helperText}</p>
            ) : null}
          </div>
          {settings.targetHref ? (
            <a
              href={settings.targetHref}
              onClick={(event) => handleSectionAnchorClick(event, settings.targetHref)}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-[var(--section-accent)] px-5 py-3 text-sm font-semibold text-white transition-all hover:brightness-90"
            >
              <CalendarDays className="h-4 w-4" />
              {settings.buttonLabel}
            </a>
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <div className="mt-10 overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
      <div className="grid gap-0 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="bg-secondary p-5 sm:p-6">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-primary">
            <CalendarDays className="h-3.5 w-3.5" />
            {isAccommodation ? "Boekingsaanvraag" : "Afspraakaanvraag"}
          </div>
          <h3 className="text-2xl font-bold text-foreground">{settings.heading}</h3>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">{settings.intro}</p>
          {settings.helperText ? (
            <p className="mt-4 rounded-xl border border-border bg-white p-3 text-xs leading-6 text-primary">
              {settings.helperText}
            </p>
          ) : null}
        </div>

        <div className="p-5 sm:p-6">
          {status === "success" ? (
            <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-center">
              <CheckCircle className="h-10 w-10 text-primary" />
              <p className="font-semibold text-foreground">
                {isPreview ? "Preview geslaagd — er is geen boeking of afspraak aangemaakt." : settings.successText}
              </p>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div className="hidden" aria-hidden="true">
                <label htmlFor="services-booking-company">Bedrijf</label>
                <input
                  id="services-booking-company"
                  name="company"
                  tabIndex={-1}
                  autoComplete="off"
                  value={form.company}
                  onChange={(event) => update("company", event.target.value)}
                />
              </div>
              {services.length > 0 ? (
                <div className="space-y-1.5">
                  <label htmlFor="services-booking-service" className="text-sm font-medium text-foreground">
                    {isAccommodation ? "Accommodatie" : "Dienst"}
                  </label>
                  <select
                    id="services-booking-service"
                    value={form.serviceId}
                    onChange={(event) => update("serviceId", event.target.value)}
                    className="h-11 w-full rounded-lg border border-border bg-white px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
                    required
                  >
                    {services.map((service) => (
                      <option key={service.id} value={service.id}>
                        {service.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label htmlFor="services-booking-name" className="text-sm font-medium text-foreground">
                    Naam *
                  </label>
                  <input
                    id="services-booking-name"
                    value={form.name}
                    onChange={(event) => update("name", event.target.value)}
                    maxLength={120}
                    className="h-11 w-full rounded-lg border border-border bg-white px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="services-booking-email" className="text-sm font-medium text-foreground">
                    E-mail *
                  </label>
                  <input
                    id="services-booking-email"
                    type="email"
                    value={form.email}
                    onChange={(event) => update("email", event.target.value)}
                    maxLength={254}
                    className="h-11 w-full rounded-lg border border-border bg-white px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
                    required
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label htmlFor="services-booking-phone" className="text-sm font-medium text-foreground">
                    Telefoon
                  </label>
                  <input
                    id="services-booking-phone"
                    type="tel"
                    value={form.phone}
                    onChange={(event) => update("phone", event.target.value)}
                    maxLength={40}
                    className="h-11 w-full rounded-lg border border-border bg-white px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="services-booking-date" className="text-sm font-medium text-foreground">
                    {isAccommodation ? "Check-in datum" : "Gewenste datum"} *
                  </label>
                  <input
                    id="services-booking-date"
                    type="date"
                    value={form.date}
                    onChange={(event) => update("date", event.target.value)}
                    className="h-11 w-full rounded-lg border border-border bg-white px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="services-booking-message" className="text-sm font-medium text-foreground">
                  Bericht
                </label>
                <textarea
                  id="services-booking-message"
                  rows={3}
                  value={form.message}
                  onChange={(event) => update("message", event.target.value)}
                  maxLength={3000}
                  placeholder={isAccommodation ? "Aantal gasten, nachten of vragen..." : "Voorkeurstijd of korte toelichting..."}
                  className="w-full resize-none rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>

              {status === "error" ? (
                <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {errorMsg}
                </div>
              ) : null}

              <Button
                type="submit"
                disabled={status === "loading"}
                className="w-full rounded-full bg-[var(--section-accent)] text-white brightness-100 hover:brightness-90"
              >
                {status === "loading" ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Verzenden...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Send className="h-4 w-4" />
                    {settings.buttonLabel}
                  </span>
                )}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

// ---- Main section component ----

export function ServicesSection({ data, styles, isPreview, onUpdate }: ServicesSectionProps) {
  const title = (data.title as string) || "Ons aanbod"
  const layout = (servicesLayoutMap[normalizeSectionLayout(data.layout)] ?? "grid") as ServicesLayout
  const serviceIds = data.serviceIds as string[] | undefined
  const bookingSettings = getBookingSpaceSettings(data)
  const popupSettings: ServiceInfoPopupSettings = {
    buttonLabel: (data.moreInfoButtonLabel as string) || "Meer info",
    eyebrow: (data.infoPopupEyebrow as string) || "Aanbod",
    title: (data.infoPopupTitle as string) || "",
    intro: (data.infoPopupIntro as string) || "",
    ctaLabel: (data.infoPopupCtaLabel as string) || "Aanvragen",
    ctaHref: (data.infoPopupCtaHref as string) || "",
    helperText:
      (data.infoPopupHelperText as string) ||
      "Neem contact op voor beschikbaarheid, planning en mogelijkheden.",
    showImage: (data.infoPopupShowImage as boolean | undefined) ?? true,
    showPrice: (data.infoPopupShowPrice as boolean | undefined) ?? true,
  }

  const [services, setServices] = useState<ServiceDisplay[]>([])
  const [loading, setLoading] = useState(true)
  const [activeService, setActiveService] = useState<ServiceDisplay | null>(null)

  const businessId = (data.businessId) as string | null | undefined
  const websiteId = (data.websiteId) as string | null | undefined
  const recipientEmail = data.recipientEmail as string | undefined
  const serviceIdsKey = (serviceIds ?? []).join(",")

  useEffect(() => {
    let cancelled = false

    const fetchServices = async () => {
      setLoading(true)
      try {
        // If service data is already provided (from server-side fetch), use it.
        if (data.services) {
          let result = (data.services as any[]).map((service): ServiceDisplay => ({
            id: service.id,
            name: service.title ?? service.name ?? "",
            description: service.description ?? null,
            price: service.price ?? null,
            capacity: service.capacity ?? service.metadata?.capacity ?? null,
            images: Array.isArray(service.image_urls)
              ? service.image_urls
              : Array.isArray(service.images)
                ? service.images
                : [],
            position: service.position,
            created_at: service.created_at,
            updated_at: service.updated_at,
          }))

          if (serviceIds && serviceIds.length > 0) {
            result = result.filter((service) => serviceIds.includes(service.id))
          }

          setServices(result)
          setLoading(false)
          return
        }

        const supabase = createClient()

        // Use businessId from section data if available; otherwise fall back to the user's first business.
        let resolvedBusinessId: string | null = businessId ?? null

        if (!resolvedBusinessId) {
          const {
            data: { user },
          } = await supabase.auth.getUser()
          if (!user || cancelled) {
            setLoading(false)
            return
          }

          const { data: business } = await supabase
            .from("businesses")
            .select("id")
            .eq("user_id", user.id)
            .order("created_at", { ascending: true })
            .limit(1)
            .maybeSingle()

          if (!business || cancelled) {
            setLoading(false)
            return
          }
          resolvedBusinessId = business.id
        }

        if (cancelled) return

        const { data: serviceData } = await supabase
          .from("services")
          .select("*")
          .eq("business_id", resolvedBusinessId)
          .order("position", { ascending: true })

        if (cancelled) return

        let result = ((serviceData ?? []) as any[]).map((service): ServiceDisplay => ({
          id: service.id,
          
          name: service.title ?? "",
          description: service.description ?? null,
          price: service.price ?? null,
          capacity: service.capacity ?? service.metadata?.capacity ?? null,
          images: Array.isArray(service.image_urls) ? service.image_urls : [],
          position: service.position,
          created_at: service.created_at,
          updated_at: service.updated_at,
        }))

        if (serviceIds && serviceIds.length > 0) {
          result = result.filter((service) => serviceIds.includes(service.id))
        }

        setServices(result)
      } catch {
        // ignore
      }
      if (!cancelled) setLoading(false)
    }

    fetchServices()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId, serviceIdsKey])

  const sectionStyle: React.CSSProperties = {
    backgroundColor: styles?.backgroundColor,
    backgroundImage: styles?.backgroundImage ? `url(${styles.backgroundImage})` : undefined,
    backgroundSize: "cover",
    backgroundPosition: "center",
    ["--section-surface" as string]: styles?.surfaceColor || "#ffffff",
    ["--section-accent" as string]: styles?.accentColor || "hsl(var(--primary))",
  }

  const textStyle: React.CSSProperties = { color: styles?.textColor }

  // Loading skeleton
  if (loading) {
    return (
      <section
        className={`bg-secondary/60 px-4 py-16 ${styles?.fontFamily ?? ""}`}
        style={sectionStyle}
      >
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto mb-10 h-8 w-48 animate-pulse rounded bg-primary/15" />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-72 animate-pulse rounded-2xl bg-primary/10" />
            ))}
          </div>
        </div>
      </section>
    )
  }

  // Empty state - link to the offerings manager.
  if (services.length === 0) {
    return (
     <section
      className={`relative overflow-hidden bg-secondary/70 px-4 py-20 ${styles?.fontFamily ?? ""}`}
      style={sectionStyle}
    >
      <div
        className="absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(56,83,68,0.18) 1px, transparent 1px),
            linear-gradient(90deg, rgba(56,83,68,0.18) 1px, transparent 1px)
          `,
          backgroundSize: "48px 48px",
        }}
      />
      <div className="relative mx-auto max-w-4xl text-center">
        <div className="mb-5 inline-flex items-center rounded-full border border-border bg-white px-4 py-2 text-sm font-medium text-primary shadow-sm">
          Aanbod beheren
        </div>
        <EditableText as="h2" data={data} path={["title"]} value={title} isPreview={isPreview} onUpdate={onUpdate} className="mb-6 text-4xl font-extrabold tracking-tight text-foreground" style={textStyle} />
        <div className="relative overflow-hidden rounded-2xl border border-border bg-white p-12 shadow-sm">
          <div className="relative flex flex-col items-center">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-[var(--section-accent)] shadow-sm">
              <Briefcase className="h-10 w-10 text-primary-foreground" />
            </div>
            <h3 className="mb-3 text-2xl font-bold text-foreground">
              Nog geen aanbod aangemaakt
            </h3>
            <p className="max-w-xl text-base leading-8 text-muted-foreground">
              Maak eerst aanbod aan via de aanbod pagina en selecteer items daarna hier om ze zichtbaar te maken op je website.
            </p>
            <Link
              href="/editor/services"
              className="mt-10 inline-flex items-center gap-3 rounded-full bg-[var(--section-accent)] px-7 py-4 text-sm font-semibold text-white transition-all duration-200 hover:brightness-90"
            >
              <Briefcase className="h-4 w-4" />
              Aanbod aanmaken
            </Link>
          </div>
        </div>
      </div>
    </section>
    )
  }

  return (
    <section
      className={`bg-secondary/60 px-4 py-10 sm:px-6 sm:py-12 md:py-16 ${styles?.fontFamily ?? ""}`}
      style={sectionStyle}
    >
      <div className="mx-auto max-w-6xl">
        <EditableText
          as="h2"
          data={data}
          path={["title"]}
          value={title}
          isPreview={isPreview}
          onUpdate={onUpdate}
          className="mb-8 text-balance text-center text-2xl font-bold text-foreground sm:mb-10 sm:text-3xl md:mb-12 md:text-4xl"
          style={textStyle}
        />

        {layout === "grid" && (
          <GridLayout
            services={services}
            textStyle={textStyle}
            buttonLabel={data.infoPopupButtonEnabled === false ? "" : popupSettings.buttonLabel}
            onMoreInfo={setActiveService}
          />
        )}
        {layout === "list" && (
          <ListLayout
            services={services}
            textStyle={textStyle}
            buttonLabel={data.infoPopupButtonEnabled === false ? "" : popupSettings.buttonLabel}
            onMoreInfo={setActiveService}
          />
        )}
        {layout === "featured" && (
          <FeaturedLayout
            services={services}
            textStyle={textStyle}
            buttonLabel={data.infoPopupButtonEnabled === false ? "" : popupSettings.buttonLabel}
            onMoreInfo={setActiveService}
          />
        )}
        {layout === "magazine" && (
          <MagazineLayout
            services={services}
            textStyle={textStyle}
            buttonLabel={data.infoPopupButtonEnabled === false ? "" : popupSettings.buttonLabel}
            onMoreInfo={setActiveService}
          />
        )}
        {layout === "minimal" && (
          <MinimalLayout
            services={services}
            textStyle={textStyle}
            buttonLabel={data.infoPopupButtonEnabled === false ? "" : popupSettings.buttonLabel}
            onMoreInfo={setActiveService}
          />
        )}
        {layout === "carousel" && (
          <CarouselLayout
            services={services}
            textStyle={textStyle}
            buttonLabel={data.infoPopupButtonEnabled === false ? "" : popupSettings.buttonLabel}
            onMoreInfo={setActiveService}
          />
        )}
        <ServicesBookingSpace
          settings={bookingSettings}
          services={bookingSettings.serviceIds.length > 0
            ? services.filter((service) => bookingSettings.serviceIds.includes(service.id))
            : services}
          businessId={businessId}
          websiteId={websiteId}
          recipientEmail={recipientEmail}
          isPreview={isPreview}
        />
        {activeService ? (
          <ServiceInfoPopup
            service={activeService}
            settings={popupSettings}
            onClose={() => setActiveService(null)}
          />
        ) : null}
      </div>
    </section>
  )
}








