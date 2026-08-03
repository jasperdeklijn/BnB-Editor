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
import { useWebsiteLocale } from "@/lib/site-i18n/provider"
import { getSectionColorVars } from "@/lib/section-colors"
import type { SiteMessages } from "@/lib/site-i18n/messages"
import type { BusinessCategory } from "@/lib/business/categories"

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
  websiteId?: string | null
  businessId?: string | null
  businessCategory?: BusinessCategory | null
  activeLocale?: string
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

interface PublicAppointmentSlot {
  local_date: string
  start_at: string
  end_at: string
  timezone: string
}

interface PublicBookingAvailability {
  settings: {
    booking_mode: "appointment" | "stay"
    confirmation_mode: "request" | "instant"
    timezone: string
    minimum_nights: number
    maximum_nights: number
    check_in_time: string
    check_out_time: string
  }
  date_bounds: { minimum: string; maximum: string }
  appointment_slots: PublicAppointmentSlot[]
  availability_days?: Array<{
    date: string
    status: "available" | "limited" | "occupied" | "unavailable"
  }>
  stay_check: {
    available: boolean
    reason: string
    nights: number
    start_at?: string
    end_at?: string
  } | null
}

const BOOKING_FLOW_COPY = {
  "nl-NL": {
    arrival: "Aankomst",
    departure: "Vertrek",
    chooseTime: "Kies een beschikbaar tijdstip",
    loading: "Beschikbaarheid laden...",
    noTimes: "Geen beschikbare tijden op deze dag.",
    stayAvailable: (nights: number) => `${nights} ${nights === 1 ? "nacht" : "nachten"} beschikbaar.`,
    stayUnavailable: "Deze verblijfsperiode is niet beschikbaar.",
    confirmed: "Je boeking is direct bevestigd en staat in de planning.",
    pending: "Je aanvraag staat als voorlopig in de planning.",
    availabilityTitle: "Beschikbaarheid",
    availableDay: "Vrij",
    limitedDay: "Deels bezet",
    occupiedDay: "Bezet",
    unavailableDay: "Niet boekbaar",
    previousMonth: "Vorige maand",
    nextMonth: "Volgende maand",
    calendarError: "Beschikbaarheid kon niet worden geladen.",
    selectArrival: "Kies eerst een vrije aankomstdatum.",
    selectDeparture: "Kies nu de vertrekdatum.",
    selectDate: "Kies een vrije datum.",
  },
  "en-GB": {
    arrival: "Arrival",
    departure: "Departure",
    chooseTime: "Choose an available time",
    loading: "Loading availability...",
    noTimes: "No times are available on this day.",
    stayAvailable: (nights: number) => `${nights} ${nights === 1 ? "night" : "nights"} available.`,
    stayUnavailable: "This stay is not available.",
    confirmed: "Your booking is confirmed and has been added to the calendar.",
    pending: "Your request has been added to the calendar provisionally.",
    availabilityTitle: "Availability",
    availableDay: "Available",
    limitedDay: "Partly booked",
    occupiedDay: "Booked",
    unavailableDay: "Unavailable",
    previousMonth: "Previous month",
    nextMonth: "Next month",
    calendarError: "Availability could not be loaded.",
    selectArrival: "First choose an available arrival date.",
    selectDeparture: "Now choose the departure date.",
    selectDate: "Choose an available date.",
  },
  "de-DE": {
    arrival: "Anreise",
    departure: "Abreise",
    chooseTime: "Verfügbare Uhrzeit wählen",
    loading: "Verfügbarkeit wird geladen...",
    noTimes: "An diesem Tag sind keine Zeiten verfügbar.",
    stayAvailable: (nights: number) => `${nights} ${nights === 1 ? "Nacht" : "Nächte"} verfügbar.`,
    stayUnavailable: "Dieser Aufenthalt ist nicht verfügbar.",
    confirmed: "Ihre Buchung ist bestätigt und im Kalender eingetragen.",
    pending: "Ihre Anfrage wurde vorläufig in den Kalender eingetragen.",
    availabilityTitle: "Verfügbarkeit",
    availableDay: "Frei",
    limitedDay: "Teilweise belegt",
    occupiedDay: "Belegt",
    unavailableDay: "Nicht buchbar",
    previousMonth: "Vorheriger Monat",
    nextMonth: "Nächster Monat",
    calendarError: "Verfügbarkeit konnte nicht geladen werden.",
    selectArrival: "Wählen Sie zuerst ein freies Anreisedatum.",
    selectDeparture: "Wählen Sie jetzt das Abreisedatum.",
    selectDate: "Wählen Sie ein freies Datum.",
  },
  "fr-FR": {
    arrival: "Arrivée",
    departure: "Départ",
    chooseTime: "Choisissez une heure disponible",
    loading: "Chargement des disponibilités...",
    noTimes: "Aucun horaire n’est disponible ce jour-là.",
    stayAvailable: (nights: number) => `${nights} ${nights === 1 ? "nuit disponible" : "nuits disponibles"}.`,
    stayUnavailable: "Ce séjour n’est pas disponible.",
    confirmed: "Votre réservation est confirmée et ajoutée au calendrier.",
    pending: "Votre demande a été ajoutée provisoirement au calendrier.",
    availabilityTitle: "Disponibilité",
    availableDay: "Libre",
    limitedDay: "Partiellement occupé",
    occupiedDay: "Occupé",
    unavailableDay: "Non réservable",
    previousMonth: "Mois précédent",
    nextMonth: "Mois suivant",
    calendarError: "La disponibilité n’a pas pu être chargée.",
    selectArrival: "Choisissez d’abord une date d’arrivée libre.",
    selectDeparture: "Choisissez maintenant la date de départ.",
    selectDate: "Choisissez une date libre.",
  },
} as const

