import type { SupabaseClient } from "@supabase/supabase-js"
import { isGifFile, isSupportedMediaFile, MAX_USER_GIF_SIZE, MAX_USER_VIDEO_SIZE, videoMime } from "./media"

export const USER_IMAGES_BUCKET = "user-images"
export const IMAGE_PREVIEW_WIDTH = 480
export const IMAGE_PREVIEW_HEIGHT = 320
export const MAX_USER_IMAGE_SIZE = 5 * 1024 * 1024
export const MAX_USER_IMAGE_TOTAL_SIZE = 500 * 1024 * 1024

// Leave room for the thumbnail and multipart fields within Vercel's 4.5 MB request limit.
const UPLOAD_IMAGE_TARGET_SIZE = 4_000_000
const UPLOAD_IMAGE_MAX_DIMENSION = 4_000

export async function prepareUserImage(file: File): Promise<File> {
  if (isGifFile(file)) {
    if (!file.size || file.size > MAX_USER_GIF_SIZE) throw new Error("Een GIF mag maximaal 20 MB zijn.")
    // Recompressing through canvas erases animation.
    return file
  }
  if (!file.type.startsWith("image/") || file.size === 0) {
    throw new Error("Kies een geldig afbeeldingsbestand.")
  }

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    throw new Error("De afbeelding kon niet worden gelezen. Kies een ander afbeeldingsbestand.")
  }
  const canvas = document.createElement("canvas")
  try {
    if (
      file.size <= UPLOAD_IMAGE_TARGET_SIZE &&
      bitmap.width <= UPLOAD_IMAGE_MAX_DIMENSION && bitmap.height <= UPLOAD_IMAGE_MAX_DIMENSION
    ) return file

    const context = canvas.getContext("2d")
    if (!context) throw new Error("Canvas is niet beschikbaar")
    const scale = Math.min(1, UPLOAD_IMAGE_MAX_DIMENSION / Math.max(bitmap.width, bitmap.height))
    let width = Math.max(1, Math.round(bitmap.width * scale))
    let height = Math.max(1, Math.round(bitmap.height * scale))

    while (true) {
      canvas.width = width
      canvas.height = height
      context.drawImage(bitmap, 0, 0, width, height)
      for (const quality of [0.9, 0.8, 0.7, 0.6]) {
        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob(
            (result) => result ? resolve(result) : reject(new Error("De afbeelding kon niet worden verkleind.")),
            "image/webp",
            quality,
          )
        })
        if (blob.size > 0 && blob.size <= UPLOAD_IMAGE_TARGET_SIZE) {
          const extension = blob.type === "image/webp" ? "webp" : "png"
          const name = file.name.replace(/\.[^.]+$/, "") || "afbeelding"
          return new File([blob], `${name}.${extension}`, { type: blob.type, lastModified: file.lastModified })
        }
      }
      if (width === 1 && height === 1) throw new Error("De afbeelding kon niet worden verkleind.")
      width = Math.max(1, Math.floor(width * 0.8))
      height = Math.max(1, Math.floor(height * 0.8))
    }
  } finally {
    bitmap.close()
    canvas.width = 0
    canvas.height = 0
  }
}

export interface UserImageAsset {
  id: string
  name: string
  originalPath: string
  thumbnailPath: string | null
  url: string
  previewUrl: string
  size: number
  storageSize: number
  createdAt: string
}

interface UserImageRow {
  id: string
  display_name: string
  original_path: string
  thumbnail_path: string | null
  original_size: number
  thumbnail_size: number
  created_at: string
}

const publicUrl = (supabase: SupabaseClient, path: string) =>
  supabase.storage.from(USER_IMAGES_BUCKET).getPublicUrl(path).data.publicUrl

export async function loadUserImages(supabase: SupabaseClient, userId: string): Promise<UserImageAsset[]> {
  const { data: rows, error } = await supabase
    .from("user_images")
    .select("id, display_name, original_path, thumbnail_path, original_size, thumbnail_size, created_at")
    .eq("user_id", userId)
    .eq("upload_status", "ready")
    .order("created_at", { ascending: false })

  if (error) throw error

  return ((rows ?? []) as UserImageRow[]).map((row) => {
    const url = publicUrl(supabase, row.original_path)
    return {
      id: row.id,
      name: row.display_name,
      originalPath: row.original_path,
      thumbnailPath: row.thumbnail_path,
      url,
      previewUrl: row.thumbnail_path ? publicUrl(supabase, row.thumbnail_path) : url,
      size: row.original_size,
      storageSize: row.original_size + row.thumbnail_size,
      createdAt: row.created_at,
    }
  })
}

