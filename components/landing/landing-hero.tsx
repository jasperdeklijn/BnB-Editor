import Link from "next/link"
import { Button } from "@/components/ui/button"

export function LandingHero() {
  return (
    <section
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[var(--hero-bg)] px-6 pt-20 text-center"
      aria-label="Hero section"
    >
      {/* Subtle grid overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
        aria-hidden="true"
      />

      {/* Glow accents */}
      <div
        className="pointer-events-none absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[480px] w-[480px] rounded-full opacity-20 blur-3xl"
        style={{ background: "var(--brand-blue)" }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute top-1/2 left-1/4 h-[320px] w-[320px] rounded-full opacity-10 blur-3xl"
        style={{ background: "var(--brand-purple)" }}
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto max-w-4xl">
        {/* Demo badge */}
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[var(--brand-purple)]/40 bg-[var(--brand-purple)]/10 px-4 py-1.5">
          <span className="h-2 w-2 rounded-full bg-[var(--brand-purple)] animate-pulse" aria-hidden="true" />
          <span className="text-sm font-medium text-[var(--brand-purple)]">Testing demo — not for production</span>
        </div>

        <h1 className="mb-6 text-balance text-5xl font-bold leading-tight tracking-tight text-white md:text-6xl lg:text-7xl">
          Build your B&B website{" "}
          <span className="text-[var(--brand-blue)]">without code</span>
        </h1>

        <p className="mx-auto mb-10 max-w-2xl text-pretty text-xl leading-relaxed text-white/60">
          The BnB Editor lets you create a stunning, professional website for your bed and breakfast in minutes. 
          Drag-and-drop sections, customise content, and publish instantly.
        </p>

        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Button
            asChild
            size="lg"
            className="bg-[var(--brand-blue)] text-white hover:bg-[var(--brand-blue)]/90 text-base px-8 py-6"
          >
            <Link href="/auth/sign-up">Start building — it&apos;s free</Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="border-white/20 bg-white/5 text-white hover:bg-white/10 text-base px-8 py-6"
          >
            <Link href="/auth/login">Sign in</Link>
          </Button>
        </div>

        <p className="mt-5 text-sm text-white/30">
          This is a testing environment. Data may be reset at any time.
        </p>
      </div>

      {/* Mock editor preview */}
      <div className="relative z-10 mt-20 w-full max-w-5xl" id="demo">
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-[var(--hero-surface)] shadow-2xl shadow-black/40">
          {/* Browser chrome */}
          <div className="flex items-center gap-2 border-b border-white/10 bg-white/5 px-4 py-3">
            <div className="h-3 w-3 rounded-full bg-red-400/60" aria-hidden="true" />
            <div className="h-3 w-3 rounded-full bg-yellow-400/60" aria-hidden="true" />
            <div className="h-3 w-3 rounded-full bg-green-400/60" aria-hidden="true" />
            <div className="mx-3 flex-1 rounded-md bg-white/10 px-3 py-1 text-xs text-white/40">
              bnb-editor.demo / editor
            </div>
          </div>
          {/* Editor mockup */}
          <div className="grid grid-cols-1 md:grid-cols-[240px_1fr]">
            {/* Sidebar */}
            <div className="hidden border-r border-white/10 p-4 md:block">
              <p className="mb-3 text-xs font-medium uppercase tracking-widest text-white/30">Sections</p>
              <div className="flex flex-col gap-2">
                {["Hero", "About", "Rooms", "Gallery", "Amenities", "Contact"].map((s, i) => (
                  <div
                    key={s}
                    className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                      i === 0
                        ? "bg-[var(--brand-blue)]/20 text-[var(--brand-blue)]"
                        : "text-white/50 hover:bg-white/5"
                    }`}
                  >
                    <div className={`h-1.5 w-1.5 rounded-full ${i === 0 ? "bg-[var(--brand-blue)]" : "bg-white/20"}`} aria-hidden="true" />
                    {s}
                  </div>
                ))}
              </div>
              <div className="mt-4 border-t border-white/10 pt-4">
                <p className="mb-3 text-xs font-medium uppercase tracking-widest text-white/30">Style</p>
                <div className="flex gap-2">
                  {["#2563eb", "#7c3aed", "#0ea5e9"].map((c) => (
                    <div
                      key={c}
                      className="h-6 w-6 rounded-full border-2 border-white/10 cursor-pointer hover:border-white/40 transition-colors"
                      style={{ background: c }}
                      aria-label={`Color option ${c}`}
                    />
                  ))}
                </div>
              </div>
            </div>
            {/* Canvas */}
            <div className="min-h-[320px] bg-white/[0.03] p-6">
              <div className="mb-4 rounded-xl bg-[var(--brand-blue)]/10 border border-[var(--brand-blue)]/20 p-6">
                <div className="mb-2 h-6 w-2/3 rounded bg-white/20" aria-hidden="true" />
                <div className="mb-4 h-4 w-full rounded bg-white/10" aria-hidden="true" />
                <div className="h-4 w-3/4 rounded bg-white/10" aria-hidden="true" />
                <div className="mt-5 flex gap-3">
                  <div className="h-9 w-28 rounded-lg bg-[var(--brand-blue)]/60" aria-hidden="true" />
                  <div className="h-9 w-24 rounded-lg bg-white/10" aria-hidden="true" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="rounded-lg border border-white/10 bg-white/5 p-3">
                    <div className="mb-2 h-16 rounded-md bg-white/10" aria-hidden="true" />
                    <div className="h-3 w-3/4 rounded bg-white/15" aria-hidden="true" />
                    <div className="mt-1.5 h-3 w-1/2 rounded bg-white/10" aria-hidden="true" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <p className="mt-3 text-center text-xs text-white/25">Visual representation — actual editor may vary</p>
      </div>
    </section>
  )
}
