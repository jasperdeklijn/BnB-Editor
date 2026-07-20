import type { SupabaseClient } from "@supabase/supabase-js"

import {
  DEFAULT_WEBSITE_LOCALE,
  getSupportedLocale,
  isSupportedWebsiteLocale,
  type SupportedWebsiteLocale,
  type WebsiteLocale,
} from "@/lib/i18n/locales"

export interface WebsiteSectionTranslation {
  website_id: string
  section_id: string
  locale: SupportedWebsiteLocale
  values: Record<string, unknown>
  source_hash: string
  created_at?: string
  updated_at?: string
}

export async function listWebsiteLocales(client: SupabaseClient, websiteId: string) {
  const { data, error } = await client
    .from("website_locales")
    .select("id, website_id, locale, path_segment, display_name, is_default, is_enabled, seo, created_at, updated_at")
    .eq("website_id", websiteId)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true })

  return { data: (data ?? []) as WebsiteLocale[], error }
}

export async function ensureDefaultWebsiteLocale(client: SupabaseClient, websiteId: string) {
  const supported = getSupportedLocale(DEFAULT_WEBSITE_LOCALE)!
  return client
    .from("website_locales")
    .upsert({
      website_id: websiteId,
      locale: supported.locale,
      path_segment: supported.pathSegment,
      display_name: supported.displayName,
      is_default: true,
      is_enabled: true,
    }, { onConflict: "website_id,locale" })
    .select()
    .single()
}

export async function addWebsiteLocale(
  client: SupabaseClient,
  websiteId: string,
  locale: SupportedWebsiteLocale,
) {
  const supported = getSupportedLocale(locale)
  if (!supported) return { data: null, error: new Error("Unsupported locale") }
  return client
    .from("website_locales")
    .insert({
      website_id: websiteId,
      locale: supported.locale,
      path_segment: supported.pathSegment,
      display_name: supported.displayName,
      is_default: false,
      is_enabled: false,
    })
    .select()
    .single()
}

export async function updateWebsiteLocale(
  client: SupabaseClient,
  websiteId: string,
  locale: SupportedWebsiteLocale,
  updates: Partial<Pick<WebsiteLocale, "display_name" | "path_segment" | "is_enabled" | "seo">>,
) {
  return client
    .from("website_locales")
    .update(updates)
    .eq("website_id", websiteId)
    .eq("locale", locale)
    .select()
    .single()
}

export async function removeWebsiteLocale(
  client: SupabaseClient,
  websiteId: string,
  locale: SupportedWebsiteLocale,
) {
  return client
    .from("website_locales")
    .delete()
    .eq("website_id", websiteId)
    .eq("locale", locale)
    .eq("is_default", false)
    .select()
    .single()
}

export async function setWebsiteDefaultLocale(
  client: SupabaseClient,
  websiteId: string,
  locale: SupportedWebsiteLocale,
) {
  return client.rpc("set_website_default_locale", { p_website_id: websiteId, p_locale: locale })
}

export async function listSectionTranslations(client: SupabaseClient, websiteId: string) {
  const { data, error } = await client
    .from("website_section_translations")
    .select("website_id, section_id, locale, values, source_hash, created_at, updated_at")
    .eq("website_id", websiteId)
  return { data: (data ?? []).filter((row) => isSupportedWebsiteLocale(row.locale)) as WebsiteSectionTranslation[], error }
}

export async function saveSectionTranslation(
  client: SupabaseClient,
  translation: WebsiteSectionTranslation,
) {
  return client
    .from("website_section_translations")
    .upsert(translation, { onConflict: "section_id,locale" })
    .select()
    .single()
}
