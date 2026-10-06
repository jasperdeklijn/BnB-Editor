import type { SupabaseClient } from "@supabase/supabase-js"

export const USER_IMAGES_BUCKET = "user-images"
export const IMAGE_PREVIEW_WIDTH = 480
export const IMAGE_PREVIEW_HEIGHT = 320
export const MAX_USER_IMAGE_SIZE = 5 * 1024 * 1024
export const MAX_USER_IMAGE_TOTAL_SIZE = 500 * 1024 * 1024

// Leave room for the thumbnail and multipart fields within Vercel's 4.5 MB request limit.
const UPLOAD_IMAGE_TARGET_SIZE = 4_000_000
const UPLOAD_IMAGE_MAX_DIMENSION = 4_000

export async function prepareUserImage(file: File): Promise<File> {
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

export async function uploadUserImage(
  _supabase: SupabaseClient,
  _userId: string,
  file: File,
): Promise<UserImageAsset> {
  const original = await prepareUserImage(file)
  const preview = await createCroppedImagePreview(original)
  const form = new FormData()
  form.set("original", original)
  form.set("preview", new File([preview], "preview.webp", { type: "image/webp" }))
  const response = await fetch("/api/images/upload", { method: "POST", body: form })
  const payload = await response.json().catch(() => null) as (UserImageAsset & { error?: string }) | null
  if (!response.ok || !payload) throw new Error(payload?.error || "Uploaden is mislukt.")
  return payload
}
