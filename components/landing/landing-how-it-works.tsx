const steps = [
  {
    step: "01",
    title: "Maak een account aan",
    description: "Registreer gratis en open direct de editor.",
  },
  {
    step: "02",
    title: "Kies je secties",
    description: "Selecteer onderdelen die passen bij jouw bedrijf en klanten.",
  },
  {
    step: "03",
    title: "Pas de inhoud aan",
    description: "Vul teksten, foto's, kleuren en contactgegevens in.",
  },
  {
    step: "04",
    title: "Publiceer online",
    description: "Zet je website live en werk hem later eenvoudig bij.",
  },
]

export function LandingHowItWorks() {
  return (
    <section id="hoe-het-werkt" className="bg-[var(--landing-surface)] px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="mb-14 max-w-2xl">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-[var(--landing-primary)]">
            Hoe het werkt
          </p>
          <h2 className="text-balance text-4xl font-bold text-[var(--landing-secondary)] md:text-5xl">
            Van eerste opzet tot live website in vier stappen
          </h2>
          <p className="mt-4 text-pretty text-lg leading-relaxed text-[var(--landing-muted)]">
            De workflow blijft bewust kort, zodat je vooral bezig bent met je bedrijf en niet met techniek.
          </p>
        </div>

        <div className="relative grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="absolute left-[10%] right-[10%] top-[22px] hidden h-px bg-[linear-gradient(90deg,var(--landing-accent),var(--landing-gold),var(--landing-accent))] lg:block" aria-hidden="true" />
          {steps.map((s, index) => (
            <article
              key={s.step}
              className="relative rounded-3xl border border-[var(--landing-border)] bg-white p-7 shadow-[0_12px_30px_rgba(31,41,51,0.04)]"
            >
              <div className={`relative z-10 mb-8 flex h-11 w-11 items-center justify-center rounded-2xl text-sm font-bold ${
                index % 2 === 0
                  ? "bg-[var(--landing-primary)] text-white"
                  : "bg-[var(--landing-gold-light)] text-[#8a6418]"
              }`}>
                {s.step}
              </div>
              <h3 className="mb-2 text-lg font-bold text-[var(--landing-secondary)]">{s.title}</h3>
              <p className="text-sm leading-relaxed text-[var(--landing-muted)]">{s.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
