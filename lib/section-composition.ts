import { z } from "zod"
import type { CSSProperties } from "react"

export const ELEMENT_TYPES = ["heading", "text", "image", "button", "icon", "divider"] as const
export const ELEMENT_LABELS = { heading: "Titel", text: "Tekst", image: "Afbeelding", button: "Knop", icon: "Icoon", divider: "Scheidingslijn" }
export const MAX_SECTION_ELEMENTS = 40

export const presentationSchema = z.object({
  alignment: z.enum(["left", "center", "right"]).optional(),
  contentWidth: z.enum(["narrow", "normal", "wide", "full"]).optional(),
  headingSize: z.number().int().min(20).max(96).optional(),
  bodySize: z.number().int().min(12).max(28).optional(),
  paddingTop: z.number().int().min(0).max(200).optional(),
  paddingBottom: z.number().int().min(0).max(200).optional(),
  imageWidth: z.number().int().min(25).max(100).optional(),
  imageAspect: z.enum(["original", "square", "landscape", "portrait"]).optional(),
  imagePosition: z.enum(["center", "top", "bottom", "left", "right"]).optional(),
  columnRatio: z.enum(["50-50", "40-60", "60-40"]).optional(),
}).strict()
export type SectionPresentation = z.infer<typeof presentationSchema>

export const sectionElementSchema = z.object({
  id: z.string().min(1).max(100),
  type: z.enum(ELEMENT_TYPES),
  text: z.string().max(10000).default(""),
  href: z.string().max(2048).default(""),
  src: z.string().max(2048).default(""),
  alt: z.string().max(500).default(""),
  icon: z.string().max(100).nullable().default("tabler:star"),
  column: z.number().int().min(0).max(2).default(0),
  placement: z.enum(["before", "after"]).default("after"),
  alignment: z.enum(["inherit", "left", "center", "right"]).default("inherit"),
  size: z.number().int().min(12).max(96).optional(),
  width: z.number().int().min(25).max(100).default(100),
  aspect: z.enum(["original", "square", "landscape", "portrait"]).default("original"),
  position: z.enum(["center", "top", "bottom", "left", "right"]).default("center"),
  buttonStyle: z.enum(["solid", "outline", "link"]).default("solid"),
}).strict()
export type SectionElement = z.infer<typeof sectionElementSchema>

export function readPresentation(value: unknown): SectionPresentation {
  if (!value || typeof value !== "object") return {}
  // Ignore invalid individual fields, retaining the other valid settings.
  return Object.fromEntries(Object.entries(value).filter(([key, entry]) => {
    const schema = presentationSchema.shape[key as keyof typeof presentationSchema.shape]
    return schema?.safeParse(entry).success
  }))
}

export function readSectionElements(value: unknown): SectionElement[] {
  if (!Array.isArray(value)) return []
  const seen = new Set<string>()
  return value.slice(0, MAX_SECTION_ELEMENTS).flatMap((entry) => {
    const result = sectionElementSchema.safeParse(entry)
    if (!result.success || seen.has(result.data.id)) return []
    seen.add(result.data.id)
    return [result.data]
  })
}

export function createSectionElement(type: SectionElement["type"], id: string, column = 0): SectionElement {
  return sectionElementSchema.parse({ id, type, column,
    text: type === "heading" ? "Uw titel" : type === "text" ? "Schrijf hier uw tekst." : type === "button" ? "Meer informatie" : "",
  })
}

export function moveSectionElement(elements: SectionElement[], id: string, direction: -1 | 1): SectionElement[] {
  const index = elements.findIndex((element) => element.id === id)
  if (index < 0) return elements
  const current = elements[index]
  let target = index + direction
  while (target >= 0 && target < elements.length) {
    if (elements[target].column === current.column && elements[target].placement === current.placement) {
      const next = [...elements]
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    }
    target += direction
  }
  return elements
}

/** Keep all content when changing from three columns to one or two. */
export function fitElementColumns(elements: SectionElement[], count: number): SectionElement[] {
  return elements.map((element) => ({ ...element, column: Math.min(element.column, Math.max(0, count - 1)) }))
}

