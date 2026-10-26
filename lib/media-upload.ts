import "server-only"
import { z } from "zod"
import type { SupabaseClient } from "@supabase/supabase-js"
import { MAX_USER_GIF_SIZE, MAX_USER_VIDEO_SIZE, mediaPaths } from "./media"
import { inspectMedia } from "./server-media-validation"
import { inspectImage } from "./server-image-validation"
import { USER_IMAGES_BUCKET } from "./user-images"

const identity = { id: z.string().uuid(), extension: z.enum(["mp4", "webm", "gif"]) }
const requestSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("prepare"), name: z.string().min(1).max(255), mimeType: z.enum(["video/mp4", "video/webm", "image/gif"]), size: z.number().int().positive().max(MAX_USER_VIDEO_SIZE), previewSize: z.number().int().positive().max(1024 * 1024) }).strict(),
  z.object({ action: z.literal("complete"), ...identity }).strict(),
  z.object({ action: z.literal("cancel"), ...identity }).strict(),
])
type UploadRow = { id: string; display_name: string; original_path: string; thumbnail_path: string; original_size: number; thumbnail_size: number; created_at: string; upload_status: string }
const columns = "id, display_name, original_path, thumbnail_path, original_size, thumbnail_size, created_at, upload_status"

function asset(storage: SupabaseClient, row: UploadRow) {
  const bucket = storage.storage.from(USER_IMAGES_BUCKET)
  return { id: row.id, name: row.display_name, originalPath: row.original_path, thumbnailPath: row.thumbnail_path,
    url: bucket.getPublicUrl(row.original_path).data.publicUrl, previewUrl: bucket.getPublicUrl(row.thumbnail_path).data.publicUrl,
    size: row.original_size, storageSize: row.original_size + row.thumbnail_size, createdAt: row.created_at }
}

async function cancelPending(storage: SupabaseClient, userId: string, id: string) {
  const { data, error } = await storage.from("user_images").delete().eq("id", id).eq("user_id", userId).eq("upload_status", "pending").select("original_path, thumbnail_path")
  if (error) throw error
  // A completed upload cannot be removed by a late failure or retry.
  for (const row of data ?? []) {
    const { error: removeError } = await storage.storage.from(USER_IMAGES_BUCKET).remove([row.original_path, row.thumbnail_path])
    if (removeError) console.error("[images] Pending storage cleanup failed", { id })
  }
}

