import { z } from "zod"
import { isHttpsUrl } from "@/lib/import/schema"
import { flexContext, flexResponse, FlexError, ownedTransfer, readBody, sameOrigin } from "@/lib/flexstart/server"
const schema = z.object({ revision: z.number().int().nonnegative(), version: z.string().uuid(),
  name: z.string().trim().min(1).max(160), city: z.string().trim().min(1).max(1000), phone: z.string().trim().max(60),
  email: z.string().trim().email().max(254), seoTitle: z.string().trim().min(1).max(200), seoDescription: z.string().trim().min(1).max(500),
  privacyUrl: z.string().max(2000).refine(isHttpsUrl), services: z.array(z.string().trim().min(1).max(160)).min(1).max(30),
}).strict()
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    sameOrigin(request)
    const { db, user } = await flexContext(true)
    const { id } = await context.params
    if (!z.string().uuid().safeParse(id).success) throw new FlexError("Ongeldige aanvraag.")
    await ownedTransfer(db, id, user.id, true)
    const parsed = schema.safeParse(JSON.parse(await readBody(request)))
    if (!parsed.success) throw new FlexError("Controleer alle velden; gebruik een HTTPS-link naar de privacyverklaring en maximaal 30 diensten.")
    const { revision, version, ...content } = parsed.data
    const { error } = await db.rpc("prepare_transfer_design", { p_id: id, p_revision: revision, p_version: version, p_content: content })
    if (error) throw new FlexError("Het concept is gewijzigd of kan niet worden aangevuld. Vernieuw de pagina.", 409)
    return Response.json({ success: true })
  } catch (error) { return flexResponse(error) }
}
