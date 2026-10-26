import assert from "node:assert/strict"
import { createRequire } from "node:module"
import test from "node:test"
const require = createRequire(import.meta.url)
const { prepareUserImage, uploadUserImage, MAX_USER_IMAGE_SIZE, MAX_USER_IMAGE_TOTAL_SIZE } = require("../scripts/load-import-module.cjs")("lib/user-images.ts")

function browserFixture(t, { width = 1200, height = 800, encode } = {}) {
  const canvases = [], encodings = []
  let closed = 0
  const originalBitmap = globalThis.createImageBitmap, originalDocument = globalThis.document
  globalThis.createImageBitmap = async () => ({ width, height, close: () => closed++ })
  globalThis.document = { createElement: () => {
    const canvas = { width: 0, height: 0,
      getContext: () => ({ drawImage() {} }),
      toBlob(callback, type, quality) {
        const call = { width: canvas.width, height: canvas.height, quality }
        encodings.push(call)
        callback(encode ? encode(call) : new Blob([new Uint8Array(100)], { type }))
      },
    }
    canvases.push(canvas)
    return canvas
  } }
  t.after(() => {
    globalThis.createImageBitmap = originalBitmap
    globalThis.document = originalDocument
  })
  return { canvases, encodings, closed: () => closed }
}

test("small originals are preserved byte-for-byte and decoded resources are released", async (t) => {
  const browser = browserFixture(t)
  const file = new File(["unchanged"], "foto.png", { type: "image/png" })
  assert.equal(await prepareUserImage(file), file)
  assert.equal(browser.encodings.length, 0)
  assert.equal(browser.closed(), 1)
})

test("files above 5 MB are compressed before sending the original and cropped preview", async (t) => {
  const browser = browserFixture(t, { width: 6000, height: 4000 })
  const file = new File([new Uint8Array(8 * 1024 * 1024)], "vakantie.png", { type: "image/png" })
  t.mock.method(globalThis, "fetch", async (url, { body }) => {
    assert.equal(url, "/api/images/upload")
    const original = body.get("original"), preview = body.get("preview")
    assert.ok(original.size <= MAX_USER_IMAGE_SIZE)
    assert.equal(original.name, "vakantie.webp")
    assert.equal(original.type, "image/webp")
    assert.equal(preview.type, "image/webp")
    assert.ok((await new Response(body).arrayBuffer()).byteLength < 4_500_000)
    return Response.json({ id: "uploaded" }, { status: 201 })
  })
  assert.equal((await uploadUserImage(null, "owner", file)).id, "uploaded")
  assert.deepEqual(browser.encodings.map(({ width, height }) => [width, height]), [[4000, 2667], [480, 320]])
  assert.equal(browser.closed(), 2)
})

test("incompressible images reduce quality and dimensions until the encoded size fits", async (t) => {
  const browser = browserFixture(t, { width: 4000, height: 2000, encode: ({ width }) =>
    new Blob([new Uint8Array(width === 4000 ? 6_000_000 : 3_900_000)], { type: "image/webp" }) })
  const file = new File([new Uint8Array(6_000_000)], "foto.jpg", { type: "image/jpeg" })
  const result = await prepareUserImage(file)
  assert.ok(result.size <= MAX_USER_IMAGE_SIZE)
  assert.deepEqual(browser.encodings.map(({ width, height, quality }) => [width, height, quality]), [
    [4000, 2000, 0.9], [4000, 2000, 0.8], [4000, 2000, 0.7], [4000, 2000, 0.6], [3200, 1600, 0.9],
  ])
  assert.equal(browser.closed(), 1)
  assert.equal(browser.canvases[0].width, 0)
})

test("small files with oversized dimensions are also resized; invalid input fails without an upload", async (t) => {
  const browser = browserFixture(t, { width: 10000, height: 5000 })
  assert.equal((await prepareUserImage(new File(["image"], "wide.png", { type: "image/png" }))).type, "image/webp")
  assert.equal(browser.encodings[0].width, 4000)
  await assert.rejects(prepareUserImage(new File([], "empty.png", { type: "image/png" })), /geldig/)
  await assert.rejects(prepareUserImage(new File(["text"], "text.txt", { type: "text/plain" })), /geldig/)
  globalThis.createImageBitmap = async () => { throw new Error("Decode failed") }
  await assert.rejects(prepareUserImage(new File(["bad"], "bad.png", { type: "image/png" })), /niet worden gelezen/)
})

test("account image storage is 500 MiB while stored files remain at most 5 MiB", () => {
  assert.equal(MAX_USER_IMAGE_TOTAL_SIZE, 500 * 1024 * 1024)
  assert.equal(MAX_USER_IMAGE_SIZE, 5 * 1024 * 1024)
})

test("GIF originals bypass recompression so every animation frame survives unchanged", async (t) => {
  const browser = browserFixture(t, { width: 6000, height: 4000 })
  const file = new File([new Uint8Array(6_000_000)], "animatie.gif", { type: "image/gif" })
  assert.equal(await prepareUserImage(file), file)
  assert.equal(browser.encodings.length, 0)
  assert.equal(browser.closed(), 0)
  await assert.rejects(prepareUserImage(new File([new Uint8Array(21 * 1024 * 1024)], "groot.gif", { type: "image/gif" })), /20 MB/)
})

test("videos upload originals and posters directly while only small JSON requests reach the existing API", async (t) => {
  const browser = browserFixture(t)
  const originalCreate = globalThis.document.createElement
  const originalWindow = globalThis.window
  let released = false
  globalThis.window = { setTimeout, clearTimeout }
  globalThis.document.createElement = (tag) => tag === "video" ? {
    videoWidth: 1920, videoHeight: 1080,
    set src(_value) { queueMicrotask(() => this.onloadeddata?.()) },
    pause() { released = true }, removeAttribute() {}, load() {},
  } : originalCreate(tag)
  t.after(() => { globalThis.window = originalWindow })
  const file = new File([new Uint8Array(6_000_000)], "video.mp4")
  const uploaded = []
  const actions = []
  const supabase = { storage: { from: (bucket) => { assert.equal(bucket, "user-images"); return { uploadToSignedUrl: async (path, token, body) => { uploaded.push({ path, token, body }); return { error: null } } } } } }
  t.mock.method(globalThis, "fetch", async (url, { body, headers }) => {
    assert.equal(url, "/api/images/upload")
    assert.equal(headers["Content-Type"], "application/json")
    assert.ok(body.length < 4096)
    const input = JSON.parse(body); actions.push(input.action)
    if (input.action === "prepare") return Response.json({ id: "video-id", extension: "mp4", original: { path: "owner/original.mp4", token: "original-token" }, preview: { path: "owner/preview.webp", token: "preview-token" } })
    return Response.json({ id: "video-id" })
  })
  assert.equal((await uploadUserImage(supabase, "owner", file)).id, "video-id")
  assert.deepEqual(actions, ["prepare", "complete"])
  assert.equal(uploaded[0].body.size, file.size)
  assert.equal(uploaded[0].body.type, "video/mp4")
  assert.equal(uploaded[1].body.type, "image/webp")
  assert.equal(browser.encodings.length, 1)
  assert.equal(released, true)
})
