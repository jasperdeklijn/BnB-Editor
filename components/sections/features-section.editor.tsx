"use client"

import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { SectionEditorProps } from "@/components/editor/section-editor-types"
import { Plus, Type } from "lucide-react"
import { Button } from "@/components/ui/button"
import { RepeatingItemActions, moveRepeatingItem } from "@/components/editor/repeating-item-actions"

import type { IconFeature } from "@/lib/section-icons"
import { SectionIconPicker } from "@/components/editor/section-icon-picker"

export function FeaturesSectionEditor({ section, updateField }: SectionEditorProps) {
  const normalizedFeatures = (section.data.features as IconFeature[] | undefined) || []
  const saveFeatures = (next: IconFeature[]) => updateField("features", next)
  return (
    <Card className="p-4 space-y-3">
      <Label className="flex items-center gap-2">
        <Type className="h-3.5 w-3.5" />
        Titel
      </Label>
      <Input
        placeholder="Kenmerken"
        value={(section.data.title as string) || ""}
        onChange={(e) => updateField("title", e.target.value)}
      />
      <Label className="flex items-center gap-2"><Plus className="h-3.5 w-3.5" />Kenmerken</Label>
      {normalizedFeatures.map((feature, index) => (
        <div key={feature.id ?? index} className="flex flex-wrap items-center gap-2 rounded-lg border border-border p-2">
          <SectionIconPicker label={`kenmerk ${index + 1}`} value={feature.icon} onChange={(icon) => saveFeatures(normalizedFeatures.map((item, itemIndex) => itemIndex === index ? { ...item, icon } : item))} />
          <Input className="min-w-24 flex-1" aria-label={`Kenmerk ${index + 1}`} placeholder="Bijvoorbeeld: Persoonlijke service" value={feature.text ?? ""} onChange={(event) => saveFeatures(normalizedFeatures.map((item, itemIndex) => itemIndex === index ? { ...item, text: event.target.value } : item))} />
          <RepeatingItemActions itemLabel={`Kenmerk ${index + 1}`} index={index} count={normalizedFeatures.length} onMove={(direction) => saveFeatures(moveRepeatingItem(normalizedFeatures, index, direction))} onDuplicate={() => { const copy = { ...feature, id: crypto.randomUUID() }; saveFeatures([...normalizedFeatures.slice(0, index + 1), copy, ...normalizedFeatures.slice(index + 1)]) }} onDelete={() => saveFeatures(normalizedFeatures.filter((_, itemIndex) => itemIndex !== index))} />
        </div>
      ))}
      <Button type="button" variant="outline" className="w-full" onClick={() => saveFeatures([...normalizedFeatures, { id: crypto.randomUUID(), text: "Nieuw kenmerk", icon: "tabler:check" }])}><Plus className="mr-2 h-4 w-4" />Kenmerk toevoegen</Button>
    </Card>
  )
}
