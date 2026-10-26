import assert from "node:assert/strict"
import test from "node:test"
import { createRequire } from "node:module"
import { fixture, website, otherWebsite } from "./helpers/website-pages-fixture.mjs"

const load = createRequire(import.meta.url)("../scripts/load-import-module.cjs")
const { createSectionElement, readSectionElements, fitElementColumns, moveSectionElement, readPresentation, presentationVariables, updateContentPath, findContentPath, contentStyleKey, readTextStyle, safeElementImage } = load("lib/section-composition.ts")
const { extractTranslatableValues, applySectionTranslation, getSectionTranslationStatus, getSectionSourceHash } = load("lib/i18n/section-translations.ts")
const { invalidWebsiteLinks } = load("lib/website-links.ts")

test("column changes preserve every element and reorder only within the same column", () => {
  const elements = [createSectionElement("heading", "title", 0), createSectionElement("image", "photo", 1), createSectionElement("text", "body", 0), createSectionElement("button", "action", 2)]
  assert.deepEqual(moveSectionElement(elements, "title", 1).map((item) => item.id), ["body", "photo", "title", "action"])
  const one = fitElementColumns(elements, 1)
  assert.deepEqual(one.map((item) => item.id), elements.map((item) => item.id))
  assert.ok(one.every((item) => item.column === 0))
  assert.deepEqual(elements.map((item) => item.column), [0, 1, 0, 2])
})

test("malformed content and style values cannot escape the supported layout contract", () => {
  assert.deepEqual(readPresentation({ paddingTop: 0, contentWidth: "narrow", headingSize: 9999, columnRatio: "expression(foo)", unknown: true }), { paddingTop: 0, contentWidth: "narrow" })
  assert.equal(presentationVariables(readPresentation({ paddingTop: 0 }))["--composition-top"], "0px")
  assert.equal(readSectionElements([createSectionElement("text", "same"), createSectionElement("text", "same"), { id: "bad", type: "html", text: "<script>" }]).length, 1)
  for (const value of ["javascript:alert(1)", "data:image/svg+xml,<svg>", "//evil.test/a.png", '/x" onload="run']) assert.equal(safeElementImage(value), "")
  assert.equal(safeElementImage("/images/photo.jpg"), "/images/photo.jpg")
})

test("direct editing updates only the selected field and resists prototype paths", () => {
  const data = { images: ["/a.jpg", "/b.jpg"], items: [{ id: "first", text: "One" }, { id: "second", text: "Two" }] }
  const updated = updateContentPath(data, ["images", 1], "/replacement.jpg")
  assert.deepEqual(updated.images, ["/a.jpg", "/replacement.jpg"])
  assert.deepEqual(data.images, ["/a.jpg", "/b.jpg"])
  assert.deepEqual(findContentPath(data, "/b.jpg", "image"), ["images", 1])
  assert.equal(findContentPath({ services: [{ image_url: "/a.jpg" }] }, "/a.jpg", "image"), null)
  assert.equal(contentStyleKey(data, ["items", 1, "text"]), '["items","second","text"]')
  assert.equal(updateContentPath(data, ["__proto__", "polluted"], true), data)
  assert.equal({}.polluted, undefined)
  const styled = { ...data, textStyles: { '["items","second","text"]': { size: 32 } } }
  styled.items = [...data.items].reverse()
  assert.equal(readTextStyle(styled, ["items", 0, "text"]).size, 32)
})

test("element translations preserve links, image sources, order and column configuration", () => {
  const section = { id: "free", type: "freeform", data: { title: "Informatie", columns: 2, elements: [
    { ...createSectionElement("button", "action", 1), text: "Contact", href: "/contact" },
    { ...createSectionElement("image", "photo"), src: "/photo.jpg", alt: "Ons bedrijf" },
  ] } }
  const extracted = extractTranslatableValues(section.type, section.data)
  assert.deepEqual(extracted.elements, [{ id: "action", text: "Contact" }, { id: "photo", alt: "Ons bedrijf" }])
  assert.equal(getSectionTranslationStatus(section, { title: "Information", elements: [{ id: "action", text: "Contact us" }] }).status, "missing")
  const translated = applySectionTranslation(section, { title: "Information", elements: [{ id: "photo", alt: "Our company", src: "https://evil.test" }, { id: "action", text: "Contact us", href: "https://evil.test", column: 0 }] })
  assert.equal(translated.data.elements[0].href, "/contact")
  assert.equal(translated.data.elements[0].column, 1)
  assert.equal(translated.data.elements[1].src, "/photo.jpg")
  assert.equal(translated.data.elements[1].alt, "Our company")
  assert.equal(getSectionTranslationStatus(section, { title: "Information", elements: [{ id: "action", text: "Contact us" }, { id: "photo", alt: "Our company" }] }).status, "complete")
  const changed = structuredClone(section); changed.data.elements[0].text = "Reserveer"
  assert.notEqual(getSectionSourceHash(changed), getSectionSourceHash(section))
  const decorative = { type: "freeform", data: { elements: [createSectionElement("divider", "line")] } }
  assert.equal(getSectionTranslationStatus(decorative, {}).status, "complete")
})

test("publication catches broken or unsafe links inside additional elements", () => {
  const data = { elements: [{ ...createSectionElement("button", "action"), href: "page:missing" }] }
  assert.deepEqual(invalidWebsiteLinks(data, [], new Map()), ["page:missing"])
  data.elements[0].href = "javascript:alert(1)"
  assert.deepEqual(invalidWebsiteLinks(data, [], new Map()), ["javascript:alert(1)"])
})

test("the existing database saves free sections and new composition fields with owner isolation", async () => {
  const db = await fixture()
  try {
    const page = (await db.query("select id from public.website_pages where website_id=$1 and is_home", [website])).rows[0]
    const content = { title: "Vrije sectie", columns: 2, presentation: { paddingTop: 0, columnRatio: "40-60" }, elements: [createSectionElement("heading", "heading"), { ...createSectionElement("button", "button", 1), href: "/contact" }] }
    const inserted = (await db.query("insert into public.website_sections(website_id,page_id,scope,position,type,content) values($1,$2,'page',0,'freeform',$3::jsonb) returning id,content", [website,page.id,JSON.stringify(content)])).rows[0]
    assert.deepEqual(inserted.content, content)
    const changed = { ...content, elements: fitElementColumns(content.elements, 1), columns: 1 }
    await db.query("update public.website_sections set content=$1::jsonb where id=$2", [JSON.stringify(changed),inserted.id])
    assert.deepEqual((await db.query("select content from public.website_sections where id=$1", [inserted.id])).rows[0].content, changed)
    await assert.rejects(db.query("insert into public.website_sections(website_id,page_id,scope,position,type,content) values($1,$2,'page',1,'freeform',$3::jsonb)", [otherWebsite,page.id,JSON.stringify(content)]))
  } finally { await db.close() }
})
