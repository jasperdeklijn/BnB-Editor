import Image from "next/image"
import Link from "next/link"
import type { ReactNode } from "react"
import { ArrowLeft, ArrowRight, CircleAlert } from "lucide-react"

import { PLATFORM_BRAND_NAME } from "@/lib/platform"

type ErrorPageShellProps = {
  eyebrow: string
  title: string
  description: string
  primaryHref: string
  primaryLabel: string
  secondaryHref?: string
  secondaryLabel?: string
  detail?: ReactNode
  action?: ReactNode
}

export function ErrorPageShell({
  eyebrow,
  title,
  description,
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
  detail,
  action,
}: ErrorPageShellProps) {
  return (
    <main className="relative flex min-h-svh items-center justify-center overflow-hidden bg-[linear-gradient(145deg,#FFFFFF_0%,#EEF5F0_62%,#FBF3DF_100%)] px-6 py-16 text-[var(--landing-secondary)]">
      <div className="absolute -left-24 top-1/4 h-72 w-72 rounded-full bg-[var(--landing-sage)]/70 blur-3xl" aria-hidden="true" />
      <div className="absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-[var(--landing-gold-light)] blur-3xl" aria-hidden="true" />

      <div className="relative w-full max-w-2xl">
        <Link
          href="/"
          className="mx-auto mb-8 flex w-fit items-center"
          aria-label={`${PLATFORM_BRAND_NAME} homepage`}
        >
          <Image
            src="/logo_klein.png"
            alt={PLATFORM_BRAND_NAME}
            width={1536}
            height={1024}
            priority
            className="h-14 w-auto object-contain"
          />
        </Link>

        <section className="overflow-hidden rounded-[32px] border border-[var(--landing-border)] bg-white shadow-[0_24px_70px_rgba(31,41,51,0.12)]">
          <div className="h-1.5 bg-[linear-gradient(90deg,var(--landing-primary),var(--landing-accent),var(--landing-gold))]" />
          <div className="px-7 py-10 text-center sm:px-12 sm:py-12">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--landing-primary-light)] text-[var(--landing-primary-dark)]">
              <CircleAlert className="h-8 w-8" aria-hidden="true" />
            </div>

            <p className="text-sm font-bold uppercase tracking-[0.2em] text-[var(--landing-primary)]">
              {eyebrow}
            </p>
            <h1 className="mt-3 text-balance text-3xl font-extrabold sm:text-4xl">{title}</h1>
            <p className="mx-auto mt-4 max-w-xl text-pretty leading-relaxed text-[var(--landing-muted)]">
              {description}
            </p>

            {detail ? (
              <div className="mx-auto mt-6 max-w-lg rounded-2xl border border-[var(--landing-border)] bg-[var(--landing-surface)] px-4 py-3 text-sm text-[var(--landing-muted)]">
                {detail}
              </div>
            ) : null}

            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href={primaryHref}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[var(--landing-primary)] px-7 py-3 font-bold text-white shadow-[0_10px_24px_rgba(36,56,45,0.18)] transition-colors hover:bg-[var(--landing-primary-dark)]"
              >
                {primaryLabel}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>

              {action}

              {secondaryHref && secondaryLabel ? (
                <Link
                  href={secondaryHref}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[var(--landing-border)] bg-white px-7 py-3 font-bold transition-colors hover:border-[var(--landing-primary)] hover:bg-[var(--landing-primary-light)]"
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                  {secondaryLabel}
                </Link>
              ) : null}
            </div>
          </div>
        </section>

        <p className="mt-6 text-center text-xs text-[var(--landing-muted)]">
          Blijft het probleem terugkomen? Neem contact op via{" "}
          <a href="mailto:support@flexpagina.nl" className="font-semibold text-[var(--landing-primary)] hover:underline">
            support@flexpagina.nl
          </a>
          .
        </p>
      </div>
    </main>
  )
}
