"use client"
import { SectionIconPicker } from "./section-icon-picker"
import type { SectionIconId } from "@/lib/section-icons"

export function SectionIconSettings({ data, updateField, fields }: {
  data: Record<string, unknown>
  updateField: (field: string, value: unknown) => void
  fields: ReadonlyArray<readonly [string, string, SectionIconId | null]>
}) {
  return <div className="space-y-2 rounded-lg border p-3">
    <p className="text-xs font-semibold">Iconen</p>
    {fields.map(([field, label, defaultIcon]) => <div key={field} className="flex items-center gap-3">
      <SectionIconPicker label={label} value={data[field]} defaultIcon={defaultIcon} onChange={icon => updateField(field, icon)} />
      <span className="text-sm">{label}</span>
    </div>)}
  </div>
}
