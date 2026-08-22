"use client"

import type { FormEvent } from "react"
import { ArrowRight, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FormField, onboardingInputClass, onboardingSelectClass } from "@/components/onboarding/form-field"
import type { OnboardingFieldErrors, PersonalDetailsInput } from "@/lib/onboarding/types"

interface Props {
  email: string
  value: PersonalDetailsInput
  errors: OnboardingFieldErrors
  formError: string | null
  saving: boolean
  onChange: (value: PersonalDetailsInput) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}

export function PersonalDetailsStep({ email, value, errors, formError, saving, onChange, onSubmit }: Props) {
  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-primary">Over jou</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Vertel ons kort wie je bent.</h1>
        <p className="mt-2 text-sm text-muted-foreground">Je persoonlijke gegevens worden niet automatisch op je website getoond.</p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <FormField error={errors.firstName}>
          <Label htmlFor="firstName">Voornaam</Label>
          <Input id="firstName" name="firstName" autoComplete="given-name" required value={value.firstName} onChange={(event) => onChange({ ...value, firstName: event.target.value })} aria-invalid={Boolean(errors.firstName)} className={onboardingInputClass} />
        </FormField>
        <FormField error={errors.lastName}>
          <Label htmlFor="lastName">Achternaam</Label>
          <Input id="lastName" name="lastName" autoComplete="family-name" required value={value.lastName} onChange={(event) => onChange({ ...value, lastName: event.target.value })} aria-invalid={Boolean(errors.lastName)} className={onboardingInputClass} />
        </FormField>
      </div>

      <FormField>
        <Label htmlFor="accountEmail">E-mailadres</Label>
        <Input id="accountEmail" value={email} readOnly className={`${onboardingInputClass} bg-muted text-muted-foreground`} />
        <p className="text-xs text-muted-foreground">Dit e-mailadres hoort bij je account en kan hier niet worden aangepast.</p>
      </FormField>

      <div className="grid gap-5 sm:grid-cols-2">
        <FormField error={errors.phone}>
          <Label htmlFor="phone">Telefoonnummer <span className="font-normal text-muted-foreground">(optioneel)</span></Label>
          <Input id="phone" name="phone" type="tel" autoComplete="tel" placeholder="+31 6 12345678" value={value.phone ?? ""} onChange={(event) => onChange({ ...value, phone: event.target.value || null })} aria-invalid={Boolean(errors.phone)} className={onboardingInputClass} />
        </FormField>
        <FormField error={errors.jobTitle}>
          <Label htmlFor="jobTitle">Functie of rol <span className="font-normal text-muted-foreground">(optioneel)</span></Label>
          <Input id="jobTitle" name="jobTitle" autoComplete="organization-title" placeholder="Eigenaar" value={value.jobTitle ?? ""} onChange={(event) => onChange({ ...value, jobTitle: event.target.value || null })} aria-invalid={Boolean(errors.jobTitle)} className={onboardingInputClass} />
        </FormField>
      </div>

      <FormField error={errors.locale}>
        <Label htmlFor="locale">Taal van FlexPagina</Label>
        <select id="locale" name="locale" value={value.locale} onChange={(event) => onChange({ ...value, locale: event.target.value as PersonalDetailsInput["locale"] })} className={onboardingSelectClass}>
          <option value="nl-NL">Nederlands</option>
          <option value="en-GB">English</option>
          <option value="de-DE">Deutsch</option>
          <option value="fr-FR">Français</option>
        </select>
      </FormField>

      {formError ? <p className="rounded-xl border border-destructive/25 bg-destructive/8 px-4 py-3 text-sm text-destructive" role="alert">{formError}</p> : null}

      <div className="flex justify-end">
        <Button type="submit" disabled={saving} className="h-11 rounded-full px-6">
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Doorgaan
          {!saving ? <ArrowRight className="ml-2 h-4 w-4" /> : null}
        </Button>
      </div>
    </form>
  )
}

