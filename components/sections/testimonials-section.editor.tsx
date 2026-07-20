"use client"

import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { SectionEditorProps } from "@/components/editor/section-editor-types"
import { Type } from "lucide-react"

const fallbackItems = [
  { id: "testimonial-1", name: "Anna de Vries", role: "Vaste klant", quote: "Uitstekende service! Ik ben heel tevreden met het resultaat en de persoonlijke aanpak.", rating: 5 },
  { id: "testimonial-2", name: "Mark Janssen", role: "Ondernemer", quote: "Professioneel, betrouwbaar en snel. Ik zou het iedereen aanraden.", rating: 5 },
  { id: "testimonial-3", name: "Sophie Bakker", role: "Particuliere klant", quote: "Fijn contact en top vakwerk. We zijn meer dan tevreden met het eindresultaat.", rating: 5 },
]

export function TestimonialsSectionEditor({ section, updateField, updateListItemField }: SectionEditorProps) {
  const items = ((section.data as any).items as any[]) || fallbackItems

  return (
    <Card className="p-4 space-y-3">
      <Label className="flex items-center gap-2">
        <Type className="h-3.5 w-3.5" />
        Inhoud
      </Label>
      <div>
        <Label className="text-xs mb-1.5 block">Titel</Label>
        <Input
          placeholder="Wat klanten zeggen"
          value={(section.data as any).title || ""}
          onChange={(e) => updateField("title", e.target.value)}
        />
      </div>
      <div>
        <Label className="text-xs mb-1.5 block">Ondertitel</Label>
        <Input
          placeholder="Lees ervaringen van onze klanten"
          value={(section.data as any).subtitle || ""}
          onChange={(e) => updateField("subtitle", e.target.value)}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Recensies worden opgeslagen op deze sectie.
      </p>
      {items.map((item, index) => (
        <div key={item.id ?? index} className="space-y-2 rounded-lg border border-border p-3">
          <Input value={item.name || ""} onChange={(e) => updateListItemField("items", index, "name", e.target.value, fallbackItems)} placeholder="Naam" />
          <Input value={item.role || ""} onChange={(e) => updateListItemField("items", index, "role", e.target.value, fallbackItems)} placeholder="Rol" />
          <textarea
            value={item.quote || ""}
            onChange={(e) => updateListItemField("items", index, "quote", e.target.value, fallbackItems)}
            placeholder="Reviewtekst"
            className="min-h-16 w-full resize-none rounded-lg border border-input bg-background p-2 text-sm shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
      ))}
    </Card>
  )
}