function getBookingFlowCopy(locale?: string) {
  return BOOKING_FLOW_COPY[locale as keyof typeof BOOKING_FLOW_COPY] ?? BOOKING_FLOW_COPY["nl-NL"]
}

function dateInputValue(daysFromToday: number) {
  const date = new Date()
  date.setUTCDate(date.getUTCDate() + daysFromToday)
  return date.toISOString().slice(0, 10)
}

function addDateInputDays(value: string, days: number) {
  const date = new Date(`${value}T00:00:00.000Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

function monthStart(dateId: string) {
  return `${dateId.slice(0, 7)}-01`
}

function shiftMonth(dateId: string, offset: number) {
  const [year, month] = dateId.split("-").map(Number)
  const shifted = new Date(Date.UTC(year, month - 1 + offset, 1))
  return shifted.toISOString().slice(0, 10)
}

function monthEnd(dateId: string) {
  return addDateInputDays(shiftMonth(dateId, 1), -1)
}

function calendarMonthCells(dateId: string) {
  const [year, month] = dateId.split("-").map(Number)
  const dayCount = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay()
  const mondayOffset = firstWeekday === 0 ? 6 : firstWeekday - 1
  return [
    ...Array.from({ length: mondayOffset }, () => null),
    ...Array.from({ length: dayCount }, (_, index) => `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-${(index + 1).toString().padStart(2, "0")}`),
  ]
}

function formatSelectedDate(dateId: string, locale?: string) {
  return new Intl.DateTimeFormat(locale || "nl-NL", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${dateId}T12:00:00.000Z`))
}

// ---- Shared helpers ----

function getBookingDefaults(isAccommodation: boolean, messages: SiteMessages) {
  return isAccommodation
    ? {
        heading: messages.bookStay,
        intro: messages.bookStayIntro,
        buttonLabel: messages.requestBooking,
        successText: messages.bookingSuccess,
        helperText: messages.bookingHelper,
        requestType: "booking_request" as BookingSpaceRequestType,
      }
    : {
        heading: messages.planAppointment,
        intro: messages.appointmentIntro,
        buttonLabel: messages.requestAppointment,
        successText: messages.appointmentSuccess,
        helperText: messages.appointmentHelper,
        requestType: "appointment" as BookingSpaceRequestType,
      }
}

function getBookingSpaceSettings(data: Record<string, unknown>, messages: SiteMessages): BookingSpaceSettings {
  const isAccommodation = data.businessCategory === "bnb" || data.bookingSpaceRequestType === "booking_request"
  const defaults = getBookingDefaults(isAccommodation, messages)
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
              <div className="absolute bottom-3 right-3 rounded-full bg-[var(--section-surface)] px-3 py-1 text-sm font-bold text-[var(--section-accent)] shadow backdrop-blur-sm">
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
                className="bg-[var(--section-accent)] text-[var(--section-accent-foreground)] brightness-100 hover:brightness-90"
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
              className="bg-[var(--section-accent)] text-[var(--section-accent-foreground)] brightness-100 hover:brightness-90"
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
              className="group overflow-hidden rounded-2xl border border-border bg-[var(--section-surface)] shadow-sm transition-shadow hover:shadow-md"
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
                    <span className="text-sm font-bold text-[var(--section-accent)]">{service.price}</span>
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
              <span className="mb-3 text-xs font-semibold uppercase tracking-widest text-[var(--section-accent)]">
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
                className="mt-6 w-fit bg-[var(--section-accent)] text-[var(--section-accent-foreground)] brightness-100 hover:brightness-90"
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
                className="font-bold text-foreground transition-colors group-hover:text-[var(--section-accent)]"
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
        className="absolute left-0 top-1/2 z-10 flex h-10 w-10 -translate-x-4 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-[var(--section-surface)] shadow-md transition-all hover:brightness-95"
        aria-label="Vorige"
      >
        <ChevronLeft className="h-5 w-5 text-[var(--section-accent)]" />
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
                <div className="absolute bottom-3 right-3 rounded-full bg-[var(--section-surface)] px-3 py-1 text-sm font-bold text-[var(--section-accent)] shadow backdrop-blur-sm">
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
        className="absolute right-0 top-1/2 z-10 flex h-10 w-10 translate-x-4 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-[var(--section-surface)] shadow-md transition-all hover:brightness-95"
        aria-label="Volgende"
      >
        <ChevronRight className="h-5 w-5 text-[var(--section-accent)]" />
      </button>
    </div>
  )
}

