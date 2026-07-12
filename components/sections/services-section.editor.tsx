"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Briefcase, CalendarDays, Check, ExternalLink, Eye, EyeOff, Loader2 } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"
import { getOfferingCopy, type BusinessCategory } from "@/lib/business/categories"
import type { SectionEditorProps } from "@/components/editor/section-editor-types"
import { TierBadge } from "@/components/editor/tier-badge"
import { planMeetsRequirement } from "@/lib/entitlements"

interface AvailableService {
  id: string
  name: string
  images: string[]
  price: string | null
}

function getBookingSpaceDefaults(category?: BusinessCategory | null) {
  return category === "bnb"
    ? {
        heading: "Boek je verblijf",
        intro: "Kies een accommodatie en stuur een boekingsaanvraag met je gewenste check-in datum.",
        buttonLabel: "Boeking aanvragen",
        successText: "Boekingsaanvraag ontvangen. We nemen zo snel mogelijk contact met je op.",
        helperText: "Je aanvraag wordt als voorlopige boeking in de planning gezet.",
        requestType: "booking_request",
      }
    : {
        heading: "Plan een afspraak",
        intro: "Kies een dienst en stuur een aanvraag met je gewenste datum en tijd.",
        buttonLabel: "Afspraak aanvragen",
        successText: "Aanvraag ontvangen. We nemen zo snel mogelijk contact met je op.",
        helperText: "Je aanvraag wordt als voorlopige afspraak in de planning gezet.",
        requestType: "appointment",
      }
}

