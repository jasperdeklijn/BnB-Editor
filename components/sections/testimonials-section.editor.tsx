"use client"
import Link from "next/link"
import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import type { SectionEditorProps } from "@/components/editor/section-editor-types"
import { googleReviewUrl, reviewLimit, reviewMode } from "@/lib/reviews/shared"
import { getReviewFormSettings, REVIEW_FORM_FIELDS } from "@/lib/reviews/presentation"

export function TestimonialsSectionEditor({ section, websiteId, hasReviewAccess = false, updateField }: SectionEditorProps) {
  const data = section.data, mode = reviewMode(data), prefix = `reviews-${section.id}`
  const formSettings = getReviewFormSettings(data)
  const [urlDraft, setUrlDraft] = useState(String(data.googleReviewUrl ?? ""))
  useEffect(() => { setUrlDraft(String(data.googleReviewUrl ?? "")) }, [section.id, data.googleReviewUrl])
  return <Card className="space-y-4 p-4">
    <fieldset className="space-y-2">
      <legend className="mb-2 text-sm font-semibold">Recensies</legend>
      {([{ value: "google", label: "Link naar Google-recensies", description: "Laat bezoekers je recensies op Google lezen." }, { value: "collection", label: "Recensies verzamelen · Gold", description: "Verzamel klantreacties en beheer publicatie op je website." }] as const).map((option) =>
        <label key={option.value} className={`flex gap-3 rounded-lg border p-3 text-sm ${mode === option.value ? "border-primary bg-primary/5" : "border-border"}`}>
          <input type="radio" name={`${prefix}-mode`} value={option.value} checked={mode === option.value} disabled={option.value === "collection" && !hasReviewAccess} onChange={() => updateField("reviewMode", option.value)} className="mt-1 accent-primary" />
          <span><span className="block font-medium">{option.label}</span><span className="text-xs text-muted-foreground">{option.description}</span></span>
        </label>)}
    </fieldset>
    {!hasReviewAccess && <p className="text-xs text-muted-foreground">Verzamelen vereist Gold. <Link className="underline" href="/editor/account/billing">Bekijk Gold</Link></p>}
    <div className="space-y-1.5"><Label htmlFor={`${prefix}-title`}>Titel</Label><Input id={`${prefix}-title`} value={String(data.title ?? "")} onChange={(event) => updateField("title", event.target.value)} placeholder="Ervaringen van klanten" /></div>
    <div className="space-y-1.5"><Label htmlFor={`${prefix}-subtitle`}>Introductie</Label><Input id={`${prefix}-subtitle`} value={String(data.subtitle ?? "")} onChange={(event) => updateField("subtitle", event.target.value)} /></div>
    {mode === "google" ? <>
      <div className="space-y-1.5"><Label htmlFor={`${prefix}-url`}>Google-recensielink</Label><Input id={`${prefix}-url`} type="url" placeholder="https://g.page/…/review" value={urlDraft} onChange={(event) => setUrlDraft(event.target.value)} onBlur={() => { const value = urlDraft.trim(); if (!value || googleReviewUrl(value)) updateField("googleReviewUrl", googleReviewUrl(value) || "") }} />
        {Boolean(urlDraft) && !googleReviewUrl(urlDraft.trim()) && <p role="alert" className="text-xs text-destructive">Gebruik een geldige HTTPS-link van Google Maps, g.page of maps.app.goo.gl. Deze link is nog niet opgeslagen.</p>}
      </div>
      <div className="space-y-1.5"><Label htmlFor={`${prefix}-button`}>Knoptekst</Label><Input id={`${prefix}-button`} value={String(data.googleButtonText ?? "")} onChange={(event) => updateField("googleButtonText", event.target.value)} placeholder="Lees onze recensies op Google" /></div>
    </> : <>
      <div className="space-y-2 rounded-lg border border-border p-3">
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor={`${prefix}-show-form`}>Formulier op website tonen</Label>
          <Switch id={`${prefix}-show-form`} checked={data.reviewFormOnWebsite !== false} onCheckedChange={(checked) => updateField("reviewFormOnWebsite", checked)} />
        </div>
        <p className="text-xs text-muted-foreground">Zet dit uit om alleen gepubliceerde recensies te tonen. De losse recensiepagina blijft beschikbaar via een link die je per e-mail kunt delen.</p>
      </div>
      <div className="space-y-1.5"><Label htmlFor={`${prefix}-limit`}>Aantal zichtbare recensies</Label><Input id={`${prefix}-limit`} type="number" min={1} max={12} value={reviewLimit(data.reviewLimit)} disabled={!hasReviewAccess} onChange={(event) => { if (Number.isInteger(event.target.valueAsNumber)) updateField("reviewLimit", reviewLimit(event.target.valueAsNumber)) }} /></div>
      <fieldset className="space-y-3 border-t border-border pt-4">
        <legend className="px-1 text-sm font-semibold">Recensieformulier bewerken</legend>
        {REVIEW_FORM_FIELDS.map(({ key, label, maxLength }) => <div key={key} className="space-y-1.5">
          <Label htmlFor={`${prefix}-${key}`}>{label}</Label>
          <Input id={`${prefix}-${key}`} value={typeof data[key] === "string" ? data[key] : formSettings[key]} maxLength={maxLength} onChange={(event) => updateField(key, event.target.value)} />
        </div>)}
        <p className="text-xs text-muted-foreground">Klik op de teksten op het doek of bewerk ze hier. De website en de losse recensiepagina gebruiken dezelfde teksten. Kies onder Indeling de layout en het stijltype. Is het formulier verborgen? Open dan op het doek het voorbeeld van de losse recensiepagina om het te bewerken.</p>
      </fieldset>
      <p className="text-xs text-muted-foreground">Publiceer deze modus om recensies te ontvangen. Klanten bevestigen hun e-mailadres; jij beoordeelt daarna de originele inzending.</p>
    </>}
    <Link href={`/editor/reviews${websiteId ? `?websiteId=${websiteId}` : ""}`} className="block rounded-md border border-border p-3 text-center text-sm font-medium hover:bg-muted">Beheer recensies</Link>
    {Array.isArray(data.items) && data.items.length > 0 && <p className="text-xs text-muted-foreground">Oude handmatige recensies worden niet meer gepubliceerd. Je vindt het archief in Beheer recensies.</p>}
  </Card>
}
