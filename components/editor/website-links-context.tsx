"use client"

import { createContext, useContext, type AnchorHTMLAttributes, type ReactNode } from "react"
import type { WebsitePage } from "@/lib/website-pages"
import { parseWebsiteLink, resolveWebsiteLink } from "@/lib/website-links"
import type { SectionTargetOption } from "./section-editor-types"

export interface WebsiteLinksContextValue {
  pages: WebsitePage[]
  activePageId: string | null
  localePath: string
  basePath?: string
  websiteId?: string | null
  editor?: boolean
  sectionOptions?: SectionTargetOption[]
  sectionAliases?: Record<string, string>
  loadSections?: (pageId: string) => Promise<SectionTargetOption[]>
  navigate?: (pageId: string, sectionId?: string) => Promise<boolean>
}

const WebsiteLinksContext = createContext<WebsiteLinksContextValue | null>(null)
export const useWebsiteLinks = () => useContext(WebsiteLinksContext)

export function WebsiteLinksProvider({ value, children }: { value: WebsiteLinksContextValue; children: ReactNode }) {
  return <WebsiteLinksContext.Provider value={value}>{children}</WebsiteLinksContext.Provider>
}

/** Resolves saved references without replacing them in editable section data. */
export function WebsiteLink({ href = "", onClick, children, ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) {
  const context = useWebsiteLinks()
  const target = parseWebsiteLink(href)
  const resolved = resolveWebsiteLink(context?.sectionAliases?.[href] ?? href, context?.pages ?? [], context?.activePageId, context?.localePath)
  const contextualHref = target.type !== "url" && context?.basePath && resolved.startsWith("/")
    ? `${context.basePath}${resolved === "/" ? "" : resolved}` : resolved
  const editorHref = context?.editor && target.type !== "url" && resolved
    ? `/editor?websiteId=${encodeURIComponent(context.websiteId ?? "")}&pageId=${encodeURIComponent(target.pageId)}${target.type === "section" ? `#section-${encodeURIComponent(target.sectionId)}` : ""}`
    : contextualHref
  const currentPage = target.type === "page" && target.pageId === context?.activePageId
  return <a {...props} data-link-target={href} aria-current={currentPage ? "page" : undefined} href={editorHref || undefined} aria-disabled={!resolved || undefined} onClick={(event) => {
    if (!resolved) { event.preventDefault(); return }
    if (context?.editor && target.type !== "url" && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey && event.button === 0) {
      event.preventDefault()
      void context.navigate?.(target.pageId, target.type === "section" ? target.sectionId : undefined)
      onClick?.(event)
      return
    }
    onClick?.(event)
  }}>{children}</a>
}
