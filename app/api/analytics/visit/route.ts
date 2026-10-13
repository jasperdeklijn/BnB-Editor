import { after, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { checkRateLimit } from "@/lib/rate-limit"
import { ANALYTICS_UUID, deviceCategory } from "@/lib/analytics/shared"
import { analyticsRequestMatches, dailyAnalyticsHash, verifyTrackingToken } from "@/lib/analytics/server"

export const maxDuration = 15
export async function POST(request: Request) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || Number(request.headers.get("content-length")) > 8192) return new NextResponse(null, { status: 204 })
  const reader = request.body?.getReader()
  if (!reader) return new NextResponse(null, { status: 400 })
  const chunks: Uint8Array[] = []
  let bytes = 0
  while (true) {
    const part = await reader.read()
    if (part.done) break
    bytes += part.value.byteLength
    if (bytes > 8192) { await reader.cancel(); return new NextResponse(null, { status: 204 }) }
    chunks.push(part.value)
  }
  const raw = Buffer.concat(chunks).toString("utf8")
  let body
  try { body = JSON.parse(raw) } catch { return new NextResponse(null, { status: 400 }) }
  const token = verifyTrackingToken(body?.token)
  if (!token || !analyticsRequestMatches(request, token) || !ANALYTICS_UUID.test(body?.sessionId ?? "")
    || !Array.isArray(body?.events) || body.events.length < 1 || body.events.length > 20) return new NextResponse(null, { status: 204 })
  if (body.events.some((event: { id?: unknown; source?: unknown }) => !event || typeof event !== "object" || typeof event.id !== "string" || !ANALYTICS_UUID.test(event.id) || !["direct", "search", "social", "referral"].includes(String(event.source)))) return new NextResponse(null, { status: 400 })
  const visitor = dailyAnalyticsHash(token.websiteId, body.sessionId)
  const limits = await Promise.all([
    checkRateLimit("analytics-session:" + visitor, 120, 60_000),
    checkRateLimit("analytics-site:" + token.websiteId, 1000, 60_000),
  ])
  if (limits.some((limit) => !limit.allowed)) return new NextResponse(null, { status: 204 })
  const events = body.events.map((event: { id: string; source: string }) => ({ id: dailyAnalyticsHash(token.websiteId, event.id), source: event.source }))
  const device = deviceCategory(request.headers.get("user-agent") ?? "")
  after(async () => {
    try {
      const admin = await createAdminClient()
      const { error } = await admin.rpc("ingest_website_analytics", { p_website_id: token.websiteId, p_page_id: token.pageId, p_visitor: visitor, p_device: device, p_events: events })
      if (error) console.warn("[Analytics] Aggregate unavailable")
    } catch { console.warn("[Analytics] Aggregate unavailable") }
  })
  return new NextResponse(null, { status: 204 })
}
