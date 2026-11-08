import assert from "node:assert/strict"
import test from "node:test"
import { z } from "zod"
import { createRequire } from "node:module"
const load = createRequire(import.meta.url)("../scripts/load-import-module.cjs")
const { parseImport } = load("lib/import/schema.ts")

test("oversized constrained arrays are rejected before element validation", () => {
  let visited = 0
  const schema = z.array(z.unknown().transform(() => { visited++; return true })).max(8)
  const result = schema.safeParse(Array(100_000).fill(null))
  assert.equal(result.success, false)
  assert.equal(visited, 0)
  assert.equal(result.error.issues.length, 1)
  assert.equal(result.error.issues[0].code, "too_big")
})

test("Zod upgrade preserves import theme defaults and redacts invalid option values", () => {
  const design = { format: "flexpagina", version: 1, title: "Security regression", sections: [{ key: "hero", type: "hero", content: { title: "Welcome" } }] }
  const parsed = parseImport(JSON.stringify(design))
  assert.equal(parsed.theme.spacing, "comfortable")
  assert.equal(parsed.theme.radius, "medium")
  assert.throws(() => parseImport(JSON.stringify({ ...design, sections: [{ ...design.sections[0], content: { title: "Welcome", layout: "<private-payload>" } }] })), (error) => {
    assert.doesNotMatch(error.message, /private-payload/)
    return true
  })
})
