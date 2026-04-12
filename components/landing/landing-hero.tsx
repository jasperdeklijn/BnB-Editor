import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"

export function LandingHero() {
  return (
    <section
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[var(--hero-bg)] px-6 pt-20 text-center"
      aria-label="Hero sectie"
    >
      {/* Subtle grid overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
        aria-hidden="true"
      />

      {/* Blue glow */}
      <div
        className="pointer-events-none absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full opacity-25 blur-3xl"
        style={{ background: "var(--brand-blue)" }}
        aria-hidden="true"
      />
      {/* Purple glow */}
      <div
        className="pointer-events-none absolute top-2/3 right-1/4 h-[400px] w-[400px] rounded-full opacity-15 blur-3xl"
        style={{ background: "var(--brand-purple)" }}
        aria-hidden="true"
      />
      {/* Extra blue accent bottom-left */}
      <div
        className="pointer-events-none absolute bottom-0 left-0 h-[300px] w-[300px] rounded-full opacity-10 blur-3xl"
        style={{ background: "var(--brand-blue)" }}
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto max-w-4xl">
        {/* Demo badge */}
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[var(--brand-purple)]/40 bg-[var(--brand-purple)]/10 px-4 py-1.5">
          <span className="h-2 w-2 rounded-full bg-[var(--brand-purple)] animate-pulse" aria-hidden="true" />
          <span className="text-sm font-medium text-[var(--brand-purple)]">Professionele B&B websites maken</span>
        </div>

        <h1 className="mb-6 text-balance text-5xl font-bold leading-tight tracking-tight text-white md:text-6xl lg:text-7xl">
          Bouw jouw B&B website{" "}
          <span className="bg-gradient-to-r from-[var(--brand-blue)] to-[var(--brand-purple)] bg-clip-text text-transparent">zonder code</span>
        </h1>

        <p className="mx-auto mb-10 max-w-2xl text-pretty text-xl leading-relaxed text-white/60">
          Met BnB Website Maken bouw je eenvoudig een professionele website voor jouw bed & breakfast. 
          Kies secties, pas content aan en publiceer direct online.
        </p>

        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Button
            asChild
            size="lg"
            className="bg-gradient-to-r from-[var(--brand-blue)] to-[var(--brand-purple)] text-white hover:opacity-90 text-base px-8 py-6"
          >
            <Link href="/auth/sign-up">Begin met bouwen — gratis</Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="border-[var(--brand-blue)]/30 bg-[var(--brand-blue)]/5 text-white hover:bg-[var(--brand-blue)]/15 text-base px-8 py-6"
          >
            <Link href="/auth/login">Inloggen</Link>
          </Button>
        </div>

        <p className="mt-5 text-sm text-white/30">
          Start vandaag nog met het maken van jouw professionele B&B website.
        </p>
      </div>

      {/* Screenshot preview instead of interactive mock */}
      <div className="relative z-10 mt-20 w-full max-w-5xl" id="voorbeeld">
        <div className="overflow-hidden rounded-2xl border border-[var(--brand-blue)]/20 shadow-2xl shadow-[var(--brand-purple)]/10">
          {/* Browser chrome */}
          <div className="flex items-center gap-2 border-b border-[var(--brand-blue)]/20 bg-[var(--hero-surface)] px-4 py-3">
            <div className="h-3 w-3 rounded-full bg-red-400/60" aria-hidden="true" />
            <div className="h-3 w-3 rounded-full bg-yellow-400/60" aria-hidden="true" />
            <div className="h-3 w-3 rounded-full bg-green-400/60" aria-hidden="true" />
            <div className="mx-3 flex-1 rounded-md bg-white/10 px-3 py-1 text-xs text-white/40">
              bnbwebsitemaken.nl / editor
            </div>
          </div>
          {/* Screenshot image */}
          <video
            aria-label="Voorbeeld van BnB Website Maken — professionele website bouwer voor bed & breakfast"
            width={1200}
            height={350}
            className="w-full"
            controls
            autoPlay
            muted
            loop
          >
            <source src="/editor-demo.mp4" type="video/mp4" />
          </video>
        </div>
        <p className="mt-3 text-center text-xs text-white/25">Visuele weergave — de werkelijke editor kan afwijken</p>
      </div>
    </section>
  )
}
