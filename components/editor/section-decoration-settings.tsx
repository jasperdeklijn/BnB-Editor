"use client"

import { useId } from "react"
import { Check } from "lucide-react"
import type { Section } from "@/lib/types"
import { getSectionDecoration } from "@/lib/section-decorations"
import { DEFAULT_SECTION_ACCENT } from "@/lib/section-colors"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

interface SectionDecorationSettingsProps {
  section: Section
  onChange: (values: Record<string, unknown>) => void
}

export function SectionDecorationSettings({ section, onChange }: SectionDecorationSettingsProps) {
  const id = useId()
  const decoration = getSectionDecoration(section.data)
  if (!decoration) return null
  const { type, options, option: selected, scale, opacity } = decoration

  return (
    <div className="space-y-4 rounded-lg border border-border bg-background p-3">
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">{type === "paint" ? "Verfvorm" : "Patroonvariant"}</legend>
        <div className="grid grid-cols-2 gap-2">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={selected.value === option.value}
              onClick={() => onChange({ decorationVariant: option.value })}
              className={`overflow-hidden rounded-md border text-left text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${selected.value === option.value ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:border-primary/60"}`}
            >
              <span aria-hidden="true" className="relative block h-16 bg-stone-50">
                <span
                  className="absolute inset-0 opacity-50"
                  style={{
                    backgroundColor: section.styles?.accentColor || DEFAULT_SECTION_ACCENT,
                    maskImage: `url('/section-decorations/${option.file}')`,
                    maskSize: type === "paint" ? "contain" : "32px 32px",
                    maskRepeat: type === "paint" ? "no-repeat" : "repeat",
                    maskPosition: "center",
                  }}
                />
              </span>
              <span className="flex min-h-9 items-center justify-between gap-1 px-2 py-1.5">
                {option.label}
                {selected.value === option.value ? <Check aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-primary" /> : null}
              </span>
            </button>
          ))}
        </div>
      </fieldset>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2 text-xs">
          <Label htmlFor={`${id}-scale`}>Grootte</Label>
          <span>{scale}%</span>
        </div>
        <input
          id={`${id}-scale`}
          type="range"
          min={50}
          max={200}
          step={10}
          value={scale}
          aria-valuetext={`${scale}%`}
          onChange={(event) => onChange({ decorationScale: event.currentTarget.valueAsNumber })}
          className="block w-full accent-primary"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2 text-xs">
          <Label htmlFor={`${id}-opacity`}>Zichtbaarheid</Label>
          <span>{opacity}%</span>
        </div>
        <input
          id={`${id}-opacity`}
          type="range"
          min={0}
          max={40}
          step={1}
          value={opacity}
          aria-valuetext={`${opacity}%`}
          onChange={(event) => onChange({ decorationOpacity: event.currentTarget.valueAsNumber })}
          className="block w-full accent-primary"
        />
      </div>

      <p className="text-xs text-muted-foreground">De decoratie gebruikt de accentkleur van deze sectie. Aanpassingen zijn direct zichtbaar op het doek.</p>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={() => onChange({ decorationVariant: options[0].value, decorationScale: 100, decorationOpacity: type === "paint" ? 16 : 12 })}
      >
        Herstel standaard
      </Button>
    </div>
  )
}
