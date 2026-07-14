"use client"

import { Eye, EyeOff, Type } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SectionLinkSelect } from "@/components/editor/section-link-select"
import type { SectionEditorProps } from "@/components/editor/section-editor-types"

export function HeroSectionEditor({ section, updateField, sectionTargetOptions }: SectionEditorProps) {
  const buttonEnabled = section.data.ctaEnabled !== false

  return (
    <Card className="space-y-3 p-4">
      <Label className="flex items-center gap-2"><Type className="h-3.5 w-3.5" />Inhoud</Label>
      <div><Label className="mb-1.5 block text-xs">Titel</Label><Input placeholder="bijv., Welkom bij ons bedrijf" value={(section.data.title as string) || ""} onChange={(event) => updateField("title", event.target.value)} /></div>
      <div><Label className="mb-1.5 block text-xs">Ondertitel</Label><Input placeholder="bijv., Professionele service, persoonlijk contact" value={(section.data.subtitle as string) || ""} onChange={(event) => updateField("subtitle", event.target.value)} /></div>
      <button type="button" onClick={() => updateField("ctaEnabled", !buttonEnabled)} className={`flex w-full items-center justify-center gap-2 rounded-lg border p-2 text-xs font-medium transition-colors ${buttonEnabled ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-muted-foreground"}`}>
        {buttonEnabled ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
        {buttonEnabled ? "Knop zichtbaar" : "Knop verborgen"}
      </button>
      {buttonEnabled ? <>
        <div><Label className="mb-1.5 block text-xs">Knoptekst</Label><Input placeholder="Neem contact op" value={(section.data.ctaText as string) || ""} onChange={(event) => updateField("ctaText", event.target.value)} /></div>
        <div><Label className="mb-1.5 block text-xs">Link naar sectie</Label><SectionLinkSelect value={(section.data.ctaHref as string) || ""} onChange={(value) => updateField("ctaHref", value)} options={sectionTargetOptions} ariaLabel="Hero knopdoel" /></div>
      </> : null}
    </Card>
  )
}