export function ServicesSectionEditor({
  section,
  businessId,
  businessCategory,
  sectionTargetOptions,
  updateField,
  updateFields,
  currentPlan,
}: SectionEditorProps) {
  const [availableServices, setAvailableServices] = useState<AvailableService[]>([])
  const [loadingServices, setLoadingServices] = useState(false)
  const offeringCopy = getOfferingCopy(businessCategory)
  const bookingDefaults = getBookingSpaceDefaults(businessCategory)
  const selectedPopupTarget = ((section.data as any).infoPopupCtaHref as string | undefined) || ""
  const hasSelectedPopupTarget =
    !selectedPopupTarget || sectionTargetOptions.some((option) => option.value === selectedPopupTarget)
  const selectedBookingTarget = ((section.data as any).bookingSpaceTargetHref as string | undefined) || ""
  const hasSelectedBookingTarget =
    !selectedBookingTarget || sectionTargetOptions.some((option) => option.value === selectedBookingTarget)

  useEffect(() => {
    let cancelled = false

    async function fetchServices() {
      setLoadingServices(true)
      try {
        const supabase = createClient()
        let resolvedBusinessId: string | null = businessId ?? null

        if (!resolvedBusinessId) {
          const {
            data: { user },
          } = await supabase.auth.getUser()
          if (!user || cancelled) return

          const { data: business } = await supabase
            .from("businesses")
            .select("id")
            .eq("user_id", user.id)
            .order("created_at", { ascending: true })
            .limit(1)
            .maybeSingle()

          if (!business || cancelled) return
          resolvedBusinessId = business.id
        }

        const { data: serviceRows } = await supabase
          .from("services")
          .select("id, title, image_urls, price")
          .eq("business_id", resolvedBusinessId)
          .order("position", { ascending: true })

        if (!cancelled) {
          setAvailableServices(
            (serviceRows ?? []).map((service) => ({
              id: service.id,
              name: service.title,
              images: Array.isArray(service.image_urls) ? service.image_urls : [],
              price: service.price,
            })),
          )
        }
      } finally {
        if (!cancelled) setLoadingServices(false)
      }
    }

    fetchServices()
    return () => {
      cancelled = true
    }
  }, [businessId, section.id])

  const toggleServiceId = (serviceId: string) => {
    const current = ((section.data as any).serviceIds as string[]) ?? []
    const next = current.includes(serviceId)
      ? current.filter((id) => id !== serviceId)
      : [...current, serviceId]
    updateField("serviceIds", next)
  }

  const toggleBookingSpaceServiceId = (serviceId: string) => {
    const current = ((section.data as any).bookingSpaceServiceIds as string[]) ?? []
    const next = current.includes(serviceId)
      ? current.filter((id) => id !== serviceId)
      : [...current, serviceId]
    updateField("bookingSpaceServiceIds", next)
  }

  const renderServiceSelector = (
    field: "serviceIds" | "bookingSpaceServiceIds",
    onToggle: (serviceId: string) => void,
    emptyLabel: string,
  ) => {
    const selectedIds = ((section.data as any)[field] as string[]) ?? []

    if (loadingServices) {
      return (
        <div className="flex items-center justify-center py-5">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )
    }

    if (availableServices.length === 0) {
      return (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border py-5 text-center">
          <Briefcase className="h-7 w-7 text-muted-foreground/40" />
          <p className="text-xs text-muted-foreground">{offeringCopy.emptyTitle}</p>
          <Link
            href="/editor/services"
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <ExternalLink className="h-3 w-3" />
            {offeringCopy.manageLabel}
          </Link>
        </div>
      )
    }

    return (
      <div className="space-y-1.5">
        {availableServices.map((service) => {
          const isExplicitlySelected = selectedIds.includes(service.id)

          return (
            <button
              key={service.id}
              type="button"
              onClick={() => onToggle(service.id)}
              className={`w-full flex items-center gap-3 rounded-lg border p-2.5 text-left transition-all hover:scale-[1.01] ${
                isExplicitlySelected
                  ? "border-primary bg-primary/5"
                  : selectedIds.length === 0
                    ? "border-border bg-muted/30"
                    : "border-border bg-background opacity-50"
              }`}
            >
              <div className="relative h-9 w-9 flex-shrink-0 overflow-hidden rounded-md bg-primary/10">
                {service.images.length > 0 ? (
                  <img src={service.images[0]} alt={service.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Briefcase className="h-4 w-4 text-primary" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium">{service.name}</p>
                {service.price ? <p className="text-[10px] text-muted-foreground">{service.price}</p> : null}
              </div>
              <div
                className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border transition-colors ${
                  isExplicitlySelected ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background"
                }`}
              >
                {isExplicitlySelected ? <Check className="h-3 w-3" /> : null}
              </div>
            </button>
          )
        })}

        {selectedIds.length ? (
          <button
            type="button"
            onClick={() => updateField(field, [])}
            className="w-full rounded-lg border border-dashed border-border py-2 text-xs text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors"
          >
            {emptyLabel}
          </button>
        ) : null}
      </div>
    )
  }

  return (
    <>
      <Card className="p-4 space-y-3">
        <Label className="flex items-center gap-2">
          <Briefcase className="h-3.5 w-3.5" />
          {offeringCopy.title}
        </Label>
        <div>
          <Label className="text-xs mb-1.5 block">Sectietitel</Label>
          <Input
            placeholder={offeringCopy.sectionTitle}
            value={(section.data as any).title || ""}
            onChange={(event) => updateField("title", event.target.value)}
          />
        </div>

        <div className="pt-1 border-t border-border space-y-2">
          <Label className="text-xs">{offeringCopy.title} selecteren</Label>
          <p className="text-xs text-muted-foreground">
            Laat leeg om alle {offeringCopy.plural} te tonen.
          </p>
          {renderServiceSelector("serviceIds", toggleServiceId, "Selectie wissen")}
        </div>
      </Card>

      <Card className="p-4 space-y-3">
        <Label className="flex items-center gap-2">
          <Eye className="h-3.5 w-3.5" />
          Meer info popup
        </Label>
        <p className="text-xs text-muted-foreground">
          De knop op elke kaart opent een popup met de actuele {offeringCopy.singular} en deze instellingen.
        </p>
        <div>
          <Label className="text-xs mb-1.5 block">Knoptekst op kaart</Label>
          <Input
            placeholder="Meer info"
            value={(section.data as any).moreInfoButtonLabel || ""}
            onChange={(event) => updateField("moreInfoButtonLabel", event.target.value)}
          />
        </div>
        <div>
          <Label className="text-xs mb-1.5 block">Label bovenaan popup</Label>
          <Input
            placeholder={offeringCopy.title}
            value={(section.data as any).infoPopupEyebrow || ""}
            onChange={(event) => updateField("infoPopupEyebrow", event.target.value)}
          />
        </div>
        <div>
          <Label className="text-xs mb-1.5 block">Popup titel override</Label>
          <Input
            placeholder={`Laat leeg voor naam van ${offeringCopy.singular}`}
            value={(section.data as any).infoPopupTitle || ""}
            onChange={(event) => updateField("infoPopupTitle", event.target.value)}
          />
        </div>
        <div>
          <Label className="text-xs mb-1.5 block">Intro override</Label>
          <textarea
            placeholder={`Laat leeg voor beschrijving van ${offeringCopy.singular}`}
            value={(section.data as any).infoPopupIntro || ""}
            onChange={(event) => updateField("infoPopupIntro", event.target.value)}
            className="min-h-20 w-full resize-none rounded-lg border border-input bg-background p-2 text-sm shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div>
          <Label className="text-xs mb-1.5 block">Hulptekst</Label>
          <textarea
            placeholder="Neem contact op voor beschikbaarheid, planning en mogelijkheden."
            value={(section.data as any).infoPopupHelperText || ""}
            onChange={(event) => updateField("infoPopupHelperText", event.target.value)}
            className="min-h-16 w-full resize-none rounded-lg border border-input bg-background p-2 text-sm shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs mb-1.5 block">Knoptekst</Label>
            <Input
              placeholder="Aanvragen"
              value={(section.data as any).infoPopupCtaLabel || ""}
              onChange={(event) => updateField("infoPopupCtaLabel", event.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs mb-1.5 block">Knoplink</Label>
            <select
              value={selectedPopupTarget}
              onChange={(event) => updateField("infoPopupCtaHref", event.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
            >
              <option value="">Kies sectie</option>
              {!hasSelectedPopupTarget ? <option value={selectedPopupTarget}>{selectedPopupTarget}</option> : null}
              {sectionTargetOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 pt-1">
          {[
            { key: "infoPopupShowImage", label: "Afbeelding", value: ((section.data as any).infoPopupShowImage as boolean | undefined) ?? true },
            { key: "infoPopupShowPrice", label: "Prijs", value: ((section.data as any).infoPopupShowPrice as boolean | undefined) ?? true },
          ].map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => updateField(option.key, !option.value)}
              className={`flex items-center justify-center gap-2 rounded-lg border p-2 text-xs font-medium transition-colors ${
                option.value ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-muted-foreground hover:border-primary/50"
              }`}
            >
              {option.value ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
              {option.label}
            </button>
          ))}
        </div>
      </Card>

      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <Label className="flex items-center gap-2">
            <CalendarDays className="h-3.5 w-3.5" />
            Boekingsruimte
            <TierBadge plan="gold" />
          </Label>
          <button
            type="button"
            onClick={() => {
              const enabled = !((section.data as any).bookingSpaceEnabled)
              updateFields({
                bookingSpaceEnabled: enabled,
                bookingSpaceRequestType:
                  ((section.data as any).bookingSpaceRequestType as string | undefined) || bookingDefaults.requestType,
              })
            }}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              (section.data as any).bookingSpaceEnabled
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-muted-foreground hover:border-primary/50"
            }`}
          >
            {(section.data as any).bookingSpaceEnabled ? "Aan" : "Uit"}
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          Voeg een compacte aanvraag- of boekingsruimte toe onder deze {offeringCopy.title.toLowerCase()} sectie.
        </p>
        {(section.data as any).bookingSpaceEnabled && !planMeetsRequirement(currentPlan, "gold") ? (
          <p className="rounded-md border border-amber-500/30 bg-amber-500/10 p-2 text-xs text-amber-900">
            De boekingsruimte vereist Gold. Je kunt haar instellen en testen, maar deze versie nog niet live zetten.
          </p>
        ) : null}

        {(section.data as any).bookingSpaceEnabled ? (
          <>
            <div>
              <Label className="text-xs mb-1.5 block">Type aanvraag</Label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: "appointment", label: "Afspraak" },
                  { value: "booking_request", label: "Boeking" },
                ].map((option) => {
                  const active =
                    (((section.data as any).bookingSpaceRequestType as string | undefined) || bookingDefaults.requestType) === option.value
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => updateField("bookingSpaceRequestType", option.value)}
                      className={`rounded-lg border p-2 text-xs font-medium transition-colors ${
                        active ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-muted-foreground hover:border-primary/50"
                      }`}
                    >
                      {option.label}
                    </button>
                  )
                })}
              </div>
            </div>
            <div>
              <Label className="text-xs mb-1.5 block">Weergave</Label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: "inline", label: "Formulier" },
                  { value: "cta", label: "Knop" },
                  { value: "calendar", label: "Kalender" },
                ].map((option) => {
                  const active = (((section.data as any).bookingSpaceMode as string | undefined) || "inline") === option.value
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => updateField("bookingSpaceMode", option.value)}
                      className={`rounded-lg border p-2 text-xs font-medium transition-colors ${
                        active ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-muted-foreground hover:border-primary/50"
                      }`}
                    >
                      {option.label}
                    </button>
                  )
                })}
              </div>
            </div>
            <div>
              <Label className="text-xs mb-1.5 block">Titel</Label>
              <Input
                placeholder={bookingDefaults.heading}
                value={(section.data as any).bookingSpaceHeading || ""}
                onChange={(event) => updateField("bookingSpaceHeading", event.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs mb-1.5 block">Intro</Label>
              <textarea
                placeholder={bookingDefaults.intro}
                value={(section.data as any).bookingSpaceIntro || ""}
                onChange={(event) => updateField("bookingSpaceIntro", event.target.value)}
                className="min-h-16 w-full resize-none rounded-lg border border-input bg-background p-2 text-sm shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs mb-1.5 block">Knoptekst</Label>
                <Input
                  placeholder={bookingDefaults.buttonLabel}
                  value={(section.data as any).bookingSpaceButtonLabel || ""}
                  onChange={(event) => updateField("bookingSpaceButtonLabel", event.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs mb-1.5 block">Succes tekst</Label>
                <Input
                  placeholder={bookingDefaults.successText}
                  value={(section.data as any).bookingSpaceSuccessText || ""}
                  onChange={(event) => updateField("bookingSpaceSuccessText", event.target.value)}
                />
              </div>
            </div>
            <div>
              <Label className="text-xs mb-1.5 block">Hulptekst</Label>
              <textarea
                placeholder={bookingDefaults.helperText}
                value={(section.data as any).bookingSpaceHelperText || ""}
                onChange={(event) => updateField("bookingSpaceHelperText", event.target.value)}
                className="min-h-14 w-full resize-none rounded-lg border border-input bg-background p-2 text-sm shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
            {((section.data as any).bookingSpaceMode as string | undefined) === "cta" ? (
              <div>
                <Label className="text-xs mb-1.5 block">Knopdoel</Label>
                <select
                  value={selectedBookingTarget}
                  onChange={(event) => updateField("bookingSpaceTargetHref", event.target.value)}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">Kies sectie</option>
                  {!hasSelectedBookingTarget ? <option value={selectedBookingTarget}>{selectedBookingTarget}</option> : null}
                  {sectionTargetOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            {availableServices.length > 0 ? (
              <div className="pt-1 border-t border-border space-y-2">
                <Label className="text-xs">{offeringCopy.title} voor boekingsruimte</Label>
                <p className="text-xs text-muted-foreground">
                  Laat leeg om dezelfde {offeringCopy.plural} als de sectie te gebruiken.
                </p>
                {renderServiceSelector("bookingSpaceServiceIds", toggleBookingSpaceServiceId, "Selectie wissen")}
              </div>
            ) : null}
          </>
        ) : null}
      </Card>
    </>
  )
}
