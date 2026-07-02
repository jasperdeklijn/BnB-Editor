"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import Link from "next/link"
import {
  AlignCenter,
  Check,
  Columns,
  Eye,
  ImageIcon,
  Maximize,
  Minimize,
  Palette,
  PanelRight,
  Square,
  Trash2,
  Type,
  Wand2,
  X,
} from "lucide-react"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { getSectionDefinition } from "@/components/editor/section-registry"
import { getSectionEditor } from "@/components/editor/section-editor-registry"
import { SectionRenderer } from "@/components/editor/section-renderer"
import type { SectionTargetOption } from "@/components/editor/section-editor-types"
import { useEditorLayout } from "@/components/editor/editor-layout-context"
import type { BusinessCategory } from "@/lib/business/categories"
import type { Section, SectionStyles, SectionType, Transition } from "@/lib/types"
import { getSectionLayoutOptions, normalizeSectionLayout, type SectionLayout } from "@/lib/section-layouts"
import { createClient } from "@/lib/supabase/client"
import websiteSections from "@/lib/supabase/websiteSections"

interface SelectionEditorProps {
  selectedSection: Section | null
  sections: Section[]
  transitions: Transition[]
  onSectionSelect?: (id: string) => void
  onOpenCanvas?: () => void
  onUpdate: (id: string, data: Record<string, unknown>) => void
  onStyleUpdate: (styles: SectionStyles) => void
  onDelete: (id: string) => void
  onTransitionUpdate: (fromSectionId: string, toSectionId: string, transitionType: string) => void
  websiteId?: string | null
  businessId?: string | null
  businessCategory?: BusinessCategory | null
}

type StyleControl = keyof Pick<SectionStyles, "fontFamily" | "backgroundColor" | "textColor" | "backgroundImage">

const DEFAULT_STYLE_CONTROLS: StyleControl[] = ["fontFamily", "backgroundColor", "textColor", "backgroundImage"]

const FONT_OPTIONS = [
  { label: "Standaard lettertype", value: "" },
  { label: "Rustig en modern", value: "font-sans" },
  { label: "Klassiek", value: "font-serif" },
  { label: "Strak technisch", value: "font-mono" },
]

const SECTION_STYLE_CONTROLS: Partial<Record<SectionType, StyleControl[]>> = {
  nav: ["backgroundColor", "textColor"],
  footer: ["backgroundColor", "textColor"],
}

const SECTION_TARGET_LABELS: Record<SectionType, string> = {
  hero: "Home",
  about: "Over",
  services: "Aanbod",
  gallery: "Galerij",
  features: "Kenmerken",
  contact: "Contact",
  nav: "Navigatie",
  footer: "Footer",
  testimonials: "Recensies",
  faq: "FAQ",
  opening_hours: "Openingstijden",
  pricing: "Tarieven",
  map: "Locatie",
  cta: "Actie",
  request_form: "Aanvraag",
}

const SECTION_TARGET_TYPES: SectionType[] = [
  "hero",
  "about",
  "services",
  "gallery",
  "features",
  "contact",
  "testimonials",
  "faq",
  "opening_hours",
  "pricing",
  "map",
  "cta",
  "request_form",
]

function getLayoutIcon(layout: SectionLayout) {
  switch (layout) {
    case "split":
      return Columns
    case "showcase":
      return Maximize
    case "compact":
      return Minimize
    case "card":
      return Square
    case "banner":
      return PanelRight
    case "classic":
    default:
      return AlignCenter
  }
}

function getSectionStyleControls(type: SectionType): StyleControl[] {
  return SECTION_STYLE_CONTROLS[type] ?? DEFAULT_STYLE_CONTROLS
}

function getSectionTargetLabel(section: Section) {
  const defaultLabel = SECTION_TARGET_LABELS[section.type]
  const title = typeof section.data?.title === "string" ? section.data.title.trim() : ""

  if (!title || title.toLowerCase() === defaultLabel.toLowerCase()) {
    return defaultLabel
  }

  return `${title} (${defaultLabel})`
}

