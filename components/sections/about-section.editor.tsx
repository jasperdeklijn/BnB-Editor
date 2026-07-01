"use client"

import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { SectionEditorProps } from "@/components/editor/section-editor-types"
import { Type } from "lucide-react"

export function AboutSectionEditor({ section, updateField }: SectionEditorProps) {
  return (
    <Card className="p-4 space-y-3">
      <Label className="flex items-center gap-2">
        <Type className="h-3.5 w-3.5" />
        Over sectie
      </Label>
      <Input
        placeholder="Over ons"
        value={(section.data as any).title || ""}
        onChange={(e) => updateField("title", e.target.value)}
      />
      <textarea
        placeholder="Beschrijf je bedrijf..."
        value={(section.data as any).description || ""}
        onChange={(e) => updateField("description", e.target.value)}
        className="w-full min-h-24 p-2 border rounded-lg resize-none"
      />
    </Card>
  )
}
