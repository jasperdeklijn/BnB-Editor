"use client"

import { useEffect, useMemo, useState } from "react"
import { CheckCircle2, ChevronDown, Languages, Layers3, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { getSectionDefinition } from "@/components/editor/section-registry"
import { SECTION_TRANSLATABLE_FIELDS, applySectionTranslation, extractTranslatableValues, getSectionTranslationStatus, getTranslationSourceHash } from "@/lib/i18n/section-translations"
import type { WebsiteLocale } from "@/lib/i18n/locales"
import type { Section } from "@/lib/types"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"

interface SectionTranslationPanelProps {
  sections: Section[]
  selectedSectionId: string | null
  locale: WebsiteLocale
  businessId?: string | null
  translations: Map<string, { values: Record<string, unknown>; sourceHash: string }>
  onSectionSelect: (sectionId: string) => void
  onSave: (section: Section, values: Record<string, unknown>) => Promise<void>
  onSharedSaved?: () => Promise<void>
  className?: string
}

function toInputValue(value: unknown) {
  if (typeof value === "string") return value
  if (value === undefined || value === null) return ""
  return JSON.stringify(value, null, 2)
}

const STRUCTURED_FIELD_LABELS: Record<string, string> = {
  answer: "Antwoord",
  bio: "Beschrijving",
  category: "Categorie",
  ctaText: "Knoptekst",
  description: "Beschrijving",
  features: "Kenmerken",
  label: "Tekst",
  links: "Links",
  name: "Naam",
  period: "Periode",
  question: "Vraag",
  quote: "Recensie",
  role: "Functie",
  text: "Tekst",
  title: "Titel",
}

function emptyStructuredValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(emptyStructuredValue)
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
      key,
      key === "id" || key === "sectionId" ? entry : emptyStructuredValue(entry),
    ]))
  }
  return typeof value === "string" ? "" : value
}

function parseStructuredDraft(value: string, sourceValue: unknown) {
  if (!value.trim()) return emptyStructuredValue(sourceValue)
  try {
    return JSON.parse(value) as unknown
  } catch {
    return emptyStructuredValue(sourceValue)
  }
}

function updateStructuredPath(current: unknown, path: Array<string | number>, value: string): unknown {
  if (path.length === 0) return value
  const [head, ...tail] = path
  if (Array.isArray(current) && typeof head === "number") {
    const next = [...current]
    next[head] = updateStructuredPath(next[head], tail, value)
    return next
  }
  if (current && typeof current === "object" && typeof head === "string") {
    const next = { ...(current as Record<string, unknown>) }
    next[head] = updateStructuredPath(next[head], tail, value)
    return next
  }
  return current
}

