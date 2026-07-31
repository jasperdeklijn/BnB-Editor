import type { SupabaseClient } from "@supabase/supabase-js"

export const USER_IMAGES_BUCKET = "user-images"
export const IMAGE_PREVIEW_WIDTH = 480
export const IMAGE_PREVIEW_HEIGHT = 320
export const MAX_USER_IMAGE_SIZE = 5 * 1024 * 1024
export const MAX_USER_IMAGE_TOTAL_SIZE = 50 * 1024 * 1024

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
  supabase: SupabaseClient,
  userId: string,
  file: File,
): Promise<UserImageAsset> {
  if (!file.type.startsWith("image/")) throw new Error("Kies een geldig afbeeldingsbestand.")
  if (file.size > MAX_USER_IMAGE_SIZE) throw new Error("De afbeelding mag maximaal 5 MB zijn.")

  const preview = await createCroppedImagePreview(file)
  const imageId = crypto.randomUUID()
  const extension = file.name.split(".").pop()?.replace(/[^a-zA-Z0-9]/g, "").toLowerCase() || "bin"
  const originalPath = `${userId}/originals/${imageId}.${extension}`
  const thumbnailPath = `${userId}/thumbnails/${imageId}.webp`

  const { error: originalError } = await supabase.storage
    .from(USER_IMAGES_BUCKET)
    .upload(originalPath, file, { cacheControl: "31536000", upsert: false })
  if (originalError) throw originalError

  const { error: thumbnailError } = await supabase.storage
    .from(USER_IMAGES_BUCKET)
    .upload(thumbnailPath, preview, { contentType: "image/webp", cacheControl: "31536000", upsert: false })
  if (thumbnailError) {
    await supabase.storage.from(USER_IMAGES_BUCKET).remove([originalPath])
    throw thumbnailError
  }

  const { error: metadataError } = await supabase.from("user_images").insert({
    id: imageId,
    user_id: userId,
    display_name: file.name,
    original_path: originalPath,
    thumbnail_path: thumbnailPath,
    original_size: file.size,
    thumbnail_size: preview.size,
  })
  if (metadataError) {
    await supabase.storage.from(USER_IMAGES_BUCKET).remove([originalPath, thumbnailPath])
    throw metadataError
  }

  const url = publicUrl(supabase, originalPath)
  return {
    id: imageId,
    name: file.name,
    originalPath,
    thumbnailPath,
    url,
    previewUrl: publicUrl(supabase, thumbnailPath),
    size: file.size,
    storageSize: file.size + preview.size,
    createdAt: new Date().toISOString(),
  }
}
