"use client"

import { useState, type ReactNode } from "react"
import Link from "next/link"
import { Dialog, DropdownMenu } from "radix-ui"
import { CheckCircle2, ChevronDown, Eye, FileJson, Globe, LayoutTemplate, Loader2, MoreHorizontal, Pencil, Plus, Redo2, Search, Trash2, Undo2, X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface EditorWebsiteToolbarProps {
  websites: { id: string; label: string }[]
  websiteId: string | null
  title: string
  busy: boolean
  saving: boolean
  renaming: boolean
  canUndo: boolean
  canRedo: boolean
  canPublish: boolean
  published: boolean
  previewHref: string
  liveHref: string
  languageControl: ReactNode
  onWebsiteChange: (id: string) => void
  onCreate: () => void
  onDelete: () => void
  onRename: (name: string) => Promise<boolean>
  onImport: () => void
  onUndo: () => void
  onRedo: () => void
  onPublish: () => void
}

const menuItemClass = "flex min-h-11 cursor-pointer items-center gap-2 rounded-md px-3 text-sm outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground"
const menuContentClass = "z-[100] min-w-56 max-w-[calc(100vw-1.5rem)] rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-lg"

export function EditorWebsiteToolbar(props: EditorWebsiteToolbarProps) {
  const [renameOpen, setRenameOpen] = useState(false)
  const [name, setName] = useState(props.title)
  const [renameError, setRenameError] = useState("")

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      <div className="flex w-full min-w-0 items-center gap-2 sm:w-auto">
        <label htmlFor="website-selector" className="sr-only">Website</label>
        <div className="relative min-w-0 flex-1 sm:w-44 lg:w-52">
          <LayoutTemplate className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
          <select id="website-selector" value={props.websiteId ?? ""} disabled={props.busy} onChange={(event) => props.onWebsiteChange(event.target.value)}
            className="h-11 w-full min-w-0 cursor-pointer appearance-none rounded-md border border-input bg-background pl-9 pr-8 text-sm font-medium outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50">
            {props.websites.map((website) => <option key={website.id} value={website.id}>{website.label}</option>)}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        </div>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild><Button variant="outline" className="h-11 px-3" disabled={props.busy} aria-label="Ontwerpen beheren"><MoreHorizontal className="h-4 w-4" /><span className="hidden sm:inline">Ontwerpen beheren</span></Button></DropdownMenu.Trigger>
          <DropdownMenu.Portal><DropdownMenu.Content align="start" sideOffset={6} className={menuContentClass}>
            <DropdownMenu.Label className="px-3 py-2 text-xs font-semibold text-muted-foreground">Ontwerpen beheren</DropdownMenu.Label>
            <DropdownMenu.Item className={menuItemClass} onSelect={props.onCreate}><Plus className="h-4 w-4" />Nieuw ontwerp</DropdownMenu.Item>
            <DropdownMenu.Item className={menuItemClass} disabled={!props.websiteId} onSelect={() => { setName(props.title); setRenameError(""); setRenameOpen(true) }}><Pencil className="h-4 w-4" />Naam wijzigen</DropdownMenu.Item>
            <DropdownMenu.Separator className="my-1 h-px bg-border" />
            <DropdownMenu.Item className={`${menuItemClass} text-destructive`} disabled={!props.websiteId} onSelect={props.onDelete}><Trash2 className="h-4 w-4" />Ontwerp verwijderen</DropdownMenu.Item>
          </DropdownMenu.Content></DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
      {props.languageControl}
      <div className="inline-flex items-center rounded-md border border-border bg-background">
        <Button variant="ghost" className="h-11 w-11 px-0" onClick={props.onUndo} disabled={!props.canUndo || props.busy} aria-label="Wijziging ongedaan maken" title="Ongedaan maken (Ctrl+Z)"><Undo2 className="h-4 w-4" /></Button>
        <Button variant="ghost" className="h-11 w-11 px-0" onClick={props.onRedo} disabled={!props.canRedo || props.busy} aria-label="Wijziging opnieuw toepassen" title="Opnieuw toepassen (Ctrl+Shift+Z)"><Redo2 className="h-4 w-4" /></Button>
      </div>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild><Button variant="outline" className="h-11" disabled={props.busy}>Importeren<ChevronDown className="h-4 w-4" /></Button></DropdownMenu.Trigger>
        <DropdownMenu.Portal><DropdownMenu.Content align="start" sideOffset={6} className={menuContentClass}>
          <DropdownMenu.Item className={menuItemClass} onSelect={props.onImport}><FileJson className="h-4 w-4" />JSON importeren</DropdownMenu.Item>
          <DropdownMenu.Item asChild className={menuItemClass}><Link href="/editor/flexstart"><Globe className="h-4 w-4" />Bestaande website overnemen</Link></DropdownMenu.Item>
        </DropdownMenu.Content></DropdownMenu.Portal>
      </DropdownMenu.Root>
      <Button variant="ghost" asChild className="h-11"><Link href={`/editor/seo${props.websiteId ? `?websiteId=${encodeURIComponent(props.websiteId)}` : ""}`}><Search className="h-4 w-4" /><span className="sr-only sm:not-sr-only">SEO & Analytics</span></Link></Button>
      <div className="flex w-full flex-wrap items-center justify-end gap-2 border-t border-border pt-2 sm:ml-auto sm:w-auto sm:border-0 sm:pt-0">
        {props.previewHref ? <Button variant="outline" asChild className="h-11"><a href={props.previewHref} target="_blank" rel="noreferrer"><Eye className="h-4 w-4" /><span className="sr-only sm:not-sr-only">Preview</span></a></Button> : null}
        {props.published && props.liveHref ? <a className="hidden max-w-36 truncate text-xs text-primary underline xl:block" href={props.liveHref} target="_blank" rel="noreferrer">Website live</a> : null}
        <Button variant="outline" className="h-11" disabled={!props.websiteId || props.busy} asChild><Link aria-disabled={!props.websiteId || props.busy} tabIndex={!props.websiteId || props.busy ? -1 : undefined} className={!props.websiteId || props.busy ? "pointer-events-none opacity-50" : ""} href={`/editor/flexcheck?websiteId=${encodeURIComponent(props.websiteId ?? "")}`}><CheckCircle2 className="h-4 w-4" />FlexCheck</Link></Button>
        <Button variant={props.canPublish ? "default" : "outline"} className="h-11" disabled={!props.websiteId || props.saving || props.busy} onClick={props.onPublish} title={props.canPublish ? (props.published ? "Nieuwe versie publiceren" : "Website publiceren") : "Bekijk wat publiceren blokkeert"}>Publiceren</Button>
      </div>
      <Dialog.Root open={renameOpen} onOpenChange={(open) => { if (!props.renaming) setRenameOpen(open) }}>
        <Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-[100] bg-black/40" /><Dialog.Content className="fixed left-1/2 top-1/2 z-[101] w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-background p-5 shadow-xl">
          <Dialog.Title className="text-lg font-semibold">Naam wijzigen</Dialog.Title>
          <Dialog.Description className="mt-2 text-sm text-muted-foreground">Wijzig de naam van dit ontwerp. Bij een live website kan ook de platformlink wijzigen.</Dialog.Description>
          <form className="mt-4 space-y-4" onSubmit={async (event) => { event.preventDefault(); setRenameError(""); try { if (await props.onRename(name)) setRenameOpen(false); else setRenameError("De naam kon niet worden opgeslagen.") } catch { setRenameError("De naam kon niet worden opgeslagen. Probeer opnieuw.") } }}>
            <label className="block space-y-2 text-sm font-medium">Websitenaam<input className="h-11 w-full rounded-md border border-input bg-background px-3 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50" value={name} onChange={(event) => setName(event.target.value)} disabled={props.renaming} required /></label>
            {renameError ? <p role="alert" className="text-sm text-destructive">{renameError}</p> : null}
            <div className="flex justify-end gap-2"><Dialog.Close asChild><Button variant="outline" disabled={props.renaming}>Annuleren</Button></Dialog.Close><Button type="submit" disabled={props.renaming || !name.trim()}>{props.renaming ? <Loader2 className="h-4 w-4 animate-spin" /> : null}Opslaan</Button></div>
          </form>
          <Dialog.Close asChild><Button variant="ghost" size="icon" disabled={props.renaming} aria-label="Sluiten" className="absolute right-2 top-2"><X className="h-4 w-4" /></Button></Dialog.Close>
        </Dialog.Content></Dialog.Portal>
      </Dialog.Root>
    </div>
  )
}