export async function createCroppedImagePreview(file: File): Promise<Blob> {
  if (videoMime(file)) return createVideoPreview(file)
  const bitmap = await createImageBitmap(file)
  try {
    const canvas = document.createElement("canvas")
    canvas.width = IMAGE_PREVIEW_WIDTH
    canvas.height = IMAGE_PREVIEW_HEIGHT
    const context = canvas.getContext("2d")
    if (!context) throw new Error("Canvas is niet beschikbaar")

    const sourceRatio = bitmap.width / bitmap.height
    const targetRatio = IMAGE_PREVIEW_WIDTH / IMAGE_PREVIEW_HEIGHT
    let sourceWidth = bitmap.width
    let sourceHeight = bitmap.height
    let sourceX = 0
    let sourceY = 0

    if (sourceRatio > targetRatio) {
      sourceWidth = bitmap.height * targetRatio
      sourceX = (bitmap.width - sourceWidth) / 2
    } else {
      sourceHeight = bitmap.width / targetRatio
      sourceY = (bitmap.height - sourceHeight) / 2
    }

    context.drawImage(
      bitmap,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      IMAGE_PREVIEW_WIDTH,
      IMAGE_PREVIEW_HEIGHT,
    )

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Voorbeeld kon niet worden gemaakt"))),
        "image/webp",
        0.8,
      )
    })
  } finally {
    bitmap.close()
  }
}

async function createVideoPreview(file: File): Promise<Blob> {
  const player = document.createElement("video")
  const url = URL.createObjectURL(file)
  const canvas = document.createElement("canvas")
  canvas.width = IMAGE_PREVIEW_WIDTH; canvas.height = IMAGE_PREVIEW_HEIGHT
  try {
    player.muted = true; player.playsInline = true; player.preload = "auto"
    await new Promise<void>((resolve, reject) => {
      const timer = window.setTimeout(() => { player.onloadeddata = null; player.onerror = null; reject(new Error("De video kon niet worden gelezen. Gebruik MP4 (H.264) of WebM.")) }, 15000)
      player.onloadeddata = () => { window.clearTimeout(timer); resolve() }
      player.onerror = () => { window.clearTimeout(timer); reject(new Error("De video kon niet worden gelezen. Gebruik MP4 (H.264) of WebM.")) }
      player.src = url
    })
    const context = canvas.getContext("2d")
    if (!context || !player.videoWidth || !player.videoHeight) throw new Error("Videovoorbeeld kon niet worden gemaakt.")
    const ratio = Math.max(IMAGE_PREVIEW_WIDTH / player.videoWidth, IMAGE_PREVIEW_HEIGHT / player.videoHeight)
    const width = player.videoWidth * ratio, height = player.videoHeight * ratio
    context.drawImage(player, (IMAGE_PREVIEW_WIDTH - width) / 2, (IMAGE_PREVIEW_HEIGHT - height) / 2, width, height)
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Videovoorbeeld kon niet worden gemaakt.")), "image/webp", 0.8))
  } finally {
    player.pause(); player.removeAttribute("src"); player.load()
    URL.revokeObjectURL(url); canvas.width = 0; canvas.height = 0
  }
}

async function uploadDirectMedia(supabase: SupabaseClient, original: File, preview: Blob): Promise<UserImageAsset> {
  const mimeType = videoMime(original) ?? "image/gif"
  const request = async (body: Record<string, unknown>) => {
    const response = await fetch("/api/images/upload", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    const result = await response.json()
    if (!response.ok) throw new Error(result.error || "Uploaden is mislukt.")
    return result
  }
  const prepared = await request({ action: "prepare", name: original.name, mimeType, size: original.size, previewSize: preview.size })
  try {
    const storage = supabase.storage.from(USER_IMAGES_BUCKET)
    const body = original.type === mimeType ? original : new File([original], original.name, { type: mimeType, lastModified: original.lastModified })
    const originalResult = await storage.uploadToSignedUrl(prepared.original.path, prepared.original.token, body, { contentType: mimeType, cacheControl: "31536000" })
    if (originalResult.error) throw originalResult.error
    const previewResult = await storage.uploadToSignedUrl(prepared.preview.path, prepared.preview.token, preview, { contentType: "image/webp", cacheControl: "31536000" })
    if (previewResult.error) throw previewResult.error
    return await request({ action: "complete", id: prepared.id, extension: prepared.extension })
  } catch (error) {
    await request({ action: "cancel", id: prepared.id, extension: prepared.extension }).catch(() => {})
    throw error
  }
}

export async function uploadUserImage(
  supabase: SupabaseClient,
  _userId: string,
  file: File,
): Promise<UserImageAsset> {
  if (!isSupportedMediaFile(file) || file.size <= 0) throw new Error("Kies JPG, PNG, GIF, WebP, MP4 of WebM.")
  const video = videoMime(file)
  if (video && file.size > MAX_USER_VIDEO_SIZE) throw new Error("Een video mag maximaal 50 MB zijn.")
  const original = video ? file : await prepareUserImage(file)
  const preview = await createCroppedImagePreview(original)
  if (video || isGifFile(original) && original.size > UPLOAD_IMAGE_TARGET_SIZE) return uploadDirectMedia(supabase, original, preview)
  const form = new FormData()
  form.set("original", original)
  form.set("preview", new File([preview], "preview.webp", { type: "image/webp" }))
  const response = await fetch("/api/images/upload", { method: "POST", body: form })
  const payload = await response.json().catch(() => null) as (UserImageAsset & { error?: string }) | null
  if (!response.ok || !payload) throw new Error(payload?.error || "Uploaden is mislukt.")
  return payload
}
