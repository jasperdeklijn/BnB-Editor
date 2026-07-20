import Link from "next/link"
import { ArrowLeft, ArrowRight, CheckCircle2, ShieldCheck, X } from "lucide-react"

import { PricingCard } from "@/components/pricing/pricing-card"
import { PricingFaq } from "@/components/pricing/pricing-faq"
import { SharedFooter } from "@/components/layout/shared-footer"
import { FEATURE_COMPARISON, formatPrice, getMainPlans } from "@/lib/pricing"
import { PLATFORM_BRAND_INITIALS, PLATFORM_BRAND_NAME } from "@/lib/platform"
import type { PlanId } from "@/lib/types/pricing"

export const metadata = {
  title: "Prijzen",
  description:
    "Transparante abonnementen voor je website: Bronze, Silver en Gold. Kies de functies die passen bij je bedrijf.",
  alternates: {
    canonical: "/pricing",
  },
  openGraph: {
    url: "/pricing",
    title: `Prijzen | ${PLATFORM_BRAND_NAME}`,
    description:
      "Vergelijk Bronze, Silver en Gold voor je bedrijfswebsite.",
  },
}

const planPosition: Record<PlanId, number> = {
  bronze: 1,
  silver: 2,
  gold: 3,
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
      <header className="sticky top-0 z-50 border-b border-[var(--landing-border)] bg-white/92 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-3" aria-label={`${PLATFORM_BRAND_NAME} homepage`}>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--landing-primary)] text-sm font-bold text-white shadow-sm">
              {PLATFORM_BRAND_INITIALS}
            </span>
            <span className="text-base font-bold">{PLATFORM_BRAND_NAME}</span>
          </Link>

          <nav className="hidden items-center gap-8 md:flex" aria-label="Prijzen navigatie">
            <Link href="/#functies" className="text-sm font-medium text-slate-600 transition-colors hover:text-[var(--landing-primary)]">
              Functies
            </Link>
            <Link href="/#hoe-het-werkt" className="text-sm font-medium text-slate-600 transition-colors hover:text-[var(--landing-primary)]">
              Hoe het werkt
            </Link>
            <Link href="/pricing" className="text-sm font-medium text-[var(--landing-primary-dark)]">
              Prijzen
            </Link>
          </nav>

          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition-colors hover:text-[var(--landing-primary-dark)]"
          >
            <ArrowLeft className="h-4 w-4" />
            Terug
          </Link>
        </div>
      </header>

      <main>
        <section className="bg-[linear-gradient(180deg,#FFFFFF_0%,#F6F8F5_100%)] px-6 pb-20 pt-24">
          <div className="mx-auto max-w-6xl">
            <div className="mx-auto max-w-3xl text-center">
              <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-[var(--landing-primary)]">
                Prijzen
              </p>
              <h1 className="text-balance text-5xl font-extrabold leading-[1.05] text-[var(--landing-secondary)] md:text-6xl">
                Duidelijke abonnementen voor elke groeifase
              </h1>
              <p className="mt-5 text-lg leading-relaxed text-[var(--landing-muted)]">
                Bronze zet je bedrijf online, Silver helpt meer aanvragen binnen te krijgen en Gold voegt online afspraken en boekingsbeheer toe.
              </p>
              <p className="mt-3 text-sm font-semibold text-[var(--landing-primary)]">
                Alle vermelde prijzen zijn exclusief btw.
              </p>
            </div>

            <div className="mt-14 grid gap-8 lg:grid-cols-3">
              {plans.map((plan) => (
                <PricingCard key={plan.id} plan={plan} isPopular={plan.isPopular} />
              ))}
            </div>
            <p className="mt-8 text-center text-sm font-semibold text-[var(--landing-primary-dark)]">
              Meertaligheid is inbegrepen bij Gold en beschikbaar als add-on van € 2,99 per maand bij Bronze en Silver.
            </p>
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
                De pakketten zijn opgebouwd rond functionaliteit: eerst online staan, daarna aanvragen ontvangen en vervolgens boekingen beheren.
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
                          {formatPrice(plan.monthlyPrice)}/maand
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