type AvailabilityDay = NonNullable<PublicBookingAvailability["availability_days"]>[number]

const availabilityDayStyles: Record<AvailabilityDay["status"], string> = {
  available: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  limited: "bg-amber-100 text-amber-800 ring-amber-200",
  occupied: "bg-rose-100 text-rose-800 ring-rose-200",
  unavailable: "bg-slate-100 text-slate-400 ring-slate-200",
}

function AvailabilityMiniCalendar({
  websiteId,
  serviceId,
  locale,
  selectedStartDate,
  selectedEndDate,
  selectionHint,
  onSelectDate,
}: {
  websiteId: string
  serviceId: string
  locale?: string
  selectedStartDate?: string
  selectedEndDate?: string
  selectionHint?: string
  onSelectDate?: (dateId: string) => void
}) {
  const copy = getBookingFlowCopy(locale)
  const resolvedLocale = locale && locale in BOOKING_FLOW_COPY ? locale : "nl-NL"
  const [visibleMonth, setVisibleMonth] = useState(() => monthStart(dateInputValue(0)))
  const [days, setDays] = useState<AvailabilityDay[]>([])
  const [bounds, setBounds] = useState<PublicBookingAvailability["date_bounds"] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const controller = new AbortController()

    const loadCalendar = async () => {
      setLoading(true)
      setError("")
      try {
        const query = new URLSearchParams({
          websiteId,
          serviceId,
          dateFrom: visibleMonth,
          dateTo: monthEnd(visibleMonth),
        })
        if (locale) query.set("locale", locale)

        const response = await fetch(`/api/booking/availability?${query}`, {
          cache: "no-store",
          signal: controller.signal,
        })
        const payload = await response.json() as PublicBookingAvailability & { error?: string }
        if (!response.ok) throw new Error(payload.error || copy.calendarError)
        setDays(payload.availability_days ?? [])
        setBounds(payload.date_bounds)
      } catch (requestError) {
        if (controller.signal.aborted) return
        setDays([])
        setError(requestError instanceof Error ? requestError.message : copy.calendarError)
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    void loadCalendar()
    return () => controller.abort()
  }, [copy.calendarError, locale, serviceId, visibleMonth, websiteId])

  const statusByDate = new Map(days.map((day) => [day.date, day.status]))
  const cells = calendarMonthCells(visibleMonth)
  const weekdayLabels = Array.from({ length: 7 }, (_, index) => new Intl.DateTimeFormat(resolvedLocale, {
    weekday: "narrow",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(2026, 7, 3 + index))))
  const monthLabel = new Intl.DateTimeFormat(resolvedLocale, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${visibleMonth}T12:00:00.000Z`))
  const dayFormatter = new Intl.DateTimeFormat(resolvedLocale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  })
  const statusLabels: Record<AvailabilityDay["status"], string> = {
    available: copy.availableDay,
    limited: copy.limitedDay,
    occupied: copy.occupiedDay,
    unavailable: copy.unavailableDay,
  }
  const previousMonth = shiftMonth(visibleMonth, -1)
  const nextMonth = shiftMonth(visibleMonth, 1)
  const canGoPrevious = bounds ? monthEnd(previousMonth) >= bounds.minimum : false
  const canGoNext = bounds ? nextMonth <= bounds.maximum : true

  return (
    <div
      className="mt-5 rounded-xl border border-border bg-muted/40 p-3"
      aria-label={copy.availabilityTitle}
      data-testid="services-availability-calendar"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <CalendarDays className="h-4 w-4 text-[var(--section-accent)]" />
          {copy.availabilityTitle}
        </p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setVisibleMonth(previousMonth)}
            disabled={!canGoPrevious || loading}
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-background hover:text-foreground disabled:cursor-not-allowed disabled:opacity-35"
            aria-label={copy.previousMonth}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setVisibleMonth(nextMonth)}
            disabled={!canGoNext || loading}
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-background hover:text-foreground disabled:cursor-not-allowed disabled:opacity-35"
            aria-label={copy.nextMonth}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <p className="mt-1 text-xs font-medium capitalize text-muted-foreground">{monthLabel}</p>
      {selectionHint ? <p className="mt-1 text-xs font-medium text-foreground" aria-live="polite">{selectionHint}</p> : null}

      {error ? (
        <p className="mt-3 rounded-lg bg-background px-3 py-2 text-xs text-muted-foreground" role="status">{error}</p>
      ) : (
        <div className={`mt-3 transition-opacity ${loading ? "opacity-45" : "opacity-100"}`} aria-busy={loading}>
          <div className="grid grid-cols-7 gap-1 text-center" aria-hidden="true">
            {weekdayLabels.map((label, index) => (
              <span key={`${label}-${index}`} className="pb-1 text-[10px] font-semibold uppercase text-muted-foreground">{label}</span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1" role="grid" aria-label={`${copy.availabilityTitle}: ${monthLabel}`}>
            {cells.map((dateId, index) => {
              if (!dateId) return <span key={`empty-${index}`} aria-hidden="true" />
              const status = statusByDate.get(dateId) ?? "unavailable"
              const label = `${dayFormatter.format(new Date(`${dateId}T12:00:00.000Z`))}: ${statusLabels[status]}`
              const isSelectable = Boolean(onSelectDate) && (status === "available" || status === "limited")
              const isRangeStart = dateId === selectedStartDate
              const isRangeEnd = dateId === selectedEndDate
              const isInRange = Boolean(
                selectedStartDate
                && selectedEndDate
                && dateId > selectedStartDate
                && dateId < selectedEndDate,
              )
              const selectionClass = isRangeStart || isRangeEnd
                ? "ring-2 ring-[var(--section-accent)] ring-offset-1"
                : isInRange
                  ? "outline outline-2 outline-[var(--section-accent)] outline-offset-[-2px]"
                  : ""
              const cellClassName = `flex aspect-square min-h-7 items-center justify-center rounded-md text-[11px] font-semibold ring-1 ring-inset ${availabilityDayStyles[status]} ${selectionClass}`

              if (onSelectDate) {
                return (
                  <button
                    key={dateId}
                    type="button"
                    role="gridcell"
                    aria-label={label}
                    aria-selected={isRangeStart || isRangeEnd || isInRange}
                    title={label}
                    disabled={!isSelectable}
                    onClick={() => onSelectDate(dateId)}
                    className={`${cellClassName} transition-transform enabled:cursor-pointer enabled:hover:scale-105 enabled:focus-visible:outline-none enabled:focus-visible:ring-2 enabled:focus-visible:ring-[var(--section-accent)] disabled:cursor-not-allowed`}
                    data-date={dateId}
                  >
                    {Number(dateId.slice(-2))}
                  </button>
                )
              }

              return (
                <span
                  key={dateId}
                  role="gridcell"
                  aria-label={label}
                  title={label}
                  className={cellClassName}
                >
                  {Number(dateId.slice(-2))}
                </span>
              )
            })}
          </div>
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5 text-[10px] text-muted-foreground">
        {(["available", "limited", "occupied", "unavailable"] as const).map((status) => (
          <span key={status} className="inline-flex items-center gap-1.5">
            <span className={`h-2.5 w-2.5 rounded-sm ring-1 ring-inset ${availabilityDayStyles[status]}`} aria-hidden="true" />
            {statusLabels[status]}
          </span>
        ))}
      </div>
    </div>
  )
}

function ServiceInfoPopup({
  service,
  settings,
  websiteId,
  locale,
  showAvailability,
  onClose,
}: {
  service: ServiceDisplay
  settings: ServiceInfoPopupSettings
  websiteId?: string | null
  locale?: string
  showAvailability: boolean
  onClose: () => void
}) {
  const { messages } = useWebsiteLocale()
  const title = settings.title || service.name
  const intro = settings.intro || service.description
  const [activeImageIndex, setActiveImageIndex] = useState(0)
  const activeImage = service.images[activeImageIndex]

  const selectPreviousImage = () => {
    setActiveImageIndex((current) =>
      current === 0 ? service.images.length - 1 : current - 1,
    )
  }

  const selectNextImage = () => {
    setActiveImageIndex((current) =>
      current === service.images.length - 1 ? 0 : current + 1,
    )
  }

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
        className="max-h-[92vh] w-full max-w-3xl overflow-hidden rounded-2xl border border-border bg-[var(--section-surface)] text-[var(--section-surface-foreground)] shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--section-accent)]">
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
            <div className="bg-muted p-3 sm:p-4">
              {activeImage ? (
                <div className="space-y-3">
                  <div className="group relative overflow-hidden rounded-xl bg-secondary">
                    <img
                      src={activeImage}
                      alt={`${service.name} ${activeImageIndex + 1}`}
                      className="h-64 w-full object-cover md:h-80"
                    />
                    {service.images.length > 1 ? (
                      <>
                        <button
                          type="button"
                          onClick={selectPreviousImage}
                          className="absolute left-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white shadow-sm transition-colors hover:bg-black/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                          aria-label="Vorige afbeelding"
                        >
                          <ChevronLeft className="h-5 w-5" />
                        </button>
                        <button
                          type="button"
                          onClick={selectNextImage}
                          className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white shadow-sm transition-colors hover:bg-black/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                          aria-label="Volgende afbeelding"
                        >
                          <ChevronRight className="h-5 w-5" />
                        </button>
                        <span
                          className="absolute bottom-2 right-2 rounded-full bg-black/60 px-2.5 py-1 text-xs font-semibold text-white"
                          aria-live="polite"
                        >
                          {activeImageIndex + 1} / {service.images.length}
                        </span>
                      </>
                    ) : null}
                  </div>

                  {service.images.length > 1 ? (
                    <div className="grid grid-cols-4 gap-2" aria-label={`Afbeeldingen van ${service.name}`}>
                      {service.images.map((image, index) => (
                        <button
                          key={`${image}-${index}`}
                          type="button"
                          onClick={() => setActiveImageIndex(index)}
                          className={`overflow-hidden rounded-lg border-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--section-accent)] ${
                            index === activeImageIndex
                              ? "border-[var(--section-accent)] opacity-100"
                              : "border-transparent opacity-70 hover:opacity-100"
                          }`}
                          aria-label={`Bekijk afbeelding ${index + 1} van ${service.images.length}`}
                          aria-current={index === activeImageIndex ? "true" : undefined}
                        >
                          <img
                            src={image}
                            alt=""
                            className="aspect-square w-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="flex h-64 items-center justify-center rounded-xl bg-secondary md:h-80">
                  <Briefcase className="h-10 w-10 text-primary/45" />
                </div>
              )}
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
                  <p className="text-xs font-medium uppercase tracking-wide text-primary">{messages.price}</p>
                  <p className="mt-1 font-bold text-foreground">{service.price}</p>
                </div>
              ) : null}
              {service.capacity ? (
                <div className="rounded-xl border border-border bg-muted/50 p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-primary">{messages.capacity}</p>
                  <p className="mt-1 font-bold text-foreground">{service.capacity} deelnemers</p>
                </div>
              ) : null}
            </div>

            {showAvailability && websiteId ? (
              <AvailabilityMiniCalendar
                websiteId={websiteId}
                serviceId={service.id}
                locale={locale}
              />
            ) : null}

            {settings.helperText ? (
              <p className="mt-5 rounded-xl bg-primary/10 p-3 text-xs leading-6 text-primary">
                {settings.helperText}
              </p>
            ) : null}

            {settings.ctaLabel && settings.ctaHref ? (
              <a
                href={settings.ctaHref}
                onClick={(event) => handleSectionAnchorClick(event, settings.ctaHref, onClose)}
                className="mt-5 inline-flex w-full items-center justify-center rounded-full bg-[var(--section-accent)] px-5 py-3 text-sm font-semibold text-[var(--section-accent-foreground)] transition-all hover:brightness-90 sm:w-auto"
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
  locale,
  isPreview,
}: {
  settings: BookingSpaceSettings
  services: ServiceDisplay[]
  businessId?: string | null
  websiteId?: string | null
  recipientEmail?: string
  locale?: string
  isPreview?: boolean
}) {
  const { messages } = useWebsiteLocale()
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
  const [availability, setAvailability] = useState<PublicBookingAvailability | null>(null)
  const [availabilityLoading, setAvailabilityLoading] = useState(false)
  const [availabilityError, setAvailabilityError] = useState("")
  const [appointmentDate, setAppointmentDate] = useState(() => dateInputValue(1))
  const [selectedSlotStart, setSelectedSlotStart] = useState("")
  const [arrivalDate, setArrivalDate] = useState(() => dateInputValue(1))
  const [departureDate, setDepartureDate] = useState(() => dateInputValue(2))
  const [bookingResultStatus, setBookingResultStatus] = useState<"pending" | "confirmed" | null>(null)
  const [stayDateSelectionStep, setStayDateSelectionStep] = useState<"arrival" | "departure" | "complete">("arrival")
  const isAccommodation = settings.requestType === "booking_request"
  const flowCopy = getBookingFlowCopy(locale)

  useEffect(() => {
    if (!form.serviceId && services[0]?.id) {
      setForm((prev) => ({ ...prev, serviceId: services[0].id }))
    }
  }, [form.serviceId, services])

  const update = (field: keyof BookingFormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const selectedService = services.find((service) => service.id === form.serviceId) ?? null
  const activeBookingMode = availability?.settings.booking_mode ?? (isAccommodation ? "stay" : "appointment")

  useEffect(() => {
    setStayDateSelectionStep("arrival")
  }, [form.serviceId])

  const handleCalendarDateSelect = (dateId: string) => {
    if (activeBookingMode === "appointment") {
      setAppointmentDate(dateId)
      return
    }

    const minimumNights = availability?.settings.minimum_nights ?? 1
    if (stayDateSelectionStep === "departure" && dateId > arrivalDate) {
      const minimumDeparture = addDateInputDays(arrivalDate, minimumNights)
      setDepartureDate(dateId < minimumDeparture ? minimumDeparture : dateId)
      setStayDateSelectionStep("complete")
      return
    }

    setArrivalDate(dateId)
    setDepartureDate(addDateInputDays(dateId, minimumNights))
    setStayDateSelectionStep("departure")
  }

  useEffect(() => {
    if (settings.mode !== "calendar" || !form.serviceId) return

    setSelectedSlotStart("")
    setAvailabilityError("")

    if (isPreview) {
      const previewStart = new Date()
      previewStart.setUTCDate(previewStart.getUTCDate() + 1)
      previewStart.setUTCHours(9, 0, 0, 0)
      const previewEnd = new Date(previewStart.getTime() + 60 * 60 * 1000)
      const previewMode = isAccommodation ? "stay" : "appointment"
      const previewAvailability: PublicBookingAvailability = {
        settings: {
          booking_mode: previewMode,
          confirmation_mode: "request",
          timezone: "Europe/Amsterdam",
          minimum_nights: 1,
          maximum_nights: 30,
          check_in_time: "15:00",
          check_out_time: "11:00",
        },
        date_bounds: { minimum: dateInputValue(0), maximum: dateInputValue(90) },
        appointment_slots: previewMode === "appointment" ? [{
          local_date: appointmentDate,
          start_at: previewStart.toISOString(),
          end_at: previewEnd.toISOString(),
          timezone: "Europe/Amsterdam",
        }] : [],
        stay_check: previewMode === "stay" ? {
          available: true,
          reason: "available",
          nights: Math.max(1, Math.round((new Date(`${departureDate}T00:00:00Z`).getTime() - new Date(`${arrivalDate}T00:00:00Z`).getTime()) / 86_400_000)),
        } : null,
      }
      setAvailability(previewAvailability)
      setSelectedSlotStart(previewAvailability.appointment_slots[0]?.start_at ?? "")
      setAvailabilityLoading(false)
      return
    }

    if (!websiteId) {
      setAvailability(null)
      setAvailabilityError(messages.error)
      return
    }

    const controller = new AbortController()
    const loadAvailability = async () => {
      setAvailabilityLoading(true)
      try {
        const query = new URLSearchParams({
          websiteId,
          serviceId: form.serviceId,
          dateFrom: appointmentDate,
          dateTo: appointmentDate,
          arrivalDate,
          departureDate,
          ...(locale ? { locale } : {}),
        })
        const response = await fetch(`/api/booking/availability?${query}`, {
          signal: controller.signal,
          cache: "no-store",
        })
        const body = await response.json().catch(() => null)
        if (!response.ok) throw new Error(body?.error || messages.error)
        const nextAvailability = body as PublicBookingAvailability
        setAvailability(nextAvailability)
        setAvailabilityError("")
        setSelectedSlotStart((current) => (
          nextAvailability.appointment_slots.some((slot) => slot.start_at === current)
            ? current
            : nextAvailability.appointment_slots[0]?.start_at ?? ""
        ))

        if (
          nextAvailability.settings.booking_mode === "stay"
          && nextAvailability.stay_check?.reason === "minimum_nights"
        ) {
          setDepartureDate(addDateInputDays(arrivalDate, nextAvailability.settings.minimum_nights))
        }
      } catch (error) {
        if (controller.signal.aborted) return
        setAvailability(null)
        setAvailabilityError(error instanceof Error ? error.message : messages.error)
      } finally {
        if (!controller.signal.aborted) setAvailabilityLoading(false)
      }
    }

    void loadAvailability()
    return () => controller.abort()
  }, [
    appointmentDate,
    arrivalDate,
    departureDate,
    form.serviceId,
    isAccommodation,
    isPreview,
    locale,
    messages.error,
    settings.mode,
    websiteId,
  ])

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setStatus("loading")
    setErrorMsg("")

    if (isPreview) {
      setStatus("success")
      return
    }

    try {
      if (settings.mode === "calendar") {
        if (!websiteId || !selectedService || !availability) {
          throw new Error(availabilityError || messages.error)
        }

        const selectedSlot = availability.appointment_slots.find((slot) => slot.start_at === selectedSlotStart)
        if (availability.settings.booking_mode === "appointment" && !selectedSlot) {
          throw new Error(flowCopy.noTimes)
        }
        if (availability.settings.booking_mode === "stay" && !availability.stay_check?.available) {
          throw new Error(flowCopy.stayUnavailable)
        }

        const holdResponse = await fetch("/api/booking/holds", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            websiteId,
            serviceId: selectedService.id,
            locale,
            ...(availability.settings.booking_mode === "appointment"
              ? { startAt: selectedSlot?.start_at, endAt: selectedSlot?.end_at }
              : { arrivalDate, departureDate }),
          }),
        })
        const hold = await holdResponse.json().catch(() => null)
        if (!holdResponse.ok) throw new Error(hold?.error || messages.error)

        const confirmResponse = await fetch("/api/booking/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            websiteId,
            serviceId: selectedService.id,
            holdId: hold.holdId,
            token: hold.token,
            name: form.name,
            email: form.email,
            phone: form.phone,
            message: form.message,
            company: form.company,
            locale,
          }),
        })
        const confirmed = await confirmResponse.json().catch(() => null)
        if (!confirmResponse.ok) throw new Error(confirmed?.error || messages.error)

        setBookingResultStatus(confirmed.status === "confirmed" ? "confirmed" : "pending")
        setStatus("success")
        return
      }

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
          locale,
          source: "services_booking_space",
        }),
      })
      await res.json()

      if (!res.ok) {
        setErrorMsg(messages.error)
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
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : messages.error)
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
              {isAccommodation ? messages.booking : messages.appointment}
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
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-[var(--section-accent)] px-5 py-3 text-sm font-semibold text-[var(--section-accent-foreground)] transition-all hover:brightness-90"
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
    <div className="mt-10 overflow-hidden rounded-2xl border border-border bg-[var(--section-surface)] text-[var(--section-surface-foreground)] shadow-sm">
      <div className="grid gap-0 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="bg-secondary p-5 sm:p-6">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-primary">
            <CalendarDays className="h-3.5 w-3.5" />
            {isAccommodation ? messages.bookingRequest : messages.appointmentRequest}
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
                {isPreview
                  ? messages.previewNoSubmission
                  : bookingResultStatus === "confirmed"
                    ? flowCopy.confirmed
                    : bookingResultStatus === "pending"
                      ? flowCopy.pending
                      : settings.successText}
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
                    {isAccommodation ? messages.accommodation : messages.service}
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

              {settings.mode === "calendar" ? (
                <div className="rounded-xl border border-border bg-secondary/50 p-4">
                  {websiteId && form.serviceId ? (
                    <AvailabilityMiniCalendar
                      websiteId={websiteId}
                      serviceId={form.serviceId}
                      locale={locale}
                      selectedStartDate={activeBookingMode === "appointment" ? appointmentDate : arrivalDate}
                      selectedEndDate={activeBookingMode === "appointment" ? undefined : departureDate}
                      selectionHint={
                        activeBookingMode === "appointment"
                          ? flowCopy.selectDate
                          : stayDateSelectionStep === "departure"
                            ? flowCopy.selectDeparture
                            : flowCopy.selectArrival
                      }
                      onSelectDate={handleCalendarDateSelect}
                    />
                  ) : null}

                  {activeBookingMode === "stay" ? (
                    <div className="space-y-3">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className={`rounded-lg border bg-white px-3 py-2.5 ${stayDateSelectionStep === "arrival" ? "border-[var(--section-accent)] ring-2 ring-[var(--section-accent)]/15" : "border-border"}`}>
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{flowCopy.arrival}</p>
                          <p className="mt-0.5 text-sm font-semibold text-foreground" data-testid="services-selected-arrival">
                            {formatSelectedDate(arrivalDate, locale)}
                          </p>
                        </div>
                        <div className={`rounded-lg border bg-white px-3 py-2.5 ${stayDateSelectionStep === "departure" ? "border-[var(--section-accent)] ring-2 ring-[var(--section-accent)]/15" : "border-border"}`}>
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{flowCopy.departure}</p>
                          <p className="mt-0.5 text-sm font-semibold text-foreground" data-testid="services-selected-departure">
                            {formatSelectedDate(departureDate, locale)}
                          </p>
                        </div>
                      </div>
                      <p className={`text-sm ${availability?.stay_check?.available ? "text-emerald-700" : "text-muted-foreground"}`} aria-live="polite">
                        {availabilityLoading
                          ? flowCopy.loading
                          : availability?.stay_check?.available
                            ? flowCopy.stayAvailable(availability.stay_check.nights)
                            : flowCopy.stayUnavailable}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="rounded-lg border border-border bg-white px-3 py-2.5">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{messages.date}</p>
                        <p className="mt-0.5 text-sm font-semibold text-foreground" data-testid="services-selected-appointment-date">
                          {formatSelectedDate(appointmentDate, locale)}
                        </p>
                      </div>
                      <fieldset>
                        <legend className="mb-2 text-sm font-medium text-foreground">{flowCopy.chooseTime} *</legend>
                        {availabilityLoading ? (
                          <p className="text-sm text-muted-foreground" aria-live="polite">{flowCopy.loading}</p>
                        ) : availability?.appointment_slots.length ? (
                          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                            {availability.appointment_slots.map((slot) => {
                              const label = new Intl.DateTimeFormat(locale || "nl-NL", {
                                hour: "2-digit",
                                minute: "2-digit",
                                timeZone: availability.settings.timezone,
                              }).format(new Date(slot.start_at))
                              return (
                                <label
                                  key={slot.start_at}
                                  className={`flex min-h-11 cursor-pointer items-center justify-center rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${selectedSlotStart === slot.start_at ? "border-primary bg-primary text-primary-foreground" : "border-border bg-white text-foreground hover:border-primary/60"}`}
                                >
                                  <input
                                    type="radio"
                                    name="services-booking-slot"
                                    value={slot.start_at}
                                    checked={selectedSlotStart === slot.start_at}
                                    onChange={() => setSelectedSlotStart(slot.start_at)}
                                    className="sr-only"
                                    required
                                  />
                                  {label}
                                </label>
                              )
                            })}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground" aria-live="polite">{flowCopy.noTimes}</p>
                        )}
                      </fieldset>
                    </div>
                  )}

                  {availabilityError ? (
                    <div className="mt-3 flex items-start gap-2 text-sm text-red-700" role="alert">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                      {availabilityError}
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label htmlFor="services-booking-name" className="text-sm font-medium text-foreground">
                    {messages.name} *
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
                    {messages.email} *
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
                    {messages.phone}
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
                {settings.mode !== "calendar" ? (
                  <div className="space-y-1.5">
                    <label htmlFor="services-booking-date" className="text-sm font-medium text-foreground">
                      {isAccommodation ? messages.checkInDate : messages.date} *
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
                ) : null}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="services-booking-message" className="text-sm font-medium text-foreground">
                  {messages.message}
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
                disabled={
                  status === "loading"
                  || availabilityLoading
                  || (settings.mode === "calendar" && (
                    !availability
                    || (availability.settings.booking_mode === "appointment" && !selectedSlotStart)
                    || (availability.settings.booking_mode === "stay" && !availability.stay_check?.available)
                  ))
                }
                className="w-full rounded-full bg-[var(--section-accent)] text-[var(--section-accent-foreground)] brightness-100 hover:brightness-90"
              >
                {status === "loading" ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    {messages.submitting}
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

export function ServicesSection({
  data,
  styles,
  isPreview,
  onUpdate,
  websiteId: runtimeWebsiteId,
  businessId: runtimeBusinessId,
  businessCategory: runtimeBusinessCategory,
  activeLocale: runtimeActiveLocale,
}: ServicesSectionProps) {
  const { messages } = useWebsiteLocale()
  const title = (data.title as string) || messages.offering
  const layout = (servicesLayoutMap[normalizeSectionLayout(data.layout)] ?? "grid") as ServicesLayout
  const serviceIds = data.serviceIds as string[] | undefined
  const bookingSettings = getBookingSpaceSettings(
    runtimeBusinessCategory ? { ...data, businessCategory: runtimeBusinessCategory } : data,
    messages,
  )
  const popupSettings: ServiceInfoPopupSettings = {
    buttonLabel: (data.moreInfoButtonLabel as string) || messages.moreInfo,
    eyebrow: (data.infoPopupEyebrow as string) || messages.offering,
    title: (data.infoPopupTitle as string) || "",
    intro: (data.infoPopupIntro as string) || "",
    ctaLabel: (data.infoPopupCtaLabel as string) || messages.request,
    ctaHref: (data.infoPopupCtaHref as string) || "",
    helperText:
      (data.infoPopupHelperText as string) ||
      messages.availabilityHelp,
    showImage: (data.infoPopupShowImage as boolean | undefined) ?? true,
    showPrice: (data.infoPopupShowPrice as boolean | undefined) ?? true,
  }

  const [services, setServices] = useState<ServiceDisplay[]>([])
  const [loading, setLoading] = useState(true)
  const [activeService, setActiveService] = useState<ServiceDisplay | null>(null)

  const businessId = runtimeBusinessId ?? data.businessId as string | null | undefined
  const websiteId = runtimeWebsiteId ?? data.websiteId as string | null | undefined
  const activeLocale = runtimeActiveLocale ?? data.activeLocale as string | undefined
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
    ...getSectionColorVars(styles, { accent: "hsl(var(--primary))", surface: "#ffffff" }),
    backgroundColor: styles?.backgroundColor,
    backgroundImage: styles?.backgroundImage ? `url(${styles.backgroundImage})` : undefined,
    backgroundSize: "cover",
    backgroundPosition: styles?.backgroundPosition || "center",
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
        <div className="mb-5 inline-flex items-center rounded-full border border-border bg-[var(--section-surface)] px-4 py-2 text-sm font-medium text-[var(--section-accent)] shadow-sm">
          Aanbod beheren
        </div>
        <EditableText as="h2" data={data} path={["title"]} value={title} isPreview={isPreview} onUpdate={onUpdate} className="mb-6 text-4xl font-extrabold tracking-tight text-foreground" style={textStyle} />
        <div className="relative overflow-hidden rounded-2xl border border-border bg-[var(--section-surface)] p-12 text-[var(--section-surface-foreground)] shadow-sm">
          <div className="relative flex flex-col items-center">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-[var(--section-accent)] shadow-sm">
              <Briefcase className="h-10 w-10 text-[var(--section-accent-foreground)]" />
            </div>
            <h3 className="mb-3 text-2xl font-bold text-foreground">
              Nog geen aanbod aangemaakt
            </h3>
            <p className="max-w-xl text-base leading-8 text-muted-foreground">
              Maak eerst aanbod aan via de aanbod pagina en selecteer items daarna hier om ze zichtbaar te maken op je website.
            </p>
            <Link
              href="/editor/services"
              className="mt-10 inline-flex items-center gap-3 rounded-full bg-[var(--section-accent)] px-7 py-4 text-sm font-semibold text-[var(--section-accent-foreground)] transition-all duration-200 hover:brightness-90"
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
          locale={activeLocale}
          isPreview={isPreview}
        />
        {activeService ? (
          <ServiceInfoPopup
            service={activeService}
            settings={popupSettings}
            websiteId={websiteId}
            locale={activeLocale}
            showAvailability={
              bookingSettings.enabled
              && bookingSettings.mode === "calendar"
              && (bookingSettings.serviceIds.length === 0 || bookingSettings.serviceIds.includes(activeService.id))
            }
            onClose={() => setActiveService(null)}
          />
        ) : null}
      </div>
    </section>
  )
}