export function safeElementImage(value: string): string {
  return /^(https?:\/\/|\/(?!\/))[^\s<>"'\\]*$/i.test(value) ? value : ""
}

export function presentationVariables(presentation: SectionPresentation): CSSProperties {
  const widths = { narrow: "48rem", normal: "64rem", wide: "80rem", full: "100%" }
  const ratios = { "50-50": "minmax(0,1fr) minmax(0,1fr)", "40-60": "minmax(0,2fr) minmax(0,3fr)", "60-40": "minmax(0,3fr) minmax(0,2fr)" }
  return {
    ...(presentation.contentWidth && { "--composition-width": widths[presentation.contentWidth] }),
    ...(presentation.alignment && { "--composition-align": presentation.alignment }),
    ...(presentation.headingSize !== undefined && { "--composition-heading": `${presentation.headingSize}px` }),
    ...(presentation.bodySize !== undefined && { "--composition-body": `${presentation.bodySize}px` }),
    ...(presentation.paddingTop !== undefined && { "--composition-top": `${presentation.paddingTop}px` }),
    ...(presentation.paddingBottom !== undefined && { "--composition-bottom": `${presentation.paddingBottom}px` }),
    ...(presentation.imageWidth !== undefined && { "--composition-image-width": `${presentation.imageWidth}%` }),
    ...(presentation.columnRatio && { "--composition-columns": ratios[presentation.columnRatio] }),
    ...(presentation.imagePosition && { "--composition-image-position": presentation.imagePosition }),
    ...(presentation.imageAspect && { "--composition-image-aspect": { original: "auto", square: "1", landscape: "4/3", portrait: "3/4" }[presentation.imageAspect] }),
  } as CSSProperties
}

export type ContentPath = Array<string | number>
export function findContentPath(data: unknown, value: string, kind: "image" | "link", path: ContentPath = []): ContentPath | null {
  if (!data || typeof data !== "object" || path.length > 8) return null
  for (const [key, entry] of Object.entries(data)) {
    if (["services", "business", "textStyles", "imageStyles", "buttonStyles", "presentation", "elements"].includes(key)) continue
    const nextPath = [...path, Array.isArray(data) ? Number(key) : key]
    const eligible = kind === "image" ? /image|images|src|photo|url/i.test(key) || path.some((part) => /images/i.test(String(part))) : /href|url|link/i.test(key)
    if (eligible && entry === value && value) return nextPath
    const nested = findContentPath(entry, value, kind, nextPath)
    if (nested) return nested
  }
  return null
}
export function contentStyleKey(data: Record<string, unknown>, path: ContentPath): string {
  return JSON.stringify(path.map((key, index) => {
    if (typeof key !== "number") return key
    const item = contentAtPath(data, path.slice(0, index + 1))
    return item && typeof item === "object" && "id" in item ? String(item.id) : key
  }))
}
export function readTextStyle(data: Record<string, unknown>, path: ContentPath): { alignment?: "left" | "center" | "right"; size?: number } {
  const styles = data.textStyles as Record<string, unknown> | undefined
  const value = styles?.[contentStyleKey(data, path)] as Record<string, unknown> | undefined
  if (!value || typeof value !== "object") return {}
  return { ...(["left", "center", "right"].includes(String(value.alignment)) ? { alignment: value.alignment as "left" | "center" | "right" } : {}), ...(typeof value.size === "number" && value.size >= 12 && value.size <= 96 ? { size: value.size } : {}) }
}
export function contentAtPath(data: unknown, path: ContentPath): unknown {
  return path.reduce<unknown>((value, key) => value && typeof value === "object" ? (value as Record<string | number, unknown>)[key] : undefined, data)
}
export function updateContentPath(data: Record<string, unknown>, path: ContentPath, value: unknown): Record<string, unknown> {
  if (!path.length || path.some((key) => ["__proto__", "constructor", "prototype"].includes(String(key)))) return data
  const [key, ...rest] = path
  const current = data[key]
  const next = rest.length ? updateContentPath((current ?? {}) as Record<string, unknown>, rest, value) : value
  if (Array.isArray(data)) {
    const copy = [...data]
    copy[Number(key)] = next
    return copy as unknown as Record<string, unknown>
  }
  return { ...data, [key]: next }
}
