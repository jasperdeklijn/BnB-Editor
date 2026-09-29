"use client"
import { useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { TransferRequest, CheckResult } from "@/lib/flexstart/shared"

export function PrepareDesign({ request, check }: { request: TransferRequest; check: CheckResult }) {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState("")
  const router = useRouter()
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("")
    const form = new FormData(event.currentTarget)
    try {
      const response = await fetch(`/api/flexstart/${request.id}/prepare`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        revision: request.revision, version: check.version, name: form.get("name"), city: form.get("city"), phone: form.get("phone"), email: form.get("email"),
        seoTitle: form.get("seoTitle"), seoDescription: form.get("seoDescription"), privacyUrl: form.get("privacyUrl"),
        services: String(form.get("services") || "").split("\n").map((s) => s.trim()).filter(Boolean),
      }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error)
      setMessage("Contact, diensten, contactknop, privacylink en SEO zijn verwerkt in dit concept."); router.refresh()
    } catch (error) { setMessage(error instanceof Error ? error.message : "Opslaan mislukt.") }
    finally { setBusy(false) }
  }
  return <details className="rounded-2xl border bg-card p-4 sm:p-6"><summary className="cursor-pointer font-semibold">Concept afronden: contact, diensten en SEO</summary>
    <p className="mt-3 text-sm text-muted-foreground">Vul gecontroleerde brongegevens in. Dit voegt de benodigde onderdelen toe aan het gekoppelde concept en maakt eerdere goedkeuringen ongeldig. Bestaande diensten blijven behouden; ontbrekende diensten worden toegevoegd.</p>
    <form onSubmit={save} className="mt-4"><fieldset disabled={busy} className="grid min-w-0 gap-4 sm:grid-cols-2">
      <label className="space-y-2 text-sm">Bedrijfsnaam<Input name="name" defaultValue={request.business_name} required maxLength={160} /></label>
      <label className="space-y-2 text-sm">Plaats en werkgebied<Input name="city" defaultValue={`${request.city} — ${request.service_area}`} required maxLength={1000} /></label>
      <label className="space-y-2 text-sm">Telefoon<Input name="phone" type="tel" maxLength={60} /></label>
      <label className="space-y-2 text-sm">E-mailadres en formulierontvanger<Input name="email" type="email" required maxLength={254} /></label>
      <label className="space-y-2 text-sm sm:col-span-2">Diensten — één dienstnaam per regel<Textarea name="services" required maxLength={4000} /></label>
      <label className="space-y-2 text-sm">SEO-titel<Input name="seoTitle" required maxLength={200} /></label>
      <label className="space-y-2 text-sm">Privacyverklaring-URL<Input name="privacyUrl" type="url" required maxLength={2000} placeholder="https://…" /></label>
      <label className="space-y-2 text-sm sm:col-span-2">SEO-omschrijving<Textarea name="seoDescription" required maxLength={500} /></label>
      <Button type="submit">{busy ? "Verwerken…" : "Gecontroleerde gegevens verwerken"}</Button>
    </fieldset></form>
    {message && <p role="status" className="mt-3 text-sm">{message}</p>}
  </details>
}
