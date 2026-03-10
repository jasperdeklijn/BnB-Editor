import Image from "next/image"

const steps = [
  {
    step: "01",
    title: "Maak een account aan",
    description: "Registreer gratis en begin direct met het maken van jouw website.",
    image: "/placeholder.svg?height=160&width=280",
    alt: "Registratieformulier voor BnB Website Maken",
  },
  {
    step: "02",
    title: "Kies je secties",
    description: "Kies uit kant-en-klare secties voor B&B's: hero, kamers, galerij, contact en meer.",
    image: "/placeholder.svg?height=160&width=280",
    alt: "Overzicht van beschikbare website secties",
  },
  {
    step: "03",
    title: "Pas de inhoud aan",
    description: "Klik op tekst of afbeeldingen om direct op de pagina te bewerken. Stel kleuren en lettertypen in.",
    image: "/placeholder.svg?height=160&width=280",
    alt: "Editor met tekst en afbeelding aanpassingen",
  },
  {
    step: "04",
    title: "Publiceer direct",
    description: "Druk op publiceren en je B&B website staat live met een eigen URL voor je gasten.",
    image: "/placeholder.svg?height=160&width=280",
    alt: "Gepubliceerde website met eigen URL",
  },
]

export function LandingHowItWorks() {
  return (
    <section id="hoe-het-werkt" className="bg-[var(--hero-bg)] px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="mb-16 text-center">
          <p className="mb-3 text-sm font-medium uppercase tracking-widest text-[var(--brand-blue)]">Hoe het werkt</p>
          <h2 className="text-balance text-4xl font-bold text-white md:text-5xl">
            Van registratie tot <span className="bg-gradient-to-r from-[var(--brand-blue)] to-[var(--brand-purple)] bg-clip-text text-transparent">live</span> in vier stappen
          </h2>
        </div>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s) => (
            <div key={s.step} className="group flex flex-col">
              {/* Step image */}
              <div className="mb-4 overflow-hidden rounded-xl border border-[var(--brand-blue)]/20 bg-[var(--hero-surface)]">
                <Image
                  src={s.image}
                  alt={s.alt}
                  width={280}
                  height={160}
                  className="h-36 w-full object-cover transition-transform group-hover:scale-105"
                />
              </div>
              {/* Step number */}
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--brand-blue)]/20 to-[var(--brand-purple)]/20 border border-[var(--brand-blue)]/30">
                <span className="text-sm font-bold bg-gradient-to-r from-[var(--brand-blue)] to-[var(--brand-purple)] bg-clip-text text-transparent">{s.step}</span>
              </div>
              <h3 className="mb-2 font-semibold text-white">{s.title}</h3>
              <p className="text-sm leading-relaxed text-white/50">{s.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
