import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import test from "node:test"
import ts from "typescript"

const sourcePath = path.resolve("lib/server-image-validation.ts")
const source = fs.readFileSync(sourcePath, "utf8")
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  fileName: sourcePath,
})
const module = { exports: {} }
Function("module", "exports", "require", compiled.outputText)(module, module.exports, (specifier) => {
  if (specifier === "server-only") return {}
  throw new Error(`Unexpected import: ${specifier}`)
})

const { inspectImage } = module.exports

function pngHeader(width, height) {
  const bytes = new Uint8Array(24)
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10])
  const view = new DataView(bytes.buffer)
  view.setUint32(16, width)
  view.setUint32(20, height)
  return bytes
}

test("server image validation trusts file signatures instead of claimed MIME types", () => {
  assert.deepEqual(inspectImage(pngHeader(1200, 800)), {
    mimeType: "image/png",
    extension: "png",
    width: 1200,
    height: 800,
  })
  assert.throws(() => inspectImage(new TextEncoder().encode("<svg onload=alert(1)></svg>")), /geen ondersteunde/)
})

test("server image validation rejects decompression-sized dimensions", () => {
  assert.throws(() => inspectImage(pngHeader(8000, 8000)), /afmetingen/)
})
