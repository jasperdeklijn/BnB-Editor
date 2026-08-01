"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { loadUserImages } from "@/lib/user-images"
import {
  createService as apiCreateService,
  updateService as apiUpdateService,
  deleteService as apiDeleteService,
  type Service,
  type ServiceInput,
} from "@/lib/supabase/services"
import type { CalendarEntry, CalendarEntryStatus } from "@/lib/supabase/calendar"
import { upsertServiceBookingSettings } from "@/lib/supabase/booking-settings"
import {
  createDefaultServiceBookingSettings,
  type ServiceBookingSettings,
  type ServiceBookingSettingsInput,
} from "@/lib/booking/types"
import type { ServiceAvailabilityPreview } from "@/lib/booking/availability"
import { Button } from "@/components/ui/button"
import { EditorPageShell } from "@/components/editor/editor-page-shell"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { useEditorLayout } from "@/components/editor/editor-layout-context"
import { useTouchDrag } from "@/hooks/use-touch-drag"
import { getOfferingCopy, type BusinessCategory, type OfferingCopy } from "@/lib/business/categories"
import {
  Briefcase,
  Plus,
  Trash2,
  ImageIcon,
  ChevronLeft,
  ChevronRight,
  X,
  Loader2,
  CheckCircle2,
  Clock,
  DollarSign,
  CalendarDays,
  ArrowRight,
  Settings2,
} from "lucide-react"
import Link from "next/link"

interface ServicesClientProps {
  userId: string
  businessId: string
  businessCategory?: BusinessCategory | string | null
  initialServices: Service[]
  initialCalendarEntries: CalendarEntry[]
  calendarUnavailable: boolean
  initialBookingSettings: ServiceBookingSettings[]
  initialAvailabilityPreviews: Record<string, ServiceAvailabilityPreview>
  bookingSettingsUnavailable: boolean
}

interface OfferingPlanningCopy {
  cardTitle: string
  emptyText: string
  openCalendarLabel: string
  unavailableText: string
  itemFallback: string
}

const CALENDAR_STATUS_LABELS: Record<CalendarEntryStatus, string> = {
  pending: "In afwachting",
  confirmed: "Bevestigd",
  cancelled: "Geannuleerd",
  completed: "Afgerond",
  blocked: "Geblokkeerd",
}

function getOfferingPlanningCopy(category?: BusinessCategory | string | null): OfferingPlanningCopy {
  if (category === "bnb") {
    return {
      cardTitle: "Aankomende boekingen",
      emptyText: "Nog geen boekingen voor deze accommodatie.",
      openCalendarLabel: "Boekingskalender",
      unavailableText: "Boekingsplanning is nog niet beschikbaar.",
      itemFallback: "Boeking",
    }
  }

  return {
    cardTitle: "Aankomende afspraken",
    emptyText: "Nog geen afspraken voor deze dienst.",
    openCalendarLabel: "Afsprakenkalender",
    unavailableText: "Afsprakenplanning is nog niet beschikbaar.",
    itemFallback: "Afspraak",
  }
}

function formatPlanningPoint(value: string, allDay: boolean) {
  const options: Intl.DateTimeFormatOptions = allDay
    ? { day: "2-digit", month: "short" }
    : { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }

  return new Intl.DateTimeFormat("nl-NL", options).format(new Date(value))
}

function formatPlanningRange(entry: CalendarEntry, isAccommodation: boolean) {
  const start = formatPlanningPoint(entry.start_at, entry.all_day)
  const end = formatPlanningPoint(entry.end_at, entry.all_day)

  if (isAccommodation) {
    return `Check-in ${start} · check-out ${end}`
  }

  return `${start} - ${end}`
}

// ---- Image card in the sidebar (draggable) ----
interface SidebarImageCardProps {
  name: string
  url: string
  previewUrl: string
  isDragging: boolean
  onDragStart: (e: React.DragEvent, url: string) => void
  onDragEnd: () => void
}

