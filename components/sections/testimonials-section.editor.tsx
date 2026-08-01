"use client"

import { ImageIcon, Plus, Type } from "lucide-react"
import { RepeatingItemActions, moveRepeatingItem } from "@/components/editor/repeating-item-actions"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { SectionEditorProps } from "@/components/editor/section-editor-types"
import type { TestimonialItem } from "@/components/sections/testimonials-section"

const fallbackItems = [
  { id: "testimonial-1", name: "Anna de Vries", role: "Vaste klant", quote: "Uitstekende service! Ik ben heel tevreden met het resultaat en de persoonlijke aanpak.", rating: 5 },
  { id: "testimonial-2", name: "Mark Janssen", role: "Ondernemer", quote: "Professioneel, betrouwbaar en snel. Ik zou het iedereen aanraden.", rating: 5 },
  { id: "testimonial-3", name: "Sophie Bakker", role: "Particuliere klant", quote: "Fijn contact en top vakwerk. We zijn meer dan tevreden met het eindresultaat.", rating: 5 },
]

export function TestimonialsSectionEditor({ section, updateField, updateListItemField }: SectionEditorProps) {
  const items = (Array.isArray(section.data.items) ? section.data.items : fallbackItems) as TestimonialItem[]
  const saveItems = (next: TestimonialItem[]) => updateField("items", next)
  const duplicateItem = (index: number) => {
    const copy = { ...items[index], id: `testimonial-${Date.now()}` }
    saveItems([...items.slice(0, index + 1), copy, ...items.slice(index + 1)])
  }

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
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold">Review {index + 1}</span>
            <RepeatingItemActions itemLabel={`Review ${index + 1}`} index={index} count={items.length} onMove={(direction) => saveItems(moveRepeatingItem(items, index, direction))} onDuplicate={() => duplicateItem(index)} onDelete={() => saveItems(items.filter((_, itemIndex) => itemIndex !== index))} />
          </div>
          <Input value={item.name || ""} onChange={(e) => updateListItemField("items", index, "name", e.target.value, fallbackItems)} placeholder="Naam" />
          <Input value={item.role || ""} onChange={(e) => updateListItemField("items", index, "role", e.target.value, fallbackItems)} placeholder="Rol" />
          <textarea
            value={item.quote || ""}
            onChange={(e) => updateListItemField("items", index, "quote", e.target.value, fallbackItems)}
            placeholder="Reviewtekst"
            className="min-h-16 w-full resize-none rounded-lg border border-input bg-background p-2 text-sm shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          <div className="grid grid-cols-[90px_1fr] gap-2">
            <div>
              <Label className="mb-1.5 block text-xs">Sterren</Label>
              <select aria-label={`Sterren voor review ${index + 1}`} value={item.rating ?? 5} onChange={(e) => updateListItemField("items", index, "rating", Number(e.target.value), fallbackItems)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                {[5, 4, 3, 2, 1].map((rating) => <option key={rating} value={rating}>{rating}</option>)}
              </select>
            </div>
            <div>
              <Label className="mb-1.5 flex items-center gap-1 text-xs"><ImageIcon className="h-3 w-3" />Foto (optioneel)</Label>
              <Input value={item.image || ""} onChange={(e) => updateListItemField("items", index, "image", e.target.value, fallbackItems)} placeholder="https://..." />
            </div>
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" className="w-full" onClick={() => saveItems([...items, { id: `testimonial-${Date.now()}`, name: "Nieuwe klant", role: "", quote: "", rating: 5, image: "" }])}>
        <Plus className="mr-2 h-4 w-4" />Review toevoegen
      </Button>
    </Card>
  )
}
