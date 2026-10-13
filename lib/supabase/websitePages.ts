import type { SupabaseClient } from "@supabase/supabase-js"
import { readAllQueryRows } from "./pagination"
import { mapWebsitePage, type PageSettings, type WebsitePage } from "@/lib/website-pages"

function pageError(error: { code?: string; message: string }): Error {
  if (error.code === "23505") return new Error("Dit webadres wordt al door een andere pagina gebruikt.")
  if (error.code === "23514") return new Error("Controleer de paginanaam en het webadres.")
  return new Error(error.message)
}

export async function listWebsitePages(client: SupabaseClient, websiteId: string): Promise<WebsitePage[]> {
  const { data, error } = await readAllQueryRows(client.from("website_pages").select("*", {count:"exact"})
    .eq("website_id", websiteId).order("position").order("id"))
  if (error) throw pageError(error)
  if (!data?.some((page) => page.is_home)) throw new Error("De startpagina ontbreekt. Controleer de multipage-migratie.")
  return data.map(mapWebsitePage)
}

export async function saveWebsitePage(client: SupabaseClient, websiteId: string, pageId: string | null, values: PageSettings) {
  const { data, error } = await client.rpc("save_website_page", {
    p_website_id: websiteId, p_page_id: pageId, p_title: values.title, p_slug: values.slug,
    p_show_in_navigation: values.showInNavigation, p_include_in_publication: values.includeInPublication,
    p_seo: values.seo ?? {},
  })
  if (error) throw pageError(error)
  return mapWebsitePage(data)
}

export async function duplicateWebsitePage(client: SupabaseClient, websiteId: string, pageId: string, title: string, slug: string) {
  const { data, error } = await client.rpc("duplicate_website_page", { p_website_id: websiteId, p_page_id: pageId, p_title: title, p_slug: slug })
  if (error) throw pageError(error)
  return mapWebsitePage(data)
}

export async function replaceWebsiteHome(client: SupabaseClient, websiteId: string, pageId: string, oldHomeSlug: string) {
  const { error } = await client.rpc("replace_website_home", { p_website_id: websiteId, p_page_id: pageId, p_old_home_slug: oldHomeSlug })
  if (error) throw pageError(error)
}

export async function reorderWebsitePages(client: SupabaseClient, websiteId: string, ids: string[]) {
  const { error } = await client.rpc("reorder_website_pages", { p_website_id: websiteId, p_page_ids: ids })
  if (error) throw pageError(error)
}

export async function deleteWebsitePage(client: SupabaseClient, websiteId: string, pageId: string) {
  const { error } = await client.rpc("delete_website_page", { p_website_id: websiteId, p_page_id: pageId })
  if (error) throw pageError(error)
}
