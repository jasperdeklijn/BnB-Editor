import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import test from "node:test"

const read = (file) => fs.readFileSync(path.resolve(file), "utf8")

test("publish and editor navigation flush pending section saves", () => {
  const editorClient = read("components/editor/editor-client.tsx")
  assert.match(editorClient, /if \(!\(await flushPendingSectionSaves\(\)\)\)/)
  assert.match(editorClient, /handleEditorNavigationCapture/)
  assert.match(editorClient, /router\.push\(href\)/)
})

test("database update errors are surfaced to the shared save queue", () => {
  const editorClient = read("components/editor/editor-client.tsx")
  assert.match(editorClient, /const \{ error \} = await websiteSections\.updateSection/)
  assert.match(editorClient, /if \(error\) throw error/)
  assert.match(editorClient, /Wijzigingen konden niet worden opgeslagen/)
})

test("section deletion is undoable from canvas and inspector", () => {
  const editorClient = read("components/editor/editor-client.tsx")
  const canvas = read("components/editor/editor-canvas.tsx")
  const inspector = read("components/editor/editor-inspector.tsx")
  assert.match(editorClient, /label: "Ongedaan maken"/)
  assert.match(editorClient, /section-\$\{Date\.now\(\)\}-restore/)
  assert.match(canvas, /onSectionDelete\(id\)/)
  assert.match(inspector, /kun je de sectie nog terugzetten/)
})

test("mobile section actions use touch-safe targets", () => {
  const canvas = read("components/editor/editor-canvas.tsx")
  assert.equal((canvas.match(/h-11 w-11/g) ?? []).length >= 4, true)
  assert.match(canvas, /touch-manipulation/)
})

test("the inspector contains the integrated media workflow", () => {
  const sectionEditor = read("components/editor/section-editor.tsx")
  const imagePicker = read("components/editor/section-image-picker.tsx")
  assert.match(sectionEditor, /SectionImagePicker/)
  assert.match(sectionEditor, /Focuspunt/)
  assert.match(sectionEditor, /Beschrijving van het logo/)
  assert.match(imagePicker, /uploadUserImage/)
})
