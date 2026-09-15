"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export async function postReview(body: Record<string, unknown>) {
  const response = await fetch("/api/reviews", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
  const result = await response.json()
  if (!response.ok) throw new Error(result.error || "De actie is niet gelukt.")
  return result
}
export function ReviewForm({ websiteId, available }: { websiteId: string; available: boolean }) {
  const [message, setMessage] = useState(""), [error, setError] = useState(""), [busy, setBusy] = useState(false)
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("")
    const form = event.currentTarget, values = new FormData(form)
    try {
      await postReview({ action: "submit", websiteId, name: values.get("name"), email: values.get("email"), rating: Number(values.get("rating")), body: values.get("body"), consent: values.get("consent") === "on", company: values.get("company") })
      setMessage("Bedankt! Controleer je e-mail om je inzending te bevestigen. Al eerder ingezonden? Vraag hieronder zo nodig een nieuwe link aan."); form.reset()
    } catch (failure) { setError((failure as Error).message) } finally { setBusy(false) }
  }
  async function requestEmail(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("")
    const form = new FormData(event.currentTarget)
    try { await postReview({ websiteId, action: form.get("action"), email: form.get("email") }); setMessage("Als er een passende inzending is, ontvang je een e-mail. Controleer ook je spammap.") }
    catch (failure) { setError((failure as Error).message) } finally { setBusy(false) }
  }
  return <div className="space-y-6">
    {message && <p role="status" className="rounded-lg border border-border bg-muted p-4 text-sm">{message}</p>}
    {error && <p role="alert" className="rounded-lg border border-destructive/30 p-4 text-sm text-destructive">{error}</p>}
    {available ? <form onSubmit={submit} className="space-y-4">
      <div className="space-y-1.5"><Label htmlFor="review-name">Naam bij je recensie</Label><Input id="review-name" name="name" required maxLength={120} autoComplete="name" /></div>
      <div className="space-y-1.5"><Label htmlFor="review-email">E-mailadres (blijft privé)</Label><Input id="review-email" name="email" type="email" required maxLength={254} autoComplete="email" /></div>
      <div className="space-y-1.5"><Label htmlFor="review-rating">Jouw beoordeling</Label><select id="review-rating" name="rating" defaultValue="" required className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="" disabled>Kies een beoordeling</option>{[1,2,3,4,5].map((n) => <option key={n} value={n}>{n} {n === 1 ? "ster" : "sterren"}</option>)}</select></div>
      <div className="space-y-1.5"><Label htmlFor="review-body">Je ervaring</Label><textarea id="review-body" name="body" required minLength={10} maxLength={3000} rows={5} className="w-full rounded-md border border-input bg-background p-3 text-sm" /><p className="text-xs text-muted-foreground">10–3000 tekens. Deel geen privégegevens van anderen.</p></div>
      <div className="hidden" aria-hidden="true"><label>Bedrijf<input name="company" tabIndex={-1} autoComplete="off" /></label></div>
      <label className="flex items-start gap-3 text-sm"><input name="consent" type="checkbox" required className="mt-1 accent-primary" /><span>Ik geef toestemming om mijn naam, beoordeling en recensie op deze website te publiceren. Mijn e-mailadres blijft privé.</span></label>
      <p className="text-xs leading-relaxed text-muted-foreground">Je bevestigt eerst je e-mailadres. Dat bevestigt geen aankoop. Daarna beoordeelt de eigenaar je inzending op spam, relevantie en persoonlijke informatie. Je tekst en sterren worden niet aangepast. Via de persoonlijke e-maillink kun je je toestemming intrekken. Onbevestigde inzendingen worden na 7 dagen verwijderd.</p>
      <Button type="submit" disabled={busy} className="w-full">{busy ? "Bezig…" : "Recensie versturen"}</Button>
    </form> : <p className="rounded-lg bg-muted p-4 text-sm">Deze website verzamelt momenteel geen recensies. Je kunt hieronder wel een intreklink aanvragen.</p>}
    <form onSubmit={requestEmail} className="space-y-3 border-t border-border pt-5">
      <h2 className="font-semibold">Al een recensie verstuurd?</h2>
      <Label htmlFor="review-resend-email">E-mailadres van je inzending</Label><Input id="review-resend-email" name="email" type="email" required maxLength={254} />
      <Label htmlFor="review-email-action">Welke link wil je ontvangen?</Label><select id="review-email-action" name="action" defaultValue={available ? "resend" : "withdrawal-email"} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">{available && <option value="resend">Nieuwe bevestigingslink</option>}<option value="withdrawal-email">Link om toestemming in te trekken</option></select>
      <Button type="submit" variant="outline" disabled={busy} className="w-full">Link aanvragen</Button>
    </form>
  </div>
}
