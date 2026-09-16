import { Globe2, MessageSquare, CalendarCheck } from "lucide-react"

const benefits = [
  { title: "Professioneel online", description: "Een website die past bij je bedrijf, goed werkt op mobiel en vindbaar is. Met je eigen domein en SEO-basis presenteer je je aanbod op één herkenbare plek.", detail: "Website, eigen domein en SEO-basis in elk pakket.", icon: Globe2 },
  { title: "Meer aanvragen", description: "Laat zien wat je doet, beantwoord veelgestelde vragen en maak contact opnemen makkelijk. Ontvang aanvragen die je overzichtelijk kunt opvolgen.", detail: "Contact in elk pakket. Aanvragen vanaf Silver.", icon: MessageSquare },
  { title: "Minder administratie", description: "Beheer beschikbaarheid en boekingen in je dashboard. Maak vanuit een boeking een factuur, met de klantgegevens al bij de hand.", detail: "Uit te breiden met Booking & Facturatie.", icon: CalendarCheck },
]

export function LandingFeatures() {
  return (
    <section id="functies" className="scroll-mt-24 bg-white px-6 py-20 sm:py-24" aria-labelledby="benefits-title">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 max-w-2xl">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-[var(--landing-primary)]">Meer tijd voor je bedrijf</p>
          <h2 id="benefits-title" className="text-balance text-3xl font-bold sm:text-4xl md:text-5xl">Van online zichtbaar naar overzicht in je werk.</h2>
          <p className="mt-4 text-lg leading-relaxed text-[var(--landing-muted)]">Begin met je website. Voeg toe wat jouw bedrijf nodig heeft, wanneer jij eraan toe bent.</p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {benefits.map(({ title, description, detail, icon: Icon }) => (
            <article key={title} className="flex flex-col rounded-3xl border border-[var(--landing-border)] bg-[var(--landing-surface)] p-7">
              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--landing-primary-light)] text-[var(--landing-primary)]"><Icon className="h-5 w-5" aria-hidden="true" /></div>
              <h3 className="text-xl font-bold">{title}</h3>
              <p className="mb-6 mt-3 flex-1 text-sm leading-relaxed text-[var(--landing-muted)]">{description}</p>
              <p className="border-t border-[var(--landing-border)] pt-4 text-sm font-medium text-[var(--landing-primary)]">{detail}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
