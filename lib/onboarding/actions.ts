"use server"

import { revalidatePath } from "next/cache"

import { logAuditEvent } from "@/lib/audit-log"
import { isOnboardingEnabled } from "@/lib/onboarding/config"
import { companyDetailsSchema, personalDetailsSchema, websiteSetupSchema } from "@/lib/onboarding/schemas"
import type {
  CompanyDetailsInput,
  OnboardingActionResult,
  PersonalDetailsInput,
  WebsiteSetupInput,
} from "@/lib/onboarding/types"
import { buildOnboardingStarterSections } from "@/lib/onboarding/website-starter"
import { createClient } from "@/lib/supabase/server"

function validationFailure<T = undefined>(error: { flatten: () => { fieldErrors: Record<string, string[]> } }): OnboardingActionResult<T> {
  const flattened = error.flatten().fieldErrors
  return {
    success: false,
    formError: "Controleer de gemarkeerde velden.",
    fieldErrors: Object.fromEntries(
      Object.entries(flattened).flatMap(([field, messages]) => messages[0] ? [[field, messages[0]]] : []),
    ),
  }
}

async function authenticatedClient() {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser()
  return { supabase, user: error ? null : data.user }
}

function unavailable<T = undefined>(): OnboardingActionResult<T> {
  return { success: false, formError: "Onboarding is momenteel niet beschikbaar." }
}

export async function savePersonalDetails(input: PersonalDetailsInput): Promise<OnboardingActionResult> {
  if (!isOnboardingEnabled()) return unavailable()
  const parsed = personalDetailsSchema.safeParse(input)
  if (!parsed.success) return validationFailure(parsed.error)

  const { supabase, user } = await authenticatedClient()
  if (!user) return { success: false, formError: "Je sessie is verlopen. Log opnieuw in." }

  const { error } = await supabase.rpc("save_onboarding_personal", {
    p_first_name: parsed.data.firstName,
    p_last_name: parsed.data.lastName,
    p_phone: parsed.data.phone,
    p_job_title: parsed.data.jobTitle,
    p_locale: parsed.data.locale,
  })
  if (error) return { success: false, formError: "Je persoonlijke gegevens konden niet worden opgeslagen." }

  await logAuditEvent({ userId: user.id, action: "onboarding.step_completed", metadata: { step: 1 } })
  revalidatePath("/onboarding")
  return { success: true, data: undefined }
}

export async function saveCompanyDetails(input: CompanyDetailsInput): Promise<OnboardingActionResult<{ businessId: string }>> {
  if (!isOnboardingEnabled()) return unavailable()
  const parsed = companyDetailsSchema.safeParse(input)
  if (!parsed.success) return validationFailure(parsed.error)

  const { supabase, user } = await authenticatedClient()
  if (!user) return { success: false, formError: "Je sessie is verlopen. Log opnieuw in." }

  const { data: businessId, error } = await supabase.rpc("save_onboarding_business", {
    p_name: parsed.data.name,
    p_category: parsed.data.category,
    p_country: parsed.data.country,
    p_city: parsed.data.city,
    p_email: parsed.data.publicEmail,
    p_phone: parsed.data.publicPhone,
    p_chamber_of_commerce_number: parsed.data.chamberOfCommerceNumber,
    p_vat_number: parsed.data.vatNumber,
  })
  if (error || typeof businessId !== "string") {
    return { success: false, formError: "Je bedrijfsgegevens konden niet worden opgeslagen." }
  }

  await logAuditEvent({ userId: user.id, action: "onboarding.step_completed", metadata: { step: 2 } })
  revalidatePath("/onboarding")
  return { success: true, data: { businessId } }
}

export async function completeOnboarding(input: WebsiteSetupInput): Promise<OnboardingActionResult<{ websiteId: string }>> {
  if (!isOnboardingEnabled()) return unavailable()
  const parsed = websiteSetupSchema.safeParse(input)
  if (!parsed.success) return validationFailure(parsed.error)

  const { supabase, user } = await authenticatedClient()
  if (!user) return { success: false, formError: "Je sessie is verlopen. Log opnieuw in." }

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_business_id")
    .eq("id", user.id)
    .maybeSingle()
  if (!profile?.onboarding_business_id) {
    return { success: false, formError: "Sla eerst je bedrijfsgegevens op." }
  }

  const { data: business } = await supabase
    .from("businesses")
    .select("id, name, category, email, phone, city")
    .eq("id", profile.onboarding_business_id)
    .eq("user_id", user.id)
    .maybeSingle()
  if (!business) return { success: false, formError: "Je bedrijf kon niet worden geladen." }

  const sections = buildOnboardingStarterSections({
    businessId: business.id,
    businessName: business.name,
    category: business.category,
    goal: parsed.data.primaryGoal,
    description: parsed.data.description,
    email: business.email,
    phone: business.phone || null,
    city: business.city || null,
  })

  const { data: websiteId, error } = await supabase.rpc("complete_onboarding", {
    p_title: parsed.data.title,
    p_slug: parsed.data.slug,
    p_primary_goal: parsed.data.primaryGoal,
    p_default_locale: parsed.data.defaultLocale,
    p_description: parsed.data.description,
    p_existing_url: parsed.data.existingWebsiteUrl,
    p_sections: sections,
  })

  if (error || typeof websiteId !== "string") {
    const slugConflict = error?.code === "23505" || error?.message?.includes("Slug unavailable")
    return {
      success: false,
      formError: slugConflict
        ? "Deze websitenaam is net door iemand anders gekozen. Kies een andere naam."
        : "De website kon niet worden voorbereid. Je eerdere antwoorden zijn bewaard; probeer het opnieuw.",
      fieldErrors: slugConflict ? { slug: "Deze naam is al in gebruik." } : undefined,
    }
  }

  await logAuditEvent({ userId: user.id, websiteId, action: "onboarding.completed", metadata: { step: 3 } })
  revalidatePath("/onboarding")
  revalidatePath("/editor")
  return { success: true, data: { websiteId } }
}
