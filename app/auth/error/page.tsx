import type { Metadata } from "next"

import { ErrorPageShell } from "@/components/layout/error-page-shell"

export const metadata: Metadata = {
  title: "Herstellink niet geldig",
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
      eyebrow="Wachtwoord herstellen"
      title="De herstellink werkt niet meer"
      description="De link kan verlopen of al gebruikt zijn. Vraag een nieuwe herstellink aan om uw wachtwoord opnieuw in te stellen."
      primaryHref="/auth/forgot-password"
      primaryLabel="Nieuwe link aanvragen"
      secondaryHref="/auth/login"
      secondaryLabel="Terug naar inloggen"
      detail={errorDetail ? <>Foutmelding: <span className="font-semibold">{errorDetail}</span></> : undefined}
    />
  )
}
