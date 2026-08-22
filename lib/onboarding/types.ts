import type { BusinessCategory } from "@/lib/business/categories"
import type { SupportedWebsiteLocale } from "@/lib/i18n/locales"

export type OnboardingGoal = "bookings" | "contact_requests" | "showcase" | "other"

export interface PersonalDetailsInput {
  firstName: string
  lastName: string
  phone: string | null
  jobTitle: string | null
  locale: SupportedWebsiteLocale
}

export interface CompanyDetailsInput {
  name: string
  category: BusinessCategory
  country: string
  city: string | null
  publicEmail: string
  publicPhone: string | null
  chamberOfCommerceNumber: string | null
  vatNumber: string | null
}

export interface WebsiteSetupInput {
  title: string
  slug: string
  primaryGoal: OnboardingGoal
  defaultLocale: SupportedWebsiteLocale
  description: string | null
  existingWebsiteUrl: string | null
}

export type OnboardingFieldErrors = Record<string, string>

export type OnboardingActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; formError: string; fieldErrors?: OnboardingFieldErrors }

export interface OnboardingInitialState {
  email: string
  step: 1 | 2 | 3
  completed: boolean
  personal: PersonalDetailsInput
  company: CompanyDetailsInput
  website: WebsiteSetupInput
}

