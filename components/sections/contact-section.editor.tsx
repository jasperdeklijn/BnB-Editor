"use client"

import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { SectionEditorProps } from "@/components/editor/section-editor-types"
import { Mail, MapPin, Phone, Type } from "lucide-react"

export function ContactSectionEditor({ section, updateField }: SectionEditorProps) {
  return (
    <>
      <Card className="p-4 space-y-3">
        <Label className="flex items-center gap-2">
          <Type className="h-3.5 w-3.5" />
          Inhoud
        </Label>
        <div>
          <Label className="text-xs mb-1.5 block">Titel</Label>
          <Input
            placeholder="Neem Contact Op"
            value={(section.data as any).title || ""}
            onChange={(e) => updateField("title", e.target.value)}
          />
        </div>
        <div>
          <Label className="text-xs mb-1.5 block">Ondertitel</Label>
          <Input
            placeholder="Neem gerust contact met ons op."
            value={(section.data as any).subtitle || ""}
            onChange={(e) => updateField("subtitle", e.target.value)}
          />
        </div>
        <div>
          <Label className="flex items-center gap-2 text-xs mb-1.5">
            <MapPin className="h-3 w-3" />
            Adres
          </Label>
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
            E-mail (weergave)
          </Label>
          <Input
            placeholder="info@mijnbedrijf.nl"
            value={(section.data as any).email || ""}
            onChange={(e) => updateField("email", e.target.value)}
          />
        </div>
      </Card>
      <Card className="p-4 space-y-3">
        <Label className="flex items-center gap-2">
          <Mail className="h-3.5 w-3.5" />
          Formulier ontvanger
        </Label>
        <p className="text-xs text-muted-foreground">
          Contactformulieren worden verzonden naar dit e-mailadres. Laat leeg om naar het standaard adres te sturen.
        </p>
        <Input
          type="email"
          placeholder="jouw@email.nl"
          value={(section.data as any).recipientEmail || ""}
          onChange={(e) => updateField("recipientEmail", e.target.value)}
        />
        <p className="text-[10px] text-muted-foreground">Verzonden vanaf: info@websitebouwer.nl</p>
      </Card>
    </>
  )
}
