"use client"

import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { SectionEditorProps } from "@/components/editor/section-editor-types"
import type { SectionType } from "@/lib/types"
import { Eye, EyeOff, Navigation, Pin, Type } from "lucide-react"

const navigableSectionTypes: SectionType[] = [
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

const defaultLabels: Record<SectionType, string> = {
  hero: "Home",
  about: "Over",
  services: "Aanbod",
  gallery: "Galerij",
  features: "Kenmerken",
  contact: "Contact",
  nav: "Navigation",
  footer: "Footer",
  testimonials: "Recensies",
  faq: "FAQ",
  opening_hours: "Openingstijden",
  pricing: "Tarieven",
  map: "Locatie",
  cta: "Actie",
  request_form: "Aanvraag",
}

export function NavSectionEditor({ section, sections, updateField }: SectionEditorProps) {
  const navLinks =
    ((section.data as any).navLinks as Array<{ sectionId: string; label: string; enabled: boolean }>) || []
  const navigableSections = sections.filter((candidate) => navigableSectionTypes.includes(candidate.type))

  const getConfig = (sectionId: string, sectionType: SectionType, data: Record<string, unknown>) => {
    const existing = navLinks.find((link) => link.sectionId === sectionId)
    if (existing) return existing
    return {
      sectionId,
      label: (data?.title as string) || defaultLabels[sectionType],
      enabled: true,
    }
  }

  const updateNavLink = (sectionId: string, field: "label" | "enabled", value: string | boolean) => {
    const currentLinks = [...navLinks]
    const existingIndex = currentLinks.findIndex((link) => link.sectionId === sectionId)
    const targetSection = navigableSections.find((candidate) => candidate.id === sectionId)

    if (existingIndex >= 0) {
      currentLinks[existingIndex] = { ...currentLinks[existingIndex], [field]: value }
    } else {
      currentLinks.push({
        sectionId,
        label: (targetSection?.data?.title as string) || defaultLabels[targetSection?.type || "hero"],
        enabled: true,
        [field]: value,
      })
    }

    updateField("navLinks", currentLinks)
  }

  return (
    <Card className="p-4 space-y-4">
      <Label className="flex items-center gap-2">
        <Navigation className="h-3.5 w-3.5" />
        Navigatie-instellingen
      </Label>
      <div className="space-y-2">
        <Label className="text-xs">Merknaam</Label>
        <Input
          value={(section.data as any).brandName || "Mijn bedrijf"}
          onChange={(e) => updateField("brandName", e.target.value)}
          placeholder="Je merknaam"
        />
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Pin className="h-3.5 w-3.5" />
          <Label className="text-xs">Vaste navigatie</Label>
        </div>
        <button
          type="button"
          onClick={() => updateField("isSticky", !((section.data as any).isSticky ?? true))}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            ((section.data as any).isSticky ?? true) ? "bg-primary" : "bg-muted"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              ((section.data as any).isSticky ?? true) ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>
      <p className="text-xs text-muted-foreground">
        {((section.data as any).isSticky ?? true) ? "Navbar blijft bovenaan tijdens scrollen" : "Navbar scrolt met pagina"}
      </p>
      <div className="space-y-3">
        <Label className="flex items-center gap-2 text-xs">
          <Type className="h-3.5 w-3.5" />
          Navigatielinks
        </Label>
        <p className="text-xs text-muted-foreground">
          Kies welke secties in de navigatie verschijnen en pas de labels aan
        </p>
        <div className="space-y-2">
          {navigableSections.map((candidate) => {
            const config = getConfig(candidate.id, candidate.type, candidate.data)
            return (
              <div key={candidate.id} className="flex items-center gap-2 p-2 rounded border bg-muted/20">
                <button
                  type="button"
                  onClick={() => updateNavLink(candidate.id, "enabled", !config.enabled)}
                  className="flex-shrink-0"
                  title={config.enabled ? "Verbergen uit nav" : "Tonen in nav"}
                >
                  {config.enabled ? <Eye className="h-4 w-4 text-primary" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
                </button>
                <Input
                  value={config.label}
                  onChange={(e) => updateNavLink(candidate.id, "label", e.target.value)}
                  className={`flex-1 h-8 text-sm ${!config.enabled ? "opacity-50" : ""}`}
                  disabled={!config.enabled}
                  placeholder={defaultLabels[candidate.type]}
                />
                <span className="text-xs text-muted-foreground capitalize w-16 text-right">
                  {candidate.type}
                </span>
              </div>
            )
          })}
          {navigableSections.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">
              Voeg secties toe aan je pagina om navigatielinks te maken
            </p>
          ) : null}
        </div>
      </div>
    </Card>
  )
}
