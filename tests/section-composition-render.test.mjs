import assert from "node:assert/strict"
import test from "node:test"
import fs from "node:fs"
import path from "node:path"
import { createRequire } from "node:module"
import { Writable } from "node:stream"
import React from "react"
import { renderToPipeableStream } from "react-dom/server"
import ts from "typescript"

const require = createRequire(import.meta.url)
const cache = new Map()
function load(file) {
  const filename = path.resolve(file)
  if (cache.has(filename)) return cache.get(filename).exports
  const module = { exports: {} }; cache.set(filename, module)
  const compiled = ts.transpileModule(fs.readFileSync(filename, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true }, fileName: filename })
  Function("module", "exports", "require", compiled.outputText)(module, module.exports, (id) => {
    if (id.endsWith(".css")) return { __esModule: true, default: new Proxy({}, { get: (_target, key) => String(key) }) }
    if (id === "next/dynamic") return (loader) => React.lazy(async () => { const loaded = await loader(); return { default: loaded.default ?? loaded } })
    if (id === "server-only") return {}
    if (id.startsWith(".") || id.startsWith("@/")) {
      const base = id.startsWith("@/") ? path.resolve(id.slice(2)) : path.resolve(path.dirname(filename), id)
      const target = [base + ".ts", base + ".tsx", path.join(base,"index.ts"), path.join(base,"index.tsx")].find((candidate) => fs.existsSync(candidate))
      if (!target) throw new Error(`Cannot load ${id} from ${filename}`)
      return load(target)
    }
    return require(id)
  })
  return module.exports
}
const { SectionRenderer } = load("components/editor/section-renderer.tsx")
const { createSectionElement } = load("lib/section-composition.ts")
async function render(section, isPreview = true) {
  return new Promise((resolve, reject) => {
    const chunks = []
    const output = new Writable({ write(chunk, _encoding, done) { chunks.push(chunk); done() } })
    output.on("finish", () => resolve(Buffer.concat(chunks).toString()))
    output.on("error", reject)
    const stream = renderToPipeableStream(React.createElement(SectionRenderer, { section, isPreview, onUpdate: isPreview ? undefined : () => {}, isSelected: true }), { onAllReady() { stream.pipe(output) }, onError: reject })
  })
}

test("the real public renderer renders free columns, safe buttons and escaped text without editor controls", async () => {
  const html = await render({ id: "free", type: "freeform", data: { columns: 3, presentation: { columnRatio: "40-60", paddingTop: 0 }, elements: [
    { ...createSectionElement("heading", "heading"), text: '<script>alert("x")</script>' },
    { ...createSectionElement("button", "button", 1), text: "Bekijk aanbod", href: "/aanbod" },
    { ...createSectionElement("button", "unsafe", 2), text: "Onveilige knop", href: "javascript:alert(1)" },
    { ...createSectionElement("image", "photo", 2), src: "/photo.jpg", alt: "Onze tuin", aspect: "square", width: 75 },
  ] }, styles: { backgroundColor: "#f3f5ef" } })
  assert.match(html, /data-columns="3"/)
  assert.match(html, /--composition-top:0px/)
  assert.match(html, /&lt;script&gt;/)
  assert.match(html, /href="\/aanbod"/)
  assert.match(html, /width:75%;aspect-ratio:1/)
  assert.doesNotMatch(html, /javascript:|Onveilige knop|data-element-controls|Element toevoegen|contentEditable="true"/)
})

test("existing sections render added elements in order and retain native text and image styling", async () => {
  const html = await render({ id: "about", type: "about", data: { title: "Ons verhaal", description: "Onze beschrijving", layout: "split", images: ["/a.jpg"], presentation: { contentWidth: "narrow", headingSize: 48 },
    textStyles: { '["title"]': { size: 32, alignment: "right" } }, imageStyles: { '["images",0]': { aspect: "portrait", width: 75, position: "top" } },
    elements: [{ ...createSectionElement("text", "before"), text: "Boven de inhoud", placement: "before" }, { ...createSectionElement("button", "after"), text: "Extra actie", href: "/contact" }],
  } })
  assert.ok(html.indexOf("Boven de inhoud") < html.indexOf("Ons verhaal"))
  assert.ok(html.indexOf("Onze beschrijving") < html.indexOf("Extra actie"))
  assert.match(html, /font-size:32px;text-align:right/)
  assert.match(html, /width:75%;height:auto;margin-inline:auto;aspect-ratio:3\/4;object-fit:cover;object-position:top/)
  assert.match(html, /--composition-width:48rem/)
})

