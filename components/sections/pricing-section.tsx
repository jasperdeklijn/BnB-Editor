"use client"

import { Check } from "lucide-react"
import type { SectionStyles } from "@/lib/types"
import { getLayoutClasses } from "@/lib/section-layouts"

export interface PricingPlan {
  id?: string
  name: string
  price: string
  period?: string
  description?: string
  features: string[]
  highlighted?: boolean
  ctaText?: string
  ctaHref?: string
}

interface PricingSectionProps {
  data: Record<string, unknown>
  isPreview: boolean
  styles?: SectionStyles
}

const DEFAULT_PLANS: PricingPlan[] = [
  {
    id: "1",
    name: "Basis",
    price: "€ 49",
    period: "per keer",
    description: "Ideaal voor eenmalige klussen of kennismaking.",
    features: ["Persoonlijk adviesgesprek", "Standaard uitvoering", "E-mail support"],
    ctaText: "Kies basis",
  },
  {
    id: "2",
    name: "Standaard",
    price: "€ 99",
    period: "per maand",
    description: "De meest gekozen optie voor reguliere klanten.",
    features: [
      "Alle voordelen van Basis",
      "Prioriteit inplanning",
      "Telefonische support",
      "Maandelijkse rapportage",
    ],
    highlighted: true,
    ctaText: "Kies standaard",
  },
  {
    id: "3",
    name: "Premium",
    price: "Op aanvraag",
    description: "Maatwerk voor grotere opdrachten of bedrijven.",
    features: [
      "Alle voordelen van Standaard",
      "Dedicated accountmanager",
      "SLA garantie",
      "Onbeperkt support",
    ],
    ctaText: "Neem contact op",
  },
]

export function PricingSection({ data, styles }: PricingSectionProps) {
  const title = (data.title as string) || "Onze tarieven"
  const subtitle = data.subtitle as string | undefined
  const plans: PricingPlan[] =
    Array.isArray(data.plans) && (data.plans as PricingPlan[]).length > 0
      ? (data.plans as PricingPlan[])
      : DEFAULT_PLANS
  const layout = getLayoutClasses(data.layout)

  const sectionStyle: React.CSSProperties = {
    backgroundColor: styles?.backgroundColor,
    backgroundImage: styles?.backgroundImage ? `url(${styles.backgroundImage})` : undefined,
    backgroundSize: "cover",
    backgroundPosition: "center",
  }
  const textStyle: React.CSSProperties = { color: styles?.textColor }

  return (
    <section
      className={`px-4 ${layout.section} sm:px-6 ${styles?.fontFamily || ""}`}
      style={sectionStyle}
    >
      <div className={`mx-auto ${layout.container}`}>
        <div className={`mb-12 ${layout.heading}`}>
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-amber-600">
            Tarieven
          </p>
          <h2
            className="mb-3 text-balance text-3xl font-bold text-amber-950 md:text-4xl"
            style={textStyle}
          >
            {title}
          </h2>
          {subtitle && (
            <p className="mx-auto max-w-xl text-muted-foreground" style={textStyle}>
              {subtitle}
            </p>
          )}
        </div>

        <div className={`grid gap-6 ${layout.grid}`}>
          {plans.map((plan, idx) => (
            <div
              key={plan.id ?? idx}
              className={`relative flex flex-col rounded-2xl border p-8 shadow-sm transition-all ${
                plan.highlighted
                  ? "border-amber-500 bg-amber-700 text-white ring-2 ring-amber-400/40"
                  : "border-border bg-white/70 backdrop-blur"
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="rounded-full bg-amber-400 px-3 py-1 text-xs font-semibold text-amber-900">
                    Meest gekozen
                  </span>
                </div>
              )}

              <div className="mb-6">
                <p
                  className={`mb-1 text-sm font-semibold uppercase tracking-wide ${
                    plan.highlighted ? "text-amber-200" : "text-amber-700"
                  }`}
                >
                  {plan.name}
                </p>
                <div className="flex items-baseline gap-1">
                  <span
                    className={`text-4xl font-bold ${
                      plan.highlighted ? "text-white" : "text-amber-950"
                    }`}
                    style={!plan.highlighted ? textStyle : undefined}
                  >
                    {plan.price}
                  </span>
                  {plan.period && (
                    <span
                      className={`text-sm ${plan.highlighted ? "text-amber-200" : "text-muted-foreground"}`}
                    >
                      {plan.period}
                    </span>
                  )}
                </div>
                {plan.description && (
                  <p
                    className={`mt-2 text-sm ${
                      plan.highlighted ? "text-amber-100" : "text-muted-foreground"
                    }`}
                  >
                    {plan.description}
                  </p>
                )}
              </div>

              <ul className="mb-8 flex-1 space-y-3">
                {plan.features.map((feature, fIdx) => (
                  <li key={fIdx} className="flex items-start gap-2 text-sm">
                    <Check
                      className={`mt-0.5 h-4 w-4 flex-shrink-0 ${
                        plan.highlighted ? "text-amber-300" : "text-amber-600"
                      }`}
                    />
                    <span className={plan.highlighted ? "text-amber-100" : "text-muted-foreground"}>
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              {plan.ctaText && (
                <a
                  href={plan.ctaHref || "#contact"}
                  className={`mt-auto inline-flex w-full items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold transition-all hover:scale-[1.02] ${
                    plan.highlighted
                      ? "bg-white text-amber-700 hover:bg-amber-50"
                      : "bg-amber-700 text-white hover:bg-amber-800"
                  }`}
                >
                  {plan.ctaText}
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
