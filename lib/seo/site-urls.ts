import { PLATFORM_BASE_URL } from "../platform"

/** Use the same public origin for canonical URLs, robots.txt and sitemaps. */
export function publishedWebsiteBaseUrl(slug: string, customDomain?: string | null) {
  if (customDomain) return `https://${customDomain.toLowerCase()}`
  const platform = new URL(PLATFORM_BASE_URL)
  platform.hostname = `${slug}.${platform.hostname.replace(/^www\./, "")}`
  return platform.origin
}
