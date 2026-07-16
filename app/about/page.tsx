import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { ArrowRight, Eye, PencilRuler, ShieldCheck } from "lucide-react"

import { SharedFooter } from "@/components/layout/shared-footer"
import { PLATFORM_BRAND_NAME } from "@/lib/platform"

export const metadata: Metadata = {
  title: "Over ons",
  description:
    "Lees waarom FlexPagina.nl een eenvoudige, transparante websitebouwer voor zelfstandigen en kleine bedrijven ontwikkelt.",
  alternates: {
    canonical: "/about",
  },
  openGraph: {
    url: "/about",
    title: `Over ons | ${PLATFORM_BRAND_NAME}`,
    description:
      "Waarom FlexPagina.nl een praktische websitebouwer voor kleine ondernemers ontwikkelt.",
  },
}

const principles = [
  {
    title: "Eenvoud boven techniek",
    description: "De editor moet begrijpelijk blijven voor ondernemers die vooral met hun eigen vak bezig willen zijn.",
    icon: PencilRuler,
  },
  {
    title: "Zichtbaar en bewerkbaar",
    description: "Je ziet wat je bouwt en kunt teksten, beelden, kleuren en onderdelen zelf blijven aanpassen.",
    icon: Eye,
  },
  {
    title: "Duidelijke afspraken",
    description: "Pakketten, functies, privacy-informatie en beheeropties worden zo transparant mogelijk uitgelegd.",
    icon: ShieldCheck,
  },
]

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white text-[var(--landing-secondary)]">
      <header className="border-b border-[var(--landing-border)] bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" aria-label={`${PLATFORM_BRAND_NAME} homepage`}>
            <Image src="/logo_klein.png" alt={PLATFORM_BRAND_NAME} width={1536} height={1024} priority className="h-12 w-auto object-contain" />
          </Link>
          <nav className="flex items-center gap-5 text-sm font-semibold" aria-label="Over ons navigatie">
            <Link href="/pricing" className="text-slate-600 hover:text-[var(--landing-primary)]">Prijzen</Link>
            <Link href="/auth/sign-up" className="rounded-full bg-[var(--landing-primary)] px-5 py-2.5 text-white hover:bg-[var(--landing-primary-dark)]">
              Begin gratis
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="overflow-hidden bg-[linear-gradient(145deg,#FFFFFF_0%,#EEF5F0_62%,#FBF3DF_100%)] px-6 py-24">
          <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div>
              <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-[var(--landing-primary)]">Over ons</p>
              <h1 className="text-balance text-5xl font-extrabold leading-[1.05] md:text-6xl">
                Professioneel online zijn moet ook voor kleine bedrijven haalbaar zijn
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-relaxed text-[var(--landing-muted)]">
                {PLATFORM_BRAND_NAME} wordt gebouwd als praktische websitebouwer voor zelfstandigen en kleine ondernemers.
                Het doel is eenvoudig: minder technische drempels en meer controle over je eigen online presentatie.
              </p>
            </div>
            <div className="rounded-[32px] bg-[var(--landing-primary-dark)] p-8 text-white shadow-[0_24px_60px_rgba(31,41,51,.16)] md:p-10">
              <p className="text-sm font-semibold uppercase tracking-widest text-[var(--landing-gold)]">Onze richting</p>
              <p className="mt-5 text-2xl font-bold leading-snug">
                Een duidelijke editor, bruikbare secties en eerlijke informatie over wat je nodig hebt om online te groeien.
              </p>
              <p className="mt-5 text-sm leading-relaxed text-white/65">
                FlexPagina.nl is een product in ontwikkeling. Functies worden stap voor stap verbeterd op basis van praktische gebruikssituaties.
              </p>
            </div>
          </div>
        </section>

        <section className="px-6 py-24">
          <div className="mx-auto max-w-6xl">
            <div className="mb-12 max-w-2xl">
              <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-[var(--landing-primary)]">Uitgangspunten</p>
              <h2 className="text-balance text-4xl font-bold md:text-5xl">Waar we het product op bouwen</h2>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              {principles.map(({ title, description, icon: Icon }, index) => (
                <article key={title} className={`rounded-3xl border p-7 ${index === 1 ? "border-[#ead9ae] bg-[var(--landing-gold-light)]" : "border-[var(--landing-border)] bg-[var(--landing-surface)]"}`}>
                  <Icon className="h-6 w-6 text-[var(--landing-primary)]" aria-hidden="true" />
                  <h3 className="mt-5 text-xl font-bold">{title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-[var(--landing-muted)]">{description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[var(--landing-warm)] px-6 py-24">
          <div className="mx-auto max-w-6xl rounded-[32px] bg-[var(--landing-primary)] px-8 py-12 text-center text-white md:px-16">
            <h2 className="text-balance text-3xl font-bold md:text-4xl">Bekijk zelf hoe eenvoudig een website maken kan zijn</h2>
            <p className="mx-auto mt-4 max-w-2xl text-white/70">Maak gratis een account aan en bouw je eerste pagina met de visuele editor.</p>
            <Link href="/auth/sign-up" className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 font-bold text-[var(--landing-primary-dark)]">
              Begin gratis
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </section>
      </main>

      <SharedFooter />
    </div>
  )
}
