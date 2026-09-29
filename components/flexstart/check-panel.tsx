"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { CheckCircle2, AlertTriangle, CircleX } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { CheckResult } from "@/lib/flexstart/shared"

export function CheckPanel({ check, websiteId, admin = false }: { check: CheckResult; websiteId: string; admin?: boolean }) {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState("")
  const router = useRouter()
  async function testForm() {
    setBusy(true); setMessage("")
    try {
      const response = await fetch(`/api/flexcheck/${websiteId}`, { method: "POST" })
      const result = await response.json()
      setMessage(result.message || result.error)
      if (response.ok) router.refresh()
    } catch { setMessage("De verbinding is onderbroken. Controleer je inbox voordat je opnieuw test.") }
    finally { setBusy(false) }
  }
  return <section className="space-y-4 rounded-2xl border bg-card p-4 sm:p-6" aria-labelledby="flexcheck-heading">
    <div><h2 id="flexcheck-heading" className="text-lg font-semibold">FlexCheck: {check.ready} van {check.total} punten gereed</h2>
      <p className="mt-1 text-sm text-muted-foreground">Automatische controle van je huidige concept. Persoonlijke beoordeling heet FlexReview.</p></div>
    <ul className="grid gap-3 md:grid-cols-2">
      {check.items.map((item) => {
        const Icon = item.state === "ready" ? CheckCircle2 : item.state === "required" ? CircleX : AlertTriangle
        const label = item.state === "ready" ? "Gereed" : item.state === "required" ? "Vereist vóór publicatie" : "Aanbevolen verbetering"
        return <li key={item.id} className="min-w-0 rounded-xl border p-3">
          <div className="flex items-start gap-2"><Icon aria-hidden="true" className={`mt-0.5 h-4 w-4 shrink-0 ${item.state === "required" ? "text-destructive" : "text-primary"}`} /><div>
            <p className="text-sm font-semibold">{item.label}</p><p className="text-xs text-muted-foreground">{label}</p>
          </div></div>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{item.detail}</p>
          {!admin && item.state !== "ready" && item.id !== "test" && <Link className="mt-2 inline-block text-sm font-medium text-primary underline" href={item.href}>Aanpassen</Link>}
        </li>
      })}
    </ul>
    {!admin && <div className="space-y-2"><Button className="h-auto min-h-10 max-w-full whitespace-normal py-2" variant="outline" disabled={busy} onClick={() => void testForm()}>{busy ? "Testaanvraag versturen…" : "Testaanvraag naar mijn formulieradres sturen"}</Button>
      <p className="text-xs text-muted-foreground">Maakt een herkenbare testaanvraag in je inbox en verstuurt één e-mail. Het voorbeeldformulier verstuurt niets.</p></div>}
    {message && <p role="status" className="rounded-lg bg-muted p-3 text-sm">{message}</p>}
  </section>
}
