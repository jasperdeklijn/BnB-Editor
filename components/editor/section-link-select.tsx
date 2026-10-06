"use client"

import { useEffect, useId, useState } from "react"
import { Input } from "@/components/ui/input"
import { useWebsiteLinks } from "./website-links-context"
import { encodeWebsiteLink, parseWebsiteLink, resolveWebsiteLink, safeWebsiteUrl } from "@/lib/website-links"
import type { SectionTargetOption } from "./section-editor-types"

interface SectionLinkSelectProps {
  value: string
  onChange: (value: string) => void
  options: SectionTargetOption[]
  ariaLabel: string
  emptyLabel?: string
}
const selectClass = "h-11 w-full min-w-0 rounded-md border border-input bg-background px-3 text-sm shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"

export function SectionLinkSelect({ value, onChange, options, ariaLabel, emptyLabel = "Kies een sectie" }: SectionLinkSelectProps) {
  const context = useWebsiteLinks()
  const id = useId()
  const target = parseWebsiteLink(value)
  const [emptyKind, setEmptyKind] = useState("section")
  const kind = value ? target.type === "url" && value.startsWith("#") ? "section" : target.type : emptyKind
  const [sectionPage, setSectionPage] = useState(context?.activePageId ?? "")
  const pageId = target.type === "section" ? target.pageId : sectionPage || context?.activePageId || ""
  const [remote, setRemote] = useState<{ pageId: string; options: SectionTargetOption[]; error?: string } | null>(null)
  const loadSections = context?.loadSections
  const currentPage = pageId === context?.activePageId
  useEffect(() => {
    if (kind !== "section" || !pageId || currentPage || !loadSections) return
    let cancelled = false
    loadSections(pageId).then((loaded) => { if (!cancelled) setRemote({ pageId, options: loaded }) })
      .catch(() => { if (!cancelled) setRemote({ pageId, options: [], error: "Secties konden niet worden geladen. Kies de pagina opnieuw om te proberen." }) })
    return () => { cancelled = true }
  }, [kind, pageId, currentPage, loadSections])
  const sectionOptions = context ? currentPage ? context.sectionOptions ?? [] : remote?.pageId === pageId ? remote.options : [] : options
  const sectionValue = target.type === "section" ? target.sectionId : context && value.startsWith("#section-") ? value.slice(9) : value
  const resolved = resolveWebsiteLink(value, context?.pages ?? [], context?.activePageId, context?.localePath)
  const loading = kind === "section" && !currentPage && Boolean(loadSections) && remote?.pageId !== pageId
  const missingPage = target.type !== "url" && !context?.pages.some((page) => page.id === target.pageId)
  return <div className="min-w-0 space-y-2">
    <label htmlFor={`${id}-kind`} className="sr-only">{ariaLabel}: type link</label>
    <select id={`${id}-kind`} value={kind} className={selectClass} onChange={(event) => {
      const next = event.target.value
      setEmptyKind(next)
      setSectionPage(context?.activePageId ?? "")
      onChange(next === "page" && context?.activePageId ? encodeWebsiteLink({ type: "page", pageId: context.activePageId }) : "")
    }}>
      {context?.pages.length ? <option value="page">Pagina</option> : null}
      <option value="section">Sectie</option><option value="url">Webadres</option>
    </select>
    {(kind === "page" || kind === "section") && context?.pages.length ? <select className={selectClass} aria-label={`${ariaLabel}: pagina`} value={kind === "page" && target.type === "page" ? target.pageId : pageId} onChange={(event) => {
      if (kind === "page") onChange(encodeWebsiteLink({ type: "page", pageId: event.target.value }))
      else { setSectionPage(event.target.value); setRemote(null); onChange("") }
    }}>
      {missingPage ? <option value={target.pageId}>Verwijderde pagina</option> : null}
      {context.pages.map((page) => <option key={page.id} value={page.id}>{page.title}{!page.includeInPublication ? " (concept)" : ""}</option>)}
    </select> : null}
    {kind === "section" ? <select value={sectionValue} disabled={loading} onChange={(event) => {
      onChange(context && event.target.value ? encodeWebsiteLink({ type: "section", pageId, sectionId: event.target.value }) : event.target.value)
    }} aria-label={ariaLabel} className={selectClass}>
      <option value="">{loading ? "Secties laden…" : emptyLabel}</option>
      {sectionValue && !sectionOptions.some((option) => option.value === sectionValue) ? <option value={sectionValue}>Onbekende sectie: {sectionValue}</option> : null}
      {sectionOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select> : null}
    {kind === "url" ? <Input className="h-11" type="text" value={value} onChange={(event) => onChange(event.target.value)} aria-label={ariaLabel} placeholder="https://voorbeeld.nl of /contact" /> : null}
    {value && resolved ? <p className="break-all text-xs text-muted-foreground">Doel: {resolved}</p> : null}
    {missingPage ? <p role="alert" className="text-xs text-destructive">Deze pagina bestaat niet meer. Kies een nieuw doel.</p> : null}
    {kind === "section" && target.type === "section" && !loading && !sectionOptions.some((option) => option.value === target.sectionId) ? <p role="alert" className="text-xs text-destructive">Deze sectie bestaat niet meer op de gekozen pagina. Kies een nieuw doel.</p> : null}
    {remote?.pageId === pageId && remote.error && kind === "section" ? <p role="alert" className="text-xs text-destructive">{remote.error}</p> : null}
    {kind === "url" && value && !safeWebsiteUrl(value) ? <p role="alert" className="text-xs text-destructive">Gebruik https://, http://, /pad, mailto: of tel:.</p> : null}
  </div>
}
