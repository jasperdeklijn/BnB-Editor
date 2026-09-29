import { z } from "zod"
import { flexContext, ownedTransfer, flexResponse, FlexError, sameOrigin, readBody } from "@/lib/flexstart/server"
import { createImportedDesign } from "@/lib/import/create-design"
import { parseImport, ImportValidationError, MAX_IMPORT_BYTES } from "@/lib/import/schema"
import { checkRateLimit } from "@/lib/rate-limit"

export const runtime = "nodejs"
export const maxDuration = 60
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    sameOrigin(request)
    const { user, db } = await flexContext(true)
    const { id } = await context.params
    if (!z.string().uuid().safeParse(id).success) throw new FlexError("Ongeldige aanvraag.")
    const designId = z.string().uuid().parse(request.headers.get("x-import-design-id"))
    if (request.headers.get("x-import-permission") !== "confirmed") throw new FlexError("Controleer de toestemming en het voorbeeld.")
    const transfer = await ownedTransfer(db, id, user.id, true)
    if (!transfer.permission_confirmed_at) throw new FlexError("Toestemming ontbreekt.")
    if (transfer.website_id === designId) return Response.json({ websiteId: designId })
    const revision = Number(request.headers.get("x-transfer-revision"))
    if (revision !== transfer.revision || !["processing", "checking", "corrections"].includes(transfer.status)) throw new FlexError("Start eerst de behandeling of vernieuw de aanvraag.", 409)
    const limit = await checkRateLimit(`flexstart:import:${user.id}`, 10, 3600000)
    if (limit.reason === "unavailable") throw new FlexError("De beveiligingscontrole is tijdelijk niet beschikbaar. Probeer later opnieuw.", 503)
    if (!limit.allowed) throw new FlexError("Te veel imports. Probeer later opnieuw.", 429)
    const document = parseImport(await readBody(request, MAX_IMPORT_BYTES))
    const websiteId = await createImportedDesign({ db, storage: db, userId: transfer.user_id, designId, document, transfer: { requestId: id, revision } })
    return Response.json({ websiteId }, { status: 201 })
  } catch (error) {
    if (error instanceof ImportValidationError) return Response.json({ error: "Controleer het JSON-bestand.", issues: error.issues }, { status: 400 })
    return flexResponse(error)
  }
}
