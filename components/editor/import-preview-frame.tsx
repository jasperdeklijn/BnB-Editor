"use client"

import { useMemo, useState, type CSSProperties } from "react"
import { createPortal } from "react-dom"
import { SectionRenderer } from "./section-renderer"
import { applyThemeDefaultsToSections, getGoogleFontsUrl, resolveWebsiteTheme } from "@/lib/themes"
import type { PreviewDesign } from "@/lib/flexstart/shared"
import { WebsiteLinksProvider } from "./website-links-context"
import { parseWebsiteLink } from "@/lib/website-links"

export function ImportPreviewFrame({ design, mobile }: { design: PreviewDesign; mobile: boolean }) {
  const [frameDocument, setFrameDocument] = useState<Document | null>(null)
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null)
  const pageId = design.pages?.some((page) => page.id === selectedPageId) ? selectedPageId : design.pages?.find((page) => page.isHome)?.id
  const theme = useMemo(() => resolveWebsiteTheme(design.theme), [design.theme])
  const sections = useMemo(() => applyThemeDefaultsToSections(design.sections.filter((section) => !design.pages || section.pageId === pageId || section.scope && section.scope !== "page").sort((a,b) => (a.scope === "site_header" ? -1 : a.scope === "site_footer" ? 1 : 0) - (b.scope === "site_header" ? -1 : b.scope === "site_footer" ? 1 : 0)), design.theme), [design, pageId])
  return <div className="overflow-x-auto rounded-xl border bg-muted p-2">
    {design.pages ? <div className="mb-2 flex gap-2 overflow-x-auto" aria-label="Pagina's in import">{design.pages.map((page) => <button type="button" key={page.id} className="min-h-11 shrink-0 rounded-md border bg-background px-3 text-sm" aria-pressed={page.id === pageId} onClick={() => setSelectedPageId(page.id)}>{page.title}</button>)}</div> : null}
    <iframe title={mobile ? "Mobiel importvoorbeeld" : "Desktop importvoorbeeld"}
      className="mx-auto block h-[680px] border-0 bg-white"
      style={{ width: mobile ? 375 : "100%", minWidth: mobile ? 375 : 768 }}
      sandbox="allow-same-origin"
      srcDoc={'<!doctype html><html lang="nl"><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="margin:0"></body></html>'}
      onLoad={(event) => {
        const doc = event.currentTarget.contentDocument
        if (!doc) return
        document.querySelectorAll('link[rel="stylesheet"], style').forEach((node) => doc.head.appendChild(node.cloneNode(true)))
        setFrameDocument(doc)
      }} />
    {frameDocument && createPortal(<WebsiteLinksProvider value={{ pages: (design.pages ?? []).map((page,index) => ({ ...page, websiteId: "", position: index, seo: {} })), activePageId: pageId ?? null, localePath: "", editor: true, navigate: async (id) => { setSelectedPageId(id); return true } }}>
      {getGoogleFontsUrl(theme.fontPair) && <link rel="stylesheet" href={getGoogleFontsUrl(theme.fontPair)} />}
      <div className="website-theme-scope" style={{ ...theme.cssVariables, fontFamily: "var(--font-body)" } as CSSProperties}
        onClickCapture={(event) => {
          const target = event.target as HTMLElement
          const link = target.closest("a")
          if (!link) return
          event.preventDefault()
          event.stopPropagation()
          const targetLink = parseWebsiteLink(link.dataset.linkTarget ?? "")
          if (targetLink.type !== "url") {
            setSelectedPageId(targetLink.pageId)
            if (targetLink.type === "section") requestAnimationFrame(() => requestAnimationFrame(() => frameDocument.getElementById(`section-${targetLink.sectionId}`)?.scrollIntoView({ behavior: "smooth" })))
            return
          }
          const href = link.getAttribute("href")
          if (href?.startsWith("#")) frameDocument.getElementById(href.slice(1))?.scrollIntoView({ behavior: "smooth" })
        }}>
        {sections.map((section) => <div id={`section-${section.id}`} key={section.id}>
          <SectionRenderer section={section} allSections={sections} isPreview device={mobile ? "mobile" : "desktop"} />
        </div>)}
      </div>
    </WebsiteLinksProvider>, frameDocument.body)}
  </div>
}

