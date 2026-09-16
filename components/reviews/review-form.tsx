"use client"

import { useId, useState } from "react"
import { Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { EditableText } from "@/components/editor/inline-editable-text"
import { getReviewFormSettings, getReviewPanelClass } from "@/lib/reviews/presentation"
import { getSectionColorVars } from "@/lib/section-colors"
import { PLATFORM_BASE_URL } from "@/lib/platform"
import type { SectionStyles } from "@/lib/types"

export async function postReview(body: Record<string, unknown>) {
  const response = await fetch("/api/reviews", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
  const result = await response.json()
  if (!response.ok) throw new Error(result.error || "De actie is niet gelukt.")
  return result
}
interface ReviewFormProps {
  websiteId: string
  available: boolean
  data?: Record<string, unknown>
  styles?: SectionStyles
  preview?: boolean
  onUpdate?: (newData: Record<string, unknown>) => void
}
export function ReviewForm({ websiteId, available, data = {}, styles, preview = false, onUpdate }: ReviewFormProps) {
  const prefix = useId(), settings = getReviewFormSettings(data)
  const editing = Boolean(onUpdate)
  const previewOnly = preview || editing
  const editableProps = { data, isPreview: !editing, onUpdate }
  const [rating, setRating] = useState(0), [hoverRating, setHoverRating] = useState(0)
  const [message, setMessage] = useState(""), [error, setError] = useState(""), [busy, setBusy] = useState(false)
  const inputClass = "border-current/25 bg-transparent text-inherit placeholder:text-current/50"
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (previewOnly) return
    setBusy(true); setError(""); setMessage("")
    const form = event.currentTarget, values = new FormData(form)
    try {
      await postReview({ action: "submit", websiteId, name: values.get("name"), email: values.get("email"), rating: Number(values.get("rating")), body: values.get("body"), consent: values.get("consent") === "on", company: values.get("company") })
      setMessage("Bedankt! Controleer je e-mail om je inzending te bevestigen. Al eerder ingezonden? Vraag hieronder zo nodig een nieuwe link aan.")
      form.reset(); setRating(0); setHoverRating(0)
    } catch (failure) { setError((failure as Error).message) } finally { setBusy(false) }
  }
  async function requestEmail(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (previewOnly) return
    setBusy(true); setError(""); setMessage("")
    const form = new FormData(event.currentTarget)
    try { await postReview({ websiteId, action: form.get("action"), email: form.get("email") }); setMessage("Als er een passende inzending is, ontvang je een e-mail. Controleer ook je spammap.") }
    catch (failure) { setError((failure as Error).message) } finally { setBusy(false) }
  }
  return <div className={`${getReviewPanelClass(data.styleType)} space-y-6 [overflow-wrap:anywhere] ${styles?.fontFamily ?? ""}`} style={getSectionColorVars(styles)}>
    {previewOnly && <p className="text-xs opacity-75">{editing ? "Klik op de teksten om ze te bewerken · inzendingen worden niet verstuurd" : "Voorbeeldformulier · inzendingen worden niet verstuurd"}</p>}
    {message && <p role="status" className="rounded-lg border border-current/20 p-4 text-sm">{message}</p>}
    {error && <p role="alert" className="rounded-lg border border-destructive/30 p-4 text-sm text-destructive">{error}</p>}
    {available ? <form onSubmit={submit} className="space-y-5">
      <div><EditableText {...editableProps} as="h3" path={["reviewFormTitle"]} value={settings.reviewFormTitle} className="text-xl font-semibold sm:text-2xl" /><EditableText {...editableProps} as="p" path={["reviewFormIntro"]} value={settings.reviewFormIntro} className="mt-2 text-sm opacity-75" multiline /></div>
      <div className={data.layout === "compact" ? "space-y-4" : "grid gap-4 sm:grid-cols-2"}>
        <div className="min-w-0 space-y-1.5"><Label htmlFor={`${prefix}-name`}><EditableText {...editableProps} path={["reviewNameLabel"]} value={settings.reviewNameLabel} /></Label><Input className={inputClass} id={`${prefix}-name`} name="name" required maxLength={120} autoComplete="name" /></div>
        <div className="min-w-0 space-y-1.5"><Label htmlFor={`${prefix}-email`}><EditableText {...editableProps} path={["reviewEmailLabel"]} value={settings.reviewEmailLabel} /></Label><Input className={inputClass} id={`${prefix}-email`} name="email" type="email" required maxLength={254} autoComplete="email" /></div>
      </div>
      <fieldset className="space-y-2" onMouseLeave={() => setHoverRating(0)}>
        <legend className="text-sm font-medium"><EditableText {...editableProps} path={["reviewRatingLabel"]} value={settings.reviewRatingLabel} /></legend>
        <div className="flex flex-wrap items-center gap-0 sm:gap-1">
          {[1, 2, 3, 4, 5].map((value) => <label key={value} className="relative cursor-pointer" onMouseEnter={() => setHoverRating(value)}>
            <input className="peer sr-only" type="radio" name="rating" value={value} checked={rating === value} onChange={() => { setRating(value); setHoverRating(0) }} onFocus={() => setHoverRating(0)} required aria-label={`${value} ${value === 1 ? "ster" : "sterren"}`} />
            <span className="flex h-11 w-11 items-center justify-center rounded-md transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-current">
              <Star aria-hidden="true" className={`h-8 w-8 ${value <= (hoverRating || rating) ? "fill-yellow-400 text-yellow-400" : "text-current/35"}`} />
            </span>
          </label>)}
        </div>
        <p aria-live="polite" className="text-xs opacity-75">{rating ? `${rating} van 5 sterren` : "Kies 1 tot 5 sterren"}</p>
      </fieldset>
      <div className="space-y-1.5"><Label htmlFor={`${prefix}-body`}><EditableText {...editableProps} path={["reviewBodyLabel"]} value={settings.reviewBodyLabel} /></Label><textarea id={`${prefix}-body`} name="body" required minLength={10} maxLength={3000} rows={data.layout === "compact" ? 3 : 5} className={`w-full rounded-md border p-3 text-sm ${inputClass}`} /><p className="text-xs opacity-75">10–3000 tekens. Deel geen privégegevens van anderen.</p></div>
      <div className="hidden" aria-hidden="true"><label>Bedrijf<input name="company" tabIndex={-1} autoComplete="off" /></label></div>
      <label className="flex items-start gap-3 text-sm"><input name="consent" type="checkbox" required className="mt-1 accent-[var(--section-accent)]" /><span>Ik geef toestemming om mijn naam, beoordeling en recensie op deze website te publiceren. Mijn e-mailadres blijft privé.</span></label>
      <p className="text-xs leading-relaxed opacity-75">Je bevestigt eerst je e-mailadres. Dat bevestigt geen aankoop. Daarna beoordeelt de eigenaar je inzending op spam, relevantie en persoonlijke informatie. Je tekst en sterren worden niet aangepast. Via de persoonlijke e-maillink kun je je toestemming intrekken. Onbevestigde inzendingen worden na 7 dagen verwijderd.</p>
      {editing ? <Button type="button" className="h-auto min-h-11 w-full whitespace-normal bg-[var(--section-accent)] py-3 text-[var(--section-accent-foreground)] hover:bg-[var(--section-accent)] hover:opacity-90"><EditableText {...editableProps} path={["reviewSubmitLabel"]} value={settings.reviewSubmitLabel} /></Button>
        : <Button type="submit" disabled={busy || previewOnly} className="h-auto min-h-11 w-full whitespace-normal bg-[var(--section-accent)] py-3 text-[var(--section-accent-foreground)] hover:bg-[var(--section-accent)] hover:opacity-90">{busy ? "Bezig…" : settings.reviewSubmitLabel}</Button>}
    </form> : <p role="status" className="rounded-lg border border-current/20 p-4 text-sm">Deze website verzamelt momenteel geen recensies. Je kunt hieronder wel een intreklink aanvragen.</p>}
    <details className="border-t border-current/20 pt-4">
      <summary className="cursor-pointer text-sm font-medium">Al een recensie verstuurd?</summary>
      <form onSubmit={requestEmail} className="mt-4 space-y-3">
        <Label htmlFor={`${prefix}-resend`}>E-mailadres van je inzending</Label><Input className={inputClass} id={`${prefix}-resend`} name="email" type="email" required maxLength={254} />
        <Label htmlFor={`${prefix}-action`}>Welke link wil je ontvangen?</Label><select id={`${prefix}-action`} name="action" defaultValue={available ? "resend" : "withdrawal-email"} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground">{available && <option value="resend">Nieuwe bevestigingslink</option>}<option value="withdrawal-email">Link om toestemming in te trekken</option></select>
        <Button type="submit" variant="outline" disabled={busy || previewOnly} className="w-full text-foreground">Link aanvragen</Button>
      </form>
    </details>
    <p className="border-t border-current/15 pt-4 text-center text-xs opacity-75">Mogelijk gemaakt door <a href={PLATFORM_BASE_URL} target="_blank" rel="noopener noreferrer" className="font-semibold underline underline-offset-4">FlexPagina</a></p>
  </div>
}
