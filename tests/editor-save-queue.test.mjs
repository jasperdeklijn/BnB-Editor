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

const { EditorSaveQueue } = loadTypeScriptModule("lib/editor-save-queue.ts")

test("flush runs a pending save immediately", async () => {
  const calls = []
  const queue = new EditorSaveQueue({ delay: 10_000 })
  queue.schedule("section-1", async () => calls.push("saved"))

  assert.equal(queue.pending, true)
  await queue.flush()
  assert.deepEqual(calls, ["saved"])
  assert.equal(queue.pending, false)
})

test("only the latest pending save for a section is kept", async () => {
  const calls = []
  const queue = new EditorSaveQueue({ delay: 10_000 })
  queue.schedule("section-1", async () => calls.push("old"))
  queue.schedule("section-1", async () => calls.push("latest"))

  await queue.flush()
  assert.deepEqual(calls, ["latest"])
})

test("flush reports save failures and leaves the queue idle", async () => {
  const errors = []
  const queue = new EditorSaveQueue({ delay: 10_000, onError: (error) => errors.push(error) })
  queue.schedule("section-1", async () => { throw new Error("database unavailable") })

  await assert.rejects(queue.flush(), /database unavailable/)
  assert.equal(errors.length, 1)
  assert.equal(queue.pending, false)
})

test("a failed save can be retried by flushing again", async () => {
  let attempts = 0
  const queue = new EditorSaveQueue({ delay: 10_000 })
  queue.schedule("section-1", async () => {
    attempts += 1
    if (attempts === 1) throw new Error("temporary failure")
  })

  await assert.rejects(queue.flush(), /temporary failure/)
  await queue.flush()
  assert.equal(attempts, 2)
})

test("publishing after flush observes the newest draft", async () => {
  let storedDraft = "old"
  const queue = new EditorSaveQueue({ delay: 10_000 })
  queue.schedule("section-1", async () => { storedDraft = "new" })

  await queue.flush()
  const publishedSnapshot = storedDraft
  assert.equal(publishedSnapshot, "new")
})
