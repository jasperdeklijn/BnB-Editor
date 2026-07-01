"use client"

import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { SectionEditorProps } from "@/components/editor/section-editor-types"
import { Type } from "lucide-react"

const fallbackPlans = [
  { name: "Basis", price: "EUR 49", period: "per keer", description: "Ideaal voor eenmalige klussen of kennismaking.", features: ["Persoonlijk adviesgesprek", "Standaard uitvoering", "E-mail support"], ctaText: "Kies basis" },
  { name: "Standaard", price: "EUR 99", period: "per maand", description: "De meest gekozen optie voor reguliere klanten.", features: ["Alle voordelen van Basis", "Prioriteit inplanning", "Telefonische support", "Maandelijkse rapportage"], ctaText: "Kies standaard", highlighted: true },
  { name: "Premium", price: "Op aanvraag", description: "Maatwerk voor grotere opdrachten of bedrijven.", features: ["Alle voordelen van Standaard", "Dedicated accountmanager", "SLA garantie", "Onbeperkt support"], ctaText: "Neem contact op" },
]

export function PricingSectionEditor({ section, updateField, updateListItemField }: SectionEditorProps) {
  const plans = ((section.data as any).plans as any[]) || fallbackPlans

  return (
    <Card className="p-4 space-y-3">
      <Label className="flex items-center gap-2">
        <Type className="h-3.5 w-3.5" />
        Inhoud
      </Label>
      <div>
        <Label className="text-xs mb-1.5 block">Titel</Label>
        <Input
          placeholder="Onze tarieven"
          value={(section.data as any).title || ""}
          onChange={(e) => updateField("title", e.target.value)}
        />
      </div>
      <div>
        <Label className="text-xs mb-1.5 block">Ondertitel</Label>
        <Input
          placeholder="Transparante tarieven zonder verrassingen"
          value={(section.data as any).subtitle || ""}
          onChange={(e) => updateField("subtitle", e.target.value)}
        />
      </div>
      {plans.map((plan, index) => (
        <div key={index} className="space-y-2 rounded-lg border border-border p-3">
          <Input value={plan.name || ""} onChange={(e) => updateListItemField("plans", index, "name", e.target.value, fallbackPlans)} placeholder="Pakketnaam" />
          <div className="grid grid-cols-2 gap-2">
            <Input value={plan.price || ""} onChange={(e) => updateListItemField("plans", index, "price", e.target.value, fallbackPlans)} placeholder="Prijs" />
            <Input value={plan.period || ""} onChange={(e) => updateListItemField("plans", index, "period", e.target.value, fallbackPlans)} placeholder="Periode" />
          </div>
          <textarea
            value={plan.description || ""}
            onChange={(e) => updateListItemField("plans", index, "description", e.target.value, fallbackPlans)}
            placeholder="Beschrijving"
            className="min-h-14 w-full resize-none rounded-lg border border-input bg-background p-2 text-sm shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          <Input
            value={(plan.features || []).join(", ")}
            onChange={(e) =>
              updateListItemField(
                "plans",
                index,
                "features",
                e.target.value.split(",").map((value) => value.trim()).filter(Boolean),
                fallbackPlans,
              )
            }
            placeholder="Voordelen, kommagescheiden"
          />
          <Input value={plan.ctaText || ""} onChange={(e) => updateListItemField("plans", index, "ctaText", e.target.value, fallbackPlans)} placeholder="Knoptekst" />
        </div>
      ))}
    </Card>
  )
}
