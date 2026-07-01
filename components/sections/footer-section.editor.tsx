"use client"

import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { SectionEditorProps } from "@/components/editor/section-editor-types"
import { Type } from "lucide-react"

const fallbackColumns = [
  { title: "Product", links: [{ label: "Editor", href: "/editor" }, { label: "Features", href: "/" }, { label: "Pricing", href: "/" }] },
  { title: "Company", links: [{ label: "About", href: "/" }, { label: "Blog", href: "/" }, { label: "Contact", href: "/" }] },
]

export function FooterSectionEditor({ section, updateField, updateListItemField }: SectionEditorProps) {
  const columns = ((section.data as any).columns as any[]) || fallbackColumns

  return (
    <Card className="p-4 space-y-3">
      <Label className="flex items-center gap-2">
        <Type className="h-3.5 w-3.5" />
        Footer tekst
      </Label>
      <div>
        <Label className="text-xs mb-1.5 block">Bedrijfsnaam</Label>
        <Input
          value={(section.data as any).companyName || (section.data as any).brandName || ""}
          onChange={(e) => updateField("companyName", e.target.value)}
          placeholder="Mijn bedrijf"
        />
      </div>
      <div>
        <Label className="text-xs mb-1.5 block">Beschrijving</Label>
        <textarea
          value={(section.data as any).companyDescription || ""}
          onChange={(e) => updateField("companyDescription", e.target.value)}
          placeholder="Korte footer beschrijving"
          className="min-h-16 w-full resize-none rounded-lg border border-input bg-background p-2 text-sm shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </div>
      {columns.map((column, columnIndex) => (
        <div key={columnIndex} className="space-y-2 rounded-lg border border-border p-3">
          <Input
            value={column.title || ""}
            onChange={(e) => updateListItemField("columns", columnIndex, "title", e.target.value, fallbackColumns)}
            placeholder="Kolomtitel"
          />
          {((column.links as any[]) || []).map((link, linkIndex) => (
            <Input
              key={linkIndex}
              value={link.label || ""}
              onChange={(e) => {
                const nextColumns = Array.isArray((section.data as any).columns)
                  ? ([...((section.data as any).columns as any[])])
                  : [...fallbackColumns]
                const links = [...(nextColumns[columnIndex]?.links || [])]
                links[linkIndex] = { ...(links[linkIndex] || {}), label: e.target.value }
                nextColumns[columnIndex] = { ...(nextColumns[columnIndex] || {}), links }
                updateField("columns", nextColumns)
              }}
              placeholder="Linklabel"
            />
          ))}
        </div>
      ))}
    </Card>
  )
}
