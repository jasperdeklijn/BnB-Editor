import { NextRequest, NextResponse } from "next/server"

import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit"
import { inspectImage } from "@/lib/server-image-validation"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { MAX_USER_IMAGE_SIZE, USER_IMAGES_BUCKET } from "@/lib/user-images"

const MAX_PREVIEW_SIZE = 1024 * 1024

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const limit = await checkRateLimit(getRateLimitKey(request, `image_upload:${user.id}`), 30, 60 * 60 * 1000)
  if (!limit.allowed) return NextResponse.json({ error: "Te veel uploads. Probeer het later opnieuw." }, { status: 429 })

  try {
    const storage = await createAdminClient()
    const form = await request.formData()
    const original = form.get("original")
    const preview = form.get("preview")
    if (!(original instanceof File) || !(preview instanceof File)) {
      return NextResponse.json({ error: "Afbeelding en voorbeeld ontbreken." }, { status: 400 })
    }
    if (original.size <= 0 || original.size > MAX_USER_IMAGE_SIZE || preview.size <= 0 || preview.size > MAX_PREVIEW_SIZE) {
      return NextResponse.json({ error: "De afbeelding mag maximaal 5 MB zijn." }, { status: 413 })
    }

    const originalBytes = new Uint8Array(await original.arrayBuffer())
    const previewBytes = new Uint8Array(await preview.arrayBuffer())
    let originalInfo
    let previewInfo
    try {
      originalInfo = inspectImage(originalBytes)
      previewInfo = inspectImage(previewBytes)
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : "Ongeldige afbeelding." }, { status: 400 })
    }
    if (previewInfo.mimeType !== "image/webp" || previewInfo.width !== 480 || previewInfo.height !== 320) {
      return NextResponse.json({ error: "Het afbeeldingsvoorbeeld is ongeldig." }, { status: 400 })
    }

    const imageId = crypto.randomUUID()
    const originalPath = `${user.id}/originals/${imageId}.${originalInfo.extension}`
    const thumbnailPath = `${user.id}/thumbnails/${imageId}.webp`
    const displayName = [...original.name]
      .filter((character) => character.charCodeAt(0) > 31 && character.charCodeAt(0) !== 127)
      .join("")
      .trim()
      .slice(0, 120) || `afbeelding.${originalInfo.extension}`

    const { error: originalError } = await storage.storage.from(USER_IMAGES_BUCKET).upload(originalPath, originalBytes, {
      contentType: originalInfo.mimeType,
      cacheControl: "31536000",
      upsert: false,
    })
    if (originalError) throw originalError

    const { error: previewError } = await storage.storage.from(USER_IMAGES_BUCKET).upload(thumbnailPath, previewBytes, {
      contentType: "image/webp",
      cacheControl: "31536000",
      upsert: false,
    })
    if (previewError) {
      await storage.storage.from(USER_IMAGES_BUCKET).remove([originalPath])
      throw previewError
    }

    const { error: metadataError } = await storage.from("user_images").insert({
      id: imageId,
      user_id: user.id,
      display_name: displayName,
      original_path: originalPath,
      thumbnail_path: thumbnailPath,
      original_size: original.size,
      thumbnail_size: preview.size,
    })
    if (metadataError) {
      await storage.storage.from(USER_IMAGES_BUCKET).remove([originalPath, thumbnailPath])
      const quotaExceeded = metadataError.message.includes("USER_IMAGE_QUOTA_EXCEEDED")
      return NextResponse.json(
        { error: quotaExceeded ? "Je opslaglimiet van 50 MB is bereikt." : "Afbeelding kon niet worden geregistreerd." },
        { status: quotaExceeded ? 413 : 500 },
      )
    }

    const url = storage.storage.from(USER_IMAGES_BUCKET).getPublicUrl(originalPath).data.publicUrl
    const previewUrl = storage.storage.from(USER_IMAGES_BUCKET).getPublicUrl(thumbnailPath).data.publicUrl
    return NextResponse.json({
      id: imageId,
      name: displayName,
      originalPath,
      thumbnailPath,
      url,
      previewUrl,
      size: original.size,
      storageSize: original.size + preview.size,
      createdAt: new Date().toISOString(),
    }, { status: 201 })
  } catch (error) {
    console.error("[images] Upload failed", error)
    return NextResponse.json({ error: "Uploaden is mislukt. Probeer het later opnieuw." }, { status: 500 })
  }
}
