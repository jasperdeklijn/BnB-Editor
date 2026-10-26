import assert from "node:assert/strict"
import test from "node:test"
import { createRequire } from "node:module"
import { readFileSync } from "node:fs"
import { fixture } from "./helpers/website-pages-fixture.mjs"

const load = createRequire(import.meta.url)("../scripts/load-import-module.cjs")
const { inspectMedia } = load("lib/server-media-validation.ts")
const { handleMediaUpload } = load("lib/media-upload.ts")
const { isVideoSource, mediaPaths, MAX_USER_VIDEO_SIZE } = load("lib/media.ts")
const owner = "00000000-0000-0000-0000-000000000001"
const other = "00000000-0000-0000-0000-000000000002"
function box(type, body) { const result = Buffer.alloc(8 + body.length); result.writeUInt32BE(result.length); result.write(type, 4); Buffer.from(body).copy(result, 8); return result }
const video = Buffer.concat([box("ftyp", Buffer.from("isom\0\0\0\0iso2")), box("moov", Buffer.from("hdlr\0vide")), box("mdat", Buffer.from([1, 2, 3]))])
function poster() {
  const bytes = new Uint8Array(30)
  bytes.set(new TextEncoder().encode("RIFF")); bytes.set(new TextEncoder().encode("WEBPVP8X"), 8)
  bytes[24] = 479 & 255; bytes[25] = 479 >> 8; bytes[27] = 319 & 255; bytes[28] = 319 >> 8
  return bytes
}

function mockStorage(db) {
  const files = new Map()
  const signed = []
  const bucket = {
    getPublicUrl: (path) => ({ data: { publicUrl: `https://storage.example.test/${path}` } }),
    createSignedUploadUrl: async (path) => { signed.push(path); return { data: { path, token: `signed:${path}` }, error: null } },
    info: async (path) => files.has(path) ? { data: { size: files.get(path).size, contentType: files.get(path).type }, error: null } : { data: null, error: new Error("missing") },
    download: async (path) => ({ data: files.get(path) ?? null, error: files.has(path) ? null : new Error("missing") }),
    remove: async (paths) => { paths.forEach((path) => files.delete(path)); return { error: null } },
  }
  return { files, signed, storage: { from: () => bucket }, from(table) {
    assert.equal(table, "user_images")
    let operation = "select", payload, selected = "*", max, single = false
    const filters = []
    const query = {
      select(columns = "*") { selected = columns; return query },
      insert(row) { operation = "insert"; payload = row; return query },
      update(row) { operation = "update"; payload = row; return query },
      delete() { operation = "delete"; return query },
      eq(key, value) { filters.push([key, "=", value]); return query },
      lt(key, value) { filters.push([key, "<", value]); return query },
      limit(count) { max = count; return query },
      maybeSingle() { single = true; return query },
      then(resolve, reject) {
        const values = []
        const parameter = (value) => { values.push(value); return `$${values.length}` }
        let sql
        if (operation === "insert") sql = `insert into user_images (${Object.keys(payload).join(",")}) values (${Object.values(payload).map(parameter).join(",")}) returning ${selected}`
        else {
          const prefix = operation === "update" ? `update user_images set ${Object.entries(payload).map(([key, value]) => `${key}=${parameter(value)}`).join(",")}` : operation === "delete" ? "delete from user_images" : `select ${selected} from user_images`
          sql = prefix + (filters.length ? ` where ${filters.map(([key, op, value]) => `${key}${op}${parameter(value)}`).join(" and ")}` : "")
          if (operation === "select" && max) sql += ` limit ${max}`
          if (operation !== "select") sql += ` returning ${selected}`
        }
        return db.query(sql, values).then(({ rows }) => ({ data: single ? rows[0] ?? null : rows, error: null })).catch((error) => ({ data: null, error })).then(resolve, reject)
      },
    }
    return query
  } }
}

test("video detection is path-based and server signatures reject disguised or incomplete files", () => {
  assert.equal(isVideoSource("https://cdn.test/clip.MP4?token=one"), true)
  assert.equal(isVideoSource("https://cdn.test/photo.jpg?name=clip.mp4"), false)
  assert.equal(isVideoSource("/animatie.gif"), false)
  assert.deepEqual(inspectMedia(video), { mimeType: "video/mp4", extension: "mp4" })
  assert.throws(() => inspectMedia(video.slice(0, 28)))
  assert.throws(() => inspectMedia(Buffer.from("<script>video/mp4</script>")))
  const audio = Buffer.from(video); audio.write("soun", audio.indexOf("vide"))
  assert.throws(() => inspectMedia(audio), /videospoor/)
  assert.throws(() => mediaPaths(owner, "../../other", "mp4"), /Ongeldige/)
})

