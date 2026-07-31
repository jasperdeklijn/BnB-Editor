import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import test from "node:test"
import ts from "typescript"

function loadTypeScriptModule(relativePath) {
  const sourcePath = path.resolve(relativePath)
  const source = fs.readFileSync(sourcePath, "utf8")
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: sourcePath,
  })
  const module = { exports: {} }
  Function("module", "exports", compiled.outputText)(module, module.exports)
  return module.exports
}

const navigation = loadTypeScriptModule("lib/editor-inspector-navigation.ts")

test("section inspector remains the default route", () => {
  assert.deepEqual(navigation.getInitialInspectorRoute(), { mode: "section" })
  assert.deepEqual(navigation.getInitialInspectorRoute("section", "section"), { mode: "section" })
})

test("site-only mobile panel opens the site menu", () => {
  assert.deepEqual(navigation.getInitialInspectorRoute("section", "site"), { mode: "site-menu" })
})

test("site detail returns through the menu without losing section context", () => {
  const sectionRoute = { mode: "section" }
  const menuRoute = navigation.navigateInspector(sectionRoute, { type: "OPEN_SITE_MENU" })
  const detailRoute = navigation.navigateInspector(menuRoute, {
    type: "OPEN_SITE_DETAIL",
    detail: "typography",
  })

  assert.deepEqual(menuRoute, { mode: "site-menu" })
  assert.deepEqual(detailRoute, { mode: "site-detail", detail: "typography" })
  assert.deepEqual(
    navigation.navigateInspector(detailRoute, { type: "OPEN_SITE_MENU" }),
    { mode: "site-menu" },
  )
  assert.deepEqual(
    navigation.navigateInspector(menuRoute, { type: "OPEN_SECTION" }),
    { mode: "section" },
  )
})

test("refactored detail panels retain the existing automatic save paths", () => {
  const themePanel = fs.readFileSync(path.resolve("components/themes/theme-panel.tsx"), "utf8")
  const sectionEditor = fs.readFileSync(path.resolve("components/editor/section-editor.tsx"), "utf8")
  const editorClient = fs.readFileSync(path.resolve("components/editor/editor-client.tsx"), "utf8")

  assert.match(themePanel, /fetch\('\/api\/themes'/)
  assert.match(themePanel, /setHeaderSaving\(true\)/)
  assert.doesNotMatch(sectionEditor, /websiteSections\.updateSection/)
  assert.match(editorClient, /scheduleSectionSave\(selectedSectionId\)/)
  assert.match(editorClient, /await saveQueueRef\.current\?\.flush\(\)/)
})
