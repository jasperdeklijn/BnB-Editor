import test from "node:test"
import assert from "node:assert/strict"
import { createRequire } from "node:module"
const require = createRequire(import.meta.url)
const load = require("../scripts/load-import-module.cjs")
const { parseImport } = load("lib/import/schema.ts")
const { createImportedDesign } = load("lib/import/create-design.ts")
const document = parseImport(JSON.stringify({ format: "flexpagina", version: 1, title: "Test", sections: [
  { key: "photos", type: "gallery", content: { title: "Photos", images: ["https://source.example/photo.png"] } },
] }))
function fixture({ uploadFailure = 0, rpcError = null, committed = false, lookupError = null } = {}) {
  const uploaded = [], removed = [], calls = []
  const bucket = {
    async upload(path) { uploaded.push(path); return { error: uploaded.length === uploadFailure ? { message: "fail" } : null } },
    async remove(paths) { removed.push(...paths); return { error: null } },
    getPublicUrl(path) { return { data: { publicUrl: "https://managed.example/" + path } } },
  }
  const query = { select() { return this }, eq() { return this }, async maybeSingle() { return { data: committed ? { id: "new-design" } : null, error: lookupError } } }
  return {
    uploaded, removed, calls,
    args: { db: { async rpc(name, args) { calls.push({ name, args }); return { error: rpcError } }, from() { return query } },
      storage: { storage: { from() { return bucket } } }, userId: "owner", designId: "new-design", document,
      download: async () => Buffer.from("source"), decode: async () => ({ original: Buffer.from("webp"), thumbnail: Buffer.from("thumb") }) },
  }
}
test("new native design and asset metadata use one RPC, no external payload/source remains", async () => {
  const f = fixture()
  assert.equal(await createImportedDesign(f.args), "new-design")
  assert.equal(f.calls.length, 1)
  assert.equal(f.calls[0].name, "create_imported_design")
  assert.ok(!JSON.stringify(f.calls).includes("source.example"))
  assert.ok(!JSON.stringify(f.calls).includes("flexpagina"))
  assert.equal(f.calls[0].args.p_assets.length, 1)
  assert.ok(f.uploaded.every((p) => p.startsWith("owner/")))
  assert.equal(f.removed.length, 0)
})
test("download and partial upload failures never create a design and clean allocated paths", async () => {
  const f = fixture()
  await assert.rejects(createImportedDesign({ ...f.args, download: async () => { throw new Error("secret URL") } }), (error) => !error.message.includes("secret"))
  assert.equal(f.calls.length, 0)
  const partial = fixture({ uploadFailure: 2 })
  await assert.rejects(createImportedDesign(partial.args))
  assert.equal(partial.calls.length, 0)
  assert.deepEqual(partial.removed, partial.uploaded)
})
test("transaction failure cleans assets; lost response preserves a committed draft", async () => {
  const failed = fixture({ rpcError: { code: "23514", message: "USER_IMAGE_QUOTA_EXCEEDED" } })
  await assert.rejects(createImportedDesign(failed.args), /50 MB/)
  assert.deepEqual(failed.removed, failed.uploaded)
  const committed = fixture({ rpcError: { code: "", message: "fetch failed" }, committed: true })
  assert.equal(await createImportedDesign(committed.args), "new-design")
  assert.deepEqual(committed.removed, [])
})
test("ambiguous commit with unavailable database never deletes possibly referenced assets", async () => {
  const f = fixture({ rpcError: { code: "", message: "network" }, lookupError: { message: "network" } })
  await assert.rejects(createImportedDesign(f.args))
  assert.deepEqual(f.removed, [])
})

