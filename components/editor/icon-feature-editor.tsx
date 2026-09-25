"use client"

import { Plus } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { SectionIconPicker } from "./section-icon-picker"
import { RepeatingItemActions, moveRepeatingItem } from "./repeating-item-actions"
import type { IconFeature } from "@/lib/section-icons"

export function IconFeatureEditor({ features, onChange, label }: {
  features: IconFeature[]; onChange: (features: IconFeature[]) => void; label: string
}) {
  return <div className="space-y-2">
    <p className="text-xs font-semibold">Kenmerken</p>
    {features.map((feature, index) => <div key={feature.id} className="flex flex-wrap items-center gap-2 rounded-lg border p-2">
      <SectionIconPicker value={feature.icon} label={`${label}, kenmerk ${index + 1}`} onChange={(icon) => onChange(features.map(item => item.id === feature.id ? { ...item, icon } : item))} />
      <Input className="min-w-24 flex-1" aria-label={`${label}, kenmerk ${index + 1}`} value={feature.text} onChange={event => onChange(features.map(item => item.id === feature.id ? { ...item, text: event.target.value } : item))} placeholder="Bijvoorbeeld: Ontbijt inbegrepen" />
      <RepeatingItemActions itemLabel={`${label}, kenmerk ${index + 1}`} index={index} count={features.length} onMove={direction => onChange(moveRepeatingItem(features, index, direction))} onDuplicate={() => onChange([...features.slice(0, index + 1), { ...feature, id: crypto.randomUUID() }, ...features.slice(index + 1)])} onDelete={() => onChange(features.filter(item => item.id !== feature.id))} />
    </div>)}
    <Button type="button" variant="outline" size="sm" onClick={() => onChange([...features, { id: crypto.randomUUID(), text: "Nieuw kenmerk", icon: "tabler:check" }])}><Plus className="mr-2 h-4 w-4" />Kenmerk toevoegen</Button>
  </div>
}
