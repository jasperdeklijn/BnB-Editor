"use client"

import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { SectionEditorProps } from "@/components/editor/section-editor-types"
import { Type } from "lucide-react"

const days = [
  { key: "monday", label: "Maandag" },
  { key: "tuesday", label: "Dinsdag" },
  { key: "wednesday", label: "Woensdag" },
  { key: "thursday", label: "Donderdag" },
  { key: "friday", label: "Vrijdag" },
  { key: "saturday", label: "Zaterdag" },
  { key: "sunday", label: "Zondag" },
] as const

export function OpeningHoursSectionEditor({ section, updateField }: SectionEditorProps) {
  return (
    <Card className="p-4 space-y-3">
      <Label className="flex items-center gap-2">
        <Type className="h-3.5 w-3.5" />
        Inhoud
      </Label>
      <div>
        <Label className="text-xs mb-1.5 block">Titel</Label>
        <Input
          placeholder="Openingstijden"
          value={(section.data as any).title || ""}
          onChange={(e) => updateField("title", e.target.value)}
        />
      </div>
      <div>
        <Label className="text-xs mb-1.5 block">Ondertitel</Label>
        <Input
          placeholder="Wanneer je ons kunt bereiken"
          value={(section.data as any).subtitle || ""}
          onChange={(e) => updateField("subtitle", e.target.value)}
        />
      </div>
      <div>
        <Label className="text-xs mb-1.5 block">Opmerking (optioneel)</Label>
        <Input
          placeholder="bijv. Op feestdagen gesloten"
          value={(section.data as any).note || ""}
          onChange={(e) => updateField("note", e.target.value)}
        />
      </div>
      {days.map((day) => {
        const val = (section.data as any)[day.key] as { hours?: string; closed?: boolean } | undefined
        const closed = val?.closed ?? day.key === "sunday"
        const hours = val?.hours ?? (day.key === "sunday" ? "" : "09:00 - 17:00")
        return (
          <div key={day.key} className="flex items-center gap-2">
            <span className="w-24 text-xs text-muted-foreground flex-shrink-0">{day.label}</span>
            <button
              type="button"
              onClick={() => updateField(day.key, { hours, closed: !closed })}
              className={`relative inline-flex h-5 w-9 items-center rounded-full flex-shrink-0 transition-colors ${closed ? "bg-muted" : "bg-primary"}`}
            >
              <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${closed ? "translate-x-0.5" : "translate-x-4"}`} />
            </button>
            {!closed ? (
              <Input
                className="h-7 text-xs flex-1"
                placeholder="09:00 - 17:00"
                value={hours}
                onChange={(e) => updateField(day.key, { hours: e.target.value, closed: false })}
              />
            ) : (
              <span className="text-xs text-muted-foreground italic">Gesloten</span>
            )}
          </div>
        )
      })}
    </Card>
  )
}
