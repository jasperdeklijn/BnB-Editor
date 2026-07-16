"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { PricingCard } from "@/components/pricing/pricing-card"
import { getMainPlans } from "@/lib/pricing"
import { ArrowRight } from "lucide-react"

export function PricingSection() {
  const plans = getMainPlans()

  return (
    <section id="prijzen" className="bg-[var(--landing-warm)] px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto mb-14 max-w-2xl text-center animate-in fade-in duration-700">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-[var(--landing-primary)]">
            Prijzen
          </p>
          <h2 className="text-balance text-4xl font-bold tracking-tight text-[var(--landing-secondary)] md:text-5xl">
            Kies het plan dat past bij je bedrijf
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-[var(--landing-muted)]">
            Start met een professionele website, breid uit met aanvragen en ga door naar online boekingen wanneer je daar klaar voor bent.
          </p>
          <p className="mt-3 text-sm font-semibold text-[var(--landing-primary)]">
            Alle vermelde prijzen zijn exclusief btw.
          </p>
        </div>

        <div className="mb-12 grid gap-8 lg:grid-cols-3 animate-in fade-in duration-700 delay-200">
          {plans.map((plan) => (
            <PricingCard key={plan.id} plan={plan} isPopular={plan.isPopular} />
          ))}
        </div>

        <div className="text-center animate-in fade-in duration-700 delay-300">
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
            Upgraden of downgraden kan wanneer je bedrijf verandert.
          </p>
        </div>
      </div>
    </section>
  )
}
