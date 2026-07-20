"use client"

import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { SectionEditorProps } from "@/components/editor/section-editor-types"
import { Type } from "lucide-react"

const fallbackItems = [
  { id: "faq-1", question: "Hoe snel kan ik terecht?", answer: "In de meeste gevallen kunnen we binnen 1-3 werkdagen bij u terecht. Neem contact op voor een exacte planning." },
  { id: "faq-2", question: "Wat zijn de kosten?", answer: "De kosten zijn afhankelijk van het type dienst en de omvang van het werk. We brengen graag een vrijblijvende offerte uit." },
  { id: "faq-3", question: "Werken jullie met garantie?", answer: "Ja, op al ons werk geven wij garantie. De exacte voorwaarden bespreken we bij de opdrachtbevestiging." },
  { id: "faq-4", question: "Hoe kan ik een afspraak maken?", answer: "U kunt ons bellen, mailen of het contactformulier op deze pagina gebruiken. We reageren zo snel mogelijk." },
]

export function FaqSectionEditor({ section, updateField, updateListItemField }: SectionEditorProps) {
  const items = ((section.data as any).items as any[]) || fallbackItems

  return (
    <Card className="p-4 space-y-3">
      <Label className="flex items-center gap-2">
        <Type className="h-3.5 w-3.5" />
        Inhoud
      </Label>
      <div>
        <Label className="text-xs mb-1.5 block">Titel</Label>
        <Input
          placeholder="Veelgestelde vragen"
          value={(section.data as any).title || ""}
          onChange={(e) => updateField("title", e.target.value)}
        />
      </div>
      <div>
        <Label className="text-xs mb-1.5 block">Ondertitel</Label>
        <Input
          placeholder="Alles wat je wil weten"
          value={(section.data as any).subtitle || ""}
          onChange={(e) => updateField("subtitle", e.target.value)}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        FAQ-items worden opgeslagen op deze sectie.
      </p>
      {items.map((item, index) => (
        <div key={item.id ?? index} className="space-y-2 rounded-lg border border-border p-3">
          <Input value={item.question || ""} onChange={(e) => updateListItemField("items", index, "question", e.target.value, fallbackItems)} placeholder="Vraag" />
          <textarea
            value={item.answer || ""}
            onChange={(e) => updateListItemField("items", index, "answer", e.target.value, fallbackItems)}
            placeholder="Antwoord"
            className="min-h-16 w-full resize-none rounded-lg border border-input bg-background p-2 text-sm shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
      ))}
    </Card>
  )
}
