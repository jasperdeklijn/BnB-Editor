import "server-only"
import { lookup } from "node:dns/promises"
import { request } from "node:https"
import { BlockList, isIP } from "node:net"
import sharp from "sharp"
import { inspectImage, MAX_IMAGE_PIXELS } from "../server-image-validation"
import { isHttpsUrl } from "./schema"

export const MAX_REMOTE_IMAGE_BYTES = 5 * 1024 * 1024
export const MAX_REMOTE_TOTAL_BYTES = 20 * 1024 * 1024
const blocked = new BlockList()
for (const [address, prefix] of [
  ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8],
  ["169.254.0.0", 16], ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.0.2.0", 24],
  ["192.88.99.0", 24], ["192.168.0.0", 16], ["198.18.0.0", 15],
  ["198.51.100.0", 24], ["203.0.113.0", 24], ["224.0.0.0", 4], ["240.0.0.0", 4],
] as const) blocked.addSubnet(address, prefix, "ipv4")
const globalV6 = new BlockList()
globalV6.addSubnet("2000::", 3, "ipv6")
for (const [address, prefix] of [["2001::", 23], ["2001:db8::", 32], ["2002::", 16], ["3fff::", 20]] as const) {
  blocked.addSubnet(address, prefix, "ipv6")
}
export function isPublicAddress(address: string) {
  const family = isIP(address)
  return family === 4 ? !blocked.check(address, "ipv4")
    : family === 6 && globalV6.check(address, "ipv6") && !blocked.check(address, "ipv6")
}
export async function resolveImageDestination(url: URL, resolver = lookup) {
  if (!isHttpsUrl(url.href)) throw new Error("Alleen HTTPS-afbeeldingen op poort 443 zijn toegestaan.")
  const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase()
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || !host.includes("." ) && !isIP(host)) {
    throw new Error("Gebruik een openbare afbeeldingshost.")
  }
  const addresses = isIP(host) ? [{ address: host, family: isIP(host) }] : await resolver(host, { all: true, verbatim: true })
  if (!addresses.length || addresses.some(({ address }) => !isPublicAddress(address))) {
    throw new Error("Privé-, lokale en gereserveerde afbeeldingsadressen zijn niet toegestaan.")
  }
  return addresses[0]
}
async function withinSignal<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  signal.throwIfAborted()
  return new Promise((resolve, reject) => {
    const abort = () => reject(new Error("Afbeelding ophalen duurde te lang."))
    signal.addEventListener("abort", abort, { once: true })
    promise.then(resolve, reject).finally(() => signal.removeEventListener("abort", abort))
  })
}
async function fetchHop(url: URL, signal: AbortSignal): Promise<{ bytes?: Buffer; location?: string }> {
  const destination = await withinSignal(resolveImageDestination(url), signal)
  signal.throwIfAborted()
  return new Promise((resolve, reject) => {
    const req = request(url, {
      agent: false, family: destination.family, signal, method: "GET",
      headers: { Accept: "image/jpeg,image/png,image/webp,image/gif", "Accept-Encoding": "identity", "User-Agent": "FlexPagina-Image-Import/1" },
      // Pin the checked DNS result to the TLS connection; no second DNS lookup/rebinding.
      lookup: (_hostname, _options, callback) => callback(null, destination.address, destination.family),
    }, (res) => {
      res.on("error", reject)
      if ([301, 302, 303, 307, 308].includes(res.statusCode ?? 0)) {
        const location = res.headers.location
        res.destroy()
        if (location) resolve({ location })
        else reject(new Error("Ongeldige afbeeldingomleiding."))
        return
      }
      if (res.statusCode !== 200 || (res.headers["content-encoding"] && res.headers["content-encoding"] !== "identity")) {
        res.destroy(); reject(new Error("Afbeeldingsserver levert geen bruikbaar bestand.")); return
      }
      if (Number(res.headers["content-length"] ?? 0) > MAX_REMOTE_IMAGE_BYTES) {
        res.destroy(); reject(new Error("Afbeelding is groter dan 5 MB.")); return
      }
      const chunks: Buffer[] = []
      let size = 0
      res.on("data", (chunk: Buffer) => {
        size += chunk.length
        if (size > MAX_REMOTE_IMAGE_BYTES) res.destroy(new Error("Afbeelding is groter dan 5 MB."))
        else chunks.push(chunk)
      })
      res.on("end", () => resolve({ bytes: Buffer.concat(chunks) }))
      res.on("aborted", () => reject(new Error("Afbeeldingsdownload is afgebroken.")))
    })
    req.on("error", () => reject(new Error("Afbeelding kon niet veilig worden opgehaald.")))
    req.end()
  })
}
export async function fetchRemoteImage(source: string, outerSignal: AbortSignal, hop = fetchHop) {
  const signal = AbortSignal.any([outerSignal, AbortSignal.timeout(8000)])
  let url = new URL(source)
  for (let redirects = 0; redirects <= 3; redirects++) {
    if (!isHttpsUrl(url.href)) throw new Error("Ongeldige HTTPS-afbeeldings-URL.")
    const result = await hop(url, signal)
    if (result.location) {
      if (redirects === 3) throw new Error("Te veel afbeeldingomleidingen.")
      url = new URL(result.location, url)
    } else if (result.bytes) return result.bytes
    else throw new Error("Lege afbeelding.")
  }
  throw new Error("Afbeelding ontbreekt.")
}
export async function decodeImportImage(bytes: Buffer) {
  inspectImage(bytes)
  const options = { limitInputPixels: MAX_IMAGE_PIXELS, failOn: "warning" as const }
  const metadata = await sharp(bytes, options).metadata()
  if (!["jpeg", "png", "webp", "gif"].includes(metadata.format ?? "") || (metadata.pages ?? 1) > 1) {
    throw new Error("Gebruik een stilstaande JPEG-, PNG-, WebP- of GIF-afbeelding.")
  }
  // Decode/re-encode actual pixels, remove metadata, and reject corrupt/truncated images.
  const original = await sharp(bytes, options).timeout({ seconds: 5 }).rotate().webp({ quality: 90 }).toBuffer()
  const thumbnail = await sharp(original, options).timeout({ seconds: 5 }).resize(480, 320, { fit: "cover" }).webp({ quality: 75 }).toBuffer()
  if (original.length > MAX_REMOTE_IMAGE_BYTES || thumbnail.length > 1024 * 1024) throw new Error("Verwerkte afbeelding is te groot.")
  return { original, thumbnail }
}

