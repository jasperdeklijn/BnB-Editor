import assert from "node:assert/strict"
import fs from "node:fs"
import { createRequire } from "node:module"
import test from "node:test"

const require = createRequire(import.meta.url)
const { getSectionDecoration, getSectionDecorationVars, SECTION_DECORATION_OPTIONS } = require("../scripts/load-import-module.cjs")("lib/section-decorations.ts")

test("existing decorated sections keep their original assets, size and opacity", () => {
  const paint = getSectionDecorationVars({ styleType: "paint" })
  assert.match(paint["--section-decoration-image"], /paint-splatter\.svg/)
  assert.equal(paint["--section-decoration-size"], "clamp(200px, 36vw, 480px), clamp(180px, 30vw, 400px)")
  assert.equal(paint["--section-decoration-opacity"], 0.16)
  const pattern = getSectionDecorationVars({ styleType: "pattern" })
  assert.equal(pattern["--section-decoration-image"], "url('/section-decorations/pattern.svg')")
  assert.equal(pattern["--section-decoration-size"], "48px 48px")
  assert.equal(pattern["--section-decoration-opacity"], 0.12)
  assert.deepEqual(getSectionDecorationVars({ styleType: "clean", decorationVariant: "brush" }), {})
})

test("switching style groups and invalid saved settings fall back safely", () => {
  assert.equal(getSectionDecoration({ styleType: "pattern", decorationVariant: "brush" }).option.value, "arches")
  assert.equal(getSectionDecoration({ styleType: "paint", decorationVariant: "dots" }).option.value, "splatter")
  for (const input of ["https://outside.example/image.svg", "../../file", {}, null]) {
    const vars = getSectionDecorationVars({ styleType: "paint", decorationVariant: input })
    assert.match(vars["--section-decoration-image"], /paint-splatter\.svg/)
  }
  for (const invalid of [NaN, Infinity, "100", null, {}]) {
    const result = getSectionDecoration({ styleType: "pattern", decorationScale: invalid, decorationOpacity: invalid })
    assert.equal(result.scale, 100)
    assert.equal(result.opacity, 12)
  }
  const limited = getSectionDecoration({ styleType: "paint", decorationScale: -20, decorationOpacity: 100 })
  assert.equal(limited.scale, 50)
  assert.equal(limited.opacity, 40)
  // Keep smaller paint shapes partially visible instead of shifting them off-canvas.
  assert.equal(getSectionDecorationVars({ styleType: "paint", decorationScale: 50 })["--section-decoration-position"], "left -50px top -50px, right -40px bottom -55px")
})

test("settings survive JSON save/reload, including a completely hidden decoration", () => {
  const saved = JSON.parse(JSON.stringify({ styleType: "pattern", decorationVariant: "waves", decorationScale: 150, decorationOpacity: 0 }))
  const vars = getSectionDecorationVars(saved)
  assert.match(vars["--section-decoration-image"], /pattern-waves\.svg/)
  assert.equal(vars["--section-decoration-size"], "72px 72px")
  assert.equal(vars["--section-decoration-opacity"], 0)
})

test("all selectable variants have distinct local SVGs without external dependencies", () => {
  const files = Object.values(SECTION_DECORATION_OPTIONS).flat().map((option) => option.file)
  assert.equal(new Set(files).size, files.length)
  for (const file of files) {
    const svg = fs.readFileSync(`public/section-decorations/${file}`, "utf8")
    assert.match(svg, /<svg[^>]+viewBox=/)
    assert.doesNotMatch(svg, /<script|<foreignObject|href=|onload=/i)
  }
})
