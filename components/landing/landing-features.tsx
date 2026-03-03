import Image from "next/image"

const features = [
  {
    title: "Visuele drag-and-drop editor",
    description:
      "Versleep secties, pas tekst en afbeeldingen direct op de pagina aan. Geen code of designkennis nodig.",
    image: "/placeholder.svg?height=200&width=400",
    alt: "Schermafbeelding van de drag-and-drop editor interface",
  },
  {
    title: "Kant-en-klare B&B secties",
    description:
      "Hero banners, kameroverzichten, voorzieningen, fotogalerijen, contactformulieren en meer — allemaal speciaal voor B&B's gemaakt.",
    image: "/placeholder.svg?height=200&width=400",
    alt: "Voorbeeld van kant-en-klare website secties voor een bed and breakfast",
  },
  {
    title: "Eigen kleuren & lettertypen",
    description:
      "Pas alles aan op jouw huisstijl met een kleurenpalet en lettertype-kiezer. Jouw website, jouw identiteit.",
    image: "/placeholder.svg?height=200&width=400",
    alt: "Kleurenpalet en lettertype aanpassingen in de editor",
  },
  {
    title: "Afbeeldingenbibliotheek",
    description:
      "Upload je eigen foto's van het pand en beheer ze vanuit een centrale bibliotheek die altijd binnen handbereik is.",
    image: "/placeholder.svg?height=200&width=400",
    alt: "Afbeeldingenbibliotheek met foto's van een B&B",
  },
  {
    title: "Direct publiceren",
    description:
      "Publiceer je wijzigingen met een klik. Je gasten zien de updates meteen, geen deploy pipeline nodig.",
    image: "/placeholder.svg?height=200&width=400",
    alt: "Publiceerknop en live preview van de website",
  },
  {
    title: "Veilig & altijd online",
    description:
      "Gebouwd op Supabase en Vercel. Je data is veilig en je site is snel, waar je gasten ook zijn.",
    image: "/placeholder.svg?height=200&width=400",
    alt: "Beveiligingspictogrammen en uptime statistieken",
  },
]

export function LandingFeatures() {
  return (
    <section id="functies" className="bg-[var(--surface-dim)] px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="mb-16 text-center">
          <p className="mb-3 text-sm font-medium uppercase tracking-widest text-[var(--brand-purple)]">Functies</p>
          <h2 className="text-balance text-4xl font-bold text-[var(--foreground)] md:text-5xl">
            Alles wat jouw B&B website nodig heeft
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-pretty text-lg leading-relaxed text-[var(--muted-foreground)]">
            Een gerichte set tools speciaal voor bed & breakfast eigenaren — geen opgeblazen website bouwer.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <article
              key={feature.title}
              className="group overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] transition-all hover:shadow-lg hover:shadow-[var(--brand-blue)]/5 hover:border-[var(--brand-blue)]/30"
            >
              {/* Feature image */}
              <div className="relative h-40 w-full overflow-hidden bg-gradient-to-br from-[var(--brand-blue)]/10 to-[var(--brand-purple)]/10">
                <Image
                  src={feature.image}
                  alt={feature.alt}
                  width={400}
                  height={200}
                  className="h-full w-full object-cover transition-transform group-hover:scale-105"
                />
              </div>
              <div className="p-6">
                <h3 className="mb-2 font-semibold text-[var(--foreground)]">{feature.title}</h3>
                <p className="text-sm leading-relaxed text-[var(--muted-foreground)]">{feature.description}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
