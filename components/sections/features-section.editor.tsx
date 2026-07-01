"use client"

import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { SectionEditorProps } from "@/components/editor/section-editor-types"
import { Plus, Type } from "lucide-react"

export function FeaturesSectionEditor({ section, updateField }: SectionEditorProps) {
  return (
    <Card className="p-4 space-y-3">
      <Label className="flex items-center gap-2">
        <Type className="h-3.5 w-3.5" />
        Titel
      </Label>
      <Input
        placeholder="Kenmerken"
        value={(section.data as any).title || ""}
        onChange={(e) => updateField("title", e.target.value)}
      />
      <Label className="flex items-center gap-2">
        <Plus className="h-3.5 w-3.5" />
        Kenmerken (kommagescheiden)
      </Label>
      <Input
        placeholder="Persoonlijke service, Heldere afspraken, Vakmanschap"
        value={(((section.data as any).features as string[] | undefined) || []).join(", ")}
        onChange={(e) =>
          updateField(
            "features",
            e.target.value.split(",").map((value) => value.trim()).filter(Boolean),
          )
        }
      />
    </Card>
  )
}
