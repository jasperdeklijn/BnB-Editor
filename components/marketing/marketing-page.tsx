import type { ReactNode } from "react"
import Link from "next/link"
import { ArrowRight, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { LandingNav } from "@/components/landing/landing-nav"
import { LandingCta } from "@/components/landing/landing-cta"
import { SharedFooter } from "@/components/layout/shared-footer"
import { MARKETING_ACCESS_NOTICE, MARKETING_PACKAGE_SCOPE_NOTICE, MARKETING_PAGES, MARKETING_PRICE_NOTICE, MARKETING_TEST_LABEL, type MarketingPath } from "@/lib/marketing"
import { getMainPlans, getPublishedPageLabel } from "@/lib/pricing"
import { marketingBreadcrumbs } from "@/lib/seo/marketing"

export function MarketingPage({ path, heading, intro, children }: {
  path: MarketingPath; heading: string; intro: string; children: ReactNode
}) {
  const page = MARKETING_PAGES[path]
  return (
    <div className="min-h-screen bg-white text-[var(--landing-secondary)]">
      <LandingNav />
      <main id="inhoud">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(marketingBreadcrumbs([{ path, name: page.label }])).replace(/</g, "\\u003c") }} />
        <section className="bg-[var(--landing-surface)] px-6 pb-16 pt-32 sm:pt-36">
          <div className="mx-auto max-w-6xl">
            <nav aria-label="Broodkruimel" className="mb-8 flex flex-wrap gap-2 text-sm text-[var(--landing-muted)]">
              <Link href="/" className="underline underline-offset-4">Home</Link><span aria-hidden="true">/</span><span aria-current="page">{page.label}</span>
            </nav>
            <div className="max-w-3xl">
              <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-[var(--landing-primary)]">FlexPagina · {MARKETING_TEST_LABEL}</p>
              <h1 className="text-balance text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">{heading}</h1>
              <p className="mt-6 text-lg leading-relaxed text-[var(--landing-muted)]">{intro}</p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="rounded-full bg-[var(--landing-primary)] px-8 py-6 font-bold text-white hover:bg-[var(--landing-primary-dark)]"><Link href="/auth/sign-up">Probeer gratis <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" /></Link></Button>
                <Button asChild size="lg" variant="outline" className="rounded-full border-[var(--landing-border)] bg-white px-8 py-6 font-bold"><Link href="/#voorbeeld">Bekijk de demo</Link></Button>
              </div>
              <p className="mt-4 text-sm text-[var(--landing-muted)]">{MARKETING_ACCESS_NOTICE} Officiële tarieven volgen na de testfase.</p>
            </div>
          </div>
        </section>
        {children}
        <LandingCta />
      </main>
      <SharedFooter />
    </div>
  )
}

export function MarketingSection({ id, title, children, soft = false }: { id?: string; title: string; children: ReactNode; soft?: boolean }) {
  return <section id={id} className={`scroll-mt-28 px-6 py-16 sm:py-20 ${soft ? "bg-[var(--landing-surface)]" : "bg-white"}`}>
    <div className="mx-auto max-w-6xl">
      <h2 className="mb-8 max-w-3xl text-balance text-3xl font-bold tracking-tight sm:text-4xl">{title}</h2>
      <div className="space-y-5 text-base leading-relaxed text-[var(--landing-muted)]">{children}</div>
    </div>
  </section>
}

export function MarketingCards({ items }: { items: { title: string; text: string }[] }) {
  return <div className="grid gap-5 md:grid-cols-2">{items.map(item => <article key={item.title} className="rounded-3xl border border-[var(--landing-border)] bg-white p-6 sm:p-8">
    <h3 className="mb-3 text-xl font-bold text-[var(--landing-secondary)]">{item.title}</h3><p>{item.text}</p>
  </article>)}</div>
}

export function MarketingLinks({ paths }: { paths: MarketingPath[] }) {
  return <ul className="flex flex-wrap gap-x-6 gap-y-3">{paths.map(path => <li key={path}><Link href={path} className="inline-flex min-h-11 items-center gap-2 font-semibold text-[var(--landing-primary)] underline underline-offset-4">{MARKETING_PAGES[path].label}<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link></li>)}</ul>
}

export function MarketingFaq({ items }: { items: { question: string; answer: string }[] }) {
  return <MarketingSection title="Veelgestelde vragen" soft><div className="divide-y divide-[var(--landing-border)] overflow-hidden rounded-3xl border border-[var(--landing-border)] bg-white">
    {items.map(item => <details key={item.question} className="group px-6"><summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-5 py-5 font-bold text-[var(--landing-secondary)]">{item.question}<ChevronDown className="h-5 w-5 shrink-0 text-[var(--landing-primary)] group-open:rotate-180" aria-hidden="true" /></summary><p className="max-w-3xl pb-6">{item.answer}</p></details>)}
  </div></MarketingSection>
}

export function MarketingPlans() {
  return <MarketingSection title="Kies een pakket dat bij je website past">
    <p className="rounded-2xl border border-[var(--landing-border)] bg-[var(--landing-primary-light)] p-5 text-[var(--landing-primary-dark)]">{MARKETING_PACKAGE_SCOPE_NOTICE}</p>
    <p>{MARKETING_PRICE_NOTICE} Booking &amp; Facturatie is een optionele uitbreiding voor elk pakket. Meertaligheid is inbegrepen bij Gold en als uitbreiding beschikbaar bij Bronze en Silver.</p>
    <MarketingCards items={getMainPlans().map(plan => ({ title: plan.name, text: `${plan.description} ${getPublishedPageLabel(plan.id)}.` }))} />
    <Link href="/pricing" className="inline-flex min-h-11 items-center gap-2 font-bold text-[var(--landing-primary)] underline underline-offset-4">Bekijk de prijzen en alle pakketfuncties <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
  </MarketingSection>
}
