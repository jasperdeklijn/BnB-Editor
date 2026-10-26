"use client"

import { Button } from "@/components/ui/button"
import { createSectionElement, ELEMENT_LABELS, ELEMENT_TYPES, fitElementColumns, MAX_SECTION_ELEMENTS, moveSectionElement, readSectionElements } from "@/lib/section-composition"
import { SectionElementFields } from "./section-element-fields"
import { RepeatingItemActions } from "./repeating-item-actions"

export function SectionElementsEditor({ data, onUpdate, userId, free = false }: {
  data: Record<string, unknown>
  onUpdate: (patch: Record<string, unknown>) => void
  userId?: string
  free?: boolean
}) {
  const elements = readSectionElements(data.elements)
  const columns = free && [2, 3].includes(Number(data.columns)) ? Number(data.columns) : 1
  const save = (next: typeof elements) => onUpdate({ elements: next })
  return <div className="space-y-3">
    {free ? <label className="block space-y-1 text-xs font-medium"><span>Aantal kolommen</span><select className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm" value={columns} onChange={(event) => onUpdate({ columns: Number(event.target.value), elements: fitElementColumns(elements, Number(event.target.value)) })}><option value={1}>Eén kolom</option><option value={2}>Twee kolommen</option><option value={3}>Drie kolommen</option></select></label> : null}
    <p className="text-xs text-muted-foreground">{free ? "Bouw uw eigen indeling. Op mobiel staan kolommen onder elkaar." : "Voeg eigen elementen boven of onder de bestaande inhoud toe."}</p>
    {elements.map((element) => {
      const siblings = elements.filter((item) => item.column === element.column && item.placement === element.placement)
      return <details key={element.id} className="rounded-lg border border-border bg-background p-3">
        <summary className="cursor-pointer text-sm font-medium">{ELEMENT_LABELS[element.type]}{element.text ? ` · ${element.text.slice(0, 32)}` : ""}{free && columns > 1 ? ` · kolom ${element.column + 1}` : ""}</summary>
        <div className="mt-3 space-y-3">
          <RepeatingItemActions itemLabel={ELEMENT_LABELS[element.type]} index={siblings.findIndex((item) => item.id === element.id)} count={siblings.length} onMove={(direction) => save(moveSectionElement(elements, element.id, direction))} onDuplicate={() => { if (elements.length < MAX_SECTION_ELEMENTS) { const next = [...elements]; next.splice(elements.indexOf(element) + 1, 0, { ...element, id: crypto.randomUUID() }); save(next) } }} onDelete={() => save(elements.filter((item) => item.id !== element.id))} />
          <SectionElementFields element={element} columns={columns} free={free} userId={userId} onChange={(next) => save(elements.map((item) => item.id === element.id ? next : item))} />
        </div>
      </details>
    })}
    <fieldset className="space-y-2"><legend className="text-sm font-semibold">Element toevoegen</legend><div className="grid grid-cols-2 gap-2">{ELEMENT_TYPES.map((type) => <Button type="button" variant="outline" size="sm" key={type} disabled={elements.length >= MAX_SECTION_ELEMENTS} onClick={() => save([...elements, createSectionElement(type, crypto.randomUUID())])}>+ {ELEMENT_LABELS[type]}</Button>)}</div></fieldset>
    <p className="text-xs text-muted-foreground">{elements.length} / {MAX_SECTION_ELEMENTS} elementen</p>
  </div>
}
