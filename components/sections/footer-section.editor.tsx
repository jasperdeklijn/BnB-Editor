"use client"

import { Building2, Eye, EyeOff, Plus, Type } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { RepeatingItemActions, moveRepeatingItem } from "@/components/editor/repeating-item-actions"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SectionLinkSelect } from "@/components/editor/section-link-select"
import type { SectionEditorProps } from "@/components/editor/section-editor-types"

interface FooterLink { id?: string; label: string; href: string }
interface FooterColumn { id?: string; title: string; links: FooterLink[] }

const fallbackColumns: FooterColumn[] = [
  { id: "footer-column-1", title: "Snel naar", links: [{ id: "footer-link-1", label: "Over ons", href: "#about" }, { id: "footer-link-2", label: "Diensten", href: "#services" }, { id: "footer-link-3", label: "Contact", href: "#contact" }] },
]

function VisibilityButton({ enabled, label, onClick }: { enabled: boolean; label: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className={`flex w-full items-center justify-center gap-2 rounded-lg border p-2 text-xs font-medium transition-colors ${enabled ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-muted-foreground"}`}>{enabled ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}{label}: {enabled ? "zichtbaar" : "verborgen"}</button>
}

export function FooterSectionEditor({ section, updateField, sectionTargetOptions }: SectionEditorProps) {
  const columns = Array.isArray(section.data.columns) ? section.data.columns as FooterColumn[] : fallbackColumns
  const socialLinks = Array.isArray(section.data.socialLinks) ? section.data.socialLinks as FooterLink[] : []
  const showLinks = section.data.showLinks !== false
  const showCompanyInfo = section.data.showCompanyInfo === true
  const showSocialLinks = section.data.showSocialLinks === true
  const saveColumns = (next: FooterColumn[]) => updateField("columns", next)
  const updateColumn = (columnIndex: number, values: Partial<FooterColumn>) => saveColumns(columns.map((column, index) => index === columnIndex ? { ...column, ...values } : column))
  const updateLink = (columnIndex: number, linkIndex: number, values: Partial<FooterLink>) => updateColumn(columnIndex, { links: columns[columnIndex].links.map((link, index) => index === linkIndex ? { ...link, ...values } : link) })
  const saveSocialLinks = (next: FooterLink[]) => updateField("socialLinks", next)
  const duplicateColumn = (columnIndex: number) => {
    const columnId = `footer-column-${Date.now()}`
    const copy = { ...columns[columnIndex], id: columnId, links: columns[columnIndex].links.map((link, linkIndex) => ({ ...link, id: `${columnId}-link-${linkIndex + 1}` })) }
    saveColumns([...columns.slice(0, columnIndex + 1), copy, ...columns.slice(columnIndex + 1)])
  }
  const duplicateLink = (columnIndex: number, linkIndex: number) => {
    const links = columns[columnIndex].links
    const copy = { ...links[linkIndex], id: `footer-link-${Date.now()}` }
    updateColumn(columnIndex, { links: [...links.slice(0, linkIndex + 1), copy, ...links.slice(linkIndex + 1)] })
  }
  const duplicateSocialLink = (index: number) => {
    const copy = { ...socialLinks[index], id: `footer-social-${Date.now()}` }
    saveSocialLinks([...socialLinks.slice(0, index + 1), copy, ...socialLinks.slice(index + 1)])
  }

  return (
    <div className="space-y-4">
      <Card className="space-y-3 p-4">
        <Label className="flex items-center gap-2"><Type className="h-3.5 w-3.5" />Footertekst</Label>
        <div><Label className="mb-1.5 block text-xs">Bedrijfsnaam</Label><Input value={(section.data.companyName as string) || (section.data.brandName as string) || ""} onChange={(event) => updateField("companyName", event.target.value)} placeholder="Mijn bedrijf" /></div>
        <div><Label className="mb-1.5 block text-xs">Korte beschrijving</Label><textarea value={(section.data.companyDescription as string) || ""} onChange={(event) => updateField("companyDescription", event.target.value)} placeholder="Waar staat je bedrijf voor?" className="min-h-16 w-full resize-none rounded-lg border border-input bg-background p-2 text-sm" /></div>
      </Card>

      <Card className="space-y-3 p-4">
        <Label className="flex items-center gap-2"><Building2 className="h-3.5 w-3.5" />Bedrijfsgegevens</Label>
        <VisibilityButton enabled={showCompanyInfo} label="Bedrijfsgegevens" onClick={() => updateField("showCompanyInfo", !showCompanyInfo)} />
        {showCompanyInfo ? <div className="space-y-2">
          <Input value={(section.data.address as string) || ""} onChange={(event) => updateField("address", event.target.value)} placeholder="Adres" />
          <Input value={(section.data.phone as string) || ""} onChange={(event) => updateField("phone", event.target.value)} placeholder="Telefoonnummer" />
          <Input type="email" value={(section.data.email as string) || ""} onChange={(event) => updateField("email", event.target.value)} placeholder="E-mailadres" />
          <Input value={(section.data.registrationNumber as string) || ""} onChange={(event) => updateField("registrationNumber", event.target.value)} placeholder="KvK-nummer" />
          <Input value={(section.data.vatNumber as string) || ""} onChange={(event) => updateField("vatNumber", event.target.value)} placeholder="BTW-nummer" />
          <p className="text-xs text-muted-foreground">Laat velden leeg die je niet in de footer wilt tonen.</p>
        </div> : null}
      </Card>

      <Card className="space-y-3 p-4">
        <VisibilityButton enabled={showLinks} label="Navigatielinks" onClick={() => updateField("showLinks", !showLinks)} />
        {showLinks ? <>
          <p className="text-xs text-muted-foreground">Nieuwe footers starten met maximaal drie links. Verwijder wat je niet nodig hebt.</p>
          {columns.map((column, columnIndex) => <div key={column.id ?? columnIndex} className="space-y-2 rounded-lg border border-border p-3">
            <div className="flex items-center justify-between gap-2"><span className="text-xs font-semibold">Linkgroep {columnIndex + 1}</span><RepeatingItemActions itemLabel={`Linkgroep ${columnIndex + 1}`} index={columnIndex} count={columns.length} onMove={(direction) => saveColumns(moveRepeatingItem(columns, columnIndex, direction))} onDuplicate={() => duplicateColumn(columnIndex)} onDelete={() => saveColumns(columns.filter((_, index) => index !== columnIndex))} /></div>
            <Input value={column.title || ""} onChange={(event) => updateColumn(columnIndex, { title: event.target.value })} placeholder="Kolomtitel" />
            {column.links.map((link, linkIndex) => <div key={link.id ?? linkIndex} className="space-y-2 rounded-md bg-muted/50 p-2">
              <div className="flex items-center justify-between gap-2"><span className="text-xs font-medium">Link {linkIndex + 1}</span><RepeatingItemActions itemLabel={`Link ${linkIndex + 1}`} index={linkIndex} count={column.links.length} onMove={(direction) => updateColumn(columnIndex, { links: moveRepeatingItem(column.links, linkIndex, direction) })} onDuplicate={() => duplicateLink(columnIndex, linkIndex)} onDelete={() => updateColumn(columnIndex, { links: column.links.filter((_, index) => index !== linkIndex) })} /></div>
              <Input value={link.label || ""} onChange={(event) => updateLink(columnIndex, linkIndex, { label: event.target.value })} placeholder="Linktekst" />
              <SectionLinkSelect value={link.href || ""} onChange={(value) => updateLink(columnIndex, linkIndex, { href: value })} options={sectionTargetOptions} ariaLabel={`Doel voor footerlink ${linkIndex + 1}`} />
            </div>)}
            <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => updateColumn(columnIndex, { links: [...column.links, { id: `footer-link-${Date.now()}`, label: "Nieuwe link", href: "" }] })}><Plus className="mr-2 h-3.5 w-3.5" />Link toevoegen</Button>
          </div>)}
          <Button type="button" variant="outline" className="w-full" onClick={() => saveColumns([...columns, { id: `footer-column-${Date.now()}`, title: "Nieuwe linkgroep", links: [] }])}><Plus className="mr-2 h-4 w-4" />Linkgroep toevoegen</Button>
        </> : null}
      </Card>

      <Card className="space-y-3 p-4">
        <VisibilityButton enabled={showSocialLinks} label="Sociale links" onClick={() => updateField("showSocialLinks", !showSocialLinks)} />
        {showSocialLinks ? <>
          {socialLinks.map((link, index) => <div key={link.id ?? index} className="space-y-2 rounded-lg border border-border p-2">
            <div className="flex items-center justify-between gap-2"><span className="text-xs font-medium">Sociaal kanaal {index + 1}</span><RepeatingItemActions itemLabel={`Sociaal kanaal ${index + 1}`} index={index} count={socialLinks.length} onMove={(direction) => saveSocialLinks(moveRepeatingItem(socialLinks, index, direction))} onDuplicate={() => duplicateSocialLink(index)} onDelete={() => saveSocialLinks(socialLinks.filter((_, itemIndex) => itemIndex !== index))} /></div>
            <div className="grid grid-cols-2 gap-2"><Input value={link.label || ""} onChange={(event) => saveSocialLinks(socialLinks.map((item, itemIndex) => itemIndex === index ? { ...item, label: event.target.value } : item))} placeholder="Platform" /><Input value={link.href || ""} onChange={(event) => saveSocialLinks(socialLinks.map((item, itemIndex) => itemIndex === index ? { ...item, href: event.target.value } : item))} placeholder="https://..." /></div>
          </div>)}
          <Button type="button" variant="outline" className="w-full" onClick={() => saveSocialLinks([...socialLinks, { label: "Instagram", href: "" }])}><Plus className="mr-2 h-4 w-4" />Sociale link toevoegen</Button>
        </> : null}
      </Card>
    </div>
  )
}
