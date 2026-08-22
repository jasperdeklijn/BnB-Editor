import Link from "next/link"
import { ArrowRight, CheckCircle2 } from "lucide-react"

import { Button } from "@/components/ui/button"

export function OnboardingComplete({ websiteId, returnTo }: { websiteId: string; returnTo?: string | null }) {
  return (
    <div className="py-4 text-center" role="status">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <CheckCircle2 className="h-8 w-8" aria-hidden="true" />
      </div>
      <p className="mt-6 text-sm font-semibold text-primary">Alles staat klaar</p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight text-foreground">Je eerste websiteconcept is gemaakt.</h1>
      <p className="mx-auto mt-3 max-w-lg text-muted-foreground">We hebben je bedrijfsgegevens, contactinformatie en passende startersecties ingevuld. Controleer en bewerk alles voordat je publiceert.</p>
      <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        <Button asChild className="h-11 rounded-full px-6">
          <Link href={`/editor?websiteId=${encodeURIComponent(websiteId)}`}>Open website-editor<ArrowRight className="ml-2 h-4 w-4" /></Link>
        </Button>
        <Button asChild variant="outline" className="h-11 rounded-full px-6">
          <Link href={returnTo || "/editor"}>{returnTo ? "Doorgaan" : "Naar overzicht"}</Link>
        </Button>
      </div>
    </div>
  )
}
