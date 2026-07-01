"use client"

import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { SectionEditorProps } from "@/components/editor/section-editor-types"
import { Mail, MapPin, Phone } from "lucide-react"

export function MapSectionEditor({ section, updateField }: SectionEditorProps) {
  return (
    <Card className="p-4 space-y-3">
      <Label className="flex items-center gap-2">
        <MapPin className="h-3.5 w-3.5" />
        Locatiegegevens
      </Label>
      <div>
        <Label className="text-xs mb-1.5 block">Titel</Label>
        <Input
          placeholder="Onze locatie"
          value={(section.data as any).title || ""}
          onChange={(e) => updateField("title", e.target.value)}
        />
      </div>
      <div>
        <Label className="text-xs mb-1.5 block">Adres</Label>
        <Input
          placeholder="Dorpsstraat 1, 1234 AB Amsterdam"
          value={(section.data as any).address || ""}
          onChange={(e) => updateField("address", e.target.value)}
        />
      </div>
      <div>
        <Label className="flex items-center gap-2 text-xs mb-1.5">
          <Phone className="h-3 w-3" />
          Telefoon
        </Label>
        <Input
          placeholder="+31 6 00000000"
          value={(section.data as any).phone || ""}
          onChange={(e) => updateField("phone", e.target.value)}
        />
      </div>
      <div>
        <Label className="flex items-center gap-2 text-xs mb-1.5">
          <Mail className="h-3 w-3" />
          E-mail
        </Label>
        <Input
          placeholder="info@mijnbedrijf.nl"
          value={(section.data as any).email || ""}
          onChange={(e) => updateField("email", e.target.value)}
        />
      </div>
      <div>
        <Label className="text-xs mb-1.5 block">Google Maps embed-URL (optioneel)</Label>
        <Input
          placeholder="https://maps.google.com/maps?q=..."
          value={(section.data as any).embedUrl || ""}
          onChange={(e) => updateField("embedUrl", e.target.value)}
        />
        <p className="mt-1 text-[10px] text-muted-foreground">
          Laat leeg om automatisch te genereren vanuit het adres.
        </p>
      </div>
    </Card>
  )
}
