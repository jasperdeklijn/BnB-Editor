export const ANALYTICS_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export type AnalyticsSource = "direct" | "search" | "social" | "referral"
export type AnalyticsDevice = "desktop" | "mobile" | "tablet"
export function isAnalyticsBot(agent: string) { return !agent || /bot|crawler|spider|headless|lighthouse|pagespeed|preview|monitor|curl|wget|python|facebookexternalhit/i.test(agent) }
export function referrerCategory(value: string, ownHost: string): AnalyticsSource {
  try {
    const host = new URL(value).hostname.toLowerCase()
    if (host === ownHost) return "direct"
    if (/(^|\.)(google\.[a-z.]+|bing.com|duckduckgo.com|yahoo.com|ecosia.org)$/.test(host)) return "search"
    if (/(^|\.)(facebook.com|instagram.com|linkedin.com|t.co|twitter.com|x.com|pinterest.com|tiktok.com)$/.test(host)) return "social"
    return "referral"
  } catch { return "direct" }
}
export function deviceCategory(agent: string): AnalyticsDevice {
  if (/ipad|tablet|android(?!.*mobile)/i.test(agent)) return "tablet"
  return /mobile|iphone|ipod/i.test(agent) ? "mobile" : "desktop"
}
export interface AnalyticsReport {
  plan: "bronze" | "silver" | "gold"
  enabled: boolean
  booking: boolean
  from: string
  to: string
  visitors: number
  views: number
  daysWithData: number
  pages?: Array<{ pageId: string; views: number }>
  sources?: Array<{ name: string; views: number }>
  devices?: Array<{ name: string; views: number }>
  trend?: Array<{ day: string; views: number; visitors: number }>
  conversions?: { contact: number; booking: number | null }
}
