import { z } from "zod"
import { flexContext, ownedTransfer, loadWebsiteCheck, flexResponse, FlexError, sameOrigin, readBody } from "@/lib/flexstart/server"
import { checkRateLimit } from "@/lib/rate-limit"

const schema = z.object({
  action: z.enum(["start", "ready", "resolve", "approve", "correct", "request_review", "review", "notes"]),
  revision: z.number().int().nonnegative(), message: z.string().trim().max(6000).default(""),
  version: z.string().uuid().optional(), mobileReviewed: z.boolean().optional(), testReceived: z.boolean().optional(),
}).strict()
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    sameOrigin(request)
    const { user, admin, db } = await flexContext()
    const { id } = await context.params
    if (!z.string().uuid().safeParse(id).success) throw new FlexError("Aanvraag niet gevonden.", 404)
    const input = schema.safeParse(JSON.parse(await readBody(request)))
    if (!input.success) throw new FlexError("Controleer de actie en opmerkingen.")
    const value = input.data
    const isAdminAction = ["start", "ready", "resolve", "review", "notes"].includes(value.action)
    if (isAdminAction && !admin) throw new FlexError("Geen beheerderstoegang.", 403)
    const transfer = await ownedTransfer(db, id, user.id, isAdminAction && admin)
    const limit = await checkRateLimit(`flexstart:action:${user.id}`, 60, 3600000)
    if (limit.reason === "unavailable") throw new FlexError("De beveiligingscontrole is tijdelijk niet beschikbaar. Probeer later opnieuw.", 503)
    if (!limit.allowed) throw new FlexError("Te veel wijzigingen. Probeer later opnieuw.", 429)
    let version: string | null = null
    if (["approve", "review", "ready", "resolve"].includes(value.action)) {
      if (!transfer.website_id) throw new FlexError("Importeer eerst een concept.")
      const current = await loadWebsiteCheck(db, transfer.website_id, transfer.user_id)
      version = current.check.version
      if (version !== value.version) throw new FlexError("Het concept is gewijzigd. Vernieuw de pagina en controleer opnieuw.", 409)
      if (value.action === "review" && (!current.check.canPublish || !value.mobileReviewed || !value.testReceived)) {
        throw new FlexError("Rond de verplichte FlexCheck-punten af en bevestig de mobiele controle en ontvangst van de testaanvraag.")
      }
    }
    const { error } = await db.rpc("transition_transfer_request", {
      p_id: id, p_revision: value.revision, p_action: value.action, p_message: value.message,
      p_version: version, p_actor: user.id, p_admin: isAdminAction && admin,
    })
    if (error) throw new FlexError("De aanvraag is gewijzigd of deze stap is nog niet beschikbaar. Vernieuw de pagina.", 409)
    return Response.json({ success: true })
  } catch (error) { return flexResponse(error) }
}
