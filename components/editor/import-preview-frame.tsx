"use client"

import { useMemo, useState, type CSSProperties } from "react"
import { createPortal } from "react-dom"
import { SectionRenderer } from "./section-renderer"
import { applyThemeDefaultsToSections, getGoogleFontsUrl, resolveWebsiteTheme } from "@/lib/themes"
import type { normalizeImport } from "@/lib/import/schema"

export function ImportPreviewFrame({ design, mobile }: { design: ReturnType<typeof normalizeImport>; mobile: boolean }) {
  const [frameDocument, setFrameDocument] = useState<Document | null>(null)
  const theme = useMemo(() => resolveWebsiteTheme(design.theme), [design.theme])
  const sections = useMemo(() => applyThemeDefaultsToSections(design.sections, design.theme), [design])
  return <div className="overflow-x-auto rounded-xl border bg-muted p-2">
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
    {frameDocument && createPortal(<>
      {getGoogleFontsUrl(theme.fontPair) && <link rel="stylesheet" href={getGoogleFontsUrl(theme.fontPair)} />}
      <div className="website-theme-scope" style={{ ...theme.cssVariables, fontFamily: "var(--font-body)" } as CSSProperties}
        onClickCapture={(event) => {
          const target = event.target as HTMLElement
          const link = target.closest("a")
          if (!link) return
          event.preventDefault()
          event.stopPropagation()
          const href = link.getAttribute("href")
          if (href?.startsWith("#")) frameDocument.getElementById(href.slice(1))?.scrollIntoView({ behavior: "smooth" })
        }}>
        {sections.map((section) => <div id={`section-${section.id}`} key={section.id}>
          <SectionRenderer section={section} allSections={sections} isPreview device={mobile ? "mobile" : "desktop"} />
        </div>)}
      </div>
    </>, frameDocument.body)}
  </div>
}

