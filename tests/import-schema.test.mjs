import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import { createRequire } from "node:module"
const require = createRequire(import.meta.url)
const { parseImport, normalizeImport, getImportImages, replaceImportImages, MAX_IMPORT_BYTES } = require("../scripts/load-import-module.cjs")("lib/import/schema.ts")
const example = JSON.parse(fs.readFileSync("docs/import/examples/bnb.json", "utf8").replace(/^\uFEFF/, ""))
const parse = (value) => parseImport(JSON.stringify(value))
test("both documented examples normalize into editable native sections", () => {
  for (const file of ["bnb", "studio"]) {
    const doc = parseImport(fs.readFileSync(`docs/import/examples/${file}.json`, "utf8"))
    let id = 0
    const native = normalizeImport(doc, () => `uuid-${++id}`)
    assert.equal(native.sections.length, doc.sections.length)
    assert.ok(native.sections.every((s) => s.id && s.data && s.styles && !("key" in s)))
    assert.equal(native.theme.spacing, "comfortable")
  }
})
test("fragment/nav links and repeating ids map to fresh native identities", () => {
  const doc = parse(example)
  let id = 0
  const native = normalizeImport(doc, () => `uuid-${++id}`)
  assert.equal(native.sections[0].data.navLinks[1].sectionId, native.sections[2].id)
  assert.equal(native.sections[1].data.ctaHref, `#section-${native.sections[2].id}`)
  assert.ok(native.sections[3].data.features.every((item) => item.id))
  assert.ok(native.sections[4].data.items.every((item) => item.id))
  assert.equal(doc.sections[1].content.ctaHref, "#over")
})
test("malformed, missing, future, deep and oversized documents fail safely", () => {
  assert.throws(() => parseImport("{secret"), /Ongeldige JSON/)
  assert.throws(() => parse({ ...example, version: 2 }), /alleen versie 1/)
  assert.throws(() => parse({ ...example, title: undefined }))
  assert.throws(() => parse({ ...example, title: "  " }))
  assert.throws(() => parseImport("[".repeat(17) + "]".repeat(17)), /diep/)
  assert.throws(() => parseImport(" ".repeat(MAX_IMPORT_BYTES + 1)), /2 MB/)
})
test("unsupported types, variants and executable/custom fields are rejected", () => {
  for (const change of [
    { ...example, user_id: "other-user" },
    { ...example, sections: [{ key: "a", type: "html", content: { html: "<script>alert(1)</script>" } }] },
    { ...example, sections: [{ key: "a", type: "hero", content: { title: "OK", layout: "unknown" } }] },
    { ...example, sections: [{ key: "a", type: "hero", content: { title: "<img onerror=alert(1)>" } }] },
    { ...example, sections: [{ key: "a", type: "hero", content: { title: "OK" }, styles: { fontFamily: "arbitrary-css" } }] },
  ]) assert.throws(() => parse(change))
  assert.throws(() => parseImport(JSON.stringify({ ...example, SECRET_CUSTOM_PROPERTY: "secret" })), (error) => !error.message.includes("SECRET_CUSTOM_PROPERTY"))
})
test("URL protocols, credentials, broken links, duplicate keys and missing CTA targets fail", () => {
  for (const url of ["javascript:alert(1)", "data:image/svg+xml,test", "http://example.com", "https://user:pass@example.com", "https://example.com:8443", "#missing"]) {
    assert.throws(() => parse({ ...example, sections: [{ key: "a", type: "hero", content: { title: "OK", ctaHref: url } }] }))
  }
  assert.throws(() => parse({ ...example, sections: [example.sections[1], example.sections[1]] }))
  assert.throws(() => parse({ ...example, sections: [{ key: "a", type: "hero", content: { title: "OK", ctaEnabled: true } }] }))
})
test("image count is bounded and native image mapping removes all source URLs", () => {
  const doc = parse({ ...example, sections: [{ key: "gallery", type: "gallery", content: { title: "Fotos", images: ["https://example.com/one.png"] }, styles: { backgroundImage: "https://example.com/two.png" } }] })
  assert.equal(getImportImages(doc).length, 2)
  const managed = replaceImportImages(doc, new Map(getImportImages(doc).map((url, i) => [url, `https://storage.example/${i}.webp`])))
  assert.ok(!JSON.stringify(managed).includes("https://example.com"))
  const tooMany = { ...example, sections: Array.from({ length: 9 }, (_, i) => ({ key: "s-" + i, type: "about", content: { title: "Title", description: "Text", images: [`https://example.com/${i}.png`] } })) }
  assert.throws(() => parse(tooMany), /8 unieke/)
})


test("image URLs cannot break out of native CSS url values", () => {
  assert.throws(() => parse({ ...example, sections: [{ key: "a", type: "hero", content: { title: "Title" }, styles: { backgroundImage: "https://example.com/a),url(https://other.example/b)" } }] }))
})
