import { z } from "zod"
import { COLOR_PALETTES } from "../themes/palettes"
import { FONT_PAIRS } from "../themes/fonts"
import type { Section } from "../types"

export const MAX_IMPORT_BYTES = 2 * 1024 * 1024
export const MAX_IMPORT_IMAGES = 8
const text = (max: number) => z.string().max(max).regex(
  // eslint-disable-next-line no-control-regex -- Reject non-text control characters in untrusted input.
  /^[^<>\u0000-\u0008\u000b\u000c\u000e-\u001f]*$/,
  "Gebruik gewone tekst, zonder HTML of besturingstekens.",
)
const heading = text(200).trim().min(1)
const short = text(500)
const key = z.string().regex(/^[a-z][a-z0-9-]{0,47}$/, "Gebruik een korte sleutel met letters, cijfers en streepjes.")
export function isHttpsUrl(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === "https:" && !url.username && !url.password && (!url.port || url.port === "443")
      && !/[\s<>"'\\]/.test(value)
  } catch { return false }
}
const imageUrl = z.string().max(2048).refine((value) => isHttpsUrl(value) && !/[()]/.test(value), "Gebruik een geldige HTTPS-afbeeldings-URL zonder inloggegevens; codeer haakjes als %28 en %29.")
const href = z.string().max(2048).refine(
  (value) => /^#[a-z][a-z0-9-]{0,47}$/.test(value) || isHttpsUrl(value),
  "Gebruik HTTPS of # gevolgd door een sectiesleutel.",
)
const color = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Gebruik een kleur als #385344.")
const styles = z.object({
  backgroundColor: color.optional(), textColor: color.optional(),
  accentColor: color.optional(), surfaceColor: color.optional(),
  backgroundImage: imageUrl.optional(), backgroundImageAlt: short.optional(),
  backgroundPosition: z.enum(["center", "top", "bottom", "left", "right"]).optional(),
}).strict()
const common = {
  layout: z.enum(["classic", "split", "showcase", "compact", "card", "banner"]).default("classic"),
  styleType: z.enum(["clean", "bold", "elegant", "soft", "dark", "outline"]).default("clean"),
}
const section = <T extends string, S extends z.ZodRawShape>(type: T, shape: S) => z.object({
  key, type: z.literal(type), content: z.object({ ...common, ...shape }).strict(),
  styles: styles.optional(),
}).strict()
export const importSchema = z.object({
  format: z.literal("flexpagina"),
  version: z.literal(1),
  title: heading,
  theme: z.object({
    paletteId: z.string().refine((id) => COLOR_PALETTES.some((p) => p.id === id), "Onbekend kleurenpalet.").default("forest-green"),
    fontPairId: z.string().refine((id) => FONT_PAIRS.some((p) => p.id === id), "Onbekende lettertypecombinatie.").default("inter-system"),
    spacing: z.enum(["compact", "comfortable", "spacious"]).default("comfortable"),
    radius: z.enum(["none", "small", "medium", "large", "full"]).default("medium"),
  }).strict().default({}),
  sections: z.array(z.discriminatedUnion("type", [
    section("nav", { brandName: heading, isSticky: z.boolean().default(true),
      navLinks: z.array(z.object({ sectionKey: key, label: text(80).min(1), enabled: z.boolean().default(true) }).strict()).max(20).default([]) }),
    section("hero", { title: heading, subtitle: short.default(""), ctaText: text(80).default(""),
      ctaEnabled: z.boolean().default(false), ctaHref: href.optional() }),
    section("about", { title: heading, description: text(10000).min(1), images: z.array(imageUrl).max(8).default([]) }),
    section("gallery", { title: heading, subtitle: short.default(""), images: z.array(imageUrl).min(1).max(8) }),
    section("features", { title: heading, features: z.array(z.object({ text: short.min(1) }).strict()).min(1).max(30) }),
    section("faq", { title: heading, subtitle: short.default(""),
      items: z.array(z.object({ question: heading, answer: text(5000).min(1) }).strict()).min(1).max(30) }),
    section("cta", { title: heading, subtitle: short.default(""),
      primaryCtaText: text(80).default(""), primaryCtaEnabled: z.boolean().default(false), primaryCtaHref: href.optional(),
      secondaryCtaText: text(80).default(""), secondaryCtaEnabled: z.boolean().default(false), secondaryCtaHref: href.optional() }),
  ])).min(1).max(40),
}).strict().superRefine((value, ctx) => {
  const keys = new Set<string>()
  for (const [i, item] of value.sections.entries()) {
    if (keys.has(item.key)) ctx.addIssue({ code: "custom", path: ["sections", i, "key"], message: "Sectiesleutels moeten uniek zijn." })
    keys.add(item.key)
  }
  for (const [i, item] of value.sections.entries()) {
    if (item.type === "nav" && item.styles && ["backgroundImage", "backgroundImageAlt", "backgroundPosition"].some((field) => field in item.styles!)) {
      ctx.addIssue({ code: "custom", path: ["sections", i, "styles"], message: "Navigatie ondersteunt geen achtergrondafbeelding." })
    }
    const data = item.content as Record<string, unknown>
    for (const name of ["ctaHref", "primaryCtaHref", "secondaryCtaHref"]) {
      const target = data[name]
      if (typeof target === "string" && target.startsWith("#") && !keys.has(target.slice(1))) {
        ctx.addIssue({ code: "custom", path: ["sections", i, "content", name], message: "Verwijzing naar een ontbrekende sectie." })
      }
    }
    for (const prefix of item.type === "hero" ? ["cta"] : item.type === "cta" ? ["primaryCta", "secondaryCta"] : []) {
      if (data[prefix + "Enabled"] && (!data[prefix + "Text"] || !data[prefix + "Href"])) {
        ctx.addIssue({ code: "custom", path: ["sections", i, "content", prefix + "Href"], message: "Een actieve knop vereist tekst en een doel." })
      }
    }
    if (item.type === "nav") for (const [j, link] of item.content.navLinks.entries()) {
      if (!keys.has(link.sectionKey)) ctx.addIssue({ code: "custom", path: ["sections", i, "content", "navLinks", j, "sectionKey"], message: "Verwijzing naar een ontbrekende sectie." })
    }
  }
  if (getImportImages(value).length > MAX_IMPORT_IMAGES) {
    ctx.addIssue({ code: "custom", path: ["sections"], message: "Maximaal 8 unieke afbeeldingen per import." })
  }
})
export type ImportDocument = z.infer<typeof importSchema>
export class ImportValidationError extends Error {
  constructor(public issues: string[]) { super(issues.join("\n")); this.name = "ImportValidationError" }
}
export function parseImport(raw: string): ImportDocument {
  if (new TextEncoder().encode(raw).length > MAX_IMPORT_BYTES) throw new ImportValidationError(["bestand: Maximaal 2 MB."])
  // Bound nesting before JSON.parse/Zod traversal (strings and escaped quotes excluded).
  let depth = 0, quoted = false, escaped = false
  for (const character of raw) {
    if (quoted) {
      if (escaped) escaped = false
      else if (character === "\\") escaped = true
      else if (character === '"') quoted = false
    } else if (character === '"') quoted = true
    else if (character === "{" || character === "[") {
      if (++depth > 16) throw new ImportValidationError(["bestand: JSON is te diep genest."])
    } else if (character === "}" || character === "]") depth--
  }
  let value: unknown
  try { value = JSON.parse(raw.replace(/^\uFEFF/, "")) }
  catch { throw new ImportValidationError(["bestand: Ongeldige JSON. Controleer komma's en aanhalingstekens."]) }
  if (value && typeof value === "object" && "version" in value && value.version !== 1) {
    throw new ImportValidationError(["version: Niet ondersteund. Deze importer accepteert alleen versie 1."])
  }
  const result = importSchema.safeParse(value)
  if (!result.success) throw new ImportValidationError(result.error.issues.slice(0, 30).map((issue) =>
    // Never include unknown property names or received enum values in reports.
    `${issue.path.map((part) => String(part).slice(0, 48)).join(".") || "bestand"}: ${
      issue.code === "unrecognized_keys" ? "Onbekende velden zijn niet toegestaan."
        : issue.code === "invalid_union_discriminator" ? "Niet-ondersteund sectietype."
        : issue.code === "invalid_enum_value" ? "Niet-ondersteunde optie."
        : issue.code === "invalid_literal" ? "Onjuist formaat of ontbrekend verplicht veld."
        : issue.message}`,
  ))
  return result.data
}
export function getImportImages(doc: ImportDocument): string[] {
  return [...new Set(doc.sections.flatMap((section) => [
    ...(section.styles?.backgroundImage ? [section.styles.backgroundImage] : []),
    ...(section.type === "gallery" || section.type === "about" ? section.content.images : []),
  ]))]
}
export function normalizeImport(doc: ImportDocument, makeId: () => string): { title: string; theme: ImportDocument["theme"]; sections: Section[] } {
  const ids = new Map(doc.sections.map((section) => [section.key, makeId()]))
  const sections: Section[] = doc.sections.map((section) => {
    const data: Record<string, unknown> = { ...section.content }
    for (const name of ["ctaHref", "primaryCtaHref", "secondaryCtaHref"]) {
      if (typeof data[name] === "string" && data[name].startsWith("#")) data[name] = `#section-${ids.get(data[name].slice(1))}`
    }
    if (section.type === "nav") data.navLinks = section.content.navLinks.map(({ sectionKey, ...link }) => ({ ...link, sectionId: ids.get(sectionKey) }))
    if (section.type === "features") data.features = section.content.features.map((item) => ({ ...item, id: makeId(), icon: "tabler:check" }))
    if (section.type === "faq") data.items = section.content.items.map((item) => ({ ...item, id: makeId() }))
    return { id: ids.get(section.key)!, type: section.type, data, styles: { ...section.styles } }
  })
  return { title: doc.title.trim(), theme: { ...doc.theme }, sections }
}
export function replaceImportImages(doc: ImportDocument, urls: Map<string, string>): ImportDocument {
  return { ...doc, sections: doc.sections.map((section) => ({
    ...section,
    styles: section.styles ? { ...section.styles, ...(section.styles.backgroundImage ? { backgroundImage: urls.get(section.styles.backgroundImage)! } : {}) } : undefined,
    content: section.type === "about" || section.type === "gallery"
      ? { ...section.content, images: section.content.images.map((url) => urls.get(url)!) } : section.content,
  })) as ImportDocument["sections"] }
}

