import { z } from "zod"
import { importSchema, ImportValidationError, MAX_IMPORT_BYTES, parseImport, parseImportJson, type ImportDocument } from "../import/schema"
import { RESERVED_PAGE_SLUGS } from "../website-pages"
import type { Section, Transition } from "../types"
import type { ThemeConfig } from "../themes/types"

const id = z.string().min(1).max(100).regex(/^[a-zA-Z0-9_-]+$/)
const sectionTypes = ["projects", "freeform", "hero", "gallery", "services", "contact", "features", "about", "nav", "footer", "testimonials", "faq", "opening_hours", "pricing", "team", "map", "cta", "request_form"] as const
const transitionTypes = ["none", "fade", "gradient", "slide", "wave", "curve", "diagonal", "zigzag", "split", "paint"] as const
const unsafeKeys = new Set(["__proto__", "prototype", "constructor"])
// Native section content evolves independently of the small hand-authored import format.
// Keep its JSON intact, while bounding traversal and rejecting executable URL schemes.
function safeJson(value: unknown, depth = 0): boolean {
  if (depth > 14) return false
  if (value === null || typeof value === "boolean") return true
  if (typeof value === "number") return Number.isFinite(value)
  if (typeof value === "string") {
    // eslint-disable-next-line no-control-regex -- Detect obfuscated executable URL schemes in untrusted JSON.
    return value.length <= 100000 && !/^(?:javascript|vbscript|data|blob|file):/i.test(value.replace(/[\u0000-\u0020]/g, ""))
  }
  if (Array.isArray(value)) return value.length <= 2000 && value.every((item) => safeJson(item, depth + 1))
  return typeof value === "object" && Object.entries(value).every(([key, item]) => !unsafeKeys.has(key) && safeJson(item, depth + 1))
}
const content = z.record(z.string(), z.unknown()).refine(safeJson, "Ongeldige of onveilige ontwerpinhoud.")
const editorExportSchema = z.object({
  format: z.literal("flexpagina-editor"), version: z.literal(1),
  title: z.string().trim().min(1).max(200),
  theme: importSchema.shape.theme.unwrap().extend({
    languageSwitcher: z.object({ style: z.enum(["dropdown", "buttons", "compact"]), position: z.enum(["nav-left", "nav-right", "bottom-left", "bottom-right"]) }).strict().optional(),
  }),
  pages: z.array(z.object({
    id, title: z.string().trim().min(1).max(200), slug: z.string().max(80), isHome: z.boolean(),
    showInNavigation: z.boolean(), includeInPublication: z.boolean(), seo: content.default({}),
  }).strict()).min(1).max(100),
  sections: z.array(z.object({
    id, type: z.enum(sectionTypes), pageId: id.optional(),
    scope: z.enum(["page", "site_header", "site_footer"]).default("page"),
    data: content, styles: z.object({
      fontFamily: z.string().max(500).optional(), textColor: z.string().max(100).optional(),
      backgroundColor: z.string().max(100).optional(), backgroundImage: z.string().max(2048).optional(),
      backgroundPosition: z.string().max(100).optional(), backgroundImageAlt: z.string().max(500).optional(),
      logo: z.string().max(2048).optional(), logoAlt: z.string().max(500).optional(),
      accentColor: z.string().max(100).optional(), surfaceColor: z.string().max(100).optional(),
    }).strict().refine(safeJson).optional(),
  }).strict()).max(1000),
  transitions: z.array(z.object({ id, fromSectionId: id, toSectionId: id, type: z.enum(transitionTypes) }).strict()).max(1000).default([]),
}).strict().superRefine((value, ctx) => {
  const fail = (message: string) => ctx.addIssue({ code: "custom", message })
  if (value.pages.filter((page) => page.isHome).length !== 1) fail("Precies één startpagina is vereist.")
  if (new Set([...value.pages, ...value.sections].map((item) => item.id)).size !== value.pages.length + value.sections.length) fail("Pagina's en secties moeten verschillende ID's hebben.")
  for (const items of [value.pages, value.sections, value.transitions]) if (new Set(items.map((item) => item.id)).size !== items.length) fail("Ontwerponderdelen moeten unieke ID's hebben.")
  if (new Set(value.pages.map((page) => page.slug)).size !== value.pages.length) fail("Pagina-adressen moeten uniek zijn.")
  for (const page of value.pages) if (page.isHome ? page.slug !== "" : !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(page.slug) || RESERVED_PAGE_SLUGS.has(page.slug)) fail("Ongeldig pagina-adres.")
  for (const section of value.sections) {
    if (section.scope === "page" && !value.pages.some((page) => page.id === section.pageId)) fail("Een sectie verwijst naar een ontbrekende pagina.")
    if (section.scope === "site_header" && section.type !== "nav" || section.scope === "site_footer" && section.type !== "footer") fail("Ongeldig gedeeld onderdeel.")
  }
  for (const scope of ["site_header", "site_footer"]) if (value.sections.filter((section) => section.scope === scope).length > 1) fail("Gebruik maximaal één gedeelde header en footer.")
  for (const transition of value.transitions) {
    const from = value.sections.find((section) => section.id === transition.fromSectionId)
    const to = value.sections.find((section) => section.id === transition.toSectionId)
    if (!from || !to || from.pageId !== to.pageId) fail("Ongeldige sectieovergang.")
  }
})

