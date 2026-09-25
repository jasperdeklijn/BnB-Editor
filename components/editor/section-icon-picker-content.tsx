"use client"

import { useState } from "react"
import { SECTION_ICON_CATALOGUE } from "@/lib/section-icon-catalogue"
import type { SectionIconId } from "@/lib/section-icons"
import { SectionIcon } from "@/components/sections/section-icon"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

const categories = ["Alle", ...new Set(SECTION_ICON_CATALOGUE.map(icon => icon.category))]

export default function SectionIconPickerContent({ value, defaultIcon, onChange }: {
  value: SectionIconId | null; defaultIcon: SectionIconId | null; onChange: (icon: SectionIconId | null) => void
}) {
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState("Alle")
  const terms = query.toLocaleLowerCase().trim().split(/\s+/)
  const icons = SECTION_ICON_CATALOGUE.filter(icon => (category === "Alle" || icon.category === category) && terms.every(term => `${icon.label} ${icon.keywords} ${icon.category}`.toLocaleLowerCase().includes(term)))
  return <>
    <Input className="shrink-0" aria-label="Iconen zoeken" placeholder="Zoek bijvoorbeeld wifi, ontbijt of phone…" value={query} onChange={event => setQuery(event.target.value)} />
    <select aria-label="Icooncategorie" className="h-10 shrink-0 rounded-md border bg-background px-3 text-sm" value={category} onChange={event => setCategory(event.target.value)}>{categories.map(item => <option key={item}>{item}</option>)}</select>
    <div className="flex shrink-0 flex-wrap gap-2">
      <Button type="button" variant="outline" size="sm" onClick={() => onChange(null)} aria-pressed={value === null}>Geen icoon</Button>
      <Button type="button" variant="outline" size="sm" onClick={() => onChange(defaultIcon)}>Standaard herstellen</Button>
    </div>
    <p role="status" className="shrink-0 text-xs text-muted-foreground">{icons.length ? `${icons.length} ${icons.length === 1 ? "icoon" : "iconen"}` : "Geen iconen gevonden. Probeer een andere zoekterm."}</p>
    <div className="grid min-h-0 grid-cols-3 gap-2 overflow-y-auto p-1 sm:grid-cols-5" aria-label="Beschikbare iconen">
      {icons.map(icon => <button key={icon.id} type="button" aria-label={icon.label} aria-pressed={value === icon.id} onClick={() => onChange(icon.id)} className={`flex min-h-20 flex-col items-center justify-center gap-2 rounded-lg border p-2 text-center text-xs hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${value === icon.id ? "border-primary bg-accent" : "border-border"}`}>
        <SectionIcon icon={icon.id} className="h-6 w-6" /><span>{icon.label}</span>
      </button>)}
    </div>
  </>
}
