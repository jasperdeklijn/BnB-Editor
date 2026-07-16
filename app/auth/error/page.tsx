import type { Metadata } from "next"

import { ErrorPageShell } from "@/components/layout/error-page-shell"

export const metadata: Metadata = {
  title: "Inloggen niet gelukt",
}

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; error_description?: string }>
}) {
  const params = await searchParams
  const errorDetail = params.error_description || params.error

  return (
    <ErrorPageShell
      eyebrow="Inloggen niet gelukt"
      title="We konden je niet aanmelden"
      description="De aanmeldlink kan verlopen zijn of de verbinding is onderbroken. Probeer opnieuw in te loggen om verder te gaan."
      primaryHref="/auth/login"
      primaryLabel="Opnieuw inloggen"
      secondaryHref="/"
      secondaryLabel="Naar de homepage"
      detail={errorDetail ? <>Foutmelding: <span className="font-semibold">{errorDetail}</span></> : undefined}
    />
  )
}
