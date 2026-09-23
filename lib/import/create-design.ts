import "server-only"
import type { SupabaseClient } from "@supabase/supabase-js"
import { getImportImages, normalizeImport, replaceImportImages, type ImportDocument } from "./schema"
import { decodeImportImage, fetchRemoteImage, MAX_REMOTE_TOTAL_BYTES } from "./remote-images"
import { USER_IMAGES_BUCKET } from "../user-images"

type Dependencies = {
  db: SupabaseClient
  storage: SupabaseClient
  userId: string
  designId: string
  document: ImportDocument
  download?: typeof fetchRemoteImage
  decode?: typeof decodeImportImage
}
export async function createImportedDesign({ db, storage, userId, designId, document, download = fetchRemoteImage, decode = decodeImportImage }: Dependencies) {
  const paths: string[] = []
  const assets: Array<Record<string, unknown>> = []
  const urls = new Map<string, string>()
  let rpcStarted = false
  const signal = AbortSignal.timeout(45000)
  const bucket = storage.storage.from(USER_IMAGES_BUCKET)
  async function cleanup() {
    if (!paths.length) return
    const { error } = await bucket.remove(paths)
    if (error) console.error("[import] Asset cleanup failed", { count: paths.length })
  }
  try {
    let total = 0
    // Sequential work bounds concurrency to one download and one decoder.
    for (const [index, source] of getImportImages(document).entries()) {
      try {
        signal.throwIfAborted()
        const bytes = await download(source, signal)
        total += bytes.length
        if (total > MAX_REMOTE_TOTAL_BYTES) throw new Error("Afbeeldingen zijn samen groter dan 20 MB.")
        const { original, thumbnail } = await decode(bytes)
        signal.throwIfAborted()
        const id = crypto.randomUUID()
        const originalPath = `${userId}/originals/${id}.webp`
        const thumbnailPath = `${userId}/thumbnails/${id}.webp`
        for (const [path, data] of [[originalPath, original], [thumbnailPath, thumbnail]] as const) {
          // Record paths before upload, including an ambiguous failed upload, for cleanup.
          paths.push(path)
          const { error } = await bucket.upload(path, data, { contentType: "image/webp", upsert: false, cacheControl: "31536000" })
          if (error) throw new Error("Opslaan van de afbeelding is mislukt.")
        }
        assets.push({ id, display_name: `Import afbeelding ${index + 1}`, original_path: originalPath,
          thumbnail_path: thumbnailPath, original_size: original.length, thumbnail_size: thumbnail.length })
        urls.set(source, bucket.getPublicUrl(originalPath).data.publicUrl)
      } catch {
        // No source URL, response body, or customer text in errors/logs.
        throw new Error(`Afbeelding ${index + 1} kon niet worden geïmporteerd. Controleer de openbare URL, het formaat en de limieten; probeer opnieuw of annuleer.`)
      }
    }
    signal.throwIfAborted()
    const design = normalizeImport(replaceImportImages(document, urls), () => crypto.randomUUID())
    rpcStarted = true
    const { error } = await db.rpc("create_imported_design", {
      p_design_id: designId, p_title: design.title, p_theme: design.theme,
      p_sections: design.sections, p_assets: assets,
    })
    if (error) {
      // A database error with a SQLSTATE means the transaction was rolled back.
      if (/^[0-9A-Z]{5}$/.test(error.code ?? "") && !error.code.startsWith("PGRST")) rpcStarted = false
      throw new Error(error.message.includes("USER_IMAGE_QUOTA_EXCEEDED")
        ? "Je opslaglimiet van 50 MB is bereikt."
        : "Het ontwerp kon niet worden aangemaakt. Controleer of de importmigratie is toegepast en probeer opnieuw.")
    }
    return designId
  } catch (error) {
    if (!rpcStarted) await cleanup()
    else {
      // The commit response may have been lost. Never delete images from a committed draft.
      const { data, error: checkError } = await db.from("websites").select("id").eq("id", designId).eq("user_id", userId).maybeSingle()
      if (data) return designId
      if (!checkError) await cleanup()
      else console.error("[import] Commit status unknown; assets retained for reconciliation", { designId })
    }
    throw error
  }
}

