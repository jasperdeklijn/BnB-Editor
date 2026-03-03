const features = [
  {
    title: "Visual drag-and-drop editor",
    description:
      "Rearrange sections, update text and images directly on the page. No code or design knowledge needed.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <rect x="2" y="2" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
        <rect x="11" y="2" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
        <rect x="2" y="11" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
        <rect x="11" y="11" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    title: "Ready-made B&B sections",
    description:
      "Hero banners, room listings, amenities, photo galleries, contact forms and more — all built for B&Bs.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M3 5h14M3 10h14M3 15h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: "Custom colours & fonts",
    description:
      "Match your brand with a full colour picker and font selector. Your website, your identity.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="10" cy="10" r="3" fill="currentColor" />
      </svg>
    ),
  },
  {
    title: "Image library",
    description:
      "Upload your own property photos and manage them from a central library that's always within reach.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <rect x="2" y="4" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="7" cy="9" r="1.5" stroke="currentColor" strokeWidth="1.25" />
        <path d="M2 14l4-4 3 3 2-2 5 5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: "Instant publish",
    description:
      "Publish your changes with a single click. Your guests see the updates immediately, no deploy pipeline required.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M10 13V4m-4 5l4-5 4 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M4 16h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: "Secure & always on",
    description:
      "Powered by Supabase and Vercel. Your data is safe and your site is fast, wherever your guests are.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M10 2l6 3v5c0 3.866-2.686 7.5-6 8.5C7.686 17.5 4 13.866 4 10V5l6-3z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M7 10l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
]

export function LandingFeatures() {
  return (
    <section id="features" className="bg-[var(--surface-dim)] px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="mb-16 text-center">
          <p className="mb-3 text-sm font-medium uppercase tracking-widest text-[var(--brand-blue)]">Features</p>
          <h2 className="text-balance text-4xl font-bold text-[var(--foreground)] md:text-5xl">
            Everything your B&B website needs
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-pretty text-lg leading-relaxed text-[var(--muted-foreground)]">
            A focused set of tools built specifically for bed and breakfast owners — not a bloated website builder.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <article
              key={feature.title}
              className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 transition-shadow hover:shadow-md"
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--brand-blue)]/10 text-[var(--brand-blue)]">
                {feature.icon}
              </div>
              <h3 className="mb-2 font-semibold text-[var(--foreground)]">{feature.title}</h3>
              <p className="text-sm leading-relaxed text-[var(--muted-foreground)]">{feature.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
