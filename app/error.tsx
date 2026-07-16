"use client"

import { RotateCcw } from "lucide-react"

import { ErrorPageShell } from "@/components/layout/error-page-shell"

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <ErrorPageShell
      eyebrow="Er ging iets mis"
      title="De pagina kon niet worden geladen"
      description="Er is onverwacht iets misgegaan. Probeer de pagina opnieuw te laden of ga terug naar de homepage."
      primaryHref="/"
      primaryLabel="Naar de homepage"
      action={
        <button
          type="button"
          onClick={reset}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[var(--landing-border)] bg-white px-7 py-3 font-bold transition-colors hover:border-[var(--landing-primary)] hover:bg-[var(--landing-primary-light)]"
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          Opnieuw proberen
        </button>
      }
    />
  )
}