test("the real metadata/quota database reserves, validates and completes video uploads in the existing library", async () => {
  const db = await fixture()
  const storage = mockStorage(db)
  try {
    await db.exec("reset role")
    const before = (await db.query("select * from storage.buckets where id='user-images'")).rows[0]
    assert.equal(Number(before.file_size_limit), MAX_USER_VIDEO_SIZE)
    assert.ok(before.allowed_mime_types.includes("video/mp4"))
    await db.exec("set role authenticated")
    const prepare = async () => handleMediaUpload(storage, owner, { action: "prepare", name: "Rondleiding.mp4", mimeType: "video/mp4", size: video.length, previewSize: poster().length })
    const first = await prepare()
    assert.equal(first.status, 201)
    assert.equal(storage.signed.length, 2)
    assert.ok(storage.signed.every((path) => path.startsWith(owner + "/")))
    assert.equal((await db.query("select count(*)::int as count from user_images where upload_status='ready'")).rows[0].count, 0)
    assert.equal((await db.query("select upload_status from user_images where id=$1", [first.body.id])).rows[0].upload_status, "pending")
    const identity = { id: first.body.id, extension: "mp4" }
    assert.equal((await handleMediaUpload(storage, other, { action: "complete", ...identity })).status, 404)
    storage.files.set(first.body.original.path, new Blob([video], { type: "video/mp4" }))
    storage.files.set(first.body.preview.path, new Blob([poster()], { type: "image/webp" }))
    const completed = await handleMediaUpload(storage, owner, { action: "complete", ...identity })
    assert.equal(completed.status, 201)
    assert.equal(completed.body.size, video.length)
    assert.equal(completed.body.storageSize, video.length + poster().length)
    assert.match(completed.body.url, /\.mp4$/)
    assert.match(completed.body.previewUrl, /\.webp$/)
    assert.equal((await handleMediaUpload(storage, owner, { action: "complete", ...identity })).status, 200)
    assert.equal((await handleMediaUpload(storage, owner, { action: "cancel", ...identity })).body.cancelled, false)
    assert.ok(storage.files.has(first.body.original.path))
    const second = await prepare()
    storage.files.set(second.body.original.path, new Blob([Buffer.alloc(video.length)], { type: "video/mp4" }))
    storage.files.set(second.body.preview.path, new Blob([poster()], { type: "image/webp" }))
    assert.equal((await handleMediaUpload(storage, owner, { action: "complete", id: second.body.id, extension: "mp4" })).status, 400)
    assert.equal(storage.files.has(second.body.original.path), false)
    assert.equal((await db.query("select count(*)::int as count from user_images where id=$1", [second.body.id])).rows[0].count, 0)
    const cancelled = await prepare()
    assert.equal((await handleMediaUpload(storage, owner, { action: "cancel", id: cancelled.body.id, extension: "mp4" })).body.cancelled, true)
    assert.equal((await handleMediaUpload(storage, owner, { action: "prepare", name: "big.mp4", mimeType: "video/mp4", size: MAX_USER_VIDEO_SIZE + 1, previewSize: 30 })).status, 400)
    // The same lock/trigger counts pending bytes before signed URLs are issued.
    await db.query("update user_images set original_size=524288000-thumbnail_size where id=$1", [first.body.id])
    const signedCount = storage.signed.length
    assert.equal((await prepare()).status, 413)
    assert.equal(storage.signed.length, signedCount)
    // Reapplying the additive migration preserves completed records and RLS.
    await db.exec("reset role")
    await db.exec(readFileSync("supabase/migrations/20261026112323_image_library_video_gif.sql", "utf8"))
    assert.equal((await db.query("select upload_status from user_images where id=$1", [first.body.id])).rows[0].upload_status, "ready")
    assert.equal((await db.query("select relrowsecurity from pg_class where oid='public.user_images'::regclass")).rows[0].relrowsecurity, true)
  } finally { await db.close() }
})
