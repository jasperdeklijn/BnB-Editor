import type { WebsitePage } from "./website-pages"

export type WebsiteLinkTarget =
  | { type: "page"; pageId: string }
  | { type: "section"; pageId: string; sectionId: string }
  | { type: "url"; url: string }

/** String references fit every existing URL field while retaining stable IDs. */
export function encodeWebsiteLink(target: WebsiteLinkTarget): string {
  if (target.type === "url") return target.url
  return target.type === "page" ? `page:${target.pageId}` : `section:${target.pageId}:${target.sectionId}`
}

export function parseWebsiteLink(value: string): WebsiteLinkTarget {
  const page = /^page:([^:\s]+)$/.exec(value)
  if (page) return { type: "page", pageId: page[1] }
  const section = /^section:([^:\s]+):([^:\s]+)$/.exec(value)
  if (section) return { type: "section", pageId: section[1], sectionId: section[2] }
  return { type: "url", url: value }
}

export function safeWebsiteUrl(value: string): string {
  const url = value.trim()
  if (!url || Array.from(url).some((character) => character.charCodeAt(0) <= 32 || character.charCodeAt(0) === 127 || character === "\\") || url.startsWith("//")) return ""
  if (url.startsWith("#") || url.startsWith("/")) return url
  if (/^(https?:\/\/|mailto:|tel:)/i.test(url)) return url
  return ""
}

export function websitePagePath(page: Pick<WebsitePage, "isHome" | "slug">, localePath = ""): string {
  return `/${[localePath, page.isHome ? "" : page.slug].filter(Boolean).join("/")}`
}

export function resolveWebsiteLink(value: string, pages: WebsitePage[], activePageId?: string | null, localePath = ""): string {
  const target = parseWebsiteLink(value)
  if (target.type === "url") return safeWebsiteUrl(target.url)
  const page = pages.find((candidate) => candidate.id === target.pageId)
  if (!page) return ""
  if (target.type === "page") return websitePagePath(page, localePath)
  const anchor = `#section-${encodeURIComponent(target.sectionId)}`
  return page.id === activePageId ? anchor : `${websitePagePath(page, localePath)}${anchor}`
}

/** Validate references at publication; no live lookup may retarget a snapshot. */
export function invalidWebsiteLinks(data: unknown, pages: WebsitePage[], sectionPages: Map<string, string | null>, currentPageId?: string | null): string[] {
  const invalid: string[] = []
  const visit = (value: unknown) => {
    if (!value || typeof value !== "object") return
    if ("enabled" in value && value.enabled === false) return
    for (const [key, item] of Object.entries(value)) {
      if ((key === "href" || key.endsWith("Href")) && typeof item === "string") {
        const enabledKey = key.endsWith("Href") ? `${key.slice(0,-4)}Enabled` : "enabled"
        if ((value as Record<string, unknown>)[enabledKey] === false) continue
        const target = parseWebsiteLink(item)
        if (target.type === "url" && item && !safeWebsiteUrl(item)) invalid.push(item)
        if (target.type !== "url" && (!pages.some((page) => page.id === target.pageId)
          || (target.type === "section" && sectionPages.get(target.sectionId) !== target.pageId))) invalid.push(item)
        if (target.type === "url" && item.startsWith("#section-")) {
          const pageId = sectionPages.get(item.slice(9))
          if (!pageId || (currentPageId && pageId !== currentPageId)) invalid.push(item)
        }
      } else if (typeof item === "object") visit(item)
    }
  }
  visit(data)
  return [...new Set(invalid)]
}