export async function handleMediaUpload(storage: SupabaseClient, userId: string, input: unknown) {
  const parsed = requestSchema.safeParse(input)
  if (!parsed.success) return { status: 400, body: { error: "Controleer het bestand en de uploadgegevens." } }
  const request = parsed.data
  if (request.action === "prepare") {
    if (request.mimeType === "image/gif" && request.size > MAX_USER_GIF_SIZE) return { status: 413, body: { error: "Een GIF mag maximaal 20 MB zijn." } }
    // Signed URLs expire after two hours. Reclaim abandoned reservations only
    // after that window, so their old tokens cannot recreate removed files.
    const expired = await storage.from("user_images").select("id").eq("user_id", userId).eq("upload_status", "pending").lt("created_at", new Date(Date.now() - 150 * 60_000).toISOString()).limit(30)
    if (expired.error) throw expired.error
    for (const row of expired.data ?? []) await cancelPending(storage, userId, row.id)
    const id = crypto.randomUUID()
    const extension = request.mimeType === "video/mp4" ? "mp4" : request.mimeType === "video/webm" ? "webm" : "gif"
    const paths = mediaPaths(userId, id, extension)
    const displayName = [...request.name].filter((character) => character.charCodeAt(0) > 31 && character.charCodeAt(0) !== 127).join("").trim().slice(0, 120) || `bestand.${extension}`
    // Reserve the full original+poster size under the existing atomic quota lock.
    const reserved = await storage.from("user_images").insert({ id, user_id: userId, display_name: displayName, original_path: paths.originalPath, thumbnail_path: paths.thumbnailPath, original_size: request.size, thumbnail_size: request.previewSize, upload_status: "pending" })
    if (reserved.error) {
      if (reserved.error.message.includes("USER_IMAGE_QUOTA_EXCEEDED")) return { status: 413, body: { error: "Je opslaglimiet van 500 MB is bereikt." } }
      throw reserved.error
    }
    const bucket = storage.storage.from(USER_IMAGES_BUCKET)
    const [original, preview] = await Promise.all([bucket.createSignedUploadUrl(paths.originalPath), bucket.createSignedUploadUrl(paths.thumbnailPath)])
    if (original.error || preview.error || !original.data || !preview.data) {
      await cancelPending(storage, userId, id)
      throw original.error || preview.error || new Error("Upload kon niet worden voorbereid.")
    }
    return { status: 201, body: { id, extension, original: { path: paths.originalPath, token: original.data.token }, preview: { path: paths.thumbnailPath, token: preview.data.token } } }
  }
  const paths = mediaPaths(userId, request.id, request.extension)
  const found = await storage.from("user_images").select(columns).eq("id", request.id).eq("user_id", userId).maybeSingle()
  if (found.error) throw found.error
  const row = found.data as UploadRow | null
  if (!row || row.original_path !== paths.originalPath || row.thumbnail_path !== paths.thumbnailPath) return { status: 404, body: { error: "Upload niet gevonden." } }
  if (request.action === "cancel") {
    await cancelPending(storage, userId, row.id)
    return { status: 200, body: { cancelled: row.upload_status === "pending" } }
  }
  if (row.upload_status === "ready") return { status: 200, body: asset(storage, row) }
  const bucket = storage.storage.from(USER_IMAGES_BUCKET)
  try {
    const [originalInfo, previewInfo] = await Promise.all([bucket.info(paths.originalPath), bucket.info(paths.thumbnailPath)])
    if (originalInfo.error || previewInfo.error) throw new Error("Het uploaden is nog niet afgerond.")
    if (originalInfo.data.size !== row.original_size || previewInfo.data.size !== row.thumbnail_size || row.original_size > MAX_USER_VIDEO_SIZE || row.thumbnail_size > 1024 * 1024) throw new Error("De bestandsgrootte komt niet overeen met de upload.")
    const [original, preview] = await Promise.all([bucket.download(paths.originalPath), bucket.download(paths.thumbnailPath)])
    if (original.error || preview.error || !original.data || !preview.data) throw new Error("De upload kon niet worden gelezen.")
    if (original.data.size !== row.original_size || preview.data.size !== row.thumbnail_size) throw new Error("De bestandsgrootte is gewijzigd.")
    const media = inspectMedia(new Uint8Array(await original.data.arrayBuffer()))
    const poster = inspectImage(new Uint8Array(await preview.data.arrayBuffer()))
    if (media.extension !== request.extension || originalInfo.data.contentType !== media.mimeType || (media.extension === "gif" && original.data.size > MAX_USER_GIF_SIZE)) throw new Error("De inhoud komt niet overeen met het gekozen bestandstype.")
    if (poster.mimeType !== "image/webp" || poster.width !== 480 || poster.height !== 320 || previewInfo.data.contentType !== "image/webp") throw new Error("Het bestandsvoorbeeld is ongeldig.")
    const completed = await storage.from("user_images").update({ upload_status: "ready" }).eq("id", row.id).eq("user_id", userId).eq("upload_status", "pending").select(columns).maybeSingle()
    if (completed.error) throw completed.error
    if (!completed.data) {
      const retry = await storage.from("user_images").select(columns).eq("id", row.id).eq("user_id", userId).eq("upload_status", "ready").maybeSingle()
      if (retry.error || !retry.data) throw new Error("De upload is geannuleerd.")
      return { status: 200, body: asset(storage, retry.data as UploadRow) }
    }
    return { status: 201, body: asset(storage, completed.data as UploadRow) }
  } catch (error) {
    await cancelPending(storage, userId, row.id)
    return { status: 400, body: { error: error instanceof Error ? error.message : "Het bestand is ongeldig." } }
  }
}
