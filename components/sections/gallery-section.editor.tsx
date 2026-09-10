"use client"

import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { SectionEditorProps } from "@/components/editor/section-editor-types"
import { DEFAULT_GALLERY_IMAGES } from "@/lib/business-naming"
import { Type } from "lucide-react"

export function GallerySectionEditor({ section, updateField }: SectionEditorProps) {
  const images = Array.isArray(section.data.images)
    ? section.data.images.filter((image): image is string => typeof image === "string")
    : DEFAULT_GALLERY_IMAGES

  return (
    <Card className="p-4 space-y-3">
      <Label className="flex items-center gap-2">
        <Type className="h-3.5 w-3.5" />
        Galerij
      </Label>
      <div>
        <Label className="text-xs mb-1.5 block">Titel</Label>
        <Input
          placeholder="Galerijtitel"
          value={(section.data as any).title || ""}
          onChange={(e) => updateField("title", e.target.value)}
        />
      </div>
      <div>
        <Label className="text-xs mb-1.5 block">Ondertitel</Label>
        <Input
          placeholder="Galerijondertitel"
          value={(section.data as any).subtitle || ""}
          onChange={(e) => updateField("subtitle", e.target.value)}
        />
      </div>
      <div>
        <Label htmlFor={`gallery-image-count-${section.id}`} className="text-xs mb-1.5 block">
          Aantal afbeeldingen
        </Label>
        <Input
          id={`gallery-image-count-${section.id}`}
          type="number"
          min={1}
          max={12}
          step={1}
          value={images.length}
          onChange={(e) => {
            const count = e.target.valueAsNumber
            if (!Number.isInteger(count)) return
            const nextCount = Math.min(12, Math.max(1, count))
            updateField("images", Array.from({ length: nextCount }, (_, index) =>
              images[index] ?? DEFAULT_GALLERY_IMAGES[index % DEFAULT_GALLERY_IMAGES.length],
            ))
          }}
        />
        <p className="mt-1.5 text-xs text-muted-foreground">
          Kies 1 tot 12 afbeeldingen. Bij verlagen vervallen de laatste afbeeldingen uit de galerij.
        </p>
      </div>
    </Card>
  )
}
