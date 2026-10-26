"use client"

import { MediaImage } from "@/components/images/media-image"

import { useState } from "react"
import dynamic from "next/dynamic"
import { Button } from "@/components/ui/button"
import { SectionIcon } from "@/components/sections/section-icon"
import { EditableText } from "./inline-editable-text"
import { WebsiteLink } from "./website-links-context"
import { RepeatingItemActions } from "./repeating-item-actions"
import { createSectionElement, ELEMENT_LABELS, ELEMENT_TYPES, MAX_SECTION_ELEMENTS, moveSectionElement, readSectionElements, safeElementImage, type SectionElement } from "@/lib/section-composition"
import { safeWebsiteUrl, parseWebsiteLink } from "@/lib/website-links"
import styles from "./section-composition.module.css"

const ElementFields = dynamic(() => import("./section-element-fields").then((module) => module.SectionElementFields))

function ElementContent({ element, index, data, isPreview, onUpdate }: {
  element: SectionElement; index: number; data: Record<string, unknown>; isPreview: boolean; onUpdate?: (data: Record<string, unknown>) => void
}) {
  const textProps = { data, path: ["elements", index, "text"], value: element.text, isPreview, onUpdate }
  if (element.type === "heading") return <EditableText as="h2" {...textProps} data-element-heading="true" className="font-bold" style={{ fontSize: element.size ?? "var(--composition-heading, 36px)", textAlign: element.alignment }} />
  if (element.type === "text") return <EditableText as="p" {...textProps} data-element-text="true" multiline style={{ fontSize: element.size ?? "var(--composition-body, 16px)", textAlign: element.alignment }} />
  if (element.type === "divider") return <hr className="border-current opacity-25" />
  if (element.type === "icon") return <span role="img" aria-label="Decoratief icoon" style={{ display: "inline-flex", width: element.size ?? 40, height: element.size ?? 40 }}><SectionIcon icon={element.icon} className="h-full w-full" /></span>
  if (element.type === "image") {
    const src = safeElementImage(element.src)
    const aspectRatio = { original: undefined, square: "1", landscape: "4/3", portrait: "3/4" }[element.aspect]
    return src ? <MediaImage src={src} alt={element.alt} loading="lazy" style={{ width: `${element.width}%`, aspectRatio, objectFit: "cover", objectPosition: element.position, marginInline: element.alignment === "center" ? "auto" : undefined, marginLeft: element.alignment === "right" ? "auto" : undefined }} /> : isPreview ? null : <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">Klik op Aanpassen om een afbeelding te kiezen</div>
  }
  const validTarget = parseWebsiteLink(element.href).type !== "url" || Boolean(safeWebsiteUrl(element.href))
  const className = element.buttonStyle === "outline" ? "border border-current px-6 py-3" : element.buttonStyle === "link" ? "underline underline-offset-4" : "bg-[var(--section-accent)] px-6 py-3 text-[var(--section-accent-foreground)]"
  if (!validTarget || !element.text.trim()) return isPreview ? null : <span className="text-sm text-muted-foreground">Stel de tekst en bestemming van de knop in</span>
  return <WebsiteLink href={element.href} className={`inline-flex rounded-lg font-semibold ${className}`} onClick={(event) => { if (!isPreview) event.preventDefault() }}>{element.text}</WebsiteLink>
}

export function SectionElements({ data, isPreview, onUpdate, userId, columns = 1, free = false, placement = "after" }: {
  data: Record<string, unknown>
  isPreview: boolean
  onUpdate?: (data: Record<string, unknown>) => void
  userId?: string
  columns?: number
  free?: boolean
  placement?: "before" | "after"
}) {
  const [selected, setSelected] = useState<string | null>(null)
  const elements = readSectionElements(data.elements)
  const editing = !isPreview && Boolean(onUpdate)
  const count = Math.max(1, Math.min(3, columns))
  const visible = free ? elements : elements.filter((element) => element.placement === placement)
  if (!visible.length && !editing) return null
  if (!visible.length && !free) return null
  const save = (next: SectionElement[]) => onUpdate?.({ elements: next })
  return <div className={free ? "" : styles.elements} data-section-elements>
    <div className={styles.columns} data-columns={free ? count : 1}>
      {Array.from({ length: free ? count : 1 }, (_, column) => <div className={styles.column} key={column}>
        {visible.filter((element) => !free || Math.min(element.column, count - 1) === column).map((element) => {
          const siblings = visible.filter((item) => item.column === element.column)
          return <div key={element.id} className={styles.element} data-editing={editing || undefined} data-selected={editing && selected === element.id || undefined} style={{ textAlign: element.alignment }} onClick={() => { if (editing) setSelected(element.id) }}>
            {editing ? <div className="mb-2 flex flex-wrap items-center justify-between gap-1 rounded-md bg-background p-1 text-foreground" data-element-controls>
              <Button type="button" variant={selected === element.id ? "secondary" : "ghost"} size="sm" aria-expanded={selected === element.id} onClick={(event) => { event.stopPropagation(); setSelected(selected === element.id ? null : element.id) }}>{ELEMENT_LABELS[element.type]} · Aanpassen</Button>
              <RepeatingItemActions itemLabel={ELEMENT_LABELS[element.type]} index={siblings.findIndex((item) => item.id === element.id)} count={siblings.length} onMove={(direction) => save(moveSectionElement(elements, element.id, direction))} onDuplicate={() => { if (elements.length < MAX_SECTION_ELEMENTS) { const next = [...elements]; next.splice(elements.indexOf(element) + 1, 0, { ...element, id: crypto.randomUUID() }); save(next) } }} onDelete={() => { save(elements.filter((item) => item.id !== element.id)); setSelected(null) }} />
            </div> : null}
            <ElementContent element={element} index={elements.indexOf(element)} data={data} isPreview={isPreview} onUpdate={onUpdate} />
            {editing && selected === element.id ? <div className="mt-3 rounded-lg border bg-background p-3" data-element-controls onClick={(event) => event.stopPropagation()}><ElementFields element={element} userId={userId} columns={count} free={free} onChange={(next) => save(elements.map((item) => item.id === element.id ? next : item))} /><Button type="button" size="sm" variant="outline" className="mt-3" onClick={() => setSelected(null)}>Gereed</Button></div> : null}
          </div>
        })}
        {editing && free ? <div className="rounded-lg border border-dashed p-3" data-element-controls><p className="mb-2 text-xs text-muted-foreground">Kolom {column + 1} · Element toevoegen</p><div className="flex flex-wrap gap-2">{ELEMENT_TYPES.map((type) => <Button type="button" key={type} size="sm" variant="outline" disabled={elements.length >= MAX_SECTION_ELEMENTS} onClick={() => { const element = createSectionElement(type, crypto.randomUUID(), column); save([...elements, element]); setSelected(element.id) }}>+ {ELEMENT_LABELS[type]}</Button>)}</div></div> : null}
      </div>)}
    </div>
  </div>
}