function StructuredTranslationEditor({ sourceValue, value, onChange }: {
  sourceValue: unknown
  value: string
  onChange: (value: string) => void
}) {
  const translatedValue = parseStructuredDraft(value, sourceValue)

  const updateText = (path: Array<string | number>, nextValue: string) => {
    onChange(JSON.stringify(updateStructuredPath(translatedValue, path, nextValue), null, 2))
  }

  const renderItems = (source: unknown[], translated: unknown[], path: Array<string | number>) => (
    <div className="space-y-3">
      {source.map((sourceEntry, index) => {
        if (!sourceEntry || typeof sourceEntry !== "object") return null
        const sourceItem = sourceEntry as Record<string, unknown>
        const translatedEntry = translated[index]
        const translatedItem = translatedEntry && typeof translatedEntry === "object"
          ? translatedEntry as Record<string, unknown>
          : {}
        const context = [sourceItem.question, sourceItem.name, sourceItem.title, sourceItem.label, sourceItem.text]
          .find((entry) => typeof entry === "string" && entry.trim())

        return (
          <div key={String(sourceItem.id ?? sourceItem.sectionId ?? index)} className="rounded-lg border border-border bg-muted/20 p-3">
            <p className="mb-3 text-xs font-semibold text-muted-foreground">
              {typeof context === "string" ? context : `Onderdeel ${index + 1}`}
            </p>
            <div className="space-y-3">
              {Object.entries(sourceItem).map(([key, sourceText]) => {
                if (key === "id" || key === "sectionId") return null
                if (Array.isArray(sourceText)) {
                  return (
                    <div key={key}>
                      <p className="mb-2 text-xs font-semibold">{STRUCTURED_FIELD_LABELS[key] ?? "Onderdelen"}</p>
                      {renderItems(sourceText, Array.isArray(translatedItem[key]) ? translatedItem[key] as unknown[] : [], [...path, index, key])}
                    </div>
                  )
                }
                if (typeof sourceText !== "string") return null
                const translatedText = typeof translatedItem[key] === "string" ? translatedItem[key] as string : ""
                const multiline = ["answer", "bio", "description", "quote"].includes(key)
                return (
                  <label key={key} className="block text-xs font-medium">
                    {STRUCTURED_FIELD_LABELS[key] ?? "Tekst"}
                    <span className="mt-0.5 block font-normal text-muted-foreground">Bron: {sourceText}</span>
                    {multiline ? (
                      <textarea
                        value={translatedText}
                        onChange={(event) => updateText([...path, index, key], event.target.value)}
                        rows={3}
                        className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-normal"
                      />
                    ) : (
                      <input
                        value={translatedText}
                        onChange={(event) => updateText([...path, index, key], event.target.value)}
                        className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm font-normal"
                      />
                    )}
                  </label>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )

  if (!Array.isArray(sourceValue)) return null
  return renderItems(sourceValue, Array.isArray(translatedValue) ? translatedValue : [], [])
}

export function SectionTranslationPanel({
  sections,
  selectedSectionId,
  locale,
  businessId,
  translations,
  onSectionSelect,
  onSave,
  onSharedSaved,
  className,
}: SectionTranslationPanelProps) {
  const selectedSection = sections.find((section) => section.id === selectedSectionId) ?? sections[0] ?? null
  const stored = selectedSection ? translations.get(`${selectedSection.id}:${locale.locale}`) : undefined
  const [drafts, setDrafts] = useState<Record<string, Record<string, string>>>({})
  const [saving, setSaving] = useState(false)
  const [business, setBusiness] = useState<{ name: string; description: string; opening_note: string } | null>(null)
  const [services, setServices] = useState<Array<{ id: string; title: string; description: string }>>([])
  const [sharedDraft, setSharedDraft] = useState({ name: "", description: "", opening_note: "" })
  const [serviceDrafts, setServiceDrafts] = useState<Record<string, { title: string; description: string }>>({})
  const [savingShared, setSavingShared] = useState(false)

  useEffect(() => {
    if (!businessId) return
    const client = createClient()
    void Promise.all([
      client.from("businesses").select("name, description, opening_note").eq("id", businessId).maybeSingle(),
      client.from("services").select("id, title, description").eq("business_id", businessId).order("position"),
      client.from("business_translations").select("name, description, opening_note").eq("business_id", businessId).eq("locale", locale.locale).maybeSingle(),
    ]).then(async ([businessResult, servicesResult, translationResult]) => {
      const nextBusiness = businessResult.data ?? null
      const nextServices = servicesResult.data ?? []
      setBusiness(nextBusiness)
      setServices(nextServices)
      setSharedDraft({
        name: translationResult.data?.name ?? "",
        description: translationResult.data?.description ?? "",
        opening_note: translationResult.data?.opening_note ?? "",
      })
      if (nextServices.length === 0) return setServiceDrafts({})
      const { data } = await client
        .from("service_translations")
        .select("service_id, title, description")
        .in("service_id", nextServices.map((service) => service.id))
        .eq("locale", locale.locale)
      setServiceDrafts(Object.fromEntries((data ?? []).map((entry) => [entry.service_id, {
        title: entry.title ?? "",
        description: entry.description ?? "",
      }])))
    })
  }, [businessId, locale.locale])

  const saveSharedContent = async () => {
    if (!businessId || !business) return
    setSavingShared(true)
    const client = createClient()
    try {
      const { error: businessError } = await client.from("business_translations").upsert({
        business_id: businessId,
        locale: locale.locale,
        ...sharedDraft,
        source_hash: getTranslationSourceHash(business),
      }, { onConflict: "business_id,locale" })
      if (businessError) throw businessError
      const serviceRows = services.map((service) => ({
        service_id: service.id,
        locale: locale.locale,
        title: serviceDrafts[service.id]?.title ?? "",
        description: serviceDrafts[service.id]?.description ?? "",
        source_hash: getTranslationSourceHash({ title: service.title, description: service.description }),
      }))
      if (serviceRows.length > 0) {
        const { error } = await client.from("service_translations").upsert(serviceRows, { onConflict: "service_id,locale" })
        if (error) throw error
      }
      toast.success("Gedeelde vertalingen opgeslagen")
      await onSharedSaved?.()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Vertalingen opslaan is mislukt")
    } finally {
      setSavingShared(false)
    }
  }
  const draftKey = selectedSection ? `${selectedSection.id}:${locale.locale}` : ""
  const fields = useMemo(
    () => selectedSection ? SECTION_TRANSLATABLE_FIELDS[selectedSection.type] : [],
    [selectedSection],
  )
  const sourceValues = useMemo(
    () => selectedSection ? extractTranslatableValues(selectedSection.type, selectedSection.data) : {},
    [selectedSection],
  )
  const storedValues = useMemo(
    () => selectedSection && stored
      ? extractTranslatableValues(selectedSection.type, applySectionTranslation(selectedSection, stored.values).data)
      : {},
    [selectedSection, stored],
  )
  const values = useMemo(() => {
    if (!selectedSection) return {}
    return Object.fromEntries(fields.map((field) => [
      field.key,
      drafts[draftKey]?.[field.key] ?? toInputValue(storedValues[field.key]),
    ]))
  }, [draftKey, drafts, fields, selectedSection, storedValues])
  const status = selectedSection
    ? getSectionTranslationStatus(selectedSection, stored?.values, stored?.sourceHash)
    : null

  const updateDraft = (key: string, value: string) => {
    setDrafts((current) => ({ ...current, [draftKey]: { ...current[draftKey], [key]: value } }))
  }

  const save = async () => {
    if (!selectedSection) return
    const parsed: Record<string, unknown> = {}
    try {
      for (const field of fields) {
        const raw = values[field.key] ?? ""
        const sourceValue = sourceValues[field.key]
        if (Array.isArray(sourceValue) || (sourceValue && typeof sourceValue === "object")) {
          parsed[field.key] = raw.trim() ? JSON.parse(raw) : []
        } else {
          parsed[field.key] = raw
        }
      }
    } catch {
      toast.error("Controleer de teksten in de herhalende onderdelen.")
      return
    }
    setSaving(true)
    try {
      await onSave(selectedSection, parsed)
      setDrafts((current) => {
        const next = { ...current }
        delete next[draftKey]
        return next
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <aside className={className}>
      <div className="border-b border-border p-4">
        <div className="flex items-center gap-2">
          <Languages className="h-4 w-4 text-primary" />
          <h2 className="font-semibold">Vertalen naar {locale.display_name}</h2>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">Opmaak, afbeeldingen en links blijven voor alle talen gelijk.</p>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {business ? (
          <details className="mb-5 rounded-lg border border-border p-3" open>
            <summary className="cursor-pointer text-sm font-semibold">Bedrijf en diensten</summary>
            <p className="mt-1 text-xs text-muted-foreground">Deze teksten worden gedeeld door gegevensgestuurde secties.</p>
            <div className="mt-3 space-y-3">
              {(["name", "description", "opening_note"] as const).map((field) => (
                <div key={field}>
                  <label className="text-xs font-medium">{field === "name" ? "Bedrijfsnaam" : field === "description" ? "Bedrijfsomschrijving" : "Notitie openingstijden"}</label>
                  <p className="line-clamp-2 text-xs text-muted-foreground">Bron: {business[field]}</p>
                  <textarea
                    value={sharedDraft[field]}
                    onChange={(event) => setSharedDraft((current) => ({ ...current, [field]: event.target.value }))}
                    rows={field === "description" ? 3 : 2}
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
              ))}
              {services.map((service) => (
                <div key={service.id} className="rounded-md bg-muted/50 p-2">
                  <p className="text-xs font-semibold">Dienst: {service.title}</p>
                  <input
                    aria-label={`Titel voor ${service.title}`}
                    value={serviceDrafts[service.id]?.title ?? ""}
                    onChange={(event) => setServiceDrafts((current) => ({ ...current, [service.id]: { title: event.target.value, description: current[service.id]?.description ?? "" } }))}
                    placeholder="Vertaalde titel"
                    className="mt-2 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  />
                  <textarea
                    aria-label={`Beschrijving voor ${service.title}`}
                    value={serviceDrafts[service.id]?.description ?? ""}
                    onChange={(event) => setServiceDrafts((current) => ({ ...current, [service.id]: { title: current[service.id]?.title ?? "", description: event.target.value } }))}
                    placeholder="Vertaalde beschrijving"
                    rows={2}
                    className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
              ))}
              <Button type="button" variant="outline" className="w-full" disabled={savingShared} onClick={() => void saveSharedContent()}>
                {savingShared ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Bedrijf en diensten opslaan
              </Button>
            </div>
          </details>
        ) : null}
        <label htmlFor="translation-section" className="text-xs font-semibold text-muted-foreground">Sectie</label>
        <div className="group relative mt-1">
          <Layers3 className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-primary" />
          <select
            id="translation-section"
            value={selectedSection?.id ?? ""}
            onChange={(event) => onSectionSelect(event.target.value)}
            className="h-11 w-full cursor-pointer appearance-none rounded-xl border border-input bg-gradient-to-b from-background to-muted/30 py-0 pl-10 pr-10 text-sm font-semibold text-foreground shadow-sm outline-none transition-all hover:border-primary/40 hover:shadow-md focus:border-primary focus:ring-2 focus:ring-primary/20"
          >
            {sections.map((section, index) => (
              <option key={section.id} value={section.id}>{index + 1}. {getSectionDefinition(section.type)?.label ?? "Sectie"}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-transform group-focus-within:rotate-180 group-focus-within:text-primary" />
        </div>

        {selectedSection ? (
          <div className="mt-5 space-y-4">
            <div className={`rounded-md border px-3 py-2 text-xs font-medium ${status?.status === "complete" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-800" : status?.status === "stale" ? "border-amber-500/30 bg-amber-500/10 text-amber-900" : "border-border bg-muted text-muted-foreground"}`}>
              {status?.status === "complete" ? "Vertaling compleet" : status?.status === "stale" ? "Brontekst is gewijzigd" : "Vertaling ontbreekt"}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setDrafts((current) => ({
                ...current,
                [draftKey]: Object.fromEntries(fields.map((field) => [field.key, toInputValue(sourceValues[field.key])])),
              }))}>Kopieer brontekst</Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setDrafts((current) => ({
                ...current,
                [draftKey]: Object.fromEntries(fields.map((field) => [field.key, ""])),
              }))}>Maak velden leeg</Button>
            </div>
            {fields.map((field) => {
              const sourceValue = sourceValues[field.key]
              const structured = Array.isArray(sourceValue) || Boolean(sourceValue && typeof sourceValue === "object")
              return (
                <div key={field.key}>
                  <label htmlFor={`translation-${field.key}`} className="text-sm font-medium">{field.label}{field.required ? " *" : ""}</label>
                  {structured ? (
                    <div className="mt-2">
                      <StructuredTranslationEditor
                        sourceValue={sourceValue}
                        value={values[field.key] ?? ""}
                        onChange={(value) => updateDraft(field.key, value)}
                      />
                    </div>
                  ) : (
                    <>
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">Bron: {toInputValue(sourceValue)}</p>
                      <textarea
                        id={`translation-${field.key}`}
                        value={values[field.key] ?? ""}
                        onChange={(event) => updateDraft(field.key, event.target.value)}
                        rows={3}
                        className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                      />
                    </>
                  )}
                </div>
              )
            })}
            <Button type="button" className="w-full" onClick={() => void save()} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Vertaling opslaan
            </Button>
          </div>
        ) : <p className="mt-6 text-sm text-muted-foreground">Voeg eerst een sectie toe in de standaardtaal.</p>}
      </div>
    </aside>
  )
}
