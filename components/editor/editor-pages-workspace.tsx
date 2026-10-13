"use client"

import { createContext, useContext, useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react"
import { Dialog } from "radix-ui"
import { ArrowDown, ArrowUp, Check, FileText, Home, Layers, Loader2, PanelLeft, Plus, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { RESERVED_PAGE_SLUGS, type WebsitePage, type PageSettings } from "@/lib/website-pages"
import type { Section } from "@/lib/types"
import { createClient } from "@/lib/supabase/client"
import { getTranslationSourceHash } from "@/lib/i18n/section-translations"

type PreviewPage = WebsitePage

const HOME_PAGE: PreviewPage = {
  id: "home",
  websiteId: "",
  position: 0,
  seo: {},
  title: "Home",
  slug: "",
  isHome: true,
  showInNavigation: true,
  includeInPublication: true,
}

const RESERVED_SLUGS = RESERVED_PAGE_SLUGS

function suggestSlug(title: string) {
  return title.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
}

function pagePath(page: PreviewPage, localePath: string) {
  const segments = [localePath, page.isHome ? "" : page.slug].filter(Boolean)
  return segments.length ? `/${segments.join("/")}` : "/"
}

interface EditorPagesWorkspaceProps {
  children: ReactNode
  siteAddress: string
  localePath?: string
  sectionCount: number
  disabled?: boolean
  pages: WebsitePage[]
  activePageId: string | null
  loading?: boolean
  beforePageChange: () => Promise<boolean>
  onPageChange: (pageId: string) => Promise<boolean>
  onSavePage: (pageId: string | null, values: PageSettings) => Promise<WebsitePage>
  onReorderPages: (ids: string[]) => Promise<void>
  onDeletePage: (pageId: string) => Promise<void>
  onDuplicatePage: (pageId: string, title: string, slug: string) => Promise<WebsitePage>
  onReplaceHome: (pageId: string, oldHomeSlug: string) => Promise<void>
  sections: Section[]
  selectedSectionId: string | null
  onSectionDestination: (sectionId: string, pageId: string | null, scope?: string) => Promise<void>
  onCreateShared: (type: "nav" | "footer") => Promise<void>
  onSelectSection: (id: string) => void
  advancedReady: boolean
  hasMultipageAccess: boolean
  advancedSeoAllowed?: boolean
}

const PageSelectorContext = createContext<{
  renderSelector: (panelId: string) => ReactNode
  activePageId: string
} | null>(null)

/** Each canvas gets its own accessible selector, sharing the workspace's page state. */
export function EditorPageSelector({ panelId }: { panelId: string }) {
  const context = useContext(PageSelectorContext)
  return context?.renderSelector(panelId) ?? null
}

export function EditorPagePanel({ id, children, className }: { id: string; children: ReactNode; className?: string }) {
  const context = useContext(PageSelectorContext)
  return (
    <div id={id} role={context ? "tabpanel" : undefined} aria-labelledby={context ? `${id}-tab-${context.activePageId}` : undefined} tabIndex={context ? 0 : undefined} className={className}>
      {children}
    </div>
  )
}

/** Controlled, persisted draft pages; every page uses the same editor panels. */
export function EditorPagesWorkspace({
  children, siteAddress, localePath = "", sectionCount, disabled = false,
  pages, activePageId, loading = false, beforePageChange, onPageChange, onSavePage, onReorderPages, onDeletePage,
  onDuplicatePage, onReplaceHome, sections, selectedSectionId, onSectionDestination, onCreateShared, onSelectSection,
  advancedReady, hasMultipageAccess, advancedSeoAllowed = false,
}: EditorPagesWorkspaceProps) {
  const workspaceRef = useRef<HTMLDivElement>(null)
  const focusSelectedTabRef = useRef(false)
  const managerTriggerRef = useRef<HTMLButtonElement | null>(null)
  const [settingsPageId, setSettingsPageId] = useState<string | null>("active")
  const [managerOpen, setManagerOpen] = useState(false)
  const [switching, setSwitching] = useState(false)
  const [tabFocusVersion, setTabFocusVersion] = useState(0)
  const [switchError, setSwitchError] = useState("")
  const [announcement, setAnnouncement] = useState("")
  const activePage = pages.find((page) => page.id === activePageId) ?? pages[0] ?? HOME_PAGE
  const settingsPage = pages.find((page) => page.id === (settingsPageId === "active" ? activePageId : settingsPageId)) ?? null
  const busy = disabled || switching || loading || pages.length === 0
  const selectedSection = sections.find((section) => section.id === selectedSectionId)

  async function runAction(action: () => Promise<unknown>) {
    if (busy) return
    if (!advancedReady) { setSwitchError("Installeer eerst de nieuwe multipage-migratie om pagina's en gedeelde onderdelen te wijzigen."); return }
    setSwitching(true); setSwitchError("")
    try {
      if (!(await beforePageChange())) throw new Error("Sla eerst uw wijzigingen op.")
      await action()
      setAnnouncement("Wijziging opgeslagen.")
    } catch (error) { setSwitchError(error instanceof Error ? error.message : "De wijziging kon niet worden opgeslagen.") }
    finally { setSwitching(false) }
  }

  useEffect(() => {
    if (switching || !focusSelectedTabRef.current) return
    focusSelectedTabRef.current = false
    const tab = Array.from(workspaceRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"][aria-selected="true"]') ?? [])
      .find((button) => button.getClientRects().length > 0)
    tab?.focus({ preventScroll: true })
    tab?.scrollIntoView({ block: "nearest", inline: "nearest" })
  }, [switching, tabFocusVersion])

  async function selectPage(page: PreviewPage) {
    if (busy) return false
    if (page.id === activePageId) return true
    setSwitching(true)
    setSwitchError("")
    try {
      if (!(await beforePageChange())) {
        setSwitchError("Uw wijzigingen konden niet worden opgeslagen. Probeer opnieuw voordat u van pagina wisselt.")
        return false
      }
      return await onPageChange(page.id)
    } catch {
      setSwitchError("De pagina kon niet worden geopend. Uw huidige pagina blijft geselecteerd.")
      return false
    } finally {
      setSwitching(false)
      if (focusSelectedTabRef.current) setTabFocusVersion((version) => version + 1)
    }
  }

  function openManager(create = false, trigger?: HTMLButtonElement) {
    managerTriggerRef.current = trigger ?? null
    setSettingsPageId(create ? null : activePage.id)
    setAnnouncement("")
    setSwitchError("")
    setManagerOpen(true)
  }

  async function applySettings(values: PageSettings) {
    if (busy || !advancedReady) return
    setSwitching(true)
    setSwitchError("")
    try {
      if (!(await beforePageChange())) throw new Error("Sla de huidige wijzigingen eerst opnieuw op.")
      const page = await onSavePage(settingsPage?.id ?? null, values)
      setSettingsPageId(page.id)
      setAnnouncement("Pagina opgeslagen. Kies Pagina openen om deze te bewerken.")
    } catch (error) {
      setSwitchError(error instanceof Error ? error.message : "De pagina kon niet worden opgeslagen.")
    } finally { setSwitching(false) }
  }

  async function movePage(id: string, direction: -1 | 1) {
      if (busy || !advancedReady) return
      const index = pages.findIndex((page) => page.id === id)
      const nextIndex = index + direction
      if (index < 1 || nextIndex < 1 || nextIndex >= pages.length) return
      const next = [...pages]
      ;[next[index], next[nextIndex]] = [next[nextIndex], next[index]]
      setSwitching(true)
      setSwitchError("")
      try {
        if (!(await beforePageChange())) throw new Error("Sla de huidige wijzigingen eerst opnieuw op.")
        await onReorderPages(next.map((page) => page.id))
      } catch { setSwitchError("De paginavolgorde kon niet worden opgeslagen.") }
      finally { setSwitching(false) }
  }

  async function removePage(page: PreviewPage) {
    if (busy || !advancedReady || page.isHome) return
    if (!window.confirm(`Pagina '${page.title}' en alle secties op deze pagina verwijderen?`)) return
    setSwitching(true)
    setSwitchError("")
    try {
      if (!(await beforePageChange())) throw new Error("Sla de huidige wijzigingen eerst opnieuw op.")
      await onDeletePage(page.id)
      setSettingsPageId("active")
      setAnnouncement(`${page.title} verwijderd.`)
    } catch (error) { setSwitchError(error instanceof Error ? error.message : "De pagina kon niet worden verwijderd.") }
    finally { setSwitching(false) }
  }

  function selectPageFromTab(page: PreviewPage) {
    if (busy || page.id === activePageId || focusSelectedTabRef.current) return
    focusSelectedTabRef.current = true
    void selectPage(page)
  }

  function renderPageSelector(panelId: string) {
    return (
      <div className="sticky top-0 z-30 shrink-0" aria-label="Paginakeuze">
        <div className="flex shrink-0 items-center gap-2 border-b border-border bg-background px-3 py-2 md:px-4">
          <Tabs value={activePage.id} activationMode="manual" className="min-w-0 flex-1" onValueChange={(id) => {
            const page = pages.find((candidate) => candidate.id === id)
            if (page) selectPageFromTab(page)
          }}>
            <div className="overflow-x-auto overflow-y-hidden">
              <TabsList variant="line" aria-label="Pagina's" aria-busy={switching} className="h-11 w-max min-w-full justify-start px-0 group-data-[orientation=horizontal]/tabs:h-11">
                {pages.map((page) => (
                  <TabsTrigger key={page.id} id={`${panelId}-tab-${page.id}`} aria-controls={panelId} value={page.id} disabled={busy} onMouseDown={(event) => event.preventDefault()} onClick={() => selectPageFromTab(page)} title={`${page.title} · ${siteAddress}${pagePath(page, localePath)}`} className="h-11 flex-none px-3 data-[state=active]:text-primary after:!bg-primary after:!bottom-0">
                    {switching && page.id === activePageId ? <Loader2 className="h-4 w-4 animate-spin" /> : page.isHome ? <Home className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                    <span className="max-w-48 truncate">{page.title}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
          </Tabs>
          <Button data-editor-page-manager type="button" variant="outline" className="h-11 shrink-0 px-3" disabled={busy} onClick={(event) => openManager(false, event.currentTarget)} aria-label="Pagina's beheren">
            <PanelLeft className="h-4 w-4" /><span className="hidden sm:inline">Pagina&apos;s</span><span className="hidden rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground sm:inline">{pages.length}</span>
          </Button>
          <Button type="button" variant="ghost" className="hidden h-11 w-11 shrink-0 px-0 md:inline-flex" disabled={busy || !hasMultipageAccess} onClick={(event) => openManager(true, event.currentTarget)} aria-label="Nieuwe pagina" title={hasMultipageAccess ? "Nieuwe pagina" : "Conceptpagina's zijn onbeperkt"}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {switchError ? <p role="alert" className="border-b border-destructive/20 bg-destructive/5 px-4 py-2 text-sm text-destructive">{switchError}</p> : null}
      </div>
    )
  }

  return (
    <PageSelectorContext.Provider value={{ renderSelector: renderPageSelector, activePageId: activePage.id }}>
      <div ref={workspaceRef} className="flex min-h-0 flex-1 flex-col">
        <div inert={switching || loading} aria-busy={loading || switching} className="relative flex min-h-0 flex-1 flex-col">
          {children}
        </div>

        <Dialog.Root open={managerOpen} onOpenChange={setManagerOpen}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-[100] bg-black/40" />
            <Dialog.Content onCloseAutoFocus={(event) => {
              event.preventDefault()
              const trigger = managerTriggerRef.current
              const visibleManager = Array.from(workspaceRef.current?.querySelectorAll<HTMLButtonElement>("[data-editor-page-manager]") ?? [])
                .find((button) => button.getClientRects().length > 0)
              ;(trigger?.isConnected && trigger.getClientRects().length > 0 ? trigger : visibleManager)?.focus()
            }} className="fixed inset-y-0 right-0 z-[101] flex w-full max-w-2xl flex-col border-l border-border bg-background shadow-xl">
              <div className="shrink-0 border-b border-border px-5 py-4 pr-14">
                <div className="flex items-center gap-2"><Dialog.Title className="text-lg font-semibold">Pagina&apos;s</Dialog.Title><span className="rounded-full border border-primary/20 bg-primary/5 px-2 py-0.5 text-xs font-medium text-primary">Concept</span></div>
                <Dialog.Description className="mt-1 text-sm leading-relaxed text-muted-foreground">Beheer uw pagina&apos;s. Iedere pagina heeft eigen secties en een eigen webadres.</Dialog.Description>
                <Dialog.Close asChild><Button type="button" variant="ghost" size="icon" aria-label="Pagina's sluiten" className="absolute right-3 top-3"><X className="h-4 w-4" /></Button></Dialog.Close>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto sm:grid sm:grid-cols-[240px_minmax(0,1fr)]">
                <div className="border-b border-border bg-muted/25 p-4 sm:border-b-0 sm:border-r">
                  <div className="mb-3 flex items-center justify-between"><h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Uw pagina&apos;s</h3><span className="text-xs text-muted-foreground">{pages.length}</span></div>
                  <ul className="space-y-1.5" aria-label="Paginaoverzicht">
                    {pages.map((page, index) => (
                      <li key={page.id} className={cn("rounded-lg border", settingsPageId === page.id ? "border-primary/25 bg-primary/5" : "border-transparent hover:bg-muted")}>
                        <button type="button" className="flex w-full min-w-0 items-start gap-2.5 rounded-lg p-3 text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50" onClick={() => { setSettingsPageId(page.id); setAnnouncement("") }} disabled={busy} aria-pressed={settingsPageId === page.id} aria-label={`Instellingen van ${page.title}`}>
                          {page.isHome ? <Home className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> : <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />}
                          <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{page.title}</span><span className="mt-0.5 block truncate text-xs text-muted-foreground">{page.isHome ? "Startpagina" : page.includeInPublication ? "Bij publicatie" : "Concept"} · {pagePath(page, localePath)}</span></span>
                          {activePageId === page.id ? <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-label="Geopende pagina" /> : null}
                        </button>
                        {!page.isHome && settingsPageId === page.id ? <div className="flex justify-end gap-1 px-2 pb-2"><Button type="button" variant="ghost" size="icon-sm" disabled={busy || index === 1} onClick={() => movePage(page.id, -1)} aria-label={`${page.title} omhoog`}><ArrowUp className="h-3.5 w-3.5" /></Button><Button type="button" variant="ghost" size="icon-sm" disabled={busy || index === pages.length - 1} onClick={() => movePage(page.id, 1)} aria-label={`${page.title} omlaag`}><ArrowDown className="h-3.5 w-3.5" /></Button></div> : null}
                      </li>
                    ))}
                  </ul>
                  <Button type="button" variant="outline" className="mt-3 h-10 w-full" disabled={busy || !hasMultipageAccess} onClick={() => { setSettingsPageId(null); setAnnouncement("") }}><Plus className="h-4 w-4" />Nieuwe pagina</Button>
                  <p className="mt-2 text-xs text-muted-foreground">Conceptpagina’s tellen niet mee. Publiceer maximaal 3 pagina’s bij Bronze, 10 bij Silver of onbeperkt bij Gold (fair-use).</p>
                  <div className="mt-6 border-t border-border pt-4">
                    <h3 className="flex items-center gap-2 text-xs font-semibold text-muted-foreground"><Layers className="h-3.5 w-3.5" />Gedeelde onderdelen</h3>
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">Gedeeld op alle pagina&apos;s. Wijzigingen aan deze onderdelen gelden overal.</p>
                    {(["nav", "footer"] as const).map((type) => {
                      const shared = sections.find((section) => section.scope === (type === "nav" ? "site_header" : "site_footer"))
                      return <Button key={type} type="button" variant="outline" className="mt-2 min-h-11 w-full" disabled={busy || !advancedReady} onClick={() => shared ? (onSelectSection(shared.id), setManagerOpen(false)) : void runAction(() => onCreateShared(type))}>{type === "nav" ? "Header" : "Footer"} {shared ? "bewerken" : "toevoegen"}</Button>
                    })}
                    {selectedSection ? <div className="mt-3 space-y-2">
                      <Label htmlFor="section-destination">Verplaatsen naar pagina</Label>
                      <select id="section-destination" className="min-h-11 w-full rounded-md border bg-background px-2 text-sm" disabled={busy} value="" onChange={(event) => { const pageId = event.target.value; if (pageId) void runAction(() => onSectionDestination(selectedSection.id, pageId)) }}>
                        <option value="">Kies een pagina</option>{pages.filter((page) => page.id !== activePageId || selectedSection.scope !== "page").map((page) => <option key={page.id} value={page.id}>{page.title}</option>)}
                      </select>
                      {(selectedSection.type === "nav" || selectedSection.type === "footer") && (!selectedSection.scope || selectedSection.scope === "page") ? <Button type="button" variant="outline" className="min-h-11 w-full" disabled={busy} onClick={() => void runAction(() => onSectionDestination(selectedSection.id, null, selectedSection.type === "nav" ? "site_header" : "site_footer"))}>Delen op alle pagina&apos;s</Button> : null}
                    </div> : null}
                  </div>
                </div>
                <div className="min-w-0 p-5">
                  {!advancedReady ? <p role="status" className="mb-4 rounded-md border p-3 text-sm">De nieuwe multipage-migratie moet nog worden geïnstalleerd. Bestaande pagina&apos;s kunt u bekijken; de nieuwe beheeracties volgen na installatie.</p> : null}
                  <PageSettingsForm advancedSeoAllowed={advancedSeoAllowed} key={settingsPage?.id ?? "new"} page={settingsPage} pages={pages} localePath={localePath} busy={busy || !advancedReady || (!settingsPage && !hasMultipageAccess)} onApply={applySettings} />
                  {settingsPage && advancedReady ? <PageLocaleAndRedirectSettings key={`${settingsPage.id}:${localePath}`} page={settingsPage} localePath={localePath} busy={busy} /> : null}
                  {announcement ? <p role="status" className="mt-3 rounded-md border border-primary/20 bg-primary/5 p-3 text-xs leading-relaxed text-primary">{announcement}</p> : null}
                  {switchError ? <p role="alert" className="mt-3 text-sm text-destructive">{switchError}</p> : null}
                  {settingsPage ? <div className="mt-5 space-y-3 border-t border-border pt-4">
                    <Button type="button" className="h-10 w-full" disabled={busy} onClick={async () => { if (await selectPage(settingsPage)) setManagerOpen(false) }}>{switching ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}Pagina openen{settingsPage.isHome ? ` · ${sectionCount} secties` : ""}</Button>
                    <Button type="button" variant="outline" className="min-h-11 w-full" disabled={busy || !advancedReady || !hasMultipageAccess} onClick={() => {
                      const title = window.prompt("Naam van de kopie", `${settingsPage.title} kopie`)
                      if (!title) return
                      const slug = window.prompt("Webadres van de kopie", `${settingsPage.slug || "home"}-kopie`)
                      if (slug) void runAction(async () => { const page = await onDuplicatePage(settingsPage.id, title, slug); setSettingsPageId(page.id) })
                    }}>Pagina dupliceren</Button>
                    {!settingsPage.isHome ? <Button type="button" variant="outline" className="min-h-11 w-full" disabled={busy || !advancedReady} onClick={() => {
                      const slug = window.prompt("Nieuw webadres voor de huidige startpagina", "vorige-home")
                      if (slug && window.confirm("Deze pagina als startpagina instellen? De huidige startpagina blijft behouden op het gekozen adres.")) void runAction(() => onReplaceHome(settingsPage.id, slug))
                    }}>Instellen als startpagina</Button> : null}
                    {!settingsPage.isHome ? <Button type="button" variant="ghost" className="w-full text-destructive hover:bg-destructive/5 hover:text-destructive" disabled={busy || !advancedReady} onClick={() => void removePage(settingsPage)}><Trash2 className="h-4 w-4" />Pagina verwijderen</Button> : null}
                  </div> : null}
                </div>
              </div>
              <div className="shrink-0 border-t border-border px-5 py-3 text-xs leading-relaxed text-muted-foreground">Pagina&apos;s worden als concept opgeslagen. Bij publicatie worden alle opgenomen pagina&apos;s en gedeelde onderdelen samen live gezet.</div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </div>
    </PageSelectorContext.Provider>
  )
}

interface PageSettingsFormProps {
  advancedSeoAllowed: boolean
  page: PreviewPage | null
  pages: PreviewPage[]
  localePath: string
  busy: boolean
  onApply: (values: PageSettings) => Promise<void>
}

function PageSettingsForm({ advancedSeoAllowed, page, pages, localePath, busy, onApply }: PageSettingsFormProps) {
  const id = useId()
  const [title, setTitle] = useState(page?.title ?? "")
  const [slug, setSlug] = useState(page?.slug ?? "")
  const [slugEdited, setSlugEdited] = useState(Boolean(page))
  const [showInNavigation, setShowInNavigation] = useState(page?.showInNavigation ?? true)
  const [includeInPublication, setIncludeInPublication] = useState(page?.includeInPublication ?? false)
  const [error, setError] = useState("")
  const [seoTitle, setSeoTitle] = useState(String(page?.seo.title ?? ""))
  const [seoDescription, setSeoDescription] = useState(String(page?.seo.description ?? ""))
  const [ogImage, setOgImage] = useState(String(page?.seo.ogImage ?? ""))
  const isHome = page?.isHome === true
  const path = pagePath({ ...HOME_PAGE, isHome, slug }, localePath)

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    const normalizedSlug = slug.trim().toLowerCase()
    if (!title.trim()) { setError("Geef uw pagina een naam."); return }
    if (!isHome && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalizedSlug)) { setError("Gebruik letters, cijfers en koppeltekens voor het webadres."); return }
    if (RESERVED_SLUGS.has(normalizedSlug)) { setError("Dit webadres is gereserveerd. Kies een ander adres."); return }
    if (pages.some((candidate) => candidate.id !== page?.id && candidate.slug === normalizedSlug)) { setError("Dit webadres wordt al door een andere pagina gebruikt."); return }
    setError("")
    void onApply({ title: title.trim(), slug: isHome ? "" : normalizedSlug, showInNavigation, includeInPublication: isHome || includeInPublication, seo: { ...page?.seo, title: seoTitle, description: seoDescription, ogImage } })
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div><h3 className="text-base font-semibold">{page ? "Pagina-instellingen" : "Nieuwe pagina"}</h3><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{isHome ? "Dit is uw startpagina. De inhoud bewerkt u op het canvas." : "Geef uw pagina een naam en een herkenbaar webadres."}</p></div>
      <div className="space-y-2"><Label htmlFor={`${id}-title`}>Paginanaam</Label><Input id={`${id}-title`} className="h-10" value={title} disabled={busy} maxLength={80} required placeholder="Bijvoorbeeld Over ons" onChange={(event) => { setTitle(event.target.value); if (!slugEdited) setSlug(suggestSlug(event.target.value)) }} /></div>
      <div className="space-y-2"><Label htmlFor={`${id}-slug`}>Webadres</Label><div className="flex items-center rounded-md border border-input focus-within:ring-[3px] focus-within:ring-ring/50"><span className="shrink-0 border-r border-border px-3 text-sm text-muted-foreground">/</span><Input id={`${id}-slug`} className="h-10 border-0 shadow-none focus-visible:ring-0" value={slug} disabled={busy || isHome} required={!isHome} maxLength={80} placeholder={isHome ? "Startpagina" : "over-ons"} autoCapitalize="none" spellCheck={false} aria-describedby={`${id}-path`} onChange={(event) => { setSlug(event.target.value); setSlugEdited(true) }} /></div><p id={`${id}-path`} className="break-all text-xs text-muted-foreground">{isHome ? "Uw startpagina opent op" : "Webadres:"} <span className="font-medium text-foreground">{path}</span></p></div>
      <div className="space-y-4 rounded-lg border border-border p-3">
        <div className="flex items-center justify-between gap-3"><div><Label htmlFor={`${id}-nav`}>Tonen in het menu</Label><p className="mt-1 text-xs text-muted-foreground">Bezoekers vinden deze pagina in de navigatie.</p></div><Switch id={`${id}-nav`} checked={showInNavigation} onCheckedChange={setShowInNavigation} disabled={busy} /></div>
        <div className="flex items-center justify-between gap-3 border-t border-border pt-3"><div><Label htmlFor={`${id}-publish`}>Meenemen bij publicatie</Label><p className="mt-1 text-xs text-muted-foreground">Een concept blijft buiten de live website.</p></div><Switch id={`${id}-publish`} checked={includeInPublication} onCheckedChange={setIncludeInPublication} disabled={busy || isHome} /></div>
      </div>
      <details className="rounded-lg border p-3"><summary className="cursor-pointer text-sm font-medium">Zoekmachines en delen</summary><div className="mt-3 space-y-3">
        <Label htmlFor={`${id}-seo-title`}>SEO-titel</Label><Input id={`${id}-seo-title`} value={seoTitle} onChange={(event) => setSeoTitle(event.target.value)} maxLength={200} disabled={busy} />
        <Label htmlFor={`${id}-seo-description`}>Omschrijving</Label><Input id={`${id}-seo-description`} value={seoDescription} onChange={(event) => setSeoDescription(event.target.value)} maxLength={500} disabled={busy} />
        <Label htmlFor={`${id}-og`}>Afbeelding voor delen (HTTPS)</Label><Input id={`${id}-og`} type="url" value={ogImage} onChange={(event) => setOgImage(event.target.value)} disabled={busy || !advancedSeoAllowed} />
        {!advancedSeoAllowed ? <p className="text-xs text-muted-foreground">Afbeeldingen voor delen en canonieke overrides vanaf Silver. <a className="text-primary underline" href="/editor/account/billing">Abonnement bekijken</a></p> : null}
      </div></details>
      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" variant="outline" className="h-10 w-full" disabled={busy}>{page ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}{page ? "Pagina opslaan" : "Pagina toevoegen"}</Button>
    </form>
  )
}

function PageLocaleAndRedirectSettings({ page, localePath, busy }: { page: WebsitePage; localePath: string; busy: boolean }) {
  const [title, setTitle] = useState("")
  const [navigationLabel, setNavigationLabel] = useState("")
  const [seoTitle, setSeoTitle] = useState("")
  const [description, setDescription] = useState("")
  const [locale, setLocale] = useState("")
  const [redirects, setRedirects] = useState<Array<{ from_slug: string; to_page_id: string }>>([])
  const [incoming, setIncoming] = useState<Array<{ id: string; page_id: string | null; type: string }>>([])
  const [message, setMessage] = useState("")
  const [saving, setSaving] = useState(false)
  const id = useId()
  useEffect(() => {
    let current = true
    const client = createClient()
    void (async () => {
      const [locales, redirects, sections] = await Promise.all([
        client.from("website_locales").select("locale,path_segment").eq("website_id", page.websiteId),
        client.from("website_page_redirects").select("from_slug,to_page_id").eq("website_id", page.websiteId),
        client.from("website_sections").select("id,page_id,type,content").eq("website_id", page.websiteId),
      ])
      if (!current) return
      if (locales.error || redirects.error || sections.error) { setMessage("Pagina-informatie kon niet worden geladen."); return }
      setRedirects(redirects.data ?? [])
      const refersToPage = (value: unknown): boolean => typeof value === "string"
        ? value === `page:${page.id}` || value.startsWith(`section:${page.id}:`)
        : Boolean(value && typeof value === "object" && Object.values(value).some(refersToPage))
      setIncoming((sections.data ?? []).filter((section) => refersToPage(section.content)))
      const locale = locales.data?.find((entry) => entry.path_segment === localePath)?.locale ?? ""
      setLocale(localePath ? locale : "")
      if (!localePath || !locale) return
      const { data, error } = await client.from("website_page_translations").select("*").eq("page_id", page.id).eq("locale", locale).maybeSingle()
      if (!current) return
      if (error) { setMessage("Paginavertaling kon niet worden geladen."); return }
      setTitle(data?.title ?? ""); setNavigationLabel(data?.navigation_label ?? "")
      setSeoTitle(data?.seo?.title ?? ""); setDescription(data?.seo?.description ?? "")
    })()
    return () => { current = false }
  }, [page.id, page.websiteId, localePath])
  async function saveTranslation() {
    setSaving(true); setMessage("")
    const { error } = await createClient().from("website_page_translations").upsert({ website_id: page.websiteId, page_id: page.id, locale,
      title, navigation_label: navigationLabel, seo: { title: seoTitle, description }, source_hash: getTranslationSourceHash({ title: page.title, seo: page.seo }) }, { onConflict: "page_id,locale" })
    setMessage(error ? error.message : "Paginavertaling opgeslagen."); setSaving(false)
  }
  return <div className="mt-4 space-y-3">
    {locale ? <details className="rounded-lg border p-3"><summary className="cursor-pointer text-sm font-medium">Paginavertaling · {localePath}</summary><div className="mt-3 space-y-2">
      <Label htmlFor={`${id}-title`}>Vertaalde paginanaam</Label><Input id={`${id}-title`} value={title} onChange={(event) => setTitle(event.target.value)} maxLength={80} />
      <Label htmlFor={`${id}-nav`}>Menulabel</Label><Input id={`${id}-nav`} value={navigationLabel} onChange={(event) => setNavigationLabel(event.target.value)} maxLength={80} />
      <Label htmlFor={`${id}-seo`}>SEO-titel</Label><Input id={`${id}-seo`} value={seoTitle} onChange={(event) => setSeoTitle(event.target.value)} maxLength={200} />
      <Label htmlFor={`${id}-description`}>Omschrijving</Label><Input id={`${id}-description`} value={description} onChange={(event) => setDescription(event.target.value)} maxLength={500} />
      <Button type="button" variant="outline" disabled={busy || saving || !title.trim()} onClick={() => void saveTranslation()}>Vertaling opslaan</Button>
    </div></details> : null}
    <details className="rounded-lg border p-3"><summary className="cursor-pointer text-sm font-medium">Links naar deze pagina · {incoming.length}</summary>
      <p className="mt-2 text-xs text-muted-foreground">Controleer deze links voordat u de pagina uitsluit of verwijdert. Publicatie stopt bij een ontbrekend doel; open de sectie om een ander doel te kiezen of de link te verwijderen.</p>
      {incoming.map((section) => <a className="mt-2 block min-h-11 break-all rounded border p-2 text-sm underline" key={section.id} href={`/editor?websiteId=${page.websiteId}&pageId=${section.page_id ?? page.id}#section-${section.id}`}>{section.type} · Link aanpassen</a>)}
    </details>
    <details className="rounded-lg border p-3"><summary className="cursor-pointer text-sm font-medium">Doorverwijzingen · {redirects.length}</summary>
      <p className="mt-2 text-xs text-muted-foreground">Een gewijzigd live webadres verwijst na publicatie naar dezelfde pagina. Verwijder conflicterende doorverwijzingen voordat u publiceert.</p>
      {redirects.map((redirect) => <div key={redirect.from_slug} className="mt-2 flex items-center justify-between gap-2"><span className="min-w-0 break-all text-xs">/{redirect.from_slug}</span><Button type="button" variant="outline" disabled={busy || saving} onClick={() => { void (async () => {
        setSaving(true)
        const { error } = await createClient().from("website_page_redirects").delete().eq("website_id", page.websiteId).eq("from_slug", redirect.from_slug)
        if (error) setMessage(error.message); else setRedirects((current) => current.filter((entry) => entry.from_slug !== redirect.from_slug))
        setSaving(false)
      })() }}>Verwijderen</Button></div>)}
    </details>
    {message ? <p role="status" className="text-sm">{message}</p> : null}
  </div>
}
