"use client"

import { Check } from "lucide-react"
import { EditableText } from "@/components/editor/inline-editable-text"
import type { SectionStyles } from "@/lib/types"
import { getLayoutClasses } from "@/lib/section-layouts"
import { useWebsiteLocale } from "@/lib/site-i18n/provider"
import { getSectionColorVars } from "@/lib/section-colors"

export interface PricingFeature { id?: string; text: string }
export interface PricingPlan { id?: string; name: string; price: string; period?: string; description?: string; features: Array<string | PricingFeature>; highlighted?: boolean; showButton?: boolean; ctaText?: string; ctaHref?: string }
export interface TariffItem { id?: string; name: string; description?: string; price: string; category?: string }

const DEFAULT_PLANS: PricingPlan[] = [
  { id: "plan-1", name: "Basis", price: "€ 49", period: "per keer", description: "Ideaal om kennis te maken.", features: [{ id: "plan-1-feature-1", text: "Persoonlijk advies" }, { id: "plan-1-feature-2", text: "Heldere afspraken" }], showButton: true, ctaText: "Kies basis" },
  { id: "plan-2", name: "Compleet", price: "€ 99", period: "per maand", description: "Voor klanten die meer ondersteuning willen.", features: [{ id: "plan-2-feature-1", text: "Alles uit Basis" }, { id: "plan-2-feature-2", text: "Snellere service" }], highlighted: true, showButton: true, ctaText: "Kies compleet" },
]
const DEFAULT_TARIFFS: TariffItem[] = [
  { id: "tariff-1", name: "Kennismakingsgesprek", description: "Vrijblijvend gesprek van 30 minuten", price: "Gratis" },
  { id: "tariff-2", name: "Uurtarief", description: "Voor losse werkzaamheden", price: "€ 75" },
]

