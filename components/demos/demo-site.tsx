"use client"

import type { CSSProperties } from "react"
import { SectionRenderer } from "@/components/editor/section-renderer"
import { WebsiteLinksProvider } from "@/components/editor/website-links-context"
import { applyThemeDefaultsToSections, getGoogleFontsUrl, resolveWebsiteTheme } from "@/lib/themes"
import { demoPages, type DemoDesign } from "@/lib/demos/shared"

export function DemoSite({ design, pageId, basePath }: { design: DemoDesign; pageId: string; basePath: string }) {
  const theme = resolveWebsiteTheme(design.theme)
  const sections = applyThemeDefaultsToSections(design.sections.filter((section) => !design.pages || section.pageId === pageId || section.scope && section.scope !== "page")
    .sort((a, b) => (a.scope === "site_header" ? -1 : a.scope === "site_footer" ? 1 : 0) - (b.scope === "site_header" ? -1 : b.scope === "site_footer" ? 1 : 0)), design.theme)
  const fonts = getGoogleFontsUrl(theme.fontPair)
  return <WebsiteLinksProvider value={{ pages: demoPages(design), activePageId: pageId, localePath: "", basePath }}>
    {fonts && <link rel="stylesheet" href={fonts} />}
    <main className="website-theme-scope min-h-screen" style={theme.cssVariables as CSSProperties}>
      {sections.map((section) => <div id={`section-${section.id}`} key={section.id}>
        <SectionRenderer section={section} allSections={sections} isPreview />
      </div>)}
    </main>
  </WebsiteLinksProvider>
}
