import { PricingCard } from "@/components/pricing/pricing-card"
import { PricingFaq } from "@/components/pricing/pricing-faq"
import { TrustSection } from "@/components/pricing/trust-section"
import { getMainPlans } from "@/lib/pricing"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export const metadata = {
  title: "Pricing | BnB Website Maken",
  description:
    "Transparante prijzen voor onze BnB website builder. Kies het plan dat bij jouw B&B past. Upgraden of downgraden kan altijd — geen verborgen kosten.",
}

/**
 * Public Pricing Page
 * Shows all pricing plans, comparison, FAQ, and trust information
 */
export default function PricingPage() {
  const plans = getMainPlans()

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-slate-50 dark:from-slate-950 dark:to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950">
        <div className="max-w-6xl mx-auto px-6 py-6 flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Terug naar homepage
          </Link>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-6 py-20">
        {/* Section header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-slate-900 dark:text-white mb-4">
            Transparante Prijzen
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Kies het plan dat bij jouw B&B past. Upgraden of downgraden kan altijd — geen verborgen kosten.
          </p>
        </div>

        {/* Pricing cards grid */}
        <div className="grid md:grid-cols-2 gap-8 mb-20">
          {plans.map((plan) => (
            <PricingCard
              key={plan.id}
              plan={plan}
              isPopular={plan.isPopular}
            />
          ))}
        </div>

        {/* Booking addon highlight */}
        <div className="mb-20 rounded-xl border-2 border-dashed border-amber-400/50 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 p-12 text-center">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
            Booking Add-on — €19/Maand
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-400 mb-6">
            Voeg bookingfunctionaliteiten toe aan elk plan. Beheer verzoeken,
            beschikbaarheid en reserveringen rechtstreeks in het dashboard.
          </p>
          <ul className="inline-flex flex-col gap-3 text-left text-slate-700 dark:text-slate-300">
            <li className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-5 h-5 bg-amber-500 text-white rounded-full text-xs">
                ✓
              </span>
              Bookingaanvragen beheren
            </li>
            <li className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-5 h-5 bg-amber-500 text-white rounded-full text-xs">
                ✓
              </span>
              Beschikbaarheidskalender
            </li>
            <li className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-5 h-5 bg-amber-500 text-white rounded-full text-xs">
                ✓
              </span>
              Reserveringen beheren
            </li>
            <li className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-5 h-5 bg-amber-500 text-white rounded-full text-xs">
                ✓
              </span>
              Gast communicatie en automatische e-mails
            </li>
          </ul>
        </div>

        {/* FAQ Section */}
        <div className="mb-20">
          <PricingFaq />
        </div>

        {/* Trust Section */}
        <TrustSection />

        {/* CTA */}
        <div className="mt-24 text-center">
          <Link
            href="/auth/sign-up"
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-lg hover:from-amber-600 hover:to-orange-600 transition-all shadow-lg shadow-amber-500/25"
          >
            Begin nu gratis
            <span>→</span>
          </Link>
          <p className="mt-4 text-slate-600 dark:text-slate-400">
            14 dagen gratis. Geen creditcard nodig.
          </p>
        </div>
      </main>
    </div>
  )
}
