"use client"

import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { SectionEditorProps } from "@/components/editor/section-editor-types"
import { Type } from "lucide-react"

export function GallerySectionEditor({ section, updateField }: SectionEditorProps) {
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
        <Label className="text-xs mb-1.5 block">Aantal afbeeldingen</Label>
        <Input
          type="number"
          min="1"
          max="12"
          value={(section.data as any).image_count || 6}
          onChange={(e) => updateField("image_count", Number(e.target.value))}
        />
      </div>
    </Card>
  )
}
