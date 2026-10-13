import "server-only"
import { createHmac, timingSafeEqual } from "node:crypto"
import { createAdminClient } from "@/lib/supabase/admin"
import { ANALYTICS_UUID, isAnalyticsBot } from "./shared"

interface TrackingToken { websiteId: string; pageId: string; host: string; path: string; expires: number }
const secret = () => process.env.ANALYTICS_SIGNING_SECRET
function signature(value: string) { return createHmac("sha256", secret()!).update(value).digest("base64url") }
export function createTrackingToken(input: Omit<TrackingToken, "expires">): string | null {
  if (!secret() || secret()!.length < 32) return null
  const data = Buffer.from(JSON.stringify({ ...input, expires: Date.now() + 60 * 60 * 1000 })).toString("base64url")
  return data + "." + signature(data)
}
export function verifyTrackingToken(value: unknown): TrackingToken | null {
  if (!secret() || secret()!.length < 32 || typeof value !== "string" || value.length > 1800) return null
  const parts = value.split(".")
  if (parts.length !== 2) return null
  const [data, mac] = parts
  if (!data || !mac) return null
  const expected = Buffer.from(signature(data)), actual = Buffer.from(mac)
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null
  try {
    const token = JSON.parse(Buffer.from(data, "base64url").toString()) as TrackingToken
    return ANALYTICS_UUID.test(token.websiteId) && ANALYTICS_UUID.test(token.pageId) && typeof token.host === "string" && typeof token.path === "string" && token.expires > Date.now() && token.expires <= Date.now() + 61 * 60 * 1000 ? token : null
  } catch { return null }
}
export function analyticsRequestMatches(request: Request, token: TrackingToken) {
  if (isAnalyticsBot(request.headers.get("user-agent") ?? "") || request.headers.get("dnt") === "1" || request.headers.get("sec-gpc") === "1") return false
  try {
    const origin = new URL(request.headers.get("origin") ?? "")
    const referrer = new URL(request.headers.get("referer") ?? "")
    return origin.host === token.host && referrer.host === token.host && referrer.pathname === token.path
      && request.headers.get("sec-fetch-site") !== "cross-site"
  } catch { return false }
}
export function dailyAnalyticsHash(site: string, value: string, day = new Date().toISOString().slice(0, 10)) {
  return createHmac("sha256", secret()!).update(site + ":" + day + ":" + value).digest("hex")
}

/** Only called after a validated backend success; never accepts a browser event name. */
export async function recordAnalyticsConversion(request: Request, websiteId: string, kind: "contact" | "booking", successId: string) {
  try {
    const cookie = request.headers.get("cookie")?.split(";").map((part) => part.trim()).find((part) => part.startsWith("fp_analytics_" + websiteId + "="))?.split("=").slice(1).join("=")
    if (!cookie) return
    const token = verifyTrackingToken(cookie)
    if (!token || token.websiteId !== websiteId || !analyticsRequestMatches(request, token)) return
    const admin = await createAdminClient()
    const { error } = await admin.rpc("record_website_conversion", { p_website_id: websiteId, p_kind: kind, p_success_id: successId })
    if (error) console.warn("[Analytics] Conversion aggregate unavailable")
  } catch { console.warn("[Analytics] Conversion aggregate unavailable") }
}
