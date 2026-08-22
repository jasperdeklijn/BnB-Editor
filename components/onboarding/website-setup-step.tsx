"use client"

import type { FormEvent } from "react"
import { useEffect, useState } from "react"
import { ArrowLeft, CheckCircle2, Loader2, XCircle } from "lucide-react"

import { FormField, onboardingInputClass, onboardingSelectClass } from "@/components/onboarding/form-field"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { normalizeOnboardingSlug } from "@/lib/onboarding/slug"
import type { OnboardingFieldErrors, WebsiteSetupInput } from "@/lib/onboarding/types"
import { PLATFORM_DOMAIN } from "@/lib/platform"

type Availability = "idle" | "checking" | "available" | "unavailable"

interface Props {
  value: WebsiteSetupInput
  errors: OnboardingFieldErrors
  formError: string | null
  saving: boolean
  onChange: (value: WebsiteSetupInput) => void
  onBack: () => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}

export function WebsiteSetupStep({ value, errors, formError, saving, onChange, onBack, onSubmit }: Props) {
  const [availability, setAvailability] = useState<Availability>("idle")

  useEffect(() => {
    const slug = normalizeOnboardingSlug(value.slug)
    if (slug.length < 3) {
      setAvailability("idle")
      return
    }

    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      setAvailability("checking")
      try {
        const response = await fetch(`/api/onboarding/slug?slug=${encodeURIComponent(slug)}`, {
          cache: "no-store",
          signal: controller.signal,
        })
        const result = await response.json().catch(() => ({}))
        if (!controller.signal.aborted) setAvailability(response.ok && result.available ? "available" : "unavailable")
      } catch {
        if (!controller.signal.aborted) setAvailability("idle")
      }
    }, 400)

    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [value.slug])

  const slugError = errors.slug || (availability === "unavailable" ? "Deze naam is al in gebruik of gereserveerd." : undefined)

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-primary">Je website</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Waarvoor wil je jouw website gebruiken?</h1>
        <p className="mt-2 text-sm text-muted-foreground">We maken een persoonlijk concept. Je website gaat pas live wanneer jij publiceert.</p>
      </div>

      <FormField error={errors.title}>
        <Label htmlFor="title">Websitenaam</Label>
        <Input id="title" name="title" required value={value.title} onChange={(event) => onChange({ ...value, title: event.target.value })} aria-invalid={Boolean(errors.title)} className={onboardingInputClass} />
      </FormField>

      <FormField error={slugError}>
        <Label htmlFor="slug">Gewenste websitenaam</Label>
        <div className="relative">
          <Input id="slug" name="slug" required value={value.slug} onChange={(event) => onChange({ ...value, slug: normalizeOnboardingSlug(event.target.value) })} aria-invalid={Boolean(slugError)} className={`${onboardingInputClass} pr-10`} />
          <span className="absolute inset-y-0 right-3 flex items-center" aria-live="polite">
            {availability === "checking" ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-label="Beschikbaarheid controleren" /> : null}
            {availability === "available" ? <CheckCircle2 className="h-4 w-4 text-success" aria-label="Naam beschikbaar" /> : null}
            {availability === "unavailable" ? <XCircle className="h-4 w-4 text-destructive" aria-label="Naam niet beschikbaar" /> : null}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">{value.slug || "jouw-naam"}.{PLATFORM_DOMAIN}</p>
      </FormField>

      <div className="grid gap-5 sm:grid-cols-2">
        <FormField error={errors.primaryGoal}>
          <Label htmlFor="primaryGoal">Belangrijkste doel</Label>
          <select id="primaryGoal" name="primaryGoal" value={value.primaryGoal} onChange={(event) => onChange({ ...value, primaryGoal: event.target.value as WebsiteSetupInput["primaryGoal"] })} className={onboardingSelectClass}>
            <option value="bookings">Boekingen of afspraken</option>
            <option value="contact_requests">Contact- of offerteaanvragen</option>
            <option value="showcase">Werk of aanbod presenteren</option>
            <option value="other">Anders</option>
          </select>
        </FormField>
        <FormField error={errors.defaultLocale}>
          <Label htmlFor="defaultLocale">Hoofdtaal van de website</Label>
          <select id="defaultLocale" name="defaultLocale" value={value.defaultLocale} onChange={(event) => onChange({ ...value, defaultLocale: event.target.value as WebsiteSetupInput["defaultLocale"] })} className={onboardingSelectClass}>
            <option value="nl-NL">Nederlands</option>
            <option value="en-GB">English</option>
            <option value="de-DE">Deutsch</option>
            <option value="fr-FR">Français</option>
          </select>
        </FormField>
      </div>

      <FormField error={errors.description}>
        <Label htmlFor="description">Korte bedrijfsomschrijving <span className="font-normal text-muted-foreground">(optioneel)</span></Label>
        <Textarea id="description" name="description" rows={4} maxLength={500} value={value.description ?? ""} onChange={(event) => onChange({ ...value, description: event.target.value || null })} aria-invalid={Boolean(errors.description)} className="rounded-xl" placeholder="Vertel kort wat je aanbiedt en voor wie." />
        <p className="text-right text-xs text-muted-foreground">{value.description?.length ?? 0} / 500</p>
      </FormField>

      <FormField error={errors.existingWebsiteUrl}>
        <Label htmlFor="existingWebsiteUrl">Bestaande website <span className="font-normal text-muted-foreground">(optioneel)</span></Label>
        <Input id="existingWebsiteUrl" name="existingWebsiteUrl" type="url" inputMode="url" placeholder="https://voorbeeld.nl" value={value.existingWebsiteUrl ?? ""} onChange={(event) => onChange({ ...value, existingWebsiteUrl: event.target.value || null })} aria-invalid={Boolean(errors.existingWebsiteUrl)} className={onboardingInputClass} />
      </FormField>

      {formError ? <p className="rounded-xl border border-destructive/25 bg-destructive/8 px-4 py-3 text-sm text-destructive" role="alert">{formError}</p> : null}

      <div className="flex items-center justify-between gap-3">
        <Button type="button" variant="outline" onClick={onBack} disabled={saving} className="h-11 rounded-full px-5"><ArrowLeft className="mr-2 h-4 w-4" />Terug</Button>
        <Button type="submit" disabled={saving || availability === "checking" || availability === "unavailable"} className="h-11 rounded-full px-6">
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Instellen afronden
        </Button>
      </div>
    </form>
  )
}

