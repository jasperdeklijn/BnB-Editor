"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { PricingCard } from "@/components/pricing/pricing-card"
import { PRICING_PLANS } from "@/lib/pricing"
import { ArrowRight } from "lucide-react"

/**
 * Pricing Section Component for Homepage
 * Displays preview of Lite and Growth plans
 */
export function PricingSection() {
  const litePlan = PRICING_PLANS.lite
  const growthPlan = PRICING_PLANS.growth

  return (
    <section id="prijzen" className="py-20 px-6 bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-950">
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-16 animate-in fade-in duration-700">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-900 dark:text-white mb-4">
            Simpel, transparante prijzen
          </h2>
          <p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Kies het juiste plan voor jouw bedrijf. Upgraden of downgraden op elk moment.
          </p>
        </div>

        {/* Pricing cards grid */}
        <div className="grid md:grid-cols-2 gap-8 mb-12 animate-in fade-in duration-700 delay-200">
          <PricingCard plan={litePlan} />
          <PricingCard plan={growthPlan} isPopular={true} />
        </div>

        {/* Booking addon mention */}
        <div className="bg-gradient-to-r from-[var(--brand-blue)]/10 to-[var(--brand-purple)]/10 dark:from-[var(--brand-blue)]/20 dark:to-[var(--brand-purple)]/20 border border-[var(--brand-blue)]/30 dark:border-[var(--brand-blue)]/50 rounded-lg p-8 mb-12 text-center animate-in fade-in duration-700 delay-300">
          <p className="text-slate-900 dark:text-white mb-2">
            <strong>Booking Add-on:</strong> Voeg boekingsbeheer toe voor €19/maand
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Beschikbaar voor elk plan. Inclusief aanvragenbeheer, beschikbaarheidskalender en geautomatiseerde e-mails.
          </p>
        </div>

        {/* CTA */}
        <div className="text-center animate-in fade-in duration-700 delay-400">
          <Button
            asChild
            size="lg"
            className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200 gap-2"
          >
            <Link href="/pricing">
              Alle prijzen bekijken
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>

          <p className="mt-4 text-sm text-slate-500 dark:text-slate-500">
            Inclusief 14-daagse gratis proefperiode
          </p>
        </div>
      </div>
    </section>
  )
}

