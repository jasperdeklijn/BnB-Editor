import "server-only"

export const MAX_IMAGE_DIMENSION = 8_000
export const MAX_IMAGE_PIXELS = 25_000_000

export type ValidatedImage = {
  mimeType: "image/jpeg" | "image/png" | "image/gif" | "image/webp"
  extension: "jpg" | "png" | "gif" | "webp"
  width: number
  height: number
}

function uint24LE(bytes: Uint8Array, offset: number) {
  return bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16)
}

function jpegDimensions(bytes: Uint8Array) {
  let offset = 2
  while (offset + 8 < bytes.length) {
    if (bytes[offset] !== 0xff) { offset += 1; continue }
    const marker = bytes[offset + 1]
    offset += 2
    if (marker === 0xd8 || marker === 0xd9) continue
    if (offset + 2 > bytes.length) break
    const length = (bytes[offset] << 8) | bytes[offset + 1]
    if (length < 2 || offset + length > bytes.length) break
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
      return { width: (bytes[offset + 5] << 8) | bytes[offset + 6], height: (bytes[offset + 3] << 8) | bytes[offset + 4] }
    }
    offset += length
  }
  return null
}

export function inspectImage(bytes: Uint8Array): ValidatedImage {
  let image: ValidatedImage | null = null

  if (bytes.length >= 24 && bytes.slice(0, 8).every((value, index) => value === [137, 80, 78, 71, 13, 10, 26, 10][index])) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
    image = { mimeType: "image/png", extension: "png", width: view.getUint32(16), height: view.getUint32(20) }
  } else if (bytes.length >= 10 && String.fromCharCode(...bytes.slice(0, 6)).match(/^GIF8[79]a$/)) {
    image = { mimeType: "image/gif", extension: "gif", width: bytes[6] | (bytes[7] << 8), height: bytes[8] | (bytes[9] << 8) }
  } else if (bytes.length >= 12 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    const dimensions = jpegDimensions(bytes)
    if (dimensions) image = { mimeType: "image/jpeg", extension: "jpg", ...dimensions }
  } else if (
    bytes.length >= 30 && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  ) {
    const chunk = String.fromCharCode(...bytes.slice(12, 16))
    if (chunk === "VP8X") {
      image = { mimeType: "image/webp", extension: "webp", width: uint24LE(bytes, 24) + 1, height: uint24LE(bytes, 27) + 1 }
    } else if (chunk === "VP8 " && bytes.length >= 30) {
      image = { mimeType: "image/webp", extension: "webp", width: (bytes[26] | (bytes[27] << 8)) & 0x3fff, height: (bytes[28] | (bytes[29] << 8)) & 0x3fff }
    } else if (chunk === "VP8L" && bytes.length >= 25 && bytes[20] === 0x2f) {
      const bits = bytes[21] | (bytes[22] << 8) | (bytes[23] << 16) | (bytes[24] << 24)
      image = { mimeType: "image/webp", extension: "webp", width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 }
    }
  }

  if (!image) throw new Error("Het bestand is geen ondersteunde JPEG-, PNG-, GIF- of WebP-afbeelding.")
  if (image.width < 1 || image.height < 1 || image.width > MAX_IMAGE_DIMENSION || image.height > MAX_IMAGE_DIMENSION || image.width * image.height > MAX_IMAGE_PIXELS) {
    throw new Error("De afmetingen van de afbeelding zijn te groot of ongeldig.")
  }
  return image
}