test("the actual editor exposes all six element types and no script or database activity is needed to compose", async () => {
  const html = await render({ id: "free", type: "freeform", data: { columns: 2, elements: [] } }, false)
  for (const label of ["Titel", "Tekst", "Afbeelding", "Knop", "Icoon", "Scheidingslijn"]) assert.ok(html.includes(label), label)
  assert.match(html.replaceAll("<!-- -->", ""), /Kolom 1/)
  assert.match(html.replaceAll("<!-- -->", ""), /Kolom 2/)
})

test("canvas element edits keep the full original section document for the existing replace-save contract", () => {
  const original = { title: "Behoud deze titel", columns: 3, presentation: { contentWidth: "wide" }, images: ["/photo.jpg"], elements: [] }
  let saved
  // This component only composes children; it has no hooks. Exercise the actual
  // callback passed to its lazy canvas editor, before the storage queue replaces data.
  const editor = SectionRenderer.type({ section: { id: "free", type: "freeform", data: original }, isPreview: false, onUpdate: (data) => { saved = data } })
  const elements = [createSectionElement("button", "new")]
  editor.props.onUpdate({ elements })
  assert.deepEqual(saved, { ...original, elements })
  editor.props.onUpdate({ textStyles: { '["title"]': { size: 32 } } })
  assert.equal(saved.title, original.title)
  assert.deepEqual(saved.presentation, original.presentation)
  assert.equal(original.elements.length, 0)
})

test("native button styling reaches the public link without altering its destination", async () => {
  const html = await render({ id: "intro", type: "hero", data: { title: "Welkom", subtitle: "Onze website", layout: "classic", ctaText: "Bekijk aanbod", ctaHref: "/aanbod", buttonStyles: { '["ctaHref"]': "outline" } } })
  assert.match(html, /href="\/aanbod"/)
  assert.match(html, /background-color:transparent;color:var\(--section-accent\);border:1px solid currentColor/)
})

test("choosing the original image ratio explicitly releases the native square crop", async () => {
  const html = await render({ id: "about", type: "about", data: { title: "Over ons", description: "Welkom", images: ["/photo.jpg"], imageStyles: { '["images",0]': { aspect: "original" } }, presentation: { imageAspect: "original" } } })
  assert.match(html, /aspect-ratio:auto;height:auto;object-fit:cover/)
  assert.match(html, /data-custom-image="true"/)
  assert.match(html, /--composition-image-aspect:auto/)
})

test("two native buttons with the same destination retain independent formatting", async () => {
  const html = await render({ id: "cta", type: "cta", data: { title: "Neem contact op", layout: "classic", primaryCtaText: "Eerste knop", secondaryCtaText: "Tweede knop", primaryCtaEnabled: true, secondaryCtaEnabled: true, primaryCtaHref: "/contact", secondaryCtaHref: "/contact", buttonStyles: { '["primaryCtaHref"]': "outline", '["secondaryCtaHref"]': "link" } } })
  assert.match(html, /background-color:transparent;color:var\(--section-accent\);border:1px solid currentColor/)
  assert.match(html, /background-color:transparent;color:var\(--section-accent\);border:none;box-shadow:none;text-decoration:underline/)
})

test("projects are selectable on the base plan and all six layouts render actual project content", async () => {
  const { getSectionDefinition, selectableSectionDefinitions } = load("components/editor/section-registry.ts")
  const { getMinimumPlanForSection } = load("lib/entitlements.ts")
  const { getSectionLayoutOptions } = load("lib/section-layouts.ts")
  const { createProject } = load("lib/projects.ts")
  assert.ok(selectableSectionDefinitions.some((definition) => definition.type === "projects"))
  assert.equal(getMinimumPlanForSection("projects"), "bronze")
  assert.deepEqual(getSectionDefinition("projects").defaultData({}).projects, [])
  const project = { ...createProject("garden"), title: "Tuinrenovatie", description: "Een groene plek om te ontspannen.", image: "/garden.jpg", imageAlt: "Tuin na de renovatie", category: "Buitenruimte", location: "Utrecht", year: "2026", ctaEnabled: true, ctaText: "Bekijk de tuin", ctaHref: "/tuin" }
  const labels = new Set()
  for (const layout of getSectionLayoutOptions("projects")) {
    labels.add(layout.label)
    const html = await render({ id: "work", type: "projects", data: { title: "Ons werk", projects: [project], layout: layout.value } })
    for (const text of ["Ons werk", "Tuinrenovatie", "Buitenruimte", "Utrecht", "2026", "Tuin na de renovatie"]) assert.ok(html.includes(text), `${layout.value}: ${text}`)
    assert.match(html, new RegExp(`data-project-layout="${layout.value}"`))
    assert.match(html, /href="\/tuin"/)
    assert.doesNotMatch(html, /Project toevoegen|Kies een projectfoto/)
  }
  assert.equal(labels.size, 6)
})

