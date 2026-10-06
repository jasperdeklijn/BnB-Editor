"use client"

import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { SectionLinkSelect } from "@/components/editor/section-link-select"
import { RepeatingItemActions, moveRepeatingItem } from "@/components/editor/repeating-item-actions"
import { resolveNavigationLinks, type ResolvedNavigationLink } from "@/lib/i18n/section-translations"
import { useWebsiteLinks } from "@/components/editor/website-links-context"
import { encodeWebsiteLink } from "@/lib/website-links"
import type { SectionEditorProps } from "@/components/editor/section-editor-types"
import { Eye, EyeOff, Navigation, Plus } from "lucide-react"

export function NavSectionEditor({ section, sections, updateField, updateFields, sectionTargetOptions }: SectionEditorProps) {
  const context = useWebsiteLinks()
  const defaults: ResolvedNavigationLink[] = section.data.navigationMode === "pages" && context
    ? context.pages.filter((page) => page.showInNavigation).map((page) => ({ sectionId: page.id, label: page.title, enabled: true, href: encodeWebsiteLink({ type: "page", pageId: page.id }) }))
    : resolveNavigationLinks(section.data, sections)
  const links = defaults.map((link) => ({ ...link,
    href: link.href ?? (context?.activePageId ? encodeWebsiteLink({ type: "section", pageId: context.activePageId, sectionId: link.sectionId }) : `#section-${link.sectionId}`),
  }))
  const saveLinks = (next: ResolvedNavigationLink[]) => updateFields({ navigationMode: "custom", navLinks: next })
  const updateLink = (index: number, changes: Partial<ResolvedNavigationLink>) => saveLinks(links.map((link, position) => position === index ? { ...link, ...changes } : link))
  const sticky = section.data.isSticky !== false
  return <Card className="space-y-4 p-4">
    <h3 className="flex items-center gap-2 text-sm font-medium"><Navigation className="h-4 w-4" />Navigatie-instellingen</h3>
    <label className="block space-y-2"><span className="text-xs font-medium">Merknaam</span><Input value={String(section.data.brandName ?? "Mijn bedrijf")} onChange={(event) => updateField("brandName", event.target.value)} placeholder="Je merknaam" /></label>
    <div className="flex items-center justify-between gap-3"><Label htmlFor={`nav-sticky-${section.id}`}>Vaste navigatie</Label><Switch id={`nav-sticky-${section.id}`} checked={sticky} onCheckedChange={(checked) => updateField("isSticky", checked)} /></div>
    <p className="text-xs text-muted-foreground">{sticky ? "De navigatie blijft bovenaan tijdens scrollen." : "De navigatie scrolt met de pagina."}</p>
    <div className="space-y-3"><h4 className="text-sm font-medium">Navigatielinks</h4><p className="text-xs text-muted-foreground">Kies een pagina, een sectie op een pagina of een webadres.</p>
      {links.map((link, index) => <div key={link.sectionId} className="min-w-0 space-y-3 rounded-lg border border-border bg-muted/20 p-3">
        <div className="flex items-center justify-between gap-2">
          <button type="button" className="flex h-11 min-w-11 items-center justify-center rounded-md hover:bg-muted" aria-label={link.enabled ? `Link ${index + 1} verbergen` : `Link ${index + 1} tonen`} aria-pressed={link.enabled} onClick={() => updateLink(index, { enabled: !link.enabled })}>{link.enabled ? <Eye className="h-4 w-4 text-primary" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}</button>
          <RepeatingItemActions itemLabel={`Navigatielink ${index + 1}`} index={index} count={links.length} onMove={(direction) => saveLinks(moveRepeatingItem(links, index, direction))} onDuplicate={() => saveLinks([...links.slice(0,index+1), { ...link, sectionId: crypto.randomUUID() }, ...links.slice(index+1)])} onDelete={() => saveLinks(links.filter((_, position) => position !== index))} />
        </div>
        <Input aria-label={`Tekst van navigatielink ${index + 1}`} value={link.label} disabled={!link.enabled} onChange={(event) => updateLink(index, { label: event.target.value })} placeholder="Linktekst" />
        <fieldset disabled={!link.enabled} className="min-w-0"><SectionLinkSelect value={link.href ?? `#section-${link.sectionId}`} onChange={(href) => updateLink(index, { href })} options={sectionTargetOptions} ariaLabel={`Doel van navigatielink ${index + 1}`} /></fieldset>
      </div>)}
      <Button type="button" variant="outline" className="h-11 w-full" onClick={() => saveLinks([...links, { sectionId: crypto.randomUUID(), label: "Nieuwe link", href: "", enabled: true }])}><Plus className="h-4 w-4" />Link toevoegen</Button>
    </div>
  </Card>
}
