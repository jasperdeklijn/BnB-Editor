import type { SupabaseClient } from "@supabase/supabase-js"

export const USER_IMAGES_BUCKET = "user-images"
export const IMAGE_PREVIEW_WIDTH = 480
export const IMAGE_PREVIEW_HEIGHT = 320

export interface UserImageAsset {
  id: string | null
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

const isLegacyLibraryFile = (file: { id?: string | null; name: string; metadata?: Record<string, unknown> | null }) =>
  Boolean(file.id && file.metadata) &&
  file.name !== ".emptyFolderPlaceholder" &&
  !/^avatar(?:\.|$)/i.test(file.name)

const publicUrl = (supabase: SupabaseClient, path: string) =>
  supabase.storage.from(USER_IMAGES_BUCKET).getPublicUrl(path).data.publicUrl

/** Load managed image records plus legacy flat-folder uploads during migration. */
export async function loadUserImages(supabase: SupabaseClient, userId: string): Promise<UserImageAsset[]> {
  const [{ data: rows }, { data: legacyFiles, error: storageError }] = await Promise.all([
    supabase
      .from("user_images")
      .select("id, display_name, original_path, thumbnail_path, original_size, thumbnail_size, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    supabase.storage.from(USER_IMAGES_BUCKET).list(userId, {
      limit: 100,
      sortBy: { column: "created_at", order: "desc" },
    }),
  ])

  if (storageError && !rows) throw storageError

  const managed = ((rows ?? []) as UserImageRow[]).map((row) => {
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

  const managedPaths = new Set(managed.map((image) => image.originalPath))
  const legacy = (legacyFiles ?? [])
    .filter(isLegacyLibraryFile)
    .map((file) => {
      const originalPath = `${userId}/${file.name}`
      const size = typeof file.metadata?.size === "number" ? file.metadata.size : 0
      const url = publicUrl(supabase, originalPath)
      return {
        id: null,
        name: file.name,
        originalPath,
        thumbnailPath: null,
        url,
        previewUrl: url,
        size,
        storageSize: size,
        createdAt: file.created_at ?? "",
      }
    })
    .filter((image) => !managedPaths.has(image.originalPath))

  return [...managed, ...legacy]
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
