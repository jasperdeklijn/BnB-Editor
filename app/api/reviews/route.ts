import { NextResponse } from "next/server"
import { applyReviewToken, deleteLegacyReviews, exportReviews, moderateReview, ownerReviews, publicReviews, requireWebsiteId, resendReviewEmail, ReviewError, submitReview } from "@/lib/reviews/server"
export const dynamic = "force-dynamic"
const headers = { "Cache-Control": "no-store, private", "Referrer-Policy": "no-referrer" }
function failure(error: unknown) {
  return NextResponse.json({ error: error instanceof ReviewError ? error.message : "Recensies zijn tijdelijk niet beschikbaar." }, { status: error instanceof ReviewError ? error.status : 503, headers })
}
export async function GET(request: Request) {
  try {
    const url = new URL(request.url), websiteId = requireWebsiteId(url.searchParams.get("websiteId"))
    if (url.searchParams.get("view") === "export") return NextResponse.json(await exportReviews(websiteId), { headers: { ...headers, "Content-Disposition": 'attachment; filename="recensies.json"' } })
    const data = url.searchParams.get("view") === "owner"
      ? await ownerReviews(websiteId, Math.max(1, Number(url.searchParams.get("page")) || 1))
      : await publicReviews(websiteId, Number(url.searchParams.get("limit")) || 6)
    return NextResponse.json(data, { headers })
  } catch (error) { return failure(error) }
}
export async function POST(request: Request) {
  try {
    if (request.headers.get("origin") !== new URL(request.url).origin) throw new ReviewError("Ongeldige herkomst.", 403)
    if (!request.headers.get("content-type")?.startsWith("application/json")) throw new ReviewError("Ongeldig verzoek.")
    const reader = request.body?.getReader()
    if (!reader) throw new ReviewError("Ongeldig verzoek.")
    const decoder = new TextDecoder(); let raw = "", size = 0
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > 20000) { await reader.cancel(); throw new ReviewError("Verzoek te groot.", 413) }
      raw += decoder.decode(value, { stream: true })
    }
    raw += decoder.decode()
    let input: Record<string, unknown>
    try { input = JSON.parse(raw); if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error() } catch { throw new ReviewError("Ongeldig verzoek.") }
    if (input.action === "submit") await submitReview(request, input)
    else if (input.action === "resend" || input.action === "withdrawal-email") await resendReviewEmail(request, input)
    else if (input.action === "confirm" || input.action === "withdraw") await applyReviewToken(request, input)
    else if (input.action === "delete-legacy") await deleteLegacyReviews(request, input)
    else await moderateReview(request, input)
    return NextResponse.json({ success: true }, { headers })
  } catch (error) { return failure(error) }
}
