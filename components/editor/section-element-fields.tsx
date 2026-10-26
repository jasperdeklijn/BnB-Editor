"use client"

import { useId } from "react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { SectionImagePicker } from "./section-image-picker"
import { SectionLinkSelect } from "./section-link-select"
import { SectionIconPicker } from "./section-icon-picker"
import type { SectionElement } from "@/lib/section-composition"

export function SectionElementFields({ element, onChange, userId, columns = 1, free = false }: {
  element: SectionElement
  onChange: (element: SectionElement) => void
  userId?: string
  columns?: number
  free?: boolean
}) {
  const id = useId()
  const update = (patch: Partial<SectionElement>) => onChange({ ...element, ...patch })
  const selectClass = "h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
  return <div className="space-y-3 text-left text-foreground">
    {["heading", "text", "button"].includes(element.type) ? <label className="block space-y-1 text-xs font-medium" htmlFor={`${id}-text`}>
      <span>{element.type === "button" ? "Knoptekst" : "Tekst"}</span>
      {element.type === "text" ? <Textarea id={`${id}-text`} value={element.text} maxLength={10000} onChange={(event) => update({ text: event.target.value })} /> : <Input id={`${id}-text`} value={element.text} maxLength={500} onChange={(event) => update({ text: event.target.value })} />}
    </label> : null}
    {element.type === "button" ? <>
      <SectionLinkSelect value={element.href} onChange={(href) => update({ href })} options={[]} ariaLabel="Bestemming van knop" />
      <label className="block space-y-1 text-xs font-medium"><span>Knopstijl</span><select className={selectClass} value={element.buttonStyle} onChange={(event) => update({ buttonStyle: event.target.value as SectionElement["buttonStyle"] })}><option value="solid">Gevuld</option><option value="outline">Omlijnd</option><option value="link">Tekstlink</option></select></label>
    </> : null}
    {element.type === "image" ? <>
      {userId ? <SectionImagePicker userId={userId} label="Afbeelding kiezen" value={element.src} onSelect={(src) => update({ src })} /> : null}
      <label className="block space-y-1 text-xs font-medium"><span>Afbeeldingsadres</span><Input value={element.src} placeholder="https://…" onChange={(event) => update({ src: event.target.value })} /></label>
      <label className="block space-y-1 text-xs font-medium"><span>Beschrijving van afbeelding</span><Input value={element.alt} maxLength={500} onChange={(event) => update({ alt: event.target.value })} /></label>
      <label className="block space-y-1 text-xs font-medium"><span>Uitsnede</span><select className={selectClass} value={element.aspect} onChange={(event) => update({ aspect: event.target.value as SectionElement["aspect"] })}><option value="original">Origineel</option><option value="square">Vierkant</option><option value="landscape">Liggend</option><option value="portrait">Staand</option></select></label>
      <label className="block space-y-1 text-xs font-medium"><span>Focus</span><select className={selectClass} value={element.position} onChange={(event) => update({ position: event.target.value as SectionElement["position"] })}>{[["center", "Midden"], ["top", "Boven"], ["bottom", "Onder"], ["left", "Links"], ["right", "Rechts"]].map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label className="block space-y-1 text-xs font-medium"><span>Breedte: {element.width}%</span><input className="w-full accent-primary" type="range" min={25} max={100} value={element.width} onChange={(event) => update({ width: event.target.valueAsNumber })} /></label>
    </> : null}
    {element.type === "icon" ? <div className="flex items-center gap-2 text-xs"><span>Icoon</span><SectionIconPicker value={element.icon} label="los element" onChange={(icon) => update({ icon })} /></div> : null}
    {["heading", "text", "icon"].includes(element.type) ? <label className="block space-y-1 text-xs font-medium"><span>Grootte: {element.size ?? (element.type === "heading" ? 36 : element.type === "icon" ? 40 : 16)}px</span><input className="w-full accent-primary" type="range" min={12} max={element.type === "text" ? 28 : 96} value={element.size ?? (element.type === "heading" ? 36 : element.type === "icon" ? 40 : 16)} onChange={(event) => update({ size: event.target.valueAsNumber })} /></label> : null}
    <label className="block space-y-1 text-xs font-medium"><span>Uitlijning</span><select className={selectClass} value={element.alignment} onChange={(event) => update({ alignment: event.target.value as SectionElement["alignment"] })}><option value="inherit">Volg sectie</option><option value="left">Links</option><option value="center">Midden</option><option value="right">Rechts</option></select></label>
    {free ? columns > 1 ? <label className="block space-y-1 text-xs font-medium"><span>Kolom</span><select className={selectClass} value={element.column} onChange={(event) => update({ column: Number(event.target.value) })}>{Array.from({ length: columns }, (_, index) => <option key={index} value={index}>Kolom {index + 1}</option>)}</select></label> : null : <label className="block space-y-1 text-xs font-medium"><span>Plaats in sectie</span><select className={selectClass} value={element.placement} onChange={(event) => update({ placement: event.target.value as SectionElement["placement"] })}><option value="before">Boven de bestaande inhoud</option><option value="after">Onder de bestaande inhoud</option></select></label>}
  </div>
}