export function SelectionEditor({
  selectedSection,
  sections,
  transitions,
  onSectionSelect,
  onOpenCanvas,
  onUpdate,
  onStyleUpdate,
  onDelete,
  onTransitionUpdate,
  websiteId,
  businessId,
  businessCategory,
}: SelectionEditorProps) {
  const [saveTimeoutId, setSaveTimeoutId] = useState<NodeJS.Timeout | null>(null)
  const [layoutDialogOpen, setLayoutDialogOpen] = useState(false)
  const { setIsSaving, setSaveState } = useEditorLayout()

  useEffect(() => {
    return () => {
      if (saveTimeoutId) clearTimeout(saveTimeoutId)
    }
  }, [saveTimeoutId])

  if (!selectedSection) {
    return (
      <div className="h-full min-h-0 w-full overflow-hidden border-border bg-[var(--editor-panel)] p-4 md:border-l md:p-6">
        <div className="flex h-full min-h-0 flex-col">
          <div className="mx-auto flex max-w-sm flex-col items-center text-center">
            <div className="mb-4 rounded-full bg-primary/10 p-4">
              <Wand2 className="h-8 w-8 text-primary" />
            </div>
            <p className="text-sm font-semibold text-foreground">Kies een sectie om te bewerken</p>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Selecteer hieronder een blok van uw pagina, of ga terug naar het doek en tik op het blok zelf.
            </p>
          </div>

          {sections.length > 0 ? (
            <div className="mt-5 min-h-0 flex-1 overflow-y-auto pr-1">
              <div className="space-y-2">
                {sections.map((section, index) => {
                  const label = getSectionTargetLabel(section)

                  return (
                    <button
                      key={section.id}
                      type="button"
                      onClick={() => onSectionSelect?.(section.id)}
                      className="flex w-full items-center justify-between gap-3 rounded-md border border-border bg-background px-3 py-3 text-left text-sm shadow-sm transition-colors hover:border-primary/60 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-foreground">
                          {index + 1}. {label}
                        </span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">Tekst en uiterlijk aanpassen</span>
                      </span>
                      <span className="shrink-0 rounded-full bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary">
                        Kies
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="mt-5 rounded-md border border-dashed border-border bg-background/60 p-4 text-center text-sm text-muted-foreground">
              Voeg eerst een sectie toe voordat u de stijl kunt aanpassen.
            </div>
          )}

          {onOpenCanvas ? (
            <Button type="button" variant="outline" className="mt-4 w-full" onClick={onOpenCanvas}>
              Op doek kiezen
            </Button>
          ) : null}
        </div>
      </div>
    )
  }

  const saveToDatabase = async (updatedData: Record<string, unknown>) => {
    if (!websiteId || selectedSection.id.startsWith("section-")) return

    setIsSaving(true)
    try {
      const supabase = createClient()
      const payload = {
        type: selectedSection.type,
        content: updatedData,
        styles: selectedSection.styles ?? {},
        position: sections.findIndex((section) => section.id === selectedSection.id) + 1,
      }

      await websiteSections.updateSection(selectedSection.id, payload as any, supabase)
    } catch (err) {
      console.error("Error saving to database:", err)
      setSaveState("error")
    } finally {
      setIsSaving(false)
    }
  }

  const saveStylesToDatabase = async (styles: SectionStyles) => {
    if (!websiteId || selectedSection.id.startsWith("section-")) return

    setIsSaving(true)
    try {
      const supabase = createClient()
      const payload = {
        type: selectedSection.type,
        content: selectedSection.data ?? {},
        styles,
        position: sections.findIndex((section) => section.id === selectedSection.id) + 1,
      }

      await websiteSections.updateSection(selectedSection.id, payload as any, supabase)
    } catch (err) {
      console.error("Error saving styles to database:", err)
      setSaveState("error")
    } finally {
      setIsSaving(false)
    }
  }

  const queueSave = (updatedData: Record<string, unknown>) => {
    if (saveTimeoutId) clearTimeout(saveTimeoutId)
    const timeout = setTimeout(async () => {
      await saveToDatabase(updatedData)
    }, 800)
    setSaveTimeoutId(timeout)
  }

  const updateField = (field: string, value: any) => {
    onUpdate(selectedSection.id, { [field]: value })
    queueSave({ ...selectedSection.data, [field]: value })
  }

  const updateFields = (values: Record<string, unknown>) => {
    onUpdate(selectedSection.id, values)
    queueSave({ ...selectedSection.data, ...values })
  }

  const updateListItemField = (field: string, index: number, key: string, value: unknown, fallback: any[] = []) => {
    const current = Array.isArray((selectedSection.data as any)[field])
      ? ([...((selectedSection.data as any)[field] as any[])])
      : [...fallback]
    current[index] = { ...(current[index] ?? {}), [key]: value }
    updateField(field, current)
  }

  const updateNestedListItemField = (
    field: string,
    index: number,
    nestedField: string,
    nestedIndex: number,
    value: unknown,
    fallback: any[] = [],
  ) => {
    const current = Array.isArray((selectedSection.data as any)[field])
      ? ([...((selectedSection.data as any)[field] as any[])])
      : [...fallback]
    const item = { ...(current[index] ?? {}) }
    const nested = Array.isArray(item[nestedField]) ? [...item[nestedField]] : []
    nested[nestedIndex] = value
    item[nestedField] = nested
    current[index] = item
    updateField(field, current)
  }

  const updateStringListItem = (field: string, index: number, value: string, fallback: string[] = []) => {
    const current = Array.isArray((selectedSection.data as any)[field])
      ? ([...((selectedSection.data as any)[field] as string[])])
      : [...fallback]
    current[index] = value
    updateField(field, current)
  }

  const handleTransitionChange = (newType: string) => {
    const nextSectionIdx = sections.findIndex((section) => section.id === selectedSection.id) + 1

    if (nextSectionIdx >= 0 && nextSectionIdx < sections.length) {
      const nextSection = sections[nextSectionIdx]
      onTransitionUpdate(selectedSection.id, nextSection.id, newType)

      if (saveTimeoutId) clearTimeout(saveTimeoutId)
      const timeout = setTimeout(() => {
        setIsSaving(false)
      }, 800)
      setSaveTimeoutId(timeout)
    }
  }

  const selectedLayout = normalizeSectionLayout((selectedSection.data as any).layout)
  const selectedSectionLabel = getSectionDefinition(selectedSection.type)?.label ?? selectedSection.type.replace("_", " ")
  const layoutOptions = getSectionLayoutOptions(selectedSection.type)
  const selectedLayoutOption = layoutOptions.find((option) => option.value === selectedLayout) ?? layoutOptions[0]
  const LayoutIcon = getLayoutIcon(selectedLayout)
  const supportedStyleControls = getSectionStyleControls(selectedSection.type)
  const supportsStyleControl = (control: StyleControl) => supportedStyleControls.includes(control)
  const SectionSpecificEditor = getSectionEditor(selectedSection.type)
  const sectionTargetOptions: SectionTargetOption[] = sections
    .filter((section) => section.id !== selectedSection.id && SECTION_TARGET_TYPES.includes(section.type))
    .map((section) => ({
      label: getSectionTargetLabel(section),
      value: `#section-${section.id}`,
    }))

  const updateStyleValue = (key: StyleControl, value: string) => {
    const newStyles = { ...(selectedSection.styles || {}) }

    if (value) {
      newStyles[key] = value
    } else {
      delete newStyles[key]
    }

    onStyleUpdate(newStyles)
    if (saveTimeoutId) clearTimeout(saveTimeoutId)
    const timeout = setTimeout(async () => {
      await saveStylesToDatabase(newStyles)
    }, 800)
    setSaveTimeoutId(timeout)
  }

  return (
    <div className="h-full min-h-0 w-full overflow-y-auto overscroll-contain border-border bg-[var(--editor-panel)] p-4 md:border-l md:p-6 animate-in slide-in-from-right duration-300">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="rounded-md bg-primary/15 p-1.5 text-primary">
              <Type className="h-4 w-4" />
            </div>
            <h2 className="text-lg font-semibold">{selectedSectionLabel}</h2>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-destructive hover:bg-destructive/10 transition-all hover:scale-110"
                aria-label={`${selectedSectionLabel} verwijderen`}
                title={`${selectedSectionLabel} verwijderen`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent size="sm">
              <AlertDialogHeader>
                <AlertDialogTitle>Sectie verwijderen?</AlertDialogTitle>
                <AlertDialogDescription>
                  Weet je zeker dat je deze sectie wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuleren</AlertDialogCancel>
                <AlertDialogAction variant="destructive" onClick={() => onDelete(selectedSection.id)}>
                  Verwijderen
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
        <p className="text-xs text-muted-foreground">Pas de tekst en het uiterlijk van dit blok aan.</p>
      </div>

      <div className="space-y-4">
        <Card className="p-4 space-y-3">
          <Label className="flex items-center gap-2">
            <Type className="h-3.5 w-3.5" />
            Indeling
          </Label>
          <button
            type="button"
            onClick={() => setLayoutDialogOpen(true)}
            className="flex w-full items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-left text-sm transition-colors hover:border-primary/60 hover:bg-accent"
          >
            <span className="flex min-w-0 items-center gap-2">
              <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                <LayoutIcon className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block truncate font-medium">{selectedLayoutOption.label}</span>
                <span className="block text-xs text-muted-foreground">Bekijk voorbeelden</span>
              </span>
            </span>
            <Eye className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
          </button>
        </Card>

        {layoutDialogOpen && typeof document !== "undefined"
          ? createPortal(
              <div className="fixed inset-0 z-[1000] bg-black/50 p-3 md:p-6" onClick={() => setLayoutDialogOpen(false)}>
                <div
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="layout-dialog-title"
                  className="mx-auto flex h-full max-w-6xl flex-col overflow-hidden rounded-lg border border-border bg-background shadow-2xl"
                  onClick={(event) => event.stopPropagation()}
                >
                  <div className="flex items-center justify-between border-b border-border px-4 py-3">
                    <div>
                      <h3 id="layout-dialog-title" className="text-sm font-semibold">
                        Indeling kiezen
                      </h3>
                      <p className="text-xs text-muted-foreground">{selectedSectionLabel}</p>
                    </div>
                    <Button type="button" variant="ghost" size="icon-sm" onClick={() => setLayoutDialogOpen(false)} aria-label="Sluiten">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  <ScrollArea className="min-h-0 flex-1">
                    <div className="grid gap-4 p-4 md:grid-cols-2">
                      {layoutOptions.map((option) => {
                        const isActive = selectedLayout === option.value
                        const OptionIcon = getLayoutIcon(option.value)
                        const previewSection = {
                          ...selectedSection,
                          data: {
                            ...selectedSection.data,
                            layout: option.value,
                          },
                        }

                        return (
                          <div
                            key={option.value}
                            className={`overflow-hidden rounded-lg border bg-white text-left transition-all hover:border-primary/70 hover:shadow-md ${
                              isActive ? "border-primary ring-2 ring-ring/30" : "border-border"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-3 border-b border-border px-3 py-2">
                              <span className="flex min-w-0 items-center gap-2">
                                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                                  <OptionIcon className="h-4 w-4" />
                                </span>
                                <span className="truncate text-sm font-semibold">{option.label}</span>
                              </span>
                              <Button
                                type="button"
                                size="sm"
                                variant={isActive ? "default" : "outline"}
                                className="h-8 flex-shrink-0"
                                onClick={() => {
                                  updateField("layout", option.value)
                                  setLayoutDialogOpen(false)
                                }}
                              >
                                {isActive ? (
                                  <>
                                    <Check className="h-3.5 w-3.5" />
                                    Actief
                                  </>
                                ) : (
                                  "Kies"
                                )}
                              </Button>
                            </div>
                            <div className="h-56 overflow-hidden bg-muted/40">
                              <div className="pointer-events-none w-[285%] origin-top-left scale-[0.35]">
                                <SectionRenderer
                                  section={previewSection}
                                  isPreview
                                  wrapTransition={false}
                                  allSections={sections}
                                  device="desktop"
                                />
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </ScrollArea>
                </div>
              </div>,
              document.body,
            )
          : null}

        <SectionSpecificEditor
          section={selectedSection}
          sections={sections}
          transitions={transitions}
          websiteId={websiteId}
          businessId={businessId}
          businessCategory={businessCategory}
          sectionTargetOptions={sectionTargetOptions}
          updateField={updateField}
          updateFields={updateFields}
          updateListItemField={updateListItemField}
          updateNestedListItemField={updateNestedListItemField}
          updateStringListItem={updateStringListItem}
        />

        <Card className="p-4 space-y-3">
          <Label className="flex items-center gap-2">
            <Palette className="h-3.5 w-3.5" />
            Uiterlijk
          </Label>
          <div className="space-y-3">
            {supportsStyleControl("fontFamily") ? (
              <div>
                <Label className="mb-2 text-xs">Lettertype</Label>
                <select
                  value={selectedSection.styles?.fontFamily || ""}
                  onChange={(event) => updateStyleValue("fontFamily", event.target.value)}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
                >
                  {FONT_OPTIONS.map((option) => (
                    <option key={option.value || "default"} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            {supportsStyleControl("backgroundColor") || supportsStyleControl("textColor") ? (
              <div className="flex gap-3">
                {supportsStyleControl("backgroundColor") ? (
                  <div className="flex-1">
                    <Label className="mb-2 flex items-center gap-1 text-xs">
                      <div className="h-3 w-3 rounded border bg-muted" />
                      Achtergrondkleur
                    </Label>
                    <input
                      type="color"
                      aria-label="Achtergrondkleur"
                      value={selectedSection.styles?.backgroundColor || "#ffffff"}
                      onChange={(event) => updateStyleValue("backgroundColor", event.target.value)}
                      className="h-9 w-full cursor-pointer rounded border"
                    />
                  </div>
                ) : null}
                {supportsStyleControl("textColor") ? (
                  <div className="flex-1">
                    <Label className="mb-2 flex items-center gap-1 text-xs">
                      <Type className="h-3 w-3" />
                      Tekstkleur
                    </Label>
                    <input
                      type="color"
                      aria-label="Tekstkleur"
                      value={selectedSection.styles?.textColor || "#000000"}
                      onChange={(event) => updateStyleValue("textColor", event.target.value)}
                      className="h-9 w-full cursor-pointer rounded border"
                    />
                  </div>
                ) : null}
              </div>
            ) : null}

            {supportsStyleControl("backgroundImage") ? (
              <div>
                <Label className="mb-2 flex items-center gap-1 text-xs">
                  <ImageIcon className="h-3 w-3" />
                  Afbeelding als achtergrond
                </Label>
                <div className="flex gap-2">
                  <Input
                    aria-label="Link naar achtergrondafbeelding"
                    placeholder="Plak een afbeeldingslink"
                    value={selectedSection.styles?.backgroundImage || ""}
                    onChange={(event) => updateStyleValue("backgroundImage", event.target.value)}
                  />
                  {selectedSection.styles?.backgroundImage ? (
                    <Button type="button" variant="outline" size="sm" className="h-10 shrink-0" onClick={() => updateStyleValue("backgroundImage", "")}>
                      Wis
                    </Button>
                  ) : null}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>Gebruik een afbeeldingslink of kies eerst een afbeelding uit de beeldbank.</span>
                  <Button variant="outline" size="xs" asChild>
                    <Link href="/editor/images">Afbeeldingen openen</Link>
                  </Button>
                </div>
              </div>
            ) : null}

            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Beschikbare uiterlijkopties voor {selectedSectionLabel}.
            </p>
          </div>
        </Card>

        {sections.length > 1 && sections.findIndex((section) => section.id === selectedSection.id) < sections.length - 1 ? (
          <Card className="p-4 space-y-3">
            <Label className="flex items-center gap-2">
              <Wand2 className="h-3.5 w-3.5" />
              Overgang naar volgende sectie
            </Label>
            <p className="text-xs text-muted-foreground mb-2">
              Selecteer hoe deze sectie overgaat naar de volgende
            </p>
            {(() => {
              const nextSectionIdx = sections.findIndex((section) => section.id === selectedSection.id) + 1
              const nextSection = nextSectionIdx < sections.length ? sections[nextSectionIdx] : null
              const currentTransition = nextSection
                ? transitions.find(
                    (transition) =>
                      transition.fromSectionId === selectedSection.id &&
                      transition.toSectionId === nextSection.id,
                  )
                : null
              const currentType = currentTransition?.type || "none"

              return (
                <>
                  <select
                    value={currentType}
                    onChange={(event) => handleTransitionChange(event.target.value)}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm transition-colors hover:bg-accent"
                  >
                    <option value="none">Geen</option>
                    <option value="fade">Vervagen</option>
                    <option value="gradient">Verloop</option>
                    <option value="slide">Schuiven</option>
                    <option value="wave">Golf</option>
                    <option value="curve">Kromme</option>
                    <option value="diagonal">Diagonaal</option>
                    <option value="zigzag">Zigzag</option>
                    <option value="split">Splitsen</option>
                  </select>
                  {currentType !== "none" ? (
                    <div className="mt-3 p-2 rounded bg-muted border border-border">
                      <p className="text-xs text-muted-foreground">
                        Voorvertoning: Controleer het editorcanvas om de {currentType} overgang te zien
                      </p>
                    </div>
                  ) : null}
                </>
              )
            })()}
          </Card>
        ) : null}
      </div>
    </div>
  )
}
