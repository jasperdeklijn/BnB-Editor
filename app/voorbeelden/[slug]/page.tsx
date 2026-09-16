import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { HeroSection } from "@/components/sections/hero-section"
import { AboutSection } from "@/components/sections/about-section"
import { PricingSection } from "@/components/sections/pricing-section"
import { FaqSection } from "@/components/sections/faq-section"
import { MARKETING_DEMOS, getDemoStyles } from "@/lib/marketing-demos"

type Props = { params: Promise<{ slug: string }> }

export function generateStaticParams() {
  return MARKETING_DEMOS.map(({ slug }) => ({ slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const demo = MARKETING_DEMOS.find((item) => item.slug === slug)
  return { title: demo ? `${demo.name} | FlexPagina voorbeeldwebsite` : "Voorbeeld niet gevonden", robots: { index: false, follow: true } }
}

export default async function ExamplePage({ params }: Props) {
  const { slug } = await params
  const demo = MARKETING_DEMOS.find((item) => item.slug === slug)
  if (!demo) notFound()
  const styles = getDemoStyles(demo)

  return (
    <div className="min-h-screen bg-white text-[#24382d]">
      <aside className="border-b border-[var(--landing-border)] bg-[var(--landing-primary-dark)] px-5 py-3 text-sm text-white" aria-label="Voorbeeldwebsite">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <p>FlexPagina demo · fictief bedrijf · geen echte aanvragen of boekingen</p>
          <div className="flex flex-wrap items-center gap-5">
            <Link href="/#voorbeelden" className="underline underline-offset-4">Alle voorbeelden</Link>
            <Link href="/auth/sign-up" className="rounded-full bg-white px-4 py-2 font-bold text-[var(--landing-primary-dark)]">Gratis starten</Link>
          </div>
        </div>
      </aside>
      <header className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-5 px-6 py-6">
        <Link href={`/voorbeelden/${demo.slug}`} className="font-serif text-2xl font-bold">{demo.name}</Link>
        <nav aria-label="Voorbeeldsite navigatie" className="flex flex-wrap gap-5 text-sm font-medium">
          <a href="#over">Over ons</a><a href="#aanbod">Ons aanbod</a><a href="#vragen">Veelgestelde vragen</a>
        </nav>
      </header>
      <main>
        <HeroSection isPreview data={{ title: demo.title, subtitle: demo.subtitle, ctaText: demo.cta, ctaHref: "#aanbod", layout: demo.layout, styleType: demo.styleType }} styles={{ ...styles, backgroundImage: demo.image }} />
        <div id="over" className="scroll-mt-6"><AboutSection isPreview data={{ title: demo.label, description: demo.about, layout: "compact" }} styles={{ ...styles, backgroundColor: "#ffffff" }} /></div>
        <div id="aanbod" className="scroll-mt-6"><PricingSection isPreview styles={styles} data={{ title: demo.offerTitle, subtitle: "Voorbeeldtarieven ter illustratie van deze demo.", plans: demo.offers.map((offer) => ({ ...offer, showButton: false })), layout: "classic" }} /></div>
        <div id="vragen" className="scroll-mt-6"><FaqSection isPreview styles={{ ...styles, backgroundColor: "#ffffff" }} data={{ title: "Goed om te weten", items: [demo.faq, { question: "Kan ik via deze website contact opnemen of boeken?", answer: "Dit is een fictieve voorbeeldwebsite. Er worden geen aanvragen of boekingen verstuurd. Wil je een eigen website maken? Kies Gratis starten in de balk bovenaan." }] }} /></div>
      </main>
      <footer className="border-t border-[var(--landing-border)] px-6 py-8 text-center text-sm">
        <p>{demo.name} · Een voorbeeldwebsite met FlexPagina</p>
        <Link href="/#voorbeelden" className="mt-3 inline-block font-semibold underline underline-offset-4">Bekijk de andere voorbeelden</Link>
      </footer>
    </div>
  )
}