function SidebarImageCard({ name, url, previewUrl, isDragging, onDragStart, onDragEnd }: SidebarImageCardProps) {
  const { onTouchStart, onTouchMove, onTouchEnd } = useTouchDrag({ payload: { imageUrl: url } })
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, url)}
      onDragEnd={onDragEnd}
      onTouchStart={(e) => onTouchStart(e, name)}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      style={{ touchAction: "none" }}
      title={name}
      className={`rounded-lg border border-border bg-card p-1 shadow-sm cursor-move hover:border-primary transition-all duration-200 select-none group ${
        isDragging ? "ring-2 ring-primary shadow-lg scale-105 opacity-70" : ""
      }`}
    >
      <img src={previewUrl} alt={name} className="w-full h-20 object-cover rounded" />
      <div className="text-[10px] text-muted-foreground truncate text-center mt-1 px-1">{name}</div>
    </div>
  )
}

// ---- Service card ----
interface ServiceCardProps {
  service: Service
  onUpdate: (id: string, updates: Partial<ServiceInput>) => void
  onDelete: (id: string) => void
  isSaving: boolean
  offeringCopy: OfferingCopy
  planningCopy: OfferingPlanningCopy
  upcomingEntries: CalendarEntry[]
  calendarUnavailable: boolean
  isAccommodation: boolean
  bookingSettings: ServiceBookingSettings
  availabilityPreview?: ServiceAvailabilityPreview
  bookingSettingsUnavailable: boolean
  onUpdateBookingSettings: (serviceId: string, settings: ServiceBookingSettingsInput) => Promise<void>
}

