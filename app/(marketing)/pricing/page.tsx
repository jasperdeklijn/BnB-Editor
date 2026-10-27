import Link from "next/link"
import { ArrowRight, CheckCircle2, ShieldCheck, X } from "lucide-react"

import { PricingCard } from "@/components/pricing/pricing-card"
import { PricingAddons } from "@/components/pricing/pricing-addons"
import { PricePreview } from "@/components/pricing/price-preview"
import { PricingFaq } from "@/components/pricing/pricing-faq"
import { SharedFooter } from "@/components/layout/shared-footer"
import { FEATURE_COMPARISON, getMainPlans, getPublishedPageLabel } from "@/lib/pricing"
import { LandingNav } from "@/components/landing/landing-nav"
import { MARKETING_PRICE_NOTICE, MARKETING_PACKAGE_SCOPE_NOTICE } from "@/lib/marketing"
import { marketingBreadcrumbs, marketingMetadata } from "@/lib/seo/marketing"
import type { PlanId } from "@/lib/types/pricing"

export const metadata = marketingMetadata("/pricing", "Prijzen en websitepakketten vergelijken", "Vergelijk Bronze, Silver en Gold tijdens de testfase van FlexPagina. Bekijk paginalimieten en uitbreidingen. De officiële tarieven volgen na de testfase.")

const planPosition: Record<PlanId, number> = {
  bronze: 1,
  silver: 3,
  gold: 2,
}

function ComparisonValue({ value }: { value: boolean | string }) {
  if (typeof value === "boolean") {
    return value ? (
      <CheckCircle2 className="mx-auto h-5 w-5 text-[var(--landing-primary)]" aria-label="Inbegrepen" />
    ) : (
      <X className="mx-auto h-5 w-5 text-slate-300" aria-label="Niet inbegrepen" />
    )
  }

  return <span className="text-sm font-medium text-[var(--landing-secondary)]">{value}</span>
}

export default function PricingPage() {
  const plans = getMainPlans()

  return (
    <div className="min-h-screen bg-white text-[var(--landing-secondary)]">
      <LandingNav />

      <main id="inhoud">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(marketingBreadcrumbs([{ path: "/pricing", name: "Prijzen" }])).replace(/</g, "\\u003c") }} />
        <section className="bg-[linear-gradient(180deg,#FFFFFF_0%,#F6F8F5_100%)] px-6 pb-20 pt-32 sm:pt-36">
          <div className="mx-auto max-w-6xl">
            <div className="mx-auto max-w-3xl text-center">
              <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-[var(--landing-primary)]">
                Prijzen
              </p>
              <h1 className="text-balance text-5xl font-extrabold leading-[1.05] text-[var(--landing-secondary)] md:text-6xl">
                Ontdek de pakketten tijdens de testfase
              </h1>
              <p className="mt-5 text-lg leading-relaxed text-[var(--landing-muted)]">
                Bronze: {getPublishedPageLabel("bronze")} en basisstatistieken. Silver: {getPublishedPageLabel("silver")} en gedetailleerde statistieken. Gold: {getPublishedPageLabel("gold")}, conversies en meertaligheid. Booking &amp; Facturatie voeg je aan elk plan toe. </p>
              <p className="mt-3 text-sm font-semibold text-[var(--landing-primary)]">
                {MARKETING_PRICE_NOTICE}
              </p>
              <p className="mt-5 rounded-2xl border border-[var(--landing-border)] bg-white p-5 text-sm leading-relaxed text-[var(--landing-primary-dark)]">{MARKETING_PACKAGE_SCOPE_NOTICE}</p>
            </div>

            <div className="mt-14 grid gap-8 lg:grid-cols-3">
              {plans.map((plan) => (
                <PricingCard key={plan.id} plan={plan} isPopular={plan.isPopular} />
              ))}
            </div>
            <PricingAddons />
          </div>
        </section>

        <section className="bg-white px-6 py-24">
          <div className="mx-auto max-w-6xl">
            <div className="mb-10 max-w-2xl">
              <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-[var(--landing-primary)]">
                Vergelijking
              </p>
              <h2 className="text-balance text-4xl font-bold tracking-tight text-[var(--landing-secondary)] md:text-5xl">
                Bekijk wat elk plan toevoegt
              </h2>
              <p className="mt-4 text-lg leading-relaxed text-[var(--landing-muted)]">
                Vergelijk de websitepakketten en breid je gekozen plan uit met Booking & Facturatie of meertaligheid.
              </p>
            </div>

            <div className="overflow-x-auto rounded-3xl border border-[var(--landing-border)] bg-white shadow-[0_16px_40px_rgba(31,41,51,0.06)]">
              <table className="w-full min-w-[760px]">
                <thead>
                  <tr className="border-b border-[var(--landing-border)] bg-[var(--landing-primary-light)]">
                    <th className="px-6 py-5 text-left text-sm font-bold text-[var(--landing-secondary)]">
                      Functie
                    </th>
                    {plans.map((plan) => (
                      <th key={plan.id} className="px-6 py-5 text-center text-sm font-bold text-[var(--landing-secondary)]">
                        <span>{plan.name}</span>
                        <span className="mt-1 block text-xs font-semibold text-[var(--landing-muted)]">
                          <PricePreview />
                        </span>
                        <span className="mt-0.5 block text-[10px] font-medium text-[var(--landing-muted)]">
                          Excl. btw
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {FEATURE_COMPARISON.map((row, index) => (
                    <tr key={row.feature} className={index % 2 === 0 ? "bg-white" : "bg-[var(--landing-soft)]"}>
                      <td className="border-r border-[var(--landing-border)] px-6 py-4 text-sm font-medium text-slate-700">
                        {row.feature}
                      </td>
                      {plans.map((plan) => (
                        <td key={`${row.feature}-${plan.id}`} className="px-6 py-4 text-center">
                          <ComparisonValue value={row[plan.id]} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="bg-[var(--landing-soft)] px-6 py-24">
          <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-3">
            {plans.map((plan) => (
              <div
                key={`position-${plan.id}`}
                className="rounded-3xl border border-[var(--landing-border)] bg-white p-7 shadow-[0_16px_40px_rgba(31,41,51,0.06)]"
              >
                <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--landing-primary-light)] text-sm font-bold text-[var(--landing-primary-dark)]">
                  {planPosition[plan.id]}
                </div>
                <h3 className="mb-2 text-xl font-bold text-[var(--landing-secondary)]">{plan.name}</h3>
                <p className="text-sm leading-relaxed text-[var(--landing-muted)]">{plan.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white px-6 py-24">
          <PricingFaq />
        </section>

        <section className="bg-white px-6 pb-24">
          <div className="mx-auto max-w-6xl rounded-[32px] bg-[var(--landing-primary)] px-8 py-12 text-center text-white md:px-16 md:py-16">
            <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/12">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h2 className="text-balance text-3xl font-bold md:text-4xl">
              Klaar om je website professioneel online te zetten?
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-white/78">
              Kies het abonnement dat nu past. Je kunt later uitbreiden wanneer je meer aanvragen of online boekingen nodig hebt.
            </p>
            <Link
              href="/auth/sign-up"
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 text-base font-bold text-[var(--landing-primary-dark)] transition-colors hover:bg-[var(--landing-primary-light)]"
            >
              Gratis proberen
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>

      <SharedFooter />
    </div>
  )
}
