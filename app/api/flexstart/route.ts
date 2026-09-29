import { transferSchema } from "@/lib/flexstart/shared"
import { flexContext, flexResponse, FlexError, readBody, sameOrigin } from "@/lib/flexstart/server"
import { checkRateLimit } from "@/lib/rate-limit"

export async function GET() {
  try {
    const { user, client } = await flexContext()
    const { data, error } = await client.from("website_transfer_requests").select("id,business_name,status,ready_at").eq("user_id", user.id).eq("status", "ready")
    if (error) throw new FlexError("Meldingen niet beschikbaar.", 503)
    return Response.json({ ready: data }, { headers: { "Cache-Control": "no-store" } })
  } catch (error) { return flexResponse(error) }
}
export async function POST(request: Request) {
  try {
    sameOrigin(request)
    const { user, db } = await flexContext()
    const limit = await checkRateLimit(`flexstart:create:${user.id}`, 5, 3600000)
    if (limit.reason === "unavailable") throw new FlexError("De beveiligingscontrole is tijdelijk niet beschikbaar. Probeer later opnieuw.", 503)
    if (!limit.allowed) throw new FlexError("Probeer het later opnieuw.", 429)
    const parsed = transferSchema.safeParse(JSON.parse(await readBody(request)))
    if (!parsed.success) throw new FlexError(parsed.error.issues[0]?.message || "Controleer de velden.")
    const { permission: _permission, ...input } = parsed.data
    const { data: existing, error: lookupError } = await db.from("website_transfer_requests").select("id").eq("user_id", user.id).maybeSingle()
    if (lookupError) throw new FlexError("FlexStart is nog niet beschikbaar.", 503)
    if (existing) return Response.json({ id: existing.id })
    if (input.logo_image_id) {
      const { data } = await db.from("user_images").select("id").eq("id", input.logo_image_id).eq("user_id", user.id).maybeSingle()
      if (!data) throw new FlexError("Kies een logo uit je eigen afbeeldingsbibliotheek.")
    }
    const { error } = await db.from("website_transfer_requests").insert({ ...input, user_id: user.id, customer_email: user.email || "" })
    if (error) {
      if (error.message.includes("FLEXSTART_FULL")) throw new FlexError("Alle 100 gratis plekken zijn bezet. Er worden geen kosten in rekening gebracht.", 409)
      if (error.code === "23505") {
        const { data } = await db.from("website_transfer_requests").select("id").eq("user_id", user.id).maybeSingle()
        if (data) return Response.json({ id: data.id })
      }
      throw error
    }
    return Response.json({ id: input.id }, { status: 201 })
  } catch (error) { return flexResponse(error) }
}