function formatAppointmentSlot(startAt: string, timezone: string) {
  return new Intl.DateTimeFormat("nl-NL", {
    timeZone: timezone,
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(startAt))
}

function formatStayDate(dateId: string) {
  return new Intl.DateTimeFormat("nl-NL", { day: "2-digit", month: "short", timeZone: "UTC" })
    .format(new Date(`${dateId}T12:00:00.000Z`))
}

function BookingSettingsPanel({
  settings,
  preview,
  unavailable,
  onSave,
}: {
  settings: ServiceBookingSettings
  preview?: ServiceAvailabilityPreview
  unavailable: boolean
  onSave: (settings: ServiceBookingSettingsInput) => Promise<void>
}) {
  const [draft, setDraft] = useState<ServiceBookingSettingsInput>(() => ({
    booking_enabled: settings.booking_enabled,
    booking_mode: settings.booking_mode,
    confirmation_mode: settings.confirmation_mode,
    timezone: settings.timezone,
    duration_minutes: settings.duration_minutes,
    slot_interval_minutes: settings.slot_interval_minutes,
    buffer_before_minutes: settings.buffer_before_minutes,
    buffer_after_minutes: settings.buffer_after_minutes,
    minimum_notice_minutes: settings.minimum_notice_minutes,
    booking_horizon_days: settings.booking_horizon_days,
    capacity: settings.capacity,
    minimum_nights: settings.minimum_nights,
    maximum_nights: settings.maximum_nights,
    check_in_time: settings.check_in_time,
    check_out_time: settings.check_out_time,
    cancellation_cutoff_minutes: settings.cancellation_cutoff_minutes,
  }))

  useEffect(() => {
    setDraft({
      booking_enabled: settings.booking_enabled,
      booking_mode: settings.booking_mode,
      confirmation_mode: settings.confirmation_mode,
      timezone: settings.timezone,
      duration_minutes: settings.duration_minutes,
      slot_interval_minutes: settings.slot_interval_minutes,
      buffer_before_minutes: settings.buffer_before_minutes,
      buffer_after_minutes: settings.buffer_after_minutes,
      minimum_notice_minutes: settings.minimum_notice_minutes,
      booking_horizon_days: settings.booking_horizon_days,
      capacity: settings.capacity,
      minimum_nights: settings.minimum_nights,
      maximum_nights: settings.maximum_nights,
      check_in_time: settings.check_in_time,
      check_out_time: settings.check_out_time,
      cancellation_cutoff_minutes: settings.cancellation_cutoff_minutes,
    })
  }, [settings])

  const commit = (updates: Partial<ServiceBookingSettingsInput>) => {
    const next = { ...draft, ...updates }
    setDraft(next)
    void onSave(next)
  }

  const previewItems = preview?.mode === "stay" ? preview.stay_options : preview?.appointment_slots

  return (
    <details className="rounded-lg border border-border bg-background">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 text-sm font-semibold marker:content-none">
        <span className="flex items-center gap-2"><Settings2 className="h-4 w-4 text-primary" />Boekingsinstellingen</span>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${draft.booking_enabled ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
          {draft.booking_enabled ? "Actief concept" : "Uit"}
        </span>
      </summary>
      <div className="space-y-4 border-t border-border p-3">
        {unavailable ? (
          <p className="rounded-md border border-dashed p-2 text-xs text-muted-foreground">Voer eerst de Booking Engine 2.0-migratie uit om instellingen op te slaan.</p>
        ) : null}

        <label className="flex items-center justify-between gap-3 text-xs font-medium">
          Beschikbaarheid voorbereiden
          <input type="checkbox" checked={draft.booking_enabled} disabled={unavailable} onChange={(event) => commit({ booking_enabled: event.target.checked })} />
        </label>

        <div className="grid grid-cols-2 gap-2">
          <div><Label className="mb-1 block text-xs">Type</Label><select value={draft.booking_mode} disabled={unavailable} onChange={(event) => commit({ booking_mode: event.target.value as ServiceBookingSettingsInput["booking_mode"] })} className="h-9 w-full rounded-md border border-input bg-background px-2 text-xs"><option value="appointment">Afspraak</option><option value="stay">Verblijf</option></select></div>
          <div><Label className="mb-1 block text-xs">Bevestiging</Label><select value={draft.confirmation_mode} disabled={unavailable} onChange={(event) => commit({ confirmation_mode: event.target.value as ServiceBookingSettingsInput["confirmation_mode"] })} className="h-9 w-full rounded-md border border-input bg-background px-2 text-xs"><option value="request">Na goedkeuring</option><option value="instant">Direct</option></select></div>
        </div>

        <div><Label className="mb-1 block text-xs">Tijdzone</Label><Input value={draft.timezone} disabled={unavailable} placeholder="Europe/Amsterdam" onChange={(event) => setDraft((current) => ({ ...current, timezone: event.target.value }))} onBlur={() => void onSave(draft)} /></div>

        {draft.booking_mode === "appointment" ? (
          <div className="grid grid-cols-2 gap-2">
            <div><Label className="mb-1 block text-xs">Duur (min.)</Label><Input type="number" min={5} max={1440} value={draft.duration_minutes} disabled={unavailable} onChange={(event) => setDraft((current) => ({ ...current, duration_minutes: Number(event.target.value) }))} onBlur={() => void onSave(draft)} /></div>
            <div><Label className="mb-1 block text-xs">Interval (min.)</Label><Input type="number" min={5} max={1440} value={draft.slot_interval_minutes} disabled={unavailable} onChange={(event) => setDraft((current) => ({ ...current, slot_interval_minutes: Number(event.target.value) }))} onBlur={() => void onSave(draft)} /></div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <div><Label className="mb-1 block text-xs">Min. nachten</Label><Input type="number" min={1} max={365} value={draft.minimum_nights} disabled={unavailable} onChange={(event) => setDraft((current) => ({ ...current, minimum_nights: Number(event.target.value) }))} onBlur={() => void onSave(draft)} /></div>
            <div><Label className="mb-1 block text-xs">Max. nachten</Label><Input type="number" min={1} max={730} value={draft.maximum_nights} disabled={unavailable} onChange={(event) => setDraft((current) => ({ ...current, maximum_nights: Number(event.target.value) }))} onBlur={() => void onSave(draft)} /></div>
            <div><Label className="mb-1 block text-xs">Check-in</Label><Input type="time" value={draft.check_in_time} disabled={unavailable} onChange={(event) => setDraft((current) => ({ ...current, check_in_time: event.target.value }))} onBlur={() => void onSave(draft)} /></div>
            <div><Label className="mb-1 block text-xs">Check-out</Label><Input type="time" value={draft.check_out_time} disabled={unavailable} onChange={(event) => setDraft((current) => ({ ...current, check_out_time: event.target.value }))} onBlur={() => void onSave(draft)} /></div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <div><Label className="mb-1 block text-xs">Buffer voor (min.)</Label><Input type="number" min={0} max={1440} value={draft.buffer_before_minutes} disabled={unavailable} onChange={(event) => setDraft((current) => ({ ...current, buffer_before_minutes: Number(event.target.value) }))} onBlur={() => void onSave(draft)} /></div>
          <div><Label className="mb-1 block text-xs">Buffer na (min.)</Label><Input type="number" min={0} max={1440} value={draft.buffer_after_minutes} disabled={unavailable} onChange={(event) => setDraft((current) => ({ ...current, buffer_after_minutes: Number(event.target.value) }))} onBlur={() => void onSave(draft)} /></div>
          <div><Label className="mb-1 block text-xs">Vooraf boeken (uur)</Label><Input type="number" min={0} max={8760} value={draft.minimum_notice_minutes / 60} disabled={unavailable} onChange={(event) => setDraft((current) => ({ ...current, minimum_notice_minutes: Math.round(Number(event.target.value) * 60) }))} onBlur={() => void onSave(draft)} /></div>
          <div><Label className="mb-1 block text-xs">Boekhorizon (dagen)</Label><Input type="number" min={1} max={730} value={draft.booking_horizon_days} disabled={unavailable} onChange={(event) => setDraft((current) => ({ ...current, booking_horizon_days: Number(event.target.value) }))} onBlur={() => void onSave(draft)} /></div>
          <div><Label className="mb-1 block text-xs">Capaciteit</Label><Input type="number" min={1} max={10000} value={draft.capacity} disabled={unavailable} onChange={(event) => setDraft((current) => ({ ...current, capacity: Number(event.target.value) }))} onBlur={() => void onSave(draft)} /></div>
          <div><Label className="mb-1 block text-xs">Annuleren tot (uur)</Label><Input type="number" min={0} max={8760} value={draft.cancellation_cutoff_minutes / 60} disabled={unavailable} onChange={(event) => setDraft((current) => ({ ...current, cancellation_cutoff_minutes: Math.round(Number(event.target.value) * 60) }))} onBlur={() => void onSave(draft)} /></div>
        </div>

        <div className="rounded-md bg-primary/5 p-2.5">
          <p className="text-xs font-semibold">Beschikbaarheidsvoorbeeld</p>
          {!draft.booking_enabled ? <p className="mt-1 text-xs text-muted-foreground">Schakel beschikbaarheid in om tijden of verblijven te berekenen.</p> : previewItems?.length ? (
            <ul className="mt-1.5 space-y-1 text-xs text-muted-foreground">
              {preview?.mode === "stay"
                ? preview.stay_options.map((option) => <li key={`${option.arrival_date}-${option.departure_date}`}>{formatStayDate(option.arrival_date)} – {formatStayDate(option.departure_date)} · {option.nights} {option.nights === 1 ? "nacht" : "nachten"}</li>)
                : preview?.appointment_slots.map((slot) => <li key={slot.start_at}>{formatAppointmentSlot(slot.start_at, slot.timezone)}</li>)}
            </ul>
          ) : <p className="mt-1 text-xs text-muted-foreground">Geen vrije momenten in de komende 14 dagen. Controleer beschikbaarheidsvensters, blokkades en boekregels.</p>}
          <p className="mt-2 text-[10px] text-muted-foreground">Alleen-lezen voorbeeld. De live kalender gebruikt deze regels; publiek boeken blijft Gold.</p>
        </div>
      </div>
    </details>
  )
}

function ServiceCard({
  service,
  onUpdate,
  onDelete,
  isSaving,
  offeringCopy,
  planningCopy,
  upcomingEntries,
  calendarUnavailable,
  isAccommodation,
  bookingSettings,
  availabilityPreview,
  bookingSettingsUnavailable,
  onUpdateBookingSettings,
}: ServiceCardProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [localTitle, setLocalTitle] = useState(service.title)
  const [localDescription, setLocalDescription] = useState(service.description ?? "")
  const [localPrice, setLocalPrice] = useState(service.price ?? "")
  const [localDuration, setLocalDuration] = useState(service.duration ?? "")

  useEffect(() => {
    setLocalTitle(service.title)
    setLocalDescription(service.description ?? "")
    setLocalPrice(service.price ?? "")
    setLocalDuration(service.duration ?? "")
  }, [service])

  const handleBlur = () => {
    onUpdate(service.id, {
      title: localTitle,
      description: localDescription,
      price: localPrice,
      duration: localDuration || null,
    })
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "copy"
    setIsDragOver(true)
  }

  const handleDragLeave = () => setIsDragOver(false)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const imageUrl = e.dataTransfer.getData("imageUrl")
    if (imageUrl && !service.image_urls.includes(imageUrl)) {
      onUpdate(service.id, { image_urls: [...service.image_urls, imageUrl] })
    }
  }

  const removeImage = (imgUrl: string) => {
    onUpdate(service.id, { image_urls: service.image_urls.filter((u) => u !== imgUrl) })
  }

  const cardRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = cardRef.current
    if (!el) return
    const handler = (e: Event) => {
      const custom = e as CustomEvent
      const imageUrl = custom.detail?.imageUrl
      if (imageUrl && !service.image_urls.includes(imageUrl)) {
        onUpdate(service.id, { image_urls: [...service.image_urls, imageUrl] })
      }
    }
    el.addEventListener("touchdrop", handler)
    return () => el.removeEventListener("touchdrop", handler)
  }, [service.id, service.image_urls, onUpdate])

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      {/* Card header */}
      <div className="flex items-center justify-between px-5 py-4 bg-secondary/40 border-b border-border">
        <div className="flex items-center gap-2">
          <Briefcase className="h-4 w-4 text-primary" />
          <span className="font-semibold text-foreground truncate max-w-[200px]">
            {service.title || offeringCopy.unnamedItem}
          </span>
          <div className="relative group">
            {(() => {
              const missing = []
              if (!service.title) missing.push("naam")
              if (!service.description) missing.push("beschrijving")
              if (!service.price) missing.push("prijs")
              return (
                <>
                  {missing.length === 0 ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500 ml-2" />
                  ) : (
                    <X className="h-4 w-4 text-red-500 ml-2" />
                  )}
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-3 px-3 py-2 bg-card border border-border text-foreground text-sm rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-100">
                    {missing.length === 0 ? "Alle velden ingevuld" : `Ontbreekt: ${missing.join(", ")}`}
                  </div>
                </>
              )
            })()}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onDelete(service.id)}
          className="h-7 w-7 text-destructive hover:bg-destructive/10 flex-shrink-0"
          disabled={isSaving}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="p-5 space-y-4">
        {/* Title */}
        <div className="space-y-1.5">
          <Label
            htmlFor={`title-${service.id}`}
            className="text-xs font-medium text-muted-foreground uppercase tracking-wide"
          >
            {offeringCopy.itemNameLabel}
          </Label>
          <Input
            id={`title-${service.id}`}
            placeholder={offeringCopy.itemNamePlaceholder}
            value={localTitle}
            onChange={(e) => setLocalTitle(e.target.value)}
            onBlur={handleBlur}
          />
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <Label
            htmlFor={`desc-${service.id}`}
            className="text-xs font-medium text-muted-foreground uppercase tracking-wide"
          >
            Beschrijving
          </Label>
          <Textarea
            id={`desc-${service.id}`}
            placeholder={`Wat houdt deze ${offeringCopy.singular} in...`}
            value={localDescription}
            onChange={(e) => setLocalDescription(e.target.value)}
            onBlur={handleBlur}
            rows={3}
            className="resize-none"
          />
        </div>

        {/* Price + duration row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label
              htmlFor={`price-${service.id}`}
              className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide"
            >
              <DollarSign className="h-3 w-3 text-primary" />
              Prijs
            </Label>
            <Input
              id={`price-${service.id}`}
              type="text"
              placeholder="Vanaf € 45"
              value={localPrice}
              onChange={(e) => setLocalPrice(e.target.value)}
              onBlur={handleBlur}
            />
          </div>
          <div className="space-y-1.5">
            <Label
              htmlFor={`duration-${service.id}`}
              className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide"
            >
              <Clock className="h-3 w-3 text-primary" />
              Duur
            </Label>
            <Input
              id={`duration-${service.id}`}
              type="text"
              placeholder="30 min"
              value={localDuration}
              onChange={(e) => setLocalDuration(e.target.value)}
              onBlur={handleBlur}
            />
          </div>
        </div>

        <div className="rounded-lg bg-primary/5 p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <CalendarDays className="h-4 w-4 shrink-0 text-primary" />
              <p className="truncate text-sm font-semibold text-foreground">{planningCopy.cardTitle}</p>
            </div>
            <Button asChild variant="ghost" size="xs" className="h-7 shrink-0 px-2 text-primary hover:text-primary">
              <Link href={`/editor/calendar?service=${encodeURIComponent(service.id)}`}>
                {planningCopy.openCalendarLabel}
                <ArrowRight className="h-3 w-3" />
              </Link>
            </Button>
          </div>

          {calendarUnavailable ? (
            <p className="rounded-md border border-dashed border-border bg-background/70 p-2 text-xs text-muted-foreground">
              {planningCopy.unavailableText}
            </p>
          ) : upcomingEntries.length === 0 ? (
            <p className="rounded-md border border-dashed border-border bg-background/70 p-2 text-xs text-muted-foreground">
              {planningCopy.emptyText}
            </p>
          ) : (
            <div className="space-y-2">
              {upcomingEntries.slice(0, 3).map((entry) => (
                <Link
                  key={entry.id}
                  href={`/editor/calendar?service=${encodeURIComponent(service.id)}`}
                  className="block rounded-md bg-background/80 px-3 py-2 text-xs transition-colors hover:bg-background"
                >
                  <span className="flex items-start justify-between gap-2">
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-foreground">
                        {entry.title || planningCopy.itemFallback}
                      </span>
                      <span className="mt-0.5 block text-muted-foreground">
                        {formatPlanningRange(entry, isAccommodation)}
                      </span>
                      {entry.customer_name ? (
                        <span className="mt-0.5 block truncate text-muted-foreground">{entry.customer_name}</span>
                      ) : null}
                    </span>
                    <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                      {CALENDAR_STATUS_LABELS[entry.status]}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        <BookingSettingsPanel
          settings={bookingSettings}
          preview={availabilityPreview}
          unavailable={bookingSettingsUnavailable}
          onSave={(settings) => onUpdateBookingSettings(service.id, settings)}
        />

        {/* Images drop zone */}
        <div className="space-y-2">
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
            <ImageIcon className="h-3 w-3 text-primary" />
            Afbeeldingen
            <span className="ml-auto text-muted-foreground/60 normal-case font-normal">sleep van zijbalk</span>
          </Label>

          <div
            ref={cardRef}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`min-h-[80px] rounded-lg border-2 border-dashed transition-all duration-200 p-2 ${
              isDragOver
                ? "border-primary bg-primary/5 scale-[1.01]"
                : "border-border/60 hover:border-primary/40 bg-muted/20"
            }`}
          >
            {service.image_urls.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-16 text-center gap-1">
                <ImageIcon className={`h-5 w-5 ${isDragOver ? "text-primary" : "text-muted-foreground/40"}`} />
                <p className={`text-xs ${isDragOver ? "text-primary font-medium" : "text-muted-foreground/60"}`}>
                  {isDragOver ? "Laat los om foto toe te voegen" : "Sleep afbeeldingen hierheen"}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-1.5">
                {service.image_urls.map((url) => (
                  <div key={url} className="relative group rounded overflow-hidden aspect-square">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(url)}
                      className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-label="Afbeelding verwijderen"
                    >
                      <X className="h-4 w-4 text-white" />
                    </button>
                  </div>
                ))}
                {isDragOver && (
                  <div className="flex items-center justify-center rounded border-2 border-dashed border-primary bg-primary/5 aspect-square">
                    <Plus className="h-5 w-5 text-primary" />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ---- Main client component ----
export function ServicesClient({
  userId,
  businessId,
  businessCategory,
  initialServices,
  initialCalendarEntries,
  calendarUnavailable,
  initialBookingSettings,
  initialAvailabilityPreviews,
  bookingSettingsUnavailable,
}: ServicesClientProps) {
  const router = useRouter()
  const [services, setServices] = useState<Service[]>(initialServices)
  const [bookingSettings, setBookingSettings] = useState<ServiceBookingSettings[]>(initialBookingSettings)
  const offeringCopy = getOfferingCopy(businessCategory)
  const planningCopy = getOfferingPlanningCopy(businessCategory)
  const isAccommodation = businessCategory === "bnb"
  const [images, setImages] = useState<{ name: string; url: string; previewUrl: string }[]>([])
  const [isLoadingImages, setIsLoadingImages] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [draggingImage, setDraggingImage] = useState<string | null>(null)
  const { setIsSaving: setHeaderSaving, setSaveState, setActionLabel, setOnAction, setActionIcon, setActionLoading, setInfoText } =
    useEditorLayout()

  useEffect(() => setBookingSettings(initialBookingSettings), [initialBookingSettings])

  const upcomingEntriesByService = useMemo(() => {
    const now = Date.now()
    const grouped = new Map<string, CalendarEntry[]>()

    initialCalendarEntries
      .filter((entry) => {
        if (!entry.service_id || entry.status === "cancelled" || entry.status === "completed") return false
        return new Date(entry.end_at).getTime() >= now
      })
      .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())
      .forEach((entry) => {
        grouped.set(entry.service_id!, [...(grouped.get(entry.service_id!) ?? []), entry])
      })

    return grouped
  }, [initialCalendarEntries])

  useEffect(() => {
    setIsLoadingImages(true)
    const supabase = createClient()
    loadUserImages(supabase, userId)
      .then((pics) => setImages(pics.map(({ name, url, previewUrl }) => ({ name, url, previewUrl }))))
      .catch(() => setImages([]))
      .finally(() => setIsLoadingImages(false))
  }, [userId])

  const handleCreateService = useCallback(async () => {
    setIsSaving(true)
    let failed = false
    try {
      const newService = await apiCreateService(businessId, {
        title: offeringCopy.newItemTitle,
        description: "",
        price: "",
        duration: null,
        capacity: null,
        image_urls: [],
        position: services.length,
      })
      setServices((prev) => [...prev, newService])
      toast.success(`${offeringCopy.singular[0].toUpperCase()}${offeringCopy.singular.slice(1)} aangemaakt`)
    } catch (err) {
      console.error(err)
      failed = true
      toast.error("Aanmaken mislukt")
    } finally {
      setIsSaving(false)
      if (failed) setSaveState("error")
    }
  }, [businessId, offeringCopy, services.length, setSaveState])

  useEffect(() => {
    setHeaderSaving(isSaving)
    setActionLoading(isSaving)
  }, [isSaving, setHeaderSaving, setActionLoading])

  useEffect(() => {
    setActionLabel(offeringCopy.addLabel)
    setActionIcon(<Plus className="mr-2 h-4 w-4" />)
    setOnAction(() => handleCreateService)
    setInfoText(`${services.length} ${services.length === 1 ? offeringCopy.singular : offeringCopy.plural}`)

    return () => {
      setActionLabel(undefined)
      setActionIcon(undefined)
      setOnAction(undefined)
      setActionLoading(false)
      setInfoText(undefined)
    }
  }, [services.length, handleCreateService, offeringCopy, setActionLabel, setActionIcon, setActionLoading, setOnAction, setInfoText])

  const handleUpdateService = async (id: string, updates: Partial<ServiceInput>) => {
    setServices((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)))
    setIsSaving(true)
    let failed = false
    try {
      const updated = await apiUpdateService(id, updates)
      setServices((prev) => prev.map((s) => (s.id === id ? updated : s)))
    } catch (err) {
      console.error(err)
      failed = true
      toast.error("Bijwerken mislukt")
    } finally {
      setIsSaving(false)
      if (failed) setSaveState("error")
    }
  }

  const handleDeleteService = async (id: string) => {
    const prev = services
    setServices((s) => s.filter((service) => service.id !== id))
    setIsSaving(true)
    let failed = false
    try {
      await apiDeleteService(id)
      toast.success(`${offeringCopy.singular[0].toUpperCase()}${offeringCopy.singular.slice(1)} verwijderd`)
    } catch (err) {
      console.error(err)
      setServices(prev)
      failed = true
      toast.error("Verwijderen mislukt")
    } finally {
      setIsSaving(false)
      if (failed) setSaveState("error")
    }
  }

  const handleUpdateBookingSettings = async (serviceId: string, settings: ServiceBookingSettingsInput) => {
    setIsSaving(true)
    try {
      const updated = await upsertServiceBookingSettings(serviceId, settings)
      setBookingSettings((current) => current.map((item) => item.service_id === serviceId ? updated : item))
      setSaveState("saved")
      router.refresh()
    } catch (error) {
      console.error(error)
      setSaveState("error")
      toast.error("Boekingsinstellingen konden niet worden opgeslagen", {
        description: error instanceof Error ? error.message : "Controleer de invoer en probeer opnieuw.",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleImageDragStart = (e: React.DragEvent, url: string) => {
    e.dataTransfer.setData("imageUrl", url)
    e.dataTransfer.effectAllowed = "copy"
    setDraggingImage(url)
  }

  const handleImageDragEnd = () => setDraggingImage(null)

  return (
    <EditorPageShell
      title={offeringCopy.title}
      description={offeringCopy.managerDescription}
      maxWidth="full"
      scroll={false}
      contentClassName="h-full min-h-0"
    >
      <div className="flex min-h-0 flex-1 overflow-hidden rounded-xl border border-border bg-background shadow-sm">
        {/* Image sidebar */}
        <aside
          className={`flex-shrink-0 border-r border-border bg-[var(--editor-sidebar)] transition-all duration-300 overflow-y-auto ${
            sidebarCollapsed ? "w-12" : "w-56"
          } hidden md:flex flex-col`}
        >
          <div className="flex items-center justify-between px-3 py-3 border-b border-border sticky top-0 bg-[var(--editor-sidebar)] z-10">
            {!sidebarCollapsed && (
              <div>
                <p className="text-xs font-semibold text-foreground">Afbeeldingen</p>
                <p className="text-[10px] text-muted-foreground">Sleep naar {offeringCopy.plural}</p>
              </div>
            )}
            <button
              type="button"
              onClick={() => setSidebarCollapsed((c) => !c)}
              className="ml-auto flex h-7 w-7 items-center justify-center rounded-md border bg-card text-muted-foreground hover:bg-accent transition-colors flex-shrink-0"
              aria-label={sidebarCollapsed ? "Zijbalk uitvouwen" : "Zijbalk samenvouwen"}
            >
              {sidebarCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
            </button>
          </div>

          {!sidebarCollapsed && (
            <div className="p-2 space-y-1.5">
              {isLoadingImages ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : images.length === 0 ? (
                <div className="py-8 text-center">
                  <ImageIcon className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">Nog geen afbeeldingen</p>
                  <Link href="/editor/images" className="text-xs text-primary hover:underline mt-1 block">
                    Afbeeldingen uploaden
                  </Link>
                </div>
              ) : (
                images.map((img) => (
                  <SidebarImageCard
                    key={img.url}
                    name={img.name}
                    url={img.url}
                    previewUrl={img.previewUrl}
                    isDragging={draggingImage === img.url}
                    onDragStart={handleImageDragStart}
                    onDragEnd={handleImageDragEnd}
                  />
                ))
              )}
            </div>
          )}
        </aside>

        {/* Main services canvas */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {services.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-24 gap-4">
              <div className="rounded-full bg-primary/10 p-6">
                <Briefcase className="h-10 w-10 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground text-lg">{offeringCopy.emptyTitle}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {offeringCopy.emptyDescription}
                </p>
              </div>
              <Button onClick={handleCreateService} disabled={isSaving} className="mt-2">
                <Plus className="mr-2 h-4 w-4" />
                Eerste {offeringCopy.singular} toevoegen
              </Button>
            </div>
          ) : (
            <div className="grid gap-5 grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 max-w-7xl mx-auto">
              {services.map((service) => (
                <ServiceCard
                  key={service.id}
                  service={service}
                  onUpdate={handleUpdateService}
                  onDelete={handleDeleteService}
                  isSaving={isSaving}
                  offeringCopy={offeringCopy}
                  planningCopy={planningCopy}
                  upcomingEntries={upcomingEntriesByService.get(service.id) ?? []}
                  calendarUnavailable={calendarUnavailable}
                  isAccommodation={isAccommodation}
                  bookingSettings={bookingSettings.find((settings) => settings.service_id === service.id)
                    ?? createDefaultServiceBookingSettings(service.id, businessId, isAccommodation ? "stay" : "appointment")}
                  availabilityPreview={initialAvailabilityPreviews[service.id]}
                  bookingSettingsUnavailable={bookingSettingsUnavailable}
                  onUpdateBookingSettings={handleUpdateBookingSettings}
                />
              ))}

              {/* Add service card */}
              <button
                type="button"
                onClick={handleCreateService}
                disabled={isSaving}
                className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border/60 hover:border-primary/50 hover:bg-primary/5 transition-all duration-200 min-h-[200px] text-muted-foreground hover:text-primary group disabled:opacity-50"
              >
                <div className="rounded-full bg-muted group-hover:bg-primary/10 p-3 transition-colors">
                  <Plus className="h-6 w-6" />
                </div>
                <span className="text-sm font-medium">Nog een {offeringCopy.singular} toevoegen</span>
              </button>
            </div>
          )}
        </main>
      </div>
    </EditorPageShell>
  )
}
