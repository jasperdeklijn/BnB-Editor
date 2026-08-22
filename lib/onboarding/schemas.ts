import { z } from "zod"

import { isValidOnboardingSlug, normalizeOnboardingSlug } from "@/lib/onboarding/slug"

const optionalText = (maximum: number) =>
  z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? null : value),
    z.string().trim().max(maximum).nullable(),
  )

const localeSchema = z.enum(["nl-NL", "en-GB", "de-DE", "fr-FR"])

export const personalDetailsSchema = z.object({
  firstName: z.string().trim().min(1, "Vul je voornaam in.").max(100, "Gebruik maximaal 100 tekens."),
  lastName: z.string().trim().min(1, "Vul je achternaam in.").max(100, "Gebruik maximaal 100 tekens."),
  phone: optionalText(40),
  jobTitle: optionalText(100),
  locale: localeSchema,
})

export const companyDetailsSchema = z
  .object({
    name: z.string().trim().min(1, "Vul je bedrijfsnaam in.").max(160, "Gebruik maximaal 160 tekens."),
    category: z.enum([
      "bnb",
      "hairdresser",
      "gardener",
      "coach",
      "restaurant",
      "photographer",
      "freelancer",
      "construction",
      "general_service",
    ]),
    country: z.enum(["NL", "BE", "DE", "FR", "GB"]),
    city: optionalText(100),
    publicEmail: z.string().trim().toLowerCase().email("Vul een geldig e-mailadres in.").max(254),
    publicPhone: optionalText(40),
    chamberOfCommerceNumber: optionalText(20),
    vatNumber: optionalText(32),
  })
  .superRefine((value, context) => {
    if (
      value.country === "NL" &&
      value.chamberOfCommerceNumber &&
      !/^\d{8}$/.test(value.chamberOfCommerceNumber.replace(/\s/g, ""))
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["chamberOfCommerceNumber"],
        message: "Een KvK-nummer bestaat uit acht cijfers.",
      })
    }
  })

export const websiteSetupSchema = z.object({
  title: z.string().trim().min(1, "Vul een websitenaam in.").max(160, "Gebruik maximaal 160 tekens."),
  slug: z
    .string()
    .trim()
    .transform(normalizeOnboardingSlug)
    .refine(isValidOnboardingSlug, "Gebruik 3–63 kleine letters, cijfers en koppeltekens; deze naam mag niet gereserveerd zijn."),
  primaryGoal: z.enum(["bookings", "contact_requests", "showcase", "other"]),
  defaultLocale: localeSchema,
  description: optionalText(500),
  existingWebsiteUrl: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? null : value),
    z.string().trim().url("Vul een volledige URL in, bijvoorbeeld https://voorbeeld.nl.").max(500).nullable(),
  ),
})
