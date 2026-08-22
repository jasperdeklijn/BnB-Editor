import "server-only"

import type { User } from "@supabase/supabase-js"

import type { BusinessCategory } from "@/lib/business/categories"
import { DEFAULT_WEBSITE_LOCALE, isSupportedWebsiteLocale } from "@/lib/i18n/locales"
import { normalizeOnboardingSlug } from "@/lib/onboarding/slug"
import type { OnboardingGoal, OnboardingInitialState } from "@/lib/onboarding/types"
import { createClient } from "@/lib/supabase/server"

const BUSINESS_CATEGORIES = new Set<BusinessCategory>([
  "bnb",
  "hairdresser",
  "gardener",
  "coach",
  "restaurant",
  "photographer",
  "freelancer",
  "construction",
  "general_service",
])

const WEBSITE_GOALS = new Set<OnboardingGoal>(["bookings", "contact_requests", "showcase", "other"])

function text(value: unknown) {
  return typeof value === "string" ? value : ""
}

function nullableText(value: unknown) {
  const normalized = text(value).trim()
  return normalized || null
}

function metadataName(user: User) {
  const metadata = (user.user_metadata as Record<string, unknown> | null) ?? {}
  const fullName = text(metadata.full_name).trim()
  const [firstName = "", ...lastParts] = fullName.split(/\s+/).filter(Boolean)
  return {
    firstName: text(metadata.first_name).trim() || firstName,
    lastName: text(metadata.last_name).trim() || lastParts.join(" "),
  }
}

export async function getOnboardingState(user: User): Promise<OnboardingInitialState> {
  const supabase = await createClient()
  const metadata = (user.user_metadata as Record<string, unknown> | null) ?? {}
  const fallbackName = metadataName(user)

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name, phone, job_title, locale, onboarding_step, onboarding_business_id, onboarding_website_id, onboarding_completed_at")
    .eq("id", user.id)
    .maybeSingle()

  const businessQuery = supabase
    .from("businesses")
    .select("id, name, category, country, city, email, phone, chamber_of_commerce_number, vat_number, description, website_url")
    .eq("user_id", user.id)

  const { data: business } = profile?.onboarding_business_id
    ? await businessQuery.eq("id", profile.onboarding_business_id).maybeSingle()
    : await businessQuery.order("created_at", { ascending: true }).limit(1).maybeSingle()

  const websiteQuery = supabase
    .from("websites")
    .select("id, title, slug, primary_goal")
    .eq("user_id", user.id)

  const { data: website } = profile?.onboarding_website_id
    ? await websiteQuery.eq("id", profile.onboarding_website_id).maybeSingle()
    : await websiteQuery.eq("published", false).order("created_at", { ascending: true }).limit(1).maybeSingle()

  const { data: defaultLocale } = website?.id
    ? await supabase
        .from("website_locales")
        .select("locale")
        .eq("website_id", website.id)
        .eq("is_default", true)
        .maybeSingle()
    : { data: null }

  const businessName = text(business?.name).trim()
  const suggestedTitle = text(website?.title).trim() || businessName
  const suggestedSlug = normalizeOnboardingSlug(text(website?.slug) || businessName) || "mijn-website"
  const profileLocale = isSupportedWebsiteLocale(profile?.locale) ? profile.locale : DEFAULT_WEBSITE_LOCALE
  const mainLocale = isSupportedWebsiteLocale(defaultLocale?.locale) ? defaultLocale.locale : profileLocale
  const category = BUSINESS_CATEGORIES.has(business?.category as BusinessCategory)
    ? (business?.category as BusinessCategory)
    : "general_service"
  const primaryGoal = WEBSITE_GOALS.has(website?.primary_goal as OnboardingGoal)
    ? (website?.primary_goal as OnboardingGoal)
    : category === "bnb"
      ? "bookings"
      : "contact_requests"

  const step = profile?.onboarding_step === 2 || profile?.onboarding_step === 3
    ? profile.onboarding_step
    : 1

  return {
    email: user.email ?? "",
    step,
    completed: Boolean(profile?.onboarding_completed_at),
    personal: {
      firstName: text(profile?.first_name).trim() || fallbackName.firstName,
      lastName: text(profile?.last_name).trim() || fallbackName.lastName,
      phone: nullableText(profile?.phone ?? metadata.phone),
      jobTitle: nullableText(profile?.job_title),
      locale: profileLocale,
    },
    company: {
      name: businessName,
      category,
      country: text(business?.country).trim().toUpperCase() || "NL",
      city: nullableText(business?.city),
      publicEmail: text(business?.email).trim().toLowerCase() || (user.email ?? ""),
      publicPhone: nullableText(business?.phone),
      chamberOfCommerceNumber: nullableText(business?.chamber_of_commerce_number),
      vatNumber: nullableText(business?.vat_number),
    },
    website: {
      title: suggestedTitle,
      slug: suggestedSlug,
      primaryGoal,
      defaultLocale: mainLocale,
      description: nullableText(business?.description),
      existingWebsiteUrl: nullableText(business?.website_url),
    },
  }
}

export async function getAuthenticatedOnboardingState() {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) return { user: null, state: null }
  return { user: data.user, state: await getOnboardingState(data.user) }
}

