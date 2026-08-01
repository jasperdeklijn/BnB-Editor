"use client"

import { Plus, Type } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { RepeatingItemActions, moveRepeatingItem } from "@/components/editor/repeating-item-actions"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SectionLinkSelect } from "@/components/editor/section-link-select"
import type { SectionEditorProps } from "@/components/editor/section-editor-types"
import type { PricingPlan, TariffItem } from "@/components/sections/pricing-section"

const fallbackPlans: PricingPlan[] = [
  { id: "plan-1", name: "Basis", price: "€ 49", period: "per keer", description: "Ideaal om kennis te maken.", features: [{ id: "plan-1-feature-1", text: "Persoonlijk advies" }, { id: "plan-1-feature-2", text: "Heldere afspraken" }], showButton: true, ctaText: "Kies basis" },
  { id: "plan-2", name: "Compleet", price: "€ 99", period: "per maand", description: "Voor klanten die meer ondersteuning willen.", features: [{ id: "plan-2-feature-1", text: "Alles uit Basis" }, { id: "plan-2-feature-2", text: "Snellere service" }], highlighted: true, showButton: true, ctaText: "Kies compleet" },
]

const fallbackTariffs: TariffItem[] = [
  { id: "tariff-1", name: "Kennismakingsgesprek", description: "Vrijblijvend gesprek van 30 minuten", price: "Gratis" },
  { id: "tariff-2", name: "Uurtarief", description: "Voor losse werkzaamheden", price: "€ 75" },
]

