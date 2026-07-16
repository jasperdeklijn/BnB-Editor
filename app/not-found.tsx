import type { Metadata } from "next"

import { ErrorPageShell } from "@/components/layout/error-page-shell"

export const metadata: Metadata = {
  title: "Pagina niet gevonden",
  robots: {
    index: false,
    follow: true,
  },
}

export default function NotFoundPage() {
  return (
    <ErrorPageShell
      eyebrow="404"
      title="Deze pagina bestaat niet"
      description="De link is mogelijk verouderd of het adres is niet helemaal juist. Ga terug naar de homepage om verder te zoeken."
      primaryHref="/"
      primaryLabel="Naar de homepage"
      secondaryHref="/pricing"
      secondaryLabel="Bekijk de prijzen"
    />
  )
}
