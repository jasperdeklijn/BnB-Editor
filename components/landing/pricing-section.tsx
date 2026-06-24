"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { PricingCard } from "@/components/pricing/pricing-card"
import { PRICING_PLANS } from "@/lib/pricing"
import { ArrowRight } from "lucide-react"

export function PricingSection() {
  const litePlan = PRICING_PLANS.lite
  const growthPlan = PRICING_PLANS.growth

  return (
    <section id="prijzen" className="bg-white px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto mb-14 max-w-2xl text-center animate-in fade-in duration-700">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-[var(--landing-primary)]">
            Prijzen
          </p>
          <h2 className="text-balance text-4xl font-bold tracking-tight text-[var(--landing-secondary)] md:text-5xl">
            Simpele, transparante prijzen
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-[var(--landing-muted)]">
            Kies het juiste plan voor jouw bedrijf. Upgraden of downgraden kan op elk moment.
          </p>
        </div>

        <div className="mb-12 grid gap-8 md:grid-cols-2 animate-in fade-in duration-700 delay-200">
          <PricingCard plan={litePlan} />
          <PricingCard plan={growthPlan} isPopular />
        </div>

        <div className="mb-12 rounded-3xl border border-[var(--landing-border)] bg-[var(--landing-primary-light)] p-8 text-center animate-in fade-in duration-700 delay-300">
          <p className="mb-2 text-[var(--landing-secondary)]">
            <strong>Booking Add-on:</strong> Voeg boekingsbeheer toe voor EUR 19/maand
          </p>
          <p className="text-sm text-[var(--landing-muted)]">
            Beschikbaar voor elk plan. Inclusief aanvragenbeheer, beschikbaarheidskalender en geautomatiseerde e-mails.
          </p>
        </div>

        <div className="text-center animate-in fade-in duration-700 delay-400">
          <Button
            asChild
            size="lg"
            className="gap-2 rounded-full bg-[var(--landing-primary)] px-8 py-6 text-white hover:bg-[var(--landing-primary-dark)]"
          >
            <Link href="/pricing">
              Alle prijzen bekijken
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>

          <p className="mt-4 text-sm text-[var(--landing-muted)]">
            Inclusief 14-daagse gratis proefperiode
          </p>
        </div>
      </div>
    </section>
  )
}
