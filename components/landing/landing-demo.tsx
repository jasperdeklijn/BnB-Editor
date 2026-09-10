import { ExternalLink } from "lucide-react"
import { PLATFORM_BRAND_NAME } from "@/lib/platform"

export function LandingDemo() {
  return (
    <section
      id="voorbeeld"
      aria-labelledby="demo-heading"
      className="scroll-mt-24 bg-white px-6 py-20 sm:py-24"
    >
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 max-w-2xl">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-[var(--landing-primary)]">
            Interactieve demo
          </p>
          <h2 id="demo-heading" className="text-balance text-3xl font-bold text-[var(--landing-secondary)] sm:text-4xl md:text-5xl">
            Ontdek zelf hoe {PLATFORM_BRAND_NAME} werkt
          </h2>
          <p className="mt-4 text-pretty text-lg leading-relaxed text-[var(--landing-muted)]">
            Klik door de demo en bekijk stap voor stap hoe je jouw website maakt en aanpast.
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-[var(--landing-border)] bg-[var(--landing-surface)] shadow-[0_16px_40px_rgba(31,41,51,0.08)] sm:rounded-3xl">
          <div className="relative h-0 pb-[calc(56.25%+42px)]">
            <iframe
              src="https://app.supademo.com/embed/cmtvo85wf04nlqm7xofmf8sax"
              title={`Interactieve demo van ${PLATFORM_BRAND_NAME}`}
              loading="lazy"
              allow="clipboard-write; fullscreen"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
              className="absolute inset-0 h-full w-full border-0"
            />
          </div>
        </div>

        <div className="mt-5 flex justify-center sm:justify-end">
          <a
            href="https://app.supademo.com/demo/cmtvo85wf04nlqm7xofmf8sax"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center gap-2 rounded-md text-sm font-semibold text-[var(--landing-primary)] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--landing-primary)] focus-visible:ring-offset-4"
          >
            Open de demo in een nieuw tabblad
            <ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />
          </a>
        </div>
      </div>
    </section>
  )
}
