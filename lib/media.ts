export const MEDIA_ACCEPT = "image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,.jpg,.jpeg,.png,.gif,.webp,.mp4,.webm"
export const MAX_USER_VIDEO_SIZE = 50 * 1024 * 1024
export const MAX_USER_GIF_SIZE = 20 * 1024 * 1024
export const MEDIA_UPLOAD_HELP = "JPG, PNG en WebP worden verkleind. GIF tot 20 MB · MP4 en WebM tot 50 MB · 500 MB opslag totaal."

export function isVideoSource(value: string | undefined): boolean {
  if (!value) return false
  try { return /\.(mp4|webm)$/i.test(new URL(value, "https://media.local").pathname) } catch { return false }
}
export function mediaPosterSource(value: string | undefined): string | undefined {
  if (!isVideoSource(value)) return undefined
  try {
    const url = new URL(value!)
    if (!/\/user-images\/[0-9a-f-]{36}\/originals\/[0-9a-f-]{36}\.(mp4|webm)$/i.test(url.pathname)) return undefined
    url.pathname = url.pathname.replace(/\/originals\/([^/]+)\.(mp4|webm)$/i, "/thumbnails/$1.webp")
    url.search = ""; url.hash = ""
    return url.href
  } catch { return undefined }
}
export function isGifFile(file: Pick<File, "type" | "name">) {
  return file.type === "image/gif" || /\.gif$/i.test(file.name)
}
export function videoMime(file: Pick<File, "type" | "name">): "video/mp4" | "video/webm" | null {
  if (file.type === "video/mp4" || file.type === "video/webm") return file.type
  if (!file.type && /\.mp4$/i.test(file.name)) return "video/mp4"
  if (!file.type && /\.webm$/i.test(file.name)) return "video/webm"
  return null
}
export function isSupportedMediaFile(file: Pick<File, "type" | "name">) {
  return ["image/jpeg", "image/png", "image/gif", "image/webp"].includes(file.type) || isGifFile(file) || Boolean(videoMime(file))
}

export function mediaPaths(userId: string, id: string, extension: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) || !["mp4", "webm", "gif"].includes(extension)) throw new Error("Ongeldige upload.")
  return { originalPath: `${userId}/originals/${id}.${extension}`, thumbnailPath: `${userId}/thumbnails/${id}.webp` }
}
