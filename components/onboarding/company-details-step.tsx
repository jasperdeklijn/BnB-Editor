"use client"

import type { FormEvent } from "react"
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react"

import { FormField, onboardingInputClass, onboardingSelectClass } from "@/components/onboarding/form-field"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { BUSINESS_CATEGORIES } from "@/lib/business/categories"
import type { CompanyDetailsInput, OnboardingFieldErrors } from "@/lib/onboarding/types"

interface Props {
  value: CompanyDetailsInput
  errors: OnboardingFieldErrors
  formError: string | null
  saving: boolean
  onChange: (value: CompanyDetailsInput) => void
  onBack: () => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}

export function CompanyDetailsStep({ value, errors, formError, saving, onChange, onBack, onSubmit }: Props) {
  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-primary">Je bedrijf</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Vul de basisgegevens van je bedrijf in.</h1>
        <p className="mt-2 text-sm text-muted-foreground">De openbare contactgegevens kunnen later op je website worden getoond.</p>
      </div>

      <FormField error={errors.name}>
        <Label htmlFor="name">Bedrijfsnaam</Label>
        <Input id="name" name="name" autoComplete="organization" required value={value.name} onChange={(event) => onChange({ ...value, name: event.target.value })} aria-invalid={Boolean(errors.name)} className={onboardingInputClass} />
      </FormField>

      <FormField error={errors.category}>
        <Label htmlFor="category">Type bedrijf</Label>
        <select id="category" name="category" value={value.category} onChange={(event) => onChange({ ...value, category: event.target.value as CompanyDetailsInput["category"] })} className={onboardingSelectClass}>
          {BUSINESS_CATEGORIES.map((category) => <option key={category.value} value={category.value}>{category.label}</option>)}
        </select>
      </FormField>

      <div className="grid gap-5 sm:grid-cols-2">
        <FormField error={errors.country}>
          <Label htmlFor="country">Land</Label>
          <select id="country" name="country" value={value.country} onChange={(event) => onChange({ ...value, country: event.target.value })} className={onboardingSelectClass}>
            <option value="NL">Nederland</option>
            <option value="BE">België</option>
            <option value="DE">Duitsland</option>
            <option value="FR">Frankrijk</option>
            <option value="GB">Verenigd Koninkrijk</option>
          </select>
        </FormField>
        <FormField error={errors.city}>
          <Label htmlFor="city">Plaats <span className="font-normal text-muted-foreground">(optioneel)</span></Label>
          <Input id="city" name="city" autoComplete="address-level2" value={value.city ?? ""} onChange={(event) => onChange({ ...value, city: event.target.value || null })} aria-invalid={Boolean(errors.city)} className={onboardingInputClass} />
        </FormField>
      </div>

      <div className="rounded-2xl border border-border bg-muted/45 p-4 sm:p-5">
        <p className="font-semibold text-foreground">Openbare contactgegevens</p>
        <p className="mt-1 text-xs text-muted-foreground">Deze gegevens gebruiken we voor je contactsectie en contactformulieren.</p>
        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          <FormField error={errors.publicEmail}>
            <Label htmlFor="publicEmail">Openbaar e-mailadres</Label>
            <Input id="publicEmail" name="publicEmail" type="email" autoComplete="email" required value={value.publicEmail} onChange={(event) => onChange({ ...value, publicEmail: event.target.value })} aria-invalid={Boolean(errors.publicEmail)} className={onboardingInputClass} />
          </FormField>
          <FormField error={errors.publicPhone}>
            <Label htmlFor="publicPhone">Openbaar telefoonnummer <span className="font-normal text-muted-foreground">(optioneel)</span></Label>
            <Input id="publicPhone" name="publicPhone" type="tel" autoComplete="tel" value={value.publicPhone ?? ""} onChange={(event) => onChange({ ...value, publicPhone: event.target.value || null })} aria-invalid={Boolean(errors.publicPhone)} className={onboardingInputClass} />
          </FormField>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <FormField error={errors.chamberOfCommerceNumber}>
          <Label htmlFor="chamberOfCommerceNumber">KvK-nummer <span className="font-normal text-muted-foreground">(optioneel)</span></Label>
          <Input id="chamberOfCommerceNumber" name="chamberOfCommerceNumber" inputMode="numeric" placeholder="12345678" value={value.chamberOfCommerceNumber ?? ""} onChange={(event) => onChange({ ...value, chamberOfCommerceNumber: event.target.value || null })} aria-invalid={Boolean(errors.chamberOfCommerceNumber)} className={onboardingInputClass} />
          <p className="text-xs text-muted-foreground">We controleren alleen het formaat; dit verifieert je inschrijving niet.</p>
        </FormField>
        <FormField error={errors.vatNumber}>
          <Label htmlFor="vatNumber">Btw-nummer <span className="font-normal text-muted-foreground">(optioneel)</span></Label>
          <Input id="vatNumber" name="vatNumber" value={value.vatNumber ?? ""} onChange={(event) => onChange({ ...value, vatNumber: event.target.value || null })} aria-invalid={Boolean(errors.vatNumber)} className={onboardingInputClass} />
        </FormField>
      </div>

      {formError ? <p className="rounded-xl border border-destructive/25 bg-destructive/8 px-4 py-3 text-sm text-destructive" role="alert">{formError}</p> : null}

      <div className="flex items-center justify-between gap-3">
        <Button type="button" variant="outline" onClick={onBack} disabled={saving} className="h-11 rounded-full px-5"><ArrowLeft className="mr-2 h-4 w-4" />Terug</Button>
        <Button type="submit" disabled={saving} className="h-11 rounded-full px-6">
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Doorgaan{!saving ? <ArrowRight className="ml-2 h-4 w-4" /> : null}
        </Button>
      </div>
    </form>
  )
}