test("projects hide empty public placeholders and suppress unsafe or disabled links", async () => {
  const { createProject } = load("lib/projects.ts")
  const empty = await render({ id: "work", type: "projects", data: { title: "Lege sectie", projects: [] } })
  assert.doesNotMatch(empty, /Lege sectie|Voeg projecten toe/)
  const html = await render({ id: "work", type: "projects", data: { projects: [
    { ...createProject("unsafe"), title: "<script>alert('x')</script>", image: "javascript:alert(1)", ctaEnabled: true, ctaText: "Onveilig", ctaHref: "javascript:alert(1)" },
    { ...createProject("disabled"), title: "Tweede project", ctaEnabled: false, ctaText: "Verborgen knop", ctaHref: "https://example.test" },
  ] } })
  assert.match(html, /&lt;script&gt;/)
  assert.match(html, /Tweede project/)
  assert.doesNotMatch(html, /javascript:|Verborgen knop|Kies een projectfoto|<script>/)
})

test("project editor actions preserve the portfolio when adding, copying, ordering and changing a project", () => {
  const { ProjectsSectionEditor } = load("components/sections/projects-section.editor.tsx")
  const { RepeatingItemActions } = load("components/editor/repeating-item-actions.tsx")
  const { createProject } = load("lib/projects.ts")
  const original = [{ ...createProject("one"), title: "Project één", image: "/one.jpg" }, { ...createProject("two"), title: "Project twee", description: "Behoud dit verhaal" }]
  let saved
  const editor = ProjectsSectionEditor({ section: { id: "work", type: "projects", data: { projects: original } }, updateField: (key, value) => { assert.equal(key, "projects"); saved = value }, sectionTargetOptions: [] })
  function walk(node, predicate) {
    for (const element of React.Children.toArray(node)) {
      if (!React.isValidElement(element)) continue
      if (predicate(element)) return element
      const found = walk(element.props.children, predicate)
      if (found) return found
    }
    return null
  }
  const actions = walk(editor, (element) => element.type === RepeatingItemActions)
  actions.props.onDuplicate()
  assert.equal(saved.length, 3)
  assert.equal(saved[1].title, "Project één")
  assert.equal(saved[1].image, "/one.jpg")
  assert.notEqual(saved[1].id, original[0].id)
  actions.props.onMove(1)
  assert.deepEqual(saved.map((project) => project.id), ["two", "one"])
  actions.props.onDelete()
  assert.deepEqual(saved.map((project) => project.id), ["two"])
  const name = walk(editor, (element) => element.props.value === "Project één")
  name.props.onChange({ target: { value: "Nieuwe titel" } })
  assert.equal(saved[0].title, "Nieuwe titel")
  assert.equal(saved[1].description, "Behoud dit verhaal")
  const add = walk(editor, (element) => typeof element.props.onClick === "function" && React.Children.toArray(element.props.children).includes("Project toevoegen"))
  add.props.onClick()
  assert.equal(saved.length, 3)
  assert.equal(new Set(saved.map((project) => project.id)).size, 3)
  assert.equal(original[0].title, "Project één")
})

test("project translations follow stable ids while preserving photos, links and years", () => {
  const { createProject } = load("lib/projects.ts")
  const { extractTranslatableValues, applySectionTranslation, getSectionTranslationStatus, getSectionSourceHash } = load("lib/i18n/section-translations.ts")
  const source = { id: "work", type: "projects", data: { title: "Projecten", projects: [{ ...createProject("one"), title: "Tuin", image: "/garden.jpg", imageAlt: "Onze tuin", year: "2026", ctaEnabled: true, ctaHref: "/tuin" }, { ...createProject("two"), title: "Huis" }] } }
  const values = { title: "Projects", projects: [{ id: "two", title: "House" }, { id: "one", title: "Garden", imageAlt: "Our garden", image: "https://evil.test", year: "1900", ctaHref: "javascript:alert(1)" }] }
  assert.equal(extractTranslatableValues("projects", source.data).projects[0].image, undefined)
  assert.equal(getSectionTranslationStatus(source, { title: "Projects", projects: [values.projects[0]] }).status, "missing")
  assert.equal(getSectionTranslationStatus(source, values).status, "complete")
  const translated = applySectionTranslation(source, values)
  assert.equal(translated.data.projects[0].title, "Garden")
  assert.equal(translated.data.projects[0].image, "/garden.jpg")
  assert.equal(translated.data.projects[0].ctaHref, "/tuin")
  assert.equal(translated.data.projects[0].year, "2026")
  const changed = structuredClone(source); changed.data.projects[0].description = "Nieuwe tekst"
  assert.notEqual(getSectionSourceHash(source), getSectionSourceHash(changed))
})
