"use client"

import { useId } from "react"
import { Button } from "@/components/ui/button"
import { readPresentation, type SectionPresentation } from "@/lib/section-composition"

export function SectionPresentationControls({ value, onChange, split = false, images = true }: {
  value: unknown
  onChange: (value: SectionPresentation) => void
  split?: boolean
  images?: boolean
}) {
  const id = useId()
  const settings = readPresentation(value)
  const update = <K extends keyof SectionPresentation>(key: K, next: SectionPresentation[K] | "") => {
    const copy = { ...settings }
    if (next === "" || next === undefined) delete copy[key]
    else copy[key] = next
    onChange(copy)
  }
  const select = <K extends keyof SectionPresentation>(key: K, label: string, options: Array<[string, string]>) => (
    <label className="block space-y-1 text-xs font-medium" htmlFor={`${id}-${key}`}>
      <span>{label}</span>
      <select id={`${id}-${key}`} className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm" value={settings[key] ?? ""} onChange={(event) => update(key, event.target.value as SectionPresentation[K])}>
        <option value="">Volg de indeling</option>
        {options.map(([value, title]) => <option key={value} value={value}>{title}</option>)}
      </select>
    </label>
  )
  const range = (key: "headingSize" | "bodySize" | "paddingTop" | "paddingBottom" | "imageWidth", label: string, min: number, max: number, fallback: number, unit = "px") => (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2 text-xs"><label htmlFor={`${id}-${key}`}>{label}</label><span>{settings[key] === undefined ? "Automatisch" : `${settings[key]}${unit}`}</span></div>
      <input id={`${id}-${key}`} aria-label={label} type="range" min={min} max={max} value={settings[key] ?? fallback} onChange={(event) => update(key, event.target.valueAsNumber)} className="block w-full accent-primary" />
      {settings[key] !== undefined ? <button type="button" className="text-xs text-primary underline" onClick={() => update(key, undefined)}>Herstel {label.toLowerCase()}</button> : null}
    </div>
  )
  return <div className="space-y-4">
    {select("alignment", "Tekst uitlijnen", [["left", "Links"], ["center", "Midden"], ["right", "Rechts"]])}
    {select("contentWidth", "Inhoudsbreedte", [["narrow", "Smal"], ["normal", "Normaal"], ["wide", "Breed"], ["full", "Volledige breedte"]])}
    {range("headingSize", "Titelgrootte", 20, 96, 40)}
    {range("bodySize", "Tekstgrootte", 12, 28, 16)}
    {range("paddingTop", "Ruimte boven", 0, 200, 64)}
    {range("paddingBottom", "Ruimte onder", 0, 200, 64)}
    {split ? select("columnRatio", "Kolomverhouding", [["50-50", "50 / 50"], ["40-60", "40 / 60"], ["60-40", "60 / 40"]]) : null}
    {images ? <>
      {range("imageWidth", "Afbeeldingsbreedte", 25, 100, 100, "%")}
      {select("imageAspect", "Afbeeldingsuitsnede", [["original", "Origineel"], ["square", "Vierkant"], ["landscape", "Liggend"], ["portrait", "Staand"]])}
      {select("imagePosition", "Focus van afbeelding", [["center", "Midden"], ["top", "Boven"], ["bottom", "Onder"], ["left", "Links"], ["right", "Rechts"]])}
    </> : null}
    <Button type="button" size="sm" variant="outline" onClick={() => onChange({})}>Herstel alle opmaak</Button>
  </div>
}
