export const SUPPORTED_WEBSITE_LOCALES = [
  { locale: "nl-NL", pathSegment: "nl", displayName: "Nederlands" },
  { locale: "en-GB", pathSegment: "en", displayName: "English" },
  { locale: "de-DE", pathSegment: "de", displayName: "Deutsch" },
  { locale: "fr-FR", pathSegment: "fr", displayName: "Français" },
] as const

export type SupportedWebsiteLocale = (typeof SUPPORTED_WEBSITE_LOCALES)[number]["locale"]

export interface WebsiteLocale {
  id?: string
  website_id: string
  locale: SupportedWebsiteLocale
  path_segment: string
  display_name: string
  is_default: boolean
  is_enabled: boolean
  seo: Record<string, unknown>
  created_at?: string
  updated_at?: string
}

export const DEFAULT_WEBSITE_LOCALE: SupportedWebsiteLocale = "nl-NL"

export function isSupportedWebsiteLocale(value: unknown): value is SupportedWebsiteLocale {
  return typeof value === "string" && SUPPORTED_WEBSITE_LOCALES.some((entry) => entry.locale === value)
}

export function getSupportedLocale(locale: string) {
  return SUPPORTED_WEBSITE_LOCALES.find((entry) => entry.locale === locale) ?? null
}

export function getLocaleByPathSegment(segment: string | null | undefined) {
  const normalized = segment?.trim().toLowerCase()
  return SUPPORTED_WEBSITE_LOCALES.find((entry) => entry.pathSegment === normalized) ?? null
}

export function getLocalePath(locale: Pick<WebsiteLocale, "is_default" | "path_segment">) {
  return locale.is_default ? "/" : `/${locale.path_segment}`
}
