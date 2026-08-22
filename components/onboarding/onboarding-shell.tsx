"use client"

import type { FormEvent } from "react"
import { useEffect, useState } from "react"
import Link from "next/link"
import { ShieldCheck } from "lucide-react"

import { CompanyDetailsStep } from "@/components/onboarding/company-details-step"
import { OnboardingComplete } from "@/components/onboarding/onboarding-complete"
import { PersonalDetailsStep } from "@/components/onboarding/personal-details-step"
import { ProgressIndicator } from "@/components/onboarding/progress-indicator"
import { WebsiteSetupStep } from "@/components/onboarding/website-setup-step"
import { completeOnboarding, saveCompanyDetails, savePersonalDetails } from "@/lib/onboarding/actions"
import { normalizeOnboardingSlug } from "@/lib/onboarding/slug"
import type { OnboardingFieldErrors, OnboardingInitialState } from "@/lib/onboarding/types"
import { PLATFORM_BRAND_INITIALS, PLATFORM_BRAND_NAME } from "@/lib/platform"

function focusFirstInvalid(form: HTMLFormElement, fieldErrors: OnboardingFieldErrors) {
  const field = Object.keys(fieldErrors)[0]
  if (!field) return
  window.requestAnimationFrame(() => {
    const control = form.elements.namedItem(field)
    if (control instanceof HTMLElement) control.focus()
  })
}

function trackOnboardingEvent(event: string, step?: number, field?: string) {
  void fetch("/api/onboarding/event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event, step, field }),
  })
}

export function OnboardingShell({ initialState, returnTo }: { initialState: OnboardingInitialState; returnTo?: string | null }) {
  const [step, setStep] = useState(initialState.step)
  const [personal, setPersonal] = useState(initialState.personal)
  const [company, setCompany] = useState(initialState.company)
  const [website, setWebsite] = useState(initialState.website)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<OnboardingFieldErrors>({})
  const [savedStep, setSavedStep] = useState<number | null>(null)
  const [completedWebsiteId, setCompletedWebsiteId] = useState<string | null>(null)

  useEffect(() => {
    trackOnboardingEvent(step === 1 ? "started" : "step_viewed", step)
  }, [step])

  const beginSubmit = () => {
    setSaving(true)
    setFormError(null)
    setFieldErrors({})
    setSavedStep(null)
  }

  const handleFailure = (form: HTMLFormElement, result: { formError: string; fieldErrors?: OnboardingFieldErrors }) => {
    const errors = result.fieldErrors ?? {}
    setFormError(result.formError)
    setFieldErrors(errors)
    focusFirstInvalid(form, errors)
    const firstField = Object.keys(errors)[0]
    trackOnboardingEvent("validation_failed", step, firstField)
  }

  const submitPersonal = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget
    beginSubmit()
    const result = await savePersonalDetails(personal)
    setSaving(false)
    if (!result.success) return handleFailure(form, result)
    setSavedStep(1)
    setStep(2)
  }

  const submitCompany = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget
    beginSubmit()
    const result = await saveCompanyDetails(company)
    setSaving(false)
    if (!result.success) return handleFailure(form, result)
    setWebsite((current) => ({
      ...current,
      title: current.title || company.name,
      slug: current.slug && current.slug !== "mijn-website" ? current.slug : normalizeOnboardingSlug(company.name),
      primaryGoal: company.category === "bnb" && current.primaryGoal === "contact_requests" ? "bookings" : current.primaryGoal,
    }))
    setSavedStep(2)
    setStep(3)
  }

  const submitWebsite = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget
    beginSubmit()
    const result = await completeOnboarding(website)
    setSaving(false)
    if (!result.success) return handleFailure(form, result)
    setCompletedWebsiteId(result.data.websiteId)
  }

  return (
    <main className="min-h-svh bg-[linear-gradient(180deg,#f6f8f5_0%,#ffffff_70%)] px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3 text-foreground">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-foreground">{PLATFORM_BRAND_INITIALS}</span>
            <span className="font-bold">{PLATFORM_BRAND_NAME}</span>
          </Link>
          <div className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex"><ShieldCheck className="h-4 w-4 text-primary" />Je gegevens worden veilig opgeslagen</div>
        </div>

        <section className="rounded-3xl border border-border bg-card p-5 shadow-[0_24px_70px_rgba(31,41,51,0.08)] sm:p-8 md:p-10">
          {completedWebsiteId ? (
            <OnboardingComplete websiteId={completedWebsiteId} returnTo={returnTo} />
          ) : (
            <>
              <ProgressIndicator currentStep={step} />
              <div className="my-7 h-px bg-border" />
              <div aria-live="polite" className="sr-only">Stap {step} van 3 geopend.{savedStep ? ` Stap ${savedStep} is opgeslagen.` : ""}</div>
              {step === 1 ? <PersonalDetailsStep email={initialState.email} value={personal} errors={fieldErrors} formError={formError} saving={saving} onChange={setPersonal} onSubmit={submitPersonal} /> : null}
              {step === 2 ? <CompanyDetailsStep value={company} errors={fieldErrors} formError={formError} saving={saving} onChange={setCompany} onBack={() => { setFormError(null); setFieldErrors({}); setStep(1) }} onSubmit={submitCompany} /> : null}
              {step === 3 ? <WebsiteSetupStep value={website} errors={fieldErrors} formError={formError} saving={saving} onChange={setWebsite} onBack={() => { setFormError(null); setFieldErrors({}); setStep(2) }} onSubmit={submitWebsite} /> : null}
              {savedStep ? <p className="mt-5 text-center text-xs text-muted-foreground">Stap {savedStep} is opgeslagen. Je kunt later verdergaan.</p> : null}
            </>
          )}
        </section>

        <p className="mt-5 text-center text-xs text-muted-foreground">Door verder te gaan bevestig je dat je onze <Link href="/privacy" className="underline underline-offset-2 hover:text-foreground">privacyverklaring</Link> hebt gelezen.</p>
      </div>
    </main>
  )
}
