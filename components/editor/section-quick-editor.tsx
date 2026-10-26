"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import * as Dialog from "@radix-ui/react-dialog"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SectionImagePicker } from "./section-image-picker"
import { SectionLinkSelect } from "./section-link-select"
import { contentAtPath, contentStyleKey, findContentPath, readTextStyle, updateContentPath, type ContentPath } from "@/lib/section-composition"
import type { Section, SectionStyles } from "@/lib/types"

type Selection = { kind: "text" | "image" | "button" | "background"; path: ContentPath; labelPath?: ContentPath; rect: DOMRect }
function parsePath(value: string | undefined): ContentPath | null {
  try { const result: unknown = JSON.parse(value ?? "null"); return Array.isArray(result) && result.every((item) => typeof item === "string" || typeof item === "number") ? result : null } catch { return null }
}

export function SectionQuickEditor({ section, onUpdate, onStyleUpdate, userId, active, children }: {
  section: Section
  onUpdate: (data: Record<string, unknown>) => void
  onStyleUpdate?: (styles: SectionStyles) => void
  userId?: string
  active?: boolean
  children: ReactNode
}) {
  const [selected, setSelected] = useState<Selection | null>(null)
  const wrapper = useRef<HTMLDivElement>(null)
  const latest = useRef(section)
  latest.current = section
  useEffect(() => { if (active === false) setSelected(null) }, [active])
  // A toolbar must not stay floating over another section after scrolling.
  useEffect(() => {
    if (!selected) return
    const close = (event: Event) => { if (event.target instanceof Element && event.target.closest("[data-quick-controls], [role=dialog], [role=alertdialog]")) return; setSelected(null) }
    window.addEventListener("scroll", close, true)
    window.addEventListener("resize", close)
    return () => { window.removeEventListener("scroll", close, true); window.removeEventListener("resize", close) }
  }, [selected])
  const update = (path: ContentPath, value: unknown) => onUpdate(updateContentPath(latest.current.data, path, value))
  const source = selected ? contentAtPath(section.data, selected.path) : ""
  const textStyle = selected ? readTextStyle(section.data, selected.path) : {}
  const imageStyle = selected ? (section.data.imageStyles as Record<string, Record<string, unknown>> | undefined)?.[contentStyleKey(section.data, selected.path)] ?? {} : {}
  const updateTextStyle = (patch: { size?: number; alignment?: string }) => {
    if (!selected) return
    const current = latest.current.data
    const styles = current.textStyles as Record<string, unknown> | undefined
    onUpdate({ textStyles: { ...styles, [contentStyleKey(current, selected.path)]: { ...readTextStyle(current, selected.path), ...patch } } })
  }
  const updateImageStyle = (patch: Record<string, unknown>) => {
    if (!selected) return
    const current = latest.current.data
    const styles = current.imageStyles as Record<string, Record<string, unknown>> | undefined
    const key = contentStyleKey(current, selected.path)
    onUpdate({ imageStyles: { ...styles, [key]: { ...styles?.[key], ...patch } } })
  }
  const selectClass = "h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
  const top = selected ? Math.max(12, Math.min(selected.rect.bottom + 8, window.innerHeight - 400)) : 12
  const left = selected ? Math.max(12, Math.min(selected.rect.left, window.innerWidth - 332)) : 12
  return <div ref={wrapper} onClickCapture={(event) => {
    if (!(event.target instanceof Element) || event.target.closest("[data-element-controls], [data-section-elements], [data-quick-controls], [data-media-controls]")) return
    const target = event.target
    const link = target.closest<HTMLAnchorElement>("a[data-link-target]")
    const text = target.closest<HTMLElement>("[data-editor-path]")
    const image = target.closest<HTMLElement>("img[data-editor-image-path], video[data-editor-image-path]")
    const background = target.closest<HTMLElement>("[data-editor-background]")
    if (link) {
      const labelPath = parsePath(link.querySelector<HTMLElement>("[data-editor-path]")?.dataset.editorPath)
      const path = labelPath && /Text$/.test(String(labelPath.at(-1)))
        ? [...labelPath.slice(0, -1), String(labelPath.at(-1)).replace(/Text$/, "Href")]
        : findContentPath(section.data, link.dataset.linkTarget ?? "", "link")
      if (path) { event.preventDefault(); event.stopPropagation(); setSelected({ kind: "button", path, labelPath: labelPath ?? undefined, rect: link.getBoundingClientRect() }); return }
    }
    if (image) {
      const path = parsePath(image.dataset.editorImagePath)
      if (path) { event.preventDefault(); event.stopPropagation(); setSelected({ kind: "image", path, rect: image.getBoundingClientRect() }); return }
    }
    if (text) {
      const path = parsePath(text.dataset.editorPath)
      if (path) { setSelected({ kind: "text", path, rect: text.getBoundingClientRect() }); return }
    }
    if (background && onStyleUpdate) { setSelected({ kind: "background", path: [], rect: background.getBoundingClientRect() }); return }
    setSelected(null)
  }}>
    {children}
    <Dialog.Root modal={false} open={Boolean(selected)} onOpenChange={(open) => { if (!open) setSelected(null) }}>
      {selected ? <Dialog.Portal><Dialog.Content data-quick-controls className="fixed z-[60] max-h-[min(60vh,450px)] w-[min(320px,calc(100vw-24px))] overflow-y-auto rounded-xl border bg-background p-3 text-foreground shadow-xl" style={{ top, left }} onOpenAutoFocus={(event) => event.preventDefault()} onCloseAutoFocus={(event) => event.preventDefault()} onInteractOutside={(event) => { if (event.target instanceof Node && wrapper.current?.contains(event.target)) event.preventDefault() }} onClick={(event) => event.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between gap-2"><Dialog.Title className="text-sm font-semibold">{selected.kind === "text" ? "Tekst opmaken" : selected.kind === "button" ? "Knop aanpassen" : selected.kind === "background" ? "Achtergrond aanpassen" : "Afbeelding aanpassen"}</Dialog.Title><Dialog.Close asChild><Button type="button" size="icon-sm" variant="ghost" aria-label="Sluit elementbewerking"><X className="h-4 w-4" /></Button></Dialog.Close></div>
        <Dialog.Description className="sr-only">Wijzigingen zijn direct zichtbaar en worden automatisch opgeslagen.</Dialog.Description>
        <div className="space-y-3">
          {selected.kind === "text" ? <>
            <p className="text-xs text-muted-foreground">Typ direct in de tekst. Gebruik hieronder de opmaak.</p>
            <label className="block space-y-1 text-xs"><span>Lettergrootte</span><input type="range" min={12} max={96} value={textStyle.size ?? 24} onChange={(event) => updateTextStyle({ size: event.target.valueAsNumber })} className="w-full accent-primary" /></label>
            <label className="block space-y-1 text-xs"><span>Uitlijning</span><select className={selectClass} value={textStyle.alignment ?? ""} onChange={(event) => updateTextStyle({ alignment: event.target.value || undefined })}><option value="">Volg sectie</option><option value="left">Links</option><option value="center">Midden</option><option value="right">Rechts</option></select></label>
            <Button type="button" size="sm" variant="outline" onClick={() => { const styles = { ...(latest.current.data.textStyles as Record<string, unknown>) }; delete styles[contentStyleKey(latest.current.data, selected.path)]; onUpdate({ textStyles: styles }) }}>Herstel tekstopmaak</Button>
          </> : null}
          {selected.kind === "button" ? <>
            {selected.labelPath ? <label className="block space-y-1 text-xs"><span>Knoptekst</span><Input value={String(contentAtPath(section.data, selected.labelPath) ?? "")} onChange={(event) => update(selected.labelPath!, event.target.value)} /></label> : null}
            <SectionLinkSelect value={String(source ?? "")} onChange={(href) => update(selected.path, href)} options={[]} ariaLabel="Bestemming van knop" />
            <label className="block space-y-1 text-xs"><span>Knopstijl</span><select className={selectClass} value={(section.data.buttonStyles as Record<string, string> | undefined)?.[contentStyleKey(section.data, selected.path)] ?? ""} onChange={(event) => onUpdate({ buttonStyles: { ...(latest.current.data.buttonStyles as Record<string, string>), [contentStyleKey(latest.current.data, selected.path)]: event.target.value } })}><option value="">Volg de indeling</option><option value="solid">Gevuld</option><option value="outline">Omlijnd</option><option value="link">Tekstlink</option></select></label>
          </> : null}
          {selected.kind === "image" ? <>
            {userId ? <SectionImagePicker userId={userId} label="Afbeelding vervangen" value={String(source ?? "")} onSelect={(src) => update(selected.path, src)} /> : null}
            <label className="block space-y-1 text-xs"><span>Afbeeldingsadres</span><Input value={String(source ?? "")} onChange={(event) => update(selected.path, event.target.value)} /></label>
            <label className="block space-y-1 text-xs"><span>Breedte: {Number(imageStyle.width ?? 100)}%</span><input type="range" min={25} max={100} value={Number(imageStyle.width ?? 100)} onChange={(event) => updateImageStyle({ width: event.target.valueAsNumber })} className="w-full accent-primary" /></label>
            <label className="block space-y-1 text-xs"><span>Uitsnede</span><select className={selectClass} value={String(imageStyle.aspect ?? "original")} onChange={(event) => updateImageStyle({ aspect: event.target.value })}><option value="original">Origineel</option><option value="square">Vierkant</option><option value="landscape">Liggend</option><option value="portrait">Staand</option></select></label>
            <label className="block space-y-1 text-xs"><span>Focus</span><select className={selectClass} value={String(imageStyle.position ?? "center")} onChange={(event) => updateImageStyle({ position: event.target.value })}>{[["center", "Midden"], ["top", "Boven"], ["bottom", "Onder"], ["left", "Links"], ["right", "Rechts"]].map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          </> : null}
          {selected.kind === "background" && onStyleUpdate ? <>
            {userId ? <SectionImagePicker userId={userId} label="Achtergrond kiezen" value={section.styles?.backgroundImage} onSelect={(backgroundImage) => onStyleUpdate({ ...latest.current.styles, backgroundImage })} /> : null}
            <label className="block space-y-1 text-xs"><span>Focus</span><select className={selectClass} value={section.styles?.backgroundPosition ?? "center"} onChange={(event) => onStyleUpdate({ ...latest.current.styles, backgroundPosition: event.target.value })}>{[["center", "Midden"], ["top", "Boven"], ["bottom", "Onder"], ["left", "Links"], ["right", "Rechts"]].map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          </> : null}
        </div>
      </Dialog.Content></Dialog.Portal> : null}
    </Dialog.Root>
  </div>
}
