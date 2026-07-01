"use client"

import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { SectionEditorProps } from "@/components/editor/section-editor-types"
import { Phone, Type } from "lucide-react"

export function CtaSectionEditor({ section, updateField }: SectionEditorProps) {
  return (
    <Card className="p-4 space-y-3">
      <Label className="flex items-center gap-2">
        <Type className="h-3.5 w-3.5" />
        Inhoud
      </Label>
      <div>
        <Label className="text-xs mb-1.5 block">Titel</Label>
        <Input
          placeholder="Klaar om te beginnen?"
          value={(section.data as any).title || ""}
          onChange={(e) => updateField("title", e.target.value)}
        />
      </div>
      <div>
        <Label className="text-xs mb-1.5 block">Ondertitel</Label>
        <Input
          placeholder="Neem vandaag nog contact op"
          value={(section.data as any).subtitle || ""}
          onChange={(e) => updateField("subtitle", e.target.value)}
        />
      </div>
      <div>
        <Label className="text-xs mb-1.5 block">Knoptekst (primair)</Label>
        <Input
          placeholder="Neem contact op"
          value={(section.data as any).primaryCtaText || ""}
          onChange={(e) => updateField("primaryCtaText", e.target.value)}
        />
      </div>
      <div>
        <Label className="text-xs mb-1.5 block">Knoplink (primair)</Label>
        <Input
          placeholder="#contact"
          value={(section.data as any).primaryCtaHref || ""}
          onChange={(e) => updateField("primaryCtaHref", e.target.value)}
        />
      </div>
      <div>
        <Label className="text-xs mb-1.5 block">Knoptekst (secundair, optioneel)</Label>
        <Input
          placeholder="Meer weten"
          value={(section.data as any).secondaryCtaText || ""}
          onChange={(e) => updateField("secondaryCtaText", e.target.value)}
        />
      </div>
      <div>
        <Label className="flex items-center gap-2 text-xs mb-1.5">
          <Phone className="h-3 w-3" />
          Telefoonnummer (optioneel)
        </Label>
        <Input
          placeholder="+31 6 00000000"
          value={(section.data as any).phone || ""}
          onChange={(e) => updateField("phone", e.target.value)}
        />
      </div>
    </Card>
  )
}
