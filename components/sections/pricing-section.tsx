"use client"

import { Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { SectionStyles } from "@/lib/types"

export interface PricingTier {
  name: string
  price: string
  period?: string
  description?: string
  features: string[]
  ctaText?: string
  ctaHref?: string
  highlighted?: boolean
}

interface PricingSectionProps {
  data: Record<string, unknown>
  isPreview: boolean
  styles?: SectionStyles
}

export function PricingSection({ data, styles }: PricingSectionProps) {
  const title = (data.title as string) || "Tarieven"
  const subtitle = (data.subtitle as string) || ""
  const tiers: PricingTier[] = (data.tiers as PricingTier[]) || DEFAULT_TIERS
  const layout = (data.layout as string) || "cards"

  const sectionStyle: React.CSSProperties = {
    backgroundColor: styles?.backgroundColor,
    backgroundImage: styles?.backgroundImage ? `url(${styles.backgroundImage})` : undefined,
    backgroundSize: "cover",
    backgroundPosition: "center",
    fontFamily: styles?.fontFamily,
  }
  const textStyle: React.CSSProperties = styles?.textColor ? { color: styles.textColor } : {}

  return (
    <section className="px-4 py-16 sm:px-6 md:py-24" style={sectionStyle}>
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 text-center">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-amber-600">
            Tarieven
          </p>
          <h2
            className="text-balance text-3xl font-bold text-amber-950 md:text-4xl"
            style={textStyle}
          >
            {title}
          </h2>
          {subtitle && (
            <p className="mt-3 text-muted-foreground" style={textStyle}>
              {subtitle}
            </p>
          )}
        </div>

        {layout === "cards" && (
          <div className={`grid gap-8 ${tiers.length === 1 ? "max-w-sm mx-auto" : tiers.length === 2 ? "sm:grid-cols-2 max-w-3xl mx-auto" : "sm:grid-cols-2 lg:grid-cols-3"}`}>
            {tiers.map((tier, i) => (
              <div
                key={i}
                className={`relative flex flex-col rounded-2xl border p-8 shadow-sm ${
                  tier.highlighted
                    ? "border-amber-400 bg-amber-700 text-white shadow-xl ring-4 ring-amber-400/30"
                    : "border-border bg-white/90"
                }`}
              >
                {tier.highlighted && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="rounded-full bg-amber-400 px-4 py-1 text-xs font-semibold text-amber-900">
                      Meest populair
                    </span>
                  </div>
                )}
                <div className="mb-6">
                  <h3
                    className={`text-lg font-bold ${tier.highlighted ? "text-white" : "text-amber-950"}`}
                    style={!tier.highlighted ? textStyle : undefined}
                  >
                    {tier.name}
                  </h3>
                  {tier.description && (
                    <p
                      className={`mt-1 text-sm ${tier.highlighted ? "text-amber-100" : "text-muted-foreground"}`}
                    >
                      {tier.description}
                    </p>
                  )}
                </div>

                <div className="mb-6">
                  <span
                    className={`text-4xl font-extrabold ${tier.highlighted ? "text-white" : "text-amber-900"}`}
                  >
                    {tier.price}
                  </span>
                  {tier.period && (
                    <span
                      className={`ml-1 text-sm ${tier.highlighted ? "text-amber-200" : "text-muted-foreground"}`}
                    >
                      /{tier.period}
                    </span>
                  )}
                </div>

                <ul className="mb-8 flex-1 space-y-3">
                  {tier.features.map((feat, fi) => (
                    <li key={fi} className="flex items-start gap-2.5 text-sm">
                      <Check
                        className={`mt-0.5 h-4 w-4 flex-shrink-0 ${
                          tier.highlighted ? "text-amber-300" : "text-amber-600"
                        }`}
                      />
                      <span className={tier.highlighted ? "text-amber-100" : "text-muted-foreground"}>
                        {feat}
                      </span>
                    </li>
                  ))}
                </ul>

                {tier.ctaHref ? (
                  <a
                    href={tier.ctaHref}
                    className={`block rounded-xl px-4 py-3 text-center text-sm font-semibold transition-colors ${
                      tier.highlighted
                        ? "bg-white text-amber-700 hover:bg-amber-50"
                        : "bg-amber-700 text-white hover:bg-amber-800"
                    }`}
                  >
                    {tier.ctaText || "Starten"}
                  </a>
                ) : (
                  <Button
                    variant={tier.highlighted ? "secondary" : "default"}
                    className={tier.highlighted ? "bg-white text-amber-700 hover:bg-amber-50" : ""}
                  >
                    {tier.ctaText || "Starten"}
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}

        {layout === "table" && (
          <div className="overflow-x-auto rounded-2xl border border-border shadow-sm">
            <table className="w-full bg-white/90">
              <thead>
                <tr className="border-b border-border bg-amber-50">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-amber-950">Pakket</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-amber-950">Prijs</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-amber-950">Inclusief</th>
                  <th className="px-6 py-4" />
                </tr>
              </thead>
              <tbody>
                {tiers.map((tier, i) => (
                  <tr key={i} className={`border-b border-border last:border-0 ${tier.highlighted ? "bg-amber-50" : ""}`}>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-amber-950">{tier.name}</p>
                      {tier.description && <p className="text-xs text-muted-foreground">{tier.description}</p>}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span className="text-lg font-bold text-amber-700">{tier.price}</span>
                      {tier.period && <span className="text-xs text-muted-foreground">/{tier.period}</span>}
                    </td>
                    <td className="px-6 py-4">
                      <ul className="space-y-1">
                        {tier.features.map((feat, fi) => (
                          <li key={fi} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Check className="h-3 w-3 text-amber-600" />
                            {feat}
                          </li>
                        ))}
                      </ul>
                    </td>
                    <td className="px-6 py-4">
                      <a
                        href={tier.ctaHref || "#contact"}
                        className="rounded-lg bg-amber-700 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-800 transition-colors"
                      >
                        {tier.ctaText || "Kiezen"}
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  )
}

export const DEFAULT_TIERS: PricingTier[] = [
  {
    name: "Basis",
    price: "€ 49",
    period: "maand",
    description: "Ideaal voor starters",
    features: ["1 gebruiker", "Basis functies", "E-mail support"],
    ctaText: "Begin nu",
    highlighted: false,
  },
  {
    name: "Standaard",
    price: "€ 99",
    period: "maand",
    description: "Voor groeiende bedrijven",
    features: ["5 gebruikers", "Alle basis functies", "Prioriteit support", "Rapportages"],
    ctaText: "Starten",
    highlighted: true,
  },
  {
    name: "Pro",
    price: "Op maat",
    description: "Voor grote organisaties",
    features: ["Onbeperkt gebruikers", "Alles in Standaard", "Dedicated support", "Maatwerk integraties"],
    ctaText: "Neem contact op",
    highlighted: false,
  },
]
