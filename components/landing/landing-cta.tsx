import Link from "next/link"
import { Button } from "@/components/ui/button"

export function LandingCta() {
  return (
    <section className="bg-[var(--surface-dim)] px-6 py-24">
      <div className="mx-auto max-w-3xl text-center">
        <div className="rounded-3xl border border-[var(--brand-blue)]/20 bg-[var(--hero-bg)] p-12 shadow-xl shadow-[var(--brand-blue)]/5">
          {/* Demo badge */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[var(--brand-purple)]/30 bg-[var(--brand-purple)]/10 px-3 py-1 text-xs font-medium text-[var(--brand-purple)]">
            Testing demo
          </div>
          <h2 className="mb-4 text-balance text-4xl font-bold text-white">
            Ready to try the BnB Editor?
          </h2>
          <p className="mb-8 text-pretty text-lg leading-relaxed text-white/55">
            This is a testing demo environment. Create an account to explore the editor, build a sample website, 
            and give feedback. Your input helps shape the final product.
          </p>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Button
              asChild
              size="lg"
              className="bg-[var(--brand-blue)] text-white hover:bg-[var(--brand-blue)]/90 px-8 py-6 text-base"
            >
              <Link href="/auth/sign-up">Create a free account</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="ghost"
              className="text-white/70 hover:text-white hover:bg-white/10 px-8 py-6 text-base"
            >
              <Link href="/auth/login">I already have an account</Link>
            </Button>
          </div>
          <p className="mt-6 text-xs text-white/25">
            Testing environment — data may be reset without notice.
          </p>
        </div>
      </div>
    </section>
  )
}
