import "server-only"

import { lookup } from "node:dns/promises"
import { isIP } from "node:net"
import type { WebsiteAnalysis } from "@/lib/leads/types"

const WEBSITE_TIMEOUT_MS = 8_000
const MAX_HTML_BYTES = 1_000_000
const CTA_PATTERN = /\b(contact|offerte|afspraak|bel(?:len)?|reserveren|boek(?:en)?|aanvragen)\b/i

const EMPTY_ANALYSIS: WebsiteAnalysis = {
  hasWebsite: false,
  hasHttps: false,
  hasMobileMeta: false,
  hasContactForm: false,
  hasClearCta: false,
  seoTitle: null,
  seoDescription: null,
}

function normalizeWebsiteUrl(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return null

  try {
    const url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`)
    if (url.protocol !== "http:" && url.protocol !== "https:") return null
    if (url.username || url.password) return null

    const hostname = url.hostname.toLowerCase()
    if (
      hostname === "localhost" ||
      hostname === "0.0.0.0" ||
      hostname === "::1" ||
      hostname.endsWith(".local") ||
      /^(10\.|127\.|169\.254\.|192\.168\.)/.test(hostname) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(hostname)
    ) {
      return null
    }

    return url
  } catch {
    return null
  }
}

function isPrivateOrReservedIp(value: string) {
  const address = value.toLowerCase().replace(/^\[|\]$/g, "")

  if (isIP(address) === 4) {
    const [first, second] = address.split(".").map(Number)
    return (
      first === 0 ||
      first === 10 ||
      first === 127 ||
      (first === 100 && second >= 64 && second <= 127) ||
      (first === 169 && second === 254) ||
      (first === 172 && second >= 16 && second <= 31) ||
      (first === 192 && (second === 0 || second === 168)) ||
      (first === 198 && (second === 18 || second === 19 || second === 51)) ||
      first >= 224
    )
  }

  if (isIP(address) === 6) {
    if (address.startsWith("::ffff:")) return isPrivateOrReservedIp(address.slice(7))
    return (
      address === "::" ||
      address === "::1" ||
      address.startsWith("fc") ||
      address.startsWith("fd") ||
      /^fe[89ab]/.test(address) ||
      address.startsWith("ff") ||
      address.startsWith("2001:db8:")
    )
  }

  return true
}

async function assertPublicHostname(url: URL) {
  if (isIP(url.hostname)) {
    if (isPrivateOrReservedIp(url.hostname)) throw new Error("Niet-openbaar websiteadres")
    return
  }

  const addresses = await lookup(url.hostname, { all: true, verbatim: true })
  if (addresses.length === 0 || addresses.some(({ address }) => isPrivateOrReservedIp(address))) {
    throw new Error("Niet-openbaar websiteadres")
  }
}

async function fetchPublicHomepage(initialUrl: URL, signal: AbortSignal) {
  let currentUrl = initialUrl

  for (let redirectCount = 0; redirectCount <= 5; redirectCount += 1) {
    await assertPublicHostname(currentUrl)
    const response = await fetch(currentUrl, {
      signal,
      redirect: "manual",
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": "FlexpaginaLeadAnalyzer/1.0",
      },
      cache: "no-store",
    })

    if (response.status < 300 || response.status >= 400) return response

    const location = response.headers.get("location")
    if (!location) return response
    const redirectUrl = normalizeWebsiteUrl(new URL(location, currentUrl).toString())
    if (!redirectUrl) throw new Error("Ongeldige website-redirect")
    currentUrl = redirectUrl
  }

  throw new Error("Te veel website-redirects")
}

function decodeHtml(value: string) {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function getMetaContent(html: string, name: string) {
  const tags = html.match(/<meta\b[^>]*>/gi) ?? []
  const normalizedName = name.toLowerCase()

  for (const tag of tags) {
    const nameMatch = tag.match(/\bname\s*=\s*["']([^"']+)["']/i)
    if (nameMatch?.[1]?.trim().toLowerCase() !== normalizedName) continue
    const contentMatch = tag.match(/\bcontent\s*=\s*["']([^"']*)["']/i)
    return contentMatch?.[1] ? decodeHtml(contentMatch[1]).slice(0, 500) : null
  }

  return null
}

export async function analyzeWebsite(website: string | null | undefined): Promise<WebsiteAnalysis> {
  const url = website ? normalizeWebsiteUrl(website) : null
  if (!url) return { ...EMPTY_ANALYSIS }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), WEBSITE_TIMEOUT_MS)

  try {
    const response = await fetchPublicHomepage(url, controller.signal)

    if (!response.ok) return { ...EMPTY_ANALYSIS, hasHttps: response.url.startsWith("https://") }

    const contentType = response.headers.get("content-type") ?? ""
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) {
      return { ...EMPTY_ANALYSIS, hasWebsite: true, hasHttps: response.url.startsWith("https://") }
    }

    const buffer = await response.arrayBuffer()
    const html = new TextDecoder().decode(buffer.slice(0, MAX_HTML_BYTES))
    const titleMatch = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)

    return {
      hasWebsite: true,
      hasHttps: response.url.startsWith("https://"),
      hasMobileMeta: getMetaContent(html, "viewport") !== null,
      hasContactForm: /<form\b/i.test(html),
      hasClearCta: CTA_PATTERN.test(decodeHtml(html)),
      seoTitle: titleMatch?.[1] ? decodeHtml(titleMatch[1]).slice(0, 500) || null : null,
      seoDescription: getMetaContent(html, "description"),
    }
  } catch {
    return { ...EMPTY_ANALYSIS, hasHttps: url.protocol === "https:" }
  } finally {
    clearTimeout(timeout)
  }
}
