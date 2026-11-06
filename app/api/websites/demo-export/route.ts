import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { readAllQueryRows } from "@/lib/supabase/pagination"
import { listWebsitePages } from "@/lib/supabase/websitePages"
import { getDefaultThemeConfig } from "@/lib/themes/resolver"
import { normalizeEditorExport, parseDemoImport, serializeEditorExport, type EditorExportDesign } from "@/lib/demos/editor-export"
import { ImportValidationError } from "@/lib/import/schema"
import type { Section, Transition } from "@/lib/types"

const headers = { "Cache-Control": "no-store" }

export async function GET(request: Request) {
  const db = await createClient()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return Response.json({ error: "Log eerst in." }, { status: 401, headers })
  const websiteId = new URL(request.url).searchParams.get("websiteId")
  if (!z.string().uuid().safeParse(websiteId).success) return Response.json({ error: "Ongeldige website." }, { status: 400, headers })
  const { data: website, error } = await db.from("websites").select("id,title,theme_config,business_id").eq("id", websiteId!).eq("user_id", user.id).maybeSingle()
  if (error) return Response.json({ error: "De website kon niet worden geladen." }, { status: 503, headers })
  if (!website) return Response.json({ error: "Website niet gevonden." }, { status: 404, headers })
  try {
    const [pages, sections, transitions] = await Promise.all([
      listWebsitePages(db, website.id),
      readAllQueryRows(db.from("website_sections").select("id,page_id,scope,type,content,styles", { count: "exact" }).eq("website_id", website.id).order("position").order("id")),
      readAllQueryRows(db.from("section_transitions").select("id,from_section_id,to_section_id,transition", { count: "exact" }).eq("website_id", website.id).order("id")),
    ])
    const design: EditorExportDesign = {
      title: website.title, theme: website.theme_config ?? getDefaultThemeConfig(),
      pages: pages.map(({ id, title, slug, isHome, showInNavigation, includeInPublication, seo }) => ({ id, title, slug, isHome, showInNavigation, includeInPublication, seo })),
      sections: sections.data.map((row) => ({ id: row.id, pageId: row.page_id ?? undefined, scope: row.scope, type: row.type as Section["type"], data: row.content ?? {}, styles: row.styles ?? {} })),
      transitions: transitions.data.map((row) => ({ id: row.id, fromSectionId: row.from_section_id, toSectionId: row.to_section_id, type: (row.transition?.type ?? "none") as Transition["type"] })),
    }
    // Freeze service cards into the demo; never attach a demo to a customer's live data.
    if (website.business_id && design.sections.some((section) => section.type === "services")) {
      const services = await readAllQueryRows(db.from("services").select("id,title,description,price,duration,capacity,image_urls,tags,position,is_featured", { count: "exact" }).eq("business_id", website.business_id).is("archived_at", null).order("position").order("id"))
      design.sections = design.sections.map((section) => section.type === "services" ? { ...section, data: { ...section.data, services: services.data.filter((service) => !Array.isArray(section.data.serviceIds) || !section.data.serviceIds.length || section.data.serviceIds.includes(service.id)) } } : section)
    }
    const document = parseDemoImport(serializeEditorExport(design))
    if (document.format !== "flexpagina-editor") throw new Error("Unexpected export format")
    const raw = serializeEditorExport(normalizeEditorExport(document, () => crypto.randomUUID()))
    return new Response(raw, { headers: { ...headers, "Content-Type": "application/json; charset=utf-8", "Content-Disposition": 'attachment; filename="flexpagina-demo.json"' } })
  } catch (error) {
    if (error instanceof ImportValidationError) return Response.json({ error: "Dit ontwerp kon niet worden geëxporteerd.", issues: error.issues }, { status: 400, headers })
    return Response.json({ error: "Exporteren is mislukt. Probeer het opnieuw." }, { status: 503, headers })
  }
}
