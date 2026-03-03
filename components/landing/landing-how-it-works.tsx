const steps = [
  {
    step: "01",
    title: "Create your account",
    description: "Sign up for free. No credit card required for the testing demo.",
  },
  {
    step: "02",
    title: "Choose your sections",
    description: "Pick from pre-built sections designed for B&Bs: hero, rooms, gallery, contact and more.",
  },
  {
    step: "03",
    title: "Customise content",
    description: "Click any text or image to edit it directly on the page. Style colours and fonts to match your brand.",
  },
  {
    step: "04",
    title: "Publish instantly",
    description: "Hit publish and your B&B website is live under your own URL for guests to find and book.",
  },
]

export function LandingHowItWorks() {
  return (
    <section id="how-it-works" className="bg-[var(--hero-bg)] px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="mb-16 text-center">
          <p className="mb-3 text-sm font-medium uppercase tracking-widest text-[var(--brand-purple)]">How it works</p>
          <h2 className="text-balance text-4xl font-bold text-white md:text-5xl">
            From sign-up to live in four steps
          </h2>
        </div>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <div key={s.step} className="relative flex flex-col">
              {/* Connector line */}
              {i < steps.length - 1 && (
                <div
                  className="absolute top-5 left-full hidden h-px w-8 bg-white/10 lg:block"
                  style={{ transform: "translateX(-50%)" }}
                  aria-hidden="true"
                />
              )}
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--brand-blue)]/40 bg-[var(--brand-blue)]/10">
                <span className="text-sm font-bold text-[var(--brand-blue)]">{s.step}</span>
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