export function PricingSection({ data, isPreview, styles, onUpdate }: { data: Record<string, unknown>; isPreview: boolean; styles?: SectionStyles; onUpdate?: (newData: Record<string, unknown>) => void }) {
  const { messages } = useWebsiteLocale()
  const title = (data.title as string) || "Onze tarieven"
  const subtitle = data.subtitle as string | undefined
  const plans = Array.isArray(data.plans) ? data.plans as PricingPlan[] : DEFAULT_PLANS
  const tariffs = Array.isArray(data.tariffs) ? data.tariffs as TariffItem[] : DEFAULT_TARIFFS
  const displayMode = data.displayMode === "menu" || data.displayMode === "both" ? data.displayMode : "packages"
  const editableData = { ...data, plans, tariffs }
  const layout = getLayoutClasses(data.layout)
  const textStyle: React.CSSProperties = { color: styles?.textColor }
  const sectionStyle: React.CSSProperties = { ...getSectionColorVars(styles), backgroundColor: styles?.backgroundColor, backgroundImage: styles?.backgroundImage ? `url(${styles.backgroundImage})` : undefined, backgroundSize: "cover", backgroundPosition: "center" }
  const accent = "var(--section-accent)"
  const accentForeground = "var(--section-accent-foreground)"
  const surface = "var(--section-surface)"
  const surfaceForeground = "var(--section-surface-foreground)"

  return (
    <section className={`px-4 ${layout.section} sm:px-6 ${styles?.fontFamily || ""}`} style={sectionStyle}>
      <div className={`mx-auto ${layout.container}`}>
        <div className={`mb-10 ${layout.heading}`}><p className="mb-2 text-xs font-semibold uppercase tracking-widest" style={{ color: accent }}>{messages.pricing}</p><EditableText as="h2" data={data} path={["title"]} value={title} isPreview={isPreview} onUpdate={onUpdate} className="text-3xl font-bold md:text-4xl" style={textStyle} />{subtitle ? <EditableText as="p" data={data} path={["subtitle"]} value={subtitle} isPreview={isPreview} onUpdate={onUpdate} multiline className="mx-auto mt-3 max-w-xl text-muted-foreground" style={textStyle} /> : null}</div>

        {displayMode !== "menu" ? <div className={`grid gap-6 ${layout.grid}`}>
          {plans.map((plan, index) => <article key={plan.id ?? index} className="relative flex flex-col rounded-2xl border p-6 shadow-sm" style={{ backgroundColor: plan.highlighted ? accent : surface, color: plan.highlighted ? accentForeground : surfaceForeground }}>
            {plan.highlighted ? <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-xs font-semibold shadow" style={{ backgroundColor: surface, color: surfaceForeground }}>{messages.mostPopular}</span> : null}
            <EditableText data={editableData} path={["plans", index, "name"]} value={plan.name} isPreview={isPreview} onUpdate={onUpdate} className="text-sm font-semibold uppercase tracking-wide" />
            <div className="mt-2 flex items-baseline gap-1"><EditableText as="span" data={editableData} path={["plans", index, "price"]} value={plan.price} isPreview={isPreview} onUpdate={onUpdate} className="text-4xl font-bold" />{plan.period ? <EditableText as="span" data={editableData} path={["plans", index, "period"]} value={plan.period} isPreview={isPreview} onUpdate={onUpdate} className="text-sm opacity-75" /> : null}</div>
            {plan.description ? <EditableText as="p" data={editableData} path={["plans", index, "description"]} value={plan.description} isPreview={isPreview} onUpdate={onUpdate} multiline className="mt-3 text-sm opacity-80" /> : null}
            <ul className="my-6 flex-1 space-y-3">{(plan.features || []).map((feature, featureIndex) => <li key={typeof feature === "string" ? `${feature}-${featureIndex}` : feature.id ?? featureIndex} className="flex gap-2 text-sm"><Check className="mt-0.5 h-4 w-4 shrink-0" /><EditableText data={editableData} path={typeof feature === "string" ? ["plans", index, "features", featureIndex] : ["plans", index, "features", featureIndex, "text"]} value={typeof feature === "string" ? feature : feature.text} isPreview={isPreview} onUpdate={onUpdate} /></li>)}</ul>
            {plan.showButton !== false && plan.ctaText ? <a href={plan.ctaHref || "#contact"} className="rounded-xl px-5 py-3 text-center text-sm font-semibold" style={{ backgroundColor: plan.highlighted ? surface : accent, color: plan.highlighted ? surfaceForeground : accentForeground }}><EditableText data={editableData} path={["plans", index, "ctaText"]} value={plan.ctaText} isPreview={isPreview} onUpdate={onUpdate} /></a> : null}
          </article>)}
        </div> : null}

        {displayMode === "both" ? <h3 className="mb-5 mt-14 text-center text-2xl font-semibold" style={textStyle}>{messages.individualRates}</h3> : null}
        {displayMode !== "packages" ? <div className="mx-auto max-w-3xl overflow-hidden rounded-2xl border shadow-sm" style={{ backgroundColor: surface, color: surfaceForeground }}>
          {tariffs.map((item, index) => <div key={item.id ?? index} className="flex items-start gap-4 border-b border-border px-5 py-4 last:border-b-0">
            <div className="min-w-0 flex-1">{item.category ? <EditableText data={editableData} path={["tariffs", index, "category"]} value={item.category} isPreview={isPreview} onUpdate={onUpdate} className="text-xs font-semibold uppercase tracking-wide" style={{ color: accent }} /> : null}<EditableText as="h3" data={editableData} path={["tariffs", index, "name"]} value={item.name} isPreview={isPreview} onUpdate={onUpdate} className="font-semibold" style={textStyle} />{item.description ? <EditableText as="p" data={editableData} path={["tariffs", index, "description"]} value={item.description} isPreview={isPreview} onUpdate={onUpdate} className="mt-1 text-sm text-muted-foreground" multiline /> : null}</div>
            <span className="mt-1 border-b border-dotted px-1 font-semibold" style={{ color: accent }}><EditableText data={editableData} path={["tariffs", index, "price"]} value={item.price} isPreview={isPreview} onUpdate={onUpdate} /></span>
          </div>)}
        </div> : null}
      </div>
    </section>
  )
}
