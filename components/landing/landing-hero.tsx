import Link from "next/link"
import { Button } from "@/components/ui/button"
import { PLATFORM_BRAND_NAME } from "@/lib/platform"
import { Check, ImageIcon, LayoutTemplate, Palette, Send } from "lucide-react"

export function LandingHero() {
  return (
    <section
      className="relative overflow-hidden bg-[linear-gradient(145deg,#FFFFFF_0%,#EEF5F0_58%,#FBF3DF_100%)] px-6 pb-20 pt-32"
      aria-label="Hero sectie"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.32]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 78% 22%, rgba(56,83,68,.24), transparent 28%), radial-gradient(circle at 8% 82%, rgba(211,155,42,.16), transparent 24%)",
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[var(--landing-border)] bg-white py-1.5 pl-2 pr-4 text-sm font-medium text-[var(--landing-primary-dark)] shadow-sm">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--landing-primary)] text-[10px] font-extrabold text-white" aria-hidden="true">
              FP
            </span>
            <span>Praktische website software voor kleine bedrijven</span>
          </div>

          <h1 className="mb-6 text-balance text-5xl font-extrabold leading-[1.05] text-[var(--landing-secondary)] md:text-6xl">
            Maak zelf een professionele website voor je bedrijf
          </h1>

          <p className="mb-9 max-w-xl text-pretty text-lg leading-relaxed text-[var(--landing-muted)]">
            {PLATFORM_BRAND_NAME} is de eenvoudige websitebouwer voor kleine ondernemers.
            Kies kant-en-klare secties, pas tekst, foto&apos;s en kleuren visueel aan en
            publiceer je bedrijfswebsite zonder code.
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
            {["Snel starten", "Eenvoudig beheer", "Direct publiceren"].map((item) => (
              <span key={item} className="inline-flex items-center gap-1.5">
                <Check className="h-4 w-4 text-[var(--landing-primary)]" aria-hidden="true" />
                {item}
              </span>
            ))}
          </div>
        </div>

        <div className="w-full" id="voorbeeld">
          <div className="relative overflow-hidden rounded-3xl border border-[var(--landing-border)] bg-white shadow-[0_24px_60px_rgba(31,41,51,0.14)]">
            <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-[var(--landing-gold-light)] blur-2xl" aria-hidden="true" />
            <div className="flex items-center gap-2 border-b border-[var(--landing-border)] bg-[var(--landing-surface)] px-4 py-3">
              <div className="h-3 w-3 rounded-full bg-red-400/70" aria-hidden="true" />
              <div className="h-3 w-3 rounded-full bg-yellow-400/70" aria-hidden="true" />
              <div className="h-3 w-3 rounded-full bg-green-500/70" aria-hidden="true" />
              <div className="mx-3 flex min-w-0 flex-1 items-center gap-2 rounded-md bg-white px-3 py-1 text-xs text-slate-500">
                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded bg-[var(--landing-primary)] text-[7px] font-bold text-white" aria-hidden="true">FP</span>
                <span className="truncate">{PLATFORM_BRAND_NAME} / editor</span>
              </div>
            </div>
            <div
              className="relative grid min-h-[390px] grid-cols-[76px_1fr] bg-[#eef2ef] p-3 sm:grid-cols-[180px_1fr] sm:p-5"
              role="img"
              aria-label={`Voorbeeld van de visuele website-editor van ${PLATFORM_BRAND_NAME}`}
            >
              <aside className="rounded-l-2xl bg-[var(--landing-primary-dark)] p-3 text-white sm:p-4">
                <p className="hidden text-xs font-bold uppercase tracking-wider text-white/55 sm:block">Onderdelen</p>
                <div className="mt-3 space-y-2">
                  {[
                    { label: "Secties", icon: LayoutTemplate },
                    { label: "Afbeeldingen", icon: ImageIcon },
                    { label: "Stijl", icon: Palette },
                  ].map(({ label, icon: Icon }, index) => (
                    <div
                      key={label}
                      className={`flex items-center gap-2 rounded-xl p-2.5 text-xs ${
                        index === 0 ? "bg-white/14 text-white" : "text-white/60"
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                      <span className="hidden sm:inline">{label}</span>
                    </div>
                  ))}
                </div>
              </aside>

              <div className="overflow-hidden rounded-r-2xl border border-l-0 border-[var(--landing-border)] bg-white">
                <div className="flex items-center justify-between border-b border-[var(--landing-border)] px-4 py-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--landing-muted)]">Voorbeeldwebsite</p>
                    <p className="text-sm font-bold text-[var(--landing-secondary)]">Studio Bloei</p>
                  </div>
                  <div className="flex items-center gap-2 rounded-full bg-[var(--landing-primary)] px-3 py-2 text-[10px] font-bold text-white">
                    <Send className="h-3 w-3" aria-hidden="true" />
                    <span className="hidden sm:inline">Publiceren</span>
                  </div>
                </div>

                <div className="p-4 sm:p-6">
                  <div className="rounded-2xl bg-[linear-gradient(135deg,#385344,#6F927D)] p-5 text-white sm:p-7">
                    <span className="rounded-full bg-white/14 px-3 py-1 text-[10px] font-semibold">Persoonlijke verzorging</span>
                    <h2 className="mt-4 max-w-sm text-xl font-bold leading-tight sm:text-3xl">
                      Tijd voor aandacht, rust en een frisse uitstraling
                    </h2>
                    <div className="mt-5 h-8 w-28 rounded-full bg-[var(--landing-gold)]" />
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-3">
                    {[0, 1, 2].map((item) => (
                      <div key={item} className="rounded-xl border border-[var(--landing-border)] p-3">
                        <div className={`h-8 w-8 rounded-lg ${item === 1 ? "bg-[var(--landing-gold-light)]" : "bg-[var(--landing-primary-light)]"}`} />
                        <div className="mt-3 h-2 w-3/4 rounded bg-slate-200" />
                        <div className="mt-2 h-2 w-full rounded bg-slate-100" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <p className="mt-3 text-center text-xs text-[var(--landing-muted)]">
            Voorbeeld van de visuele editor: pas onderdelen aan en bekijk direct het resultaat.
          </p>
        </div>
      </div>
    </section>
  )
}
