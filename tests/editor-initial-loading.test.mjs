import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { createRequire } from "node:module"
import test from "node:test"
import React from "react"
import { renderToString } from "react-dom/server"
import ts from "typescript"

const require = createRequire(import.meta.url)
function load(file, imports) {
  const module = { exports: {} }
  const source = ts.transpileModule(readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 },
  }).outputText
  Function("module", "exports", "require", source)(module, module.exports, imports)
  return module.exports
}

test("initial editor render shows only the loader before website data is ready", () => {
  const { PageLoadingIndicator } = load("components/ui/page-loading-indicator.tsx", (id) => {
    if (id === "@/lib/utils") return { cn: (...classes) => classes.filter(Boolean).join(" ") }
    if (id.endsWith(".module.css")) return { default: { loader: "loader", workspace: "workspace", spinner: "spinner", label: "label" } }
    return require(id)
  })
  const { EditorSaveQueue } = load("lib/editor-save-queue.ts", require)
  const { EditorClient } = load("components/editor/editor-client.tsx", (id) => {
    if (id === "react" || id === "react/jsx-runtime") return require(id)
    if (id === "next/navigation") return { useRouter: () => ({}), useSearchParams: () => new URLSearchParams("websiteId=existing-site") }
    if (id === "./editor-layout-context") return { useEditorLayout: () => ({ isPreview: false, isSaving: false, saveState: "saved", device: "desktop" }) }
    if (id === "@/components/ui/page-loading-indicator") return { PageLoadingIndicator }
    if (id === "@/lib/editor-save-queue") return { EditorSaveQueue }
    if (id === "@/lib/entitlements") return { inspectWebsiteEntitlements: () => ({ allowed: true, violations: [] }) }
    if (id === "@/lib/i18n/feature") return { isMultilingualWebsitesEnabled: () => true }
    if (id === "@/lib/i18n/locales") return { DEFAULT_WEBSITE_LOCALE: "nl-NL" }
    if (id === "@/lib/business-naming") return { DEFAULT_SITE_TITLE: "Mijn website" }
    if (id === "@/lib/supabase/client") return { createClient: () => { throw new Error("Data must not load during render") } }
    return {}
  })
  const html = renderToString(React.createElement(EditorClient, {
    userId: "owner", currentPlan: "gold", hasReviewAccess: true, hasMultilingualAccess: true,
    hasBookingAccess: true, enforcementMode: "enforce",
  }))
  assert.match(html, /role="status"/)
  assert.match(html, /Even laden…/)
  assert.doesNotMatch(html, /<button|<select|Publiceren|FlexCheck/)
})
