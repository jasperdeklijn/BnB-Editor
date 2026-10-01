"use client"
import { Button } from "@/components/ui/button"
export default function AdminError({ retry }: { retry: () => void }) {
  return <main className="space-y-4 p-6"><h1 className="text-2xl font-bold">Beheer kon niet worden geladen</h1><p role="alert" className="text-sm text-muted-foreground">Er ging iets mis bij het ophalen van deze pagina. Probeer het opnieuw.</p><Button onClick={() => retry()}>Opnieuw proberen</Button></main>
}
