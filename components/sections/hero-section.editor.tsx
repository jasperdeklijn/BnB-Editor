"use client"

import { SectionIconSettings } from "@/components/editor/section-icon-settings"

import { Eye, EyeOff, Type } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useId } from "react"
import { SectionLinkSelect } from "@/components/editor/section-link-select"
import type { SectionEditorProps } from "@/components/editor/section-editor-types"

export function HeroSectionEditor({ section, updateField, sectionTargetOptions }: SectionEditorProps) {
  const buttonEnabled = section.data.ctaEnabled !== false
  const fieldId = useId()

  return (
    <Card className="space-y-3 p-4">
      <p className="flex items-center gap-2 text-sm font-medium"><Type className="h-3.5 w-3.5" />Inhoud</p>
      <div><Label htmlFor={`${fieldId}-title`} className="mb-1.5 block text-xs">Titel</Label><Input id={`${fieldId}-title`} placeholder="Bijvoorbeeld: Welkom bij ons bedrijf" value={(section.data.title as string) || ""} onChange={(event) => updateField("title", event.target.value)} /></div>
      <div><Label htmlFor={`${fieldId}-subtitle`} className="mb-1.5 block text-xs">Ondertitel</Label><Textarea id={`${fieldId}-subtitle`} rows={4} placeholder="Bijvoorbeeld: Professionele service, persoonlijk contact" value={(section.data.subtitle as string) || ""} onChange={(event) => updateField("subtitle", event.target.value)} /></div>
      <button type="button" aria-pressed={buttonEnabled} onClick={() => updateField("ctaEnabled", !buttonEnabled)} className={`flex w-full items-center justify-center gap-2 rounded-lg border p-2 text-xs font-medium transition-colors ${buttonEnabled ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-muted-foreground"}`}>
        {buttonEnabled ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
        {buttonEnabled ? "Knop zichtbaar" : "Knop verborgen"}
      </button>
      {buttonEnabled ? <>
        <div><Label htmlFor={`${fieldId}-button`} className="mb-1.5 block text-xs">Knoptekst</Label><Input id={`${fieldId}-button`} placeholder="Neem contact op" value={(section.data.ctaText as string) || ""} onChange={(event) => updateField("ctaText", event.target.value)} /></div>
        <div><p className="mb-1.5 text-xs font-medium">Waar gaat deze knop naartoe?</p><SectionLinkSelect value={(section.data.ctaHref as string) || ""} onChange={(value) => updateField("ctaHref", value)} options={sectionTargetOptions} ariaLabel="Doel van de introknop" /></div>
        <details className="rounded-lg border p-3"><summary className="cursor-pointer text-xs font-medium">Icoon bij de knop</summary><div className="mt-3"><SectionIconSettings data={section.data} updateField={updateField} fields={[["ctaIcon","Hoofdknop",null]]} /></div></details>
      </> : null}
    </Card>
  )
}
