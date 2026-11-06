import { z } from "zod"
import { normalizeImport } from "@/lib/import/schema"
import { normalizeEditorExport, type DemoImportDocument, type EditorExportDesign } from "./editor-export"
import { PLATFORM_DOMAIN } from "@/lib/platform"
import type { WebsitePage } from "@/lib/website-pages"

export const demoSlugSchema = z.string().min(6).max(63).regex(/^demo-[a-z0-9]+(?:-[a-z0-9]+)*$/, "Gebruik demo- gevolgd door kleine letters, cijfers en streepjes.")
export const demoMetadataSchema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(1, "Vul een demonaam in.").max(200),
  slug: demoSlugSchema,
  source_filename: z.string().trim().min(1).max(255).regex(/\.json$/i),
  published: z.boolean(),
}).strict()

export type DemoDesign = Omit<EditorExportDesign, "pages"> & { pages?: EditorExportDesign["pages"] }
export type DemoSummary = z.infer<typeof demoMetadataSchema> & {
  thumbnail_url: string | null
  created_at: string
  updated_at: string
}

export function suggestDemoSlug(title: string) {
  const name = title.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/^demo[-\s]+/, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
  return `demo-${(name || "website").slice(0, 58).replace(/-$/, "")}`
}

export function demoUrl(slug: string) {
  return `https://${slug}.${PLATFORM_DOMAIN.toLowerCase().replace(/^www\./, "")}`
}

export function prepareDemo(document: DemoImportDocument, makeId: () => string): DemoDesign {
  return document.format === "flexpagina-editor" ? normalizeEditorExport(document, makeId) : normalizeImport(document, makeId)
}

// Only pages explicitly included in publication are publicly reachable.
export function demoPages(design: DemoDesign): WebsitePage[] {
  return (design.pages ?? [{ id: "home", title: design.title, slug: "", isHome: true, showInNavigation: true, includeInPublication: true }])
    .filter((page) => page.isHome || page.includeInPublication)
    .map((page, position) => ({ ...page, websiteId: "", position, seo: "seo" in page ? page.seo ?? {} : {} }))
}

export function publicDemoDesign(design: DemoDesign): DemoDesign {
  if (!design.pages) return design
  const ids = new Set(demoPages(design).map((page) => page.id))
  const sections = design.sections.filter((section) => (section.scope && section.scope !== "page") || (section.pageId && ids.has(section.pageId)))
  const sectionIds = new Set(sections.map((section) => section.id))
  return { ...design, pages: design.pages.filter((page) => ids.has(page.id)), sections,
    ...(design.transitions && { transitions: design.transitions.filter((transition) => sectionIds.has(transition.fromSectionId) && sectionIds.has(transition.toSectionId)) }) }
}

export function demoThumbnail(design: DemoDesign): string | null {
  const home = design.pages?.find((page) => page.isHome)
  const sections = design.sections.filter((section) => !home || section.pageId === home.id)
  return sections.find((section) => section.type === "hero")?.styles?.backgroundImage
    || sections.find((section) => section.styles?.backgroundImage)?.styles?.backgroundImage
    || sections.flatMap((section) => Array.isArray(section.data.images) ? section.data.images : []).find((image): image is string => typeof image === "string") || null
}
