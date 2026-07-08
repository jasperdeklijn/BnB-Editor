import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { PLATFORM_BRAND_NAME } from "@/lib/platform"

export function LandingHero() {
  return (
    <section
      className="relative overflow-hidden bg-[linear-gradient(180deg,#FFFFFF_0%,#F6F8F5_100%)] px-6 pb-20 pt-32"
      aria-label="Hero sectie"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.32]"
        style={{
          backgroundImage: "radial-gradient(circle at top right, rgba(56, 83, 68, 0.18), transparent 34%)",
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[var(--landing-border)] bg-white py-1.5 pl-2 pr-4 text-sm font-medium text-[var(--landing-primary-dark)] shadow-sm">
            <Image
              src="/icon.png"
              alt=""
              width={1024}
              height={1024}
              className="h-7 w-7 rounded-full object-contain"
              aria-hidden="true"
            />
            <span>Praktische website software voor kleine bedrijven</span>
          </div>

          <h1 className="mb-6 text-balance text-5xl font-extrabold leading-[1.05] text-[var(--landing-secondary)] md:text-6xl">
            Bouw een professionele website zonder code
          </h1>

          <p className="mb-9 max-w-xl text-pretty text-lg leading-relaxed text-[var(--landing-muted)]">
            Met {PLATFORM_BRAND_NAME} maak je snel een duidelijke website voor jouw bedrijf.
            Kies kant-en-klare secties, pas de inhoud aan en publiceer direct online.
          </p>

          <div className="flex flex-col gap-4 sm:flex-row">
            <Button
              asChild
              size="lg"
              className="rounded-full bg-[var(--landing-primary)] px-8 py-6 text-base font-bold text-white shadow-[0_10px_24px_rgba(36,56,45,0.18)] hover:bg-[var(--landing-primary-dark)]"
            >
              <Link href="/auth/sign-up">Begin gratis</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="rounded-full border-[var(--landing-border)] bg-white px-8 py-6 text-base font-bold text-[var(--landing-secondary)] hover:border-[var(--landing-primary)] hover:bg-white hover:text-[var(--landing-primary-dark)]"
            >
              <Link href="#voorbeeld">Bekijk voorbeeld</Link>
            </Button>
          </div>

          <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-sm text-[var(--landing-muted)]">
            <span>Snel starten</span>
            <span>Eenvoudig beheer</span>
            <span>Direct publiceren</span>
          </div>
        </div>

        <div className="w-full" id="voorbeeld">
          <div className="overflow-hidden rounded-3xl border border-[var(--landing-border)] bg-white shadow-[0_20px_48px_rgba(31,41,51,0.09)]">
            <div className="flex items-center gap-2 border-b border-[var(--landing-border)] bg-[var(--landing-surface)] px-4 py-3">
              <div className="h-3 w-3 rounded-full bg-red-400/70" aria-hidden="true" />
              <div className="h-3 w-3 rounded-full bg-yellow-400/70" aria-hidden="true" />
              <div className="h-3 w-3 rounded-full bg-green-500/70" aria-hidden="true" />
              <div className="mx-3 flex min-w-0 flex-1 items-center gap-2 rounded-md bg-white px-3 py-1 text-xs text-slate-500">
                <Image
                  src="/icon.png"
                  alt=""
                  width={1024}
                  height={1024}
                  className="h-4 w-4 shrink-0 rounded object-contain"
                  aria-hidden="true"
                />
                <span className="truncate">{PLATFORM_BRAND_NAME} / editor</span>
              </div>
            </div>
            <video
              aria-label={`Voorbeeld van ${PLATFORM_BRAND_NAME} voor kleine bedrijven`}
              width={1200}
              height={350}
              className="w-full bg-white"
              controls
              autoPlay
              muted
              loop
            >
              <source src="/editor-demo.mp4" type="video/mp4" />
            </video>
          </div>
          <p className="mt-3 text-center text-xs text-[var(--landing-muted)]">
            Visuele weergave; de werkelijke editor kan afwijken.
          </p>
        </div>
      </div>
    </section>
  )
}
