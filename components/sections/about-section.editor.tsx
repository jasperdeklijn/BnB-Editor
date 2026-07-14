"use client"

import { ImageIcon, Trash2, Type } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { SectionEditorProps } from "@/components/editor/section-editor-types"

export function AboutSectionEditor({ section, updateField }: SectionEditorProps) {
  const images = Array.isArray(section.data.images)
    ? section.data.images.filter((image): image is string => typeof image === "string" && image.trim().length > 0)
    : []

  return (
    <Card className="space-y-3 p-4">
      <Label className="flex items-center gap-2"><Type className="h-3.5 w-3.5" />Over sectie</Label>
      <Input placeholder="Over ons" value={(section.data.title as string) || ""} onChange={(event) => updateField("title", event.target.value)} />
      <textarea placeholder="Beschrijf je bedrijf..." value={(section.data.description as string) || ""} onChange={(event) => updateField("description", event.target.value)} className="min-h-24 w-full resize-none rounded-lg border border-input bg-background p-2 text-sm" />
      <div className="space-y-2">
        <div>
          <Label className="flex items-center gap-1 text-xs"><ImageIcon className="h-3 w-3" />Afbeeldingen</Label>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Open links de tab Afbeeldingen en sleep een foto naar deze Over ons-sectie. Sleep op een bestaande foto om die te vervangen.</p>
        </div>
        {images.length === 0 ? <div className="rounded-lg border border-dashed p-3 text-center text-xs text-muted-foreground">Nog geen afbeeldingen toegevoegd.</div> : null}
        {images.map((image, index) => (
          <div key={`${image}-${index}`} className="flex items-center gap-2 rounded-lg border border-border p-2">
            <img src={image} alt={`Over ons afbeelding ${index + 1}`} className="h-12 w-16 rounded object-cover" />
            <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">Afbeelding {index + 1}</span>
            <Button type="button" variant="ghost" size="icon" aria-label={`Afbeelding ${index + 1} verwijderen`} onClick={() => updateField("images", images.filter((_, imageIndex) => imageIndex !== index))}><Trash2 className="h-4 w-4" /></Button>
          </div>
        ))}
      </div>
    </Card>
  )
}