export type EditorExportDocument = z.infer<typeof editorExportSchema>
export type EditorExportDesign = {
  title: string; theme: ThemeConfig; sections: Array<Section & { pageId?: string }>;
  pages: Array<Omit<EditorExportDocument["pages"][number], "seo"> & { seo?: Record<string, unknown> }>; transitions?: Transition[]
}
export type DemoImportDocument = ImportDocument | EditorExportDocument

export function parseDemoImport(raw: string): DemoImportDocument {
  const value = parseImportJson(raw)
  if (!value || typeof value !== "object" || !("format" in value) || value.format !== "flexpagina-editor") return parseImport(raw)
  if (!safeJson(value)) throw new ImportValidationError(["bestand: Ongeldige of onveilige ontwerpinhoud."])
  const result = editorExportSchema.safeParse(value)
  if (!result.success) throw new ImportValidationError(result.error.issues.slice(0, 30).map((issue) => `${issue.path.join(".") || "bestand"}: ${issue.code === "custom" ? issue.message : "Ongeldig editor-exportveld."}`))
  return result.data
}

export function serializeEditorExport(design: EditorExportDesign): string {
  const raw = JSON.stringify({ format: "flexpagina-editor", version: 1, ...design }, null, 2)
  if (new TextEncoder().encode(raw).length > MAX_IMPORT_BYTES) throw new ImportValidationError(["Dit ontwerp is te groot voor een demo-export (maximaal 2 MB)."])
  parseDemoImport(raw)
  return raw
}

export function normalizeEditorExport(doc: EditorExportDocument, makeId: () => string): EditorExportDesign {
  const ids = new Map([...doc.pages, ...doc.sections].map((item) => [item.id, makeId()]))
  const remap = (value: unknown): unknown => {
    if (typeof value === "string") {
      if (ids.has(value)) return ids.get(value)
      if (value.startsWith("#section-")) return `#section-${ids.get(value.slice(9)) ?? value.slice(9)}`
      if (/^(page|section):/.test(value)) return value.split(":").map((part, index) => index ? ids.get(part) ?? part : part).join(":")
      return value
    }
    if (Array.isArray(value)) return value.map(remap)
    if (value && typeof value === "object") return Object.fromEntries(Object.entries(value)
      .filter(([key]) => !["businessId", "business_id", "websiteId", "website_id", "formDestinationKey", "booking_catalog"].includes(key))
      .map(([key, item]) => [key, remap(item)]))
    return value
  }
  return {
    title: doc.title, theme: doc.theme,
    pages: doc.pages.map((page) => ({ ...page, id: ids.get(page.id)! })),
    sections: doc.sections.map((section) => ({ ...section, id: ids.get(section.id)!, pageId: section.pageId ? ids.get(section.pageId) : undefined,
      data: remap(section.type === "services" ? { ...section.data, services: section.data.services ?? [] } : section.data) as Record<string, unknown> })),
    transitions: doc.transitions.map((transition) => ({ ...transition, id: makeId(), fromSectionId: ids.get(transition.fromSectionId)!, toSectionId: ids.get(transition.toSectionId)! })),
  }
}
