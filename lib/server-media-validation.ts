import "server-only"
import { inspectImage } from "./server-image-validation"

export function inspectMedia(bytes: Uint8Array) {
  // ISO BMFF (MP4): check top-level box boundaries and video-track metadata.
  if (bytes.length >= 24 && String.fromCharCode(...bytes.slice(4, 8)) === "ftyp") {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
    let offset = 0, movie = false, payload = false, video = false, compatible = false
    while (offset + 8 <= bytes.length) {
      let size = view.getUint32(offset)
      const type = String.fromCharCode(...bytes.slice(offset + 4, offset + 8))
      let header = 8
      if (size === 1) {
        if (offset + 16 > bytes.length) throw new Error("Ongeldig MP4-bestand.")
        const large = view.getBigUint64(offset + 8)
        if (large > BigInt(bytes.length)) throw new Error("Ongeldig MP4-bestand.")
        size = Number(large); header = 16
      } else if (size === 0) size = bytes.length - offset
      if (size < header || offset + size > bytes.length) throw new Error("Ongeldig MP4-bestand.")
      if (type === "ftyp") {
        const brands = new TextDecoder("ascii").decode(bytes.slice(offset + 8, offset + size))
        compatible = /isom|iso[2-9]|mp4[12]|avc1|dash|M4V |MSNV/.test(brands)
      }
      if (type === "moov") {
        movie = true
        video = new TextDecoder("ascii").decode(bytes.slice(offset + header, offset + size)).includes("vide")
      }
      if (type === "mdat" && size > header) payload = true
      offset += size
    }
    if (offset !== bytes.length || !compatible || !movie || !payload || !video) throw new Error("Kies een MP4-bestand met een videospoor.")
    return { mimeType: "video/mp4" as const, extension: "mp4" as const }
  }
  if (bytes.length >= 16 && bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3) {
    const header = new TextDecoder("ascii").decode(bytes.slice(0, Math.min(bytes.length, 4096)))
    if (!header.includes("webm") || !bytes.some((value, index) => value === 0x18 && bytes[index + 1] === 0x53 && bytes[index + 2] === 0x80 && bytes[index + 3] === 0x67)) throw new Error("Ongeldig WebM-bestand.")
    return { mimeType: "video/webm" as const, extension: "webm" as const }
  }
  return inspectImage(bytes)
}
