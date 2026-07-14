"use client"

import { Eye, EyeOff, Phone, Type } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SectionLinkSelect } from "@/components/editor/section-link-select"
import type { SectionEditorProps } from "@/components/editor/section-editor-types"

function VisibilityButton({ enabled, onClick, label }: { enabled: boolean; onClick: () => void; label: string }) {
  return <button type="button" onClick={onClick} className={`flex w-full items-center justify-center gap-2 rounded-lg border p-2 text-xs font-medium transition-colors ${enabled ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-muted-foreground"}`}>{enabled ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}{label}: {enabled ? "zichtbaar" : "verborgen"}</button>
}

export function CtaSectionEditor({ section, updateField, sectionTargetOptions }: SectionEditorProps) {
  const primaryEnabled = section.data.primaryCtaEnabled !== false
  const secondaryEnabled = section.data.secondaryCtaEnabled === true || (section.data.secondaryCtaEnabled === undefined && Boolean(section.data.secondaryCtaText))

  return (
    <Card className="space-y-3 p-4">
      <Label className="flex items-center gap-2"><Type className="h-3.5 w-3.5" />Inhoud</Label>
      <div><Label className="mb-1.5 block text-xs">Titel</Label><Input placeholder="Klaar om te beginnen?" value={(section.data.title as string) || ""} onChange={(event) => updateField("title", event.target.value)} /></div>
      <div><Label className="mb-1.5 block text-xs">Ondertitel</Label><Input placeholder="Neem vandaag nog contact op" value={(section.data.subtitle as string) || ""} onChange={(event) => updateField("subtitle", event.target.value)} /></div>

      <div className="space-y-2 rounded-lg border border-border p-3">
        <VisibilityButton enabled={primaryEnabled} onClick={() => updateField("primaryCtaEnabled", !primaryEnabled)} label="Primaire knop" />
        {primaryEnabled ? <><Input aria-label="Primaire knoptekst" placeholder="Neem contact op" value={(section.data.primaryCtaText as string) || ""} onChange={(event) => updateField("primaryCtaText", event.target.value)} /><SectionLinkSelect value={(section.data.primaryCtaHref as string) || ""} onChange={(value) => updateField("primaryCtaHref", value)} options={sectionTargetOptions} ariaLabel="Primaire knopdoel" /></> : null}
      </div>

      <div className="space-y-2 rounded-lg border border-border p-3">
        <VisibilityButton enabled={secondaryEnabled} onClick={() => updateField("secondaryCtaEnabled", !secondaryEnabled)} label="Secundaire knop" />
        {secondaryEnabled ? <><Input aria-label="Secundaire knoptekst" placeholder="Meer weten" value={(section.data.secondaryCtaText as string) || ""} onChange={(event) => updateField("secondaryCtaText", event.target.value)} /><SectionLinkSelect value={(section.data.secondaryCtaHref as string) || ""} onChange={(value) => updateField("secondaryCtaHref", value)} options={sectionTargetOptions} ariaLabel="Secundaire knopdoel" /></> : null}
      </div>

      <div><Label className="mb-1.5 flex items-center gap-2 text-xs"><Phone className="h-3 w-3" />Telefoonnummer (optioneel)</Label><Input placeholder="+31 6 00000000" value={(section.data.phone as string) || ""} onChange={(event) => updateField("phone", event.target.value)} /></div>
    </Card>
  )
}