export function PricingSectionEditor({ section, updateField, sectionTargetOptions }: SectionEditorProps) {
  const plans = Array.isArray(section.data.plans) ? section.data.plans as PricingPlan[] : fallbackPlans
  const tariffs = Array.isArray(section.data.tariffs) ? section.data.tariffs as TariffItem[] : fallbackTariffs
  const displayMode = section.data.displayMode === "menu" || section.data.displayMode === "both" ? section.data.displayMode : "packages"
  const savePlans = (next: PricingPlan[]) => updateField("plans", next)
  const saveTariffs = (next: TariffItem[]) => updateField("tariffs", next)
  const updatePlan = (index: number, values: Partial<PricingPlan>) => savePlans(plans.map((plan, planIndex) => planIndex === index ? { ...plan, ...values } : plan))
  const updateTariff = (index: number, values: Partial<TariffItem>) => saveTariffs(tariffs.map((item, itemIndex) => itemIndex === index ? { ...item, ...values } : item))
  const duplicatePlan = (index: number) => {
    const copyId = `plan-${Date.now()}`
    const copy = {
      ...plans[index],
      id: copyId,
      features: (plans[index].features || []).map((feature, featureIndex) => typeof feature === "string" ? feature : { ...feature, id: `${copyId}-feature-${featureIndex + 1}` }),
    }
    savePlans([...plans.slice(0, index + 1), copy, ...plans.slice(index + 1)])
  }
  const duplicateTariff = (index: number) => {
    const copy = { ...tariffs[index], id: `tariff-${Date.now()}` }
    saveTariffs([...tariffs.slice(0, index + 1), copy, ...tariffs.slice(index + 1)])
  }

  return (
    <Card className="space-y-4 p-4">
      <Label className="flex items-center gap-2"><Type className="h-3.5 w-3.5" />Prijzen en tarieven</Label>
      <Input placeholder="Onze tarieven" value={(section.data.title as string) || ""} onChange={(event) => updateField("title", event.target.value)} />
      <Input placeholder="Transparante tarieven zonder verrassingen" value={(section.data.subtitle as string) || ""} onChange={(event) => updateField("subtitle", event.target.value)} />
      <div>
        <Label className="mb-1.5 block text-xs">Weergave</Label>
        <select value={displayMode} onChange={(event) => updateField("displayMode", event.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
          <option value="packages">Pakketten</option>
          <option value="menu">Tarievenlijst</option>
          <option value="both">Pakketten en tarievenlijst</option>
        </select>
      </div>

      {displayMode !== "menu" ? (
        <div className="space-y-3">
          <div><p className="text-sm font-semibold">Pakketten</p><p className="text-xs text-muted-foreground">Voeg zelf zoveel pakketten toe als nodig.</p></div>
          {plans.map((plan, index) => (
            <div key={plan.id ?? index} className="space-y-2 rounded-lg border border-border p-3">
              <div className="flex items-center justify-between"><span className="text-xs font-semibold">Pakket {index + 1}</span><RepeatingItemActions itemLabel={`Pakket ${index + 1}`} index={index} count={plans.length} onMove={(direction) => savePlans(moveRepeatingItem(plans, index, direction))} onDuplicate={() => duplicatePlan(index)} onDelete={() => savePlans(plans.filter((_, planIndex) => planIndex !== index))} /></div>
              <Input value={plan.name || ""} onChange={(event) => updatePlan(index, { name: event.target.value })} placeholder="Pakketnaam" />
              <div className="grid grid-cols-2 gap-2"><Input value={plan.price || ""} onChange={(event) => updatePlan(index, { price: event.target.value })} placeholder="Prijs" /><Input value={plan.period || ""} onChange={(event) => updatePlan(index, { period: event.target.value })} placeholder="Periode" /></div>
              <textarea value={plan.description || ""} onChange={(event) => updatePlan(index, { description: event.target.value })} placeholder="Beschrijving" className="min-h-16 w-full resize-none rounded-lg border border-input bg-background p-2 text-sm" />
              <Input value={(plan.features || []).map((feature) => typeof feature === "string" ? feature : feature.text).join(", ")} onChange={(event) => updatePlan(index, { features: event.target.value.split(",").map((value) => value.trim()).filter(Boolean).map((text, featureIndex) => ({ id: typeof plan.features[featureIndex] === "object" ? plan.features[featureIndex].id : `plan-feature-${Date.now()}-${featureIndex}`, text })) })} placeholder="Voordelen, gescheiden met komma's" />
              <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={plan.showButton !== false} onChange={(event) => updatePlan(index, { showButton: event.target.checked })} />Knop tonen</label>
              {plan.showButton !== false ? <div className="space-y-2"><Input value={plan.ctaText || ""} onChange={(event) => updatePlan(index, { ctaText: event.target.value })} placeholder="Knoptekst" /><SectionLinkSelect value={plan.ctaHref || ""} onChange={(value) => updatePlan(index, { ctaHref: value })} options={sectionTargetOptions} ariaLabel={`Knopdoel voor pakket ${index + 1}`} /></div> : null}
              <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={Boolean(plan.highlighted)} onChange={(event) => updatePlan(index, { highlighted: event.target.checked })} />Uitgelicht pakket</label>
            </div>
          ))}
          <Button type="button" variant="outline" className="w-full" onClick={() => savePlans([...plans, { id: `plan-${Date.now()}`, name: "Nieuw pakket", price: "€ 0", period: "", description: "", features: [], showButton: true, ctaText: "Kies dit pakket" }])}><Plus className="mr-2 h-4 w-4" />Pakket toevoegen</Button>
        </div>
      ) : null}

      {displayMode !== "packages" ? (
        <div className="space-y-3">
          <div><p className="text-sm font-semibold">Tarievenlijst</p><p className="text-xs text-muted-foreground">Een menu met losse diensten en prijzen.</p></div>
          {tariffs.map((item, index) => (
            <div key={item.id ?? index} className="space-y-2 rounded-lg border border-border p-3">
              <div className="flex items-center justify-between"><span className="text-xs font-semibold">Tarief {index + 1}</span><RepeatingItemActions itemLabel={`Tarief ${index + 1}`} index={index} count={tariffs.length} onMove={(direction) => saveTariffs(moveRepeatingItem(tariffs, index, direction))} onDuplicate={() => duplicateTariff(index)} onDelete={() => saveTariffs(tariffs.filter((_, itemIndex) => itemIndex !== index))} /></div>
              <div className="grid grid-cols-[1fr_110px] gap-2"><Input value={item.name || ""} onChange={(event) => updateTariff(index, { name: event.target.value })} placeholder="Dienst" /><Input value={item.price || ""} onChange={(event) => updateTariff(index, { price: event.target.value })} placeholder="Prijs" /></div>
              <Input value={item.description || ""} onChange={(event) => updateTariff(index, { description: event.target.value })} placeholder="Korte omschrijving" />
              <Input value={item.category || ""} onChange={(event) => updateTariff(index, { category: event.target.value })} placeholder="Categorie (optioneel)" />
            </div>
          ))}
          <Button type="button" variant="outline" className="w-full" onClick={() => saveTariffs([...tariffs, { id: `tariff-${Date.now()}`, name: "Nieuw tarief", description: "", price: "€ 0" }])}><Plus className="mr-2 h-4 w-4" />Tarief toevoegen</Button>
        </div>
      ) : null}
    </Card>
  )
}
