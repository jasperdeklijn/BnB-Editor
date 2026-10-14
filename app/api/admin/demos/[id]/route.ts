import { z } from "zod"
import { requireAdminApiUser } from "@/lib/mail/admin-api"
import { createAdminClient } from "@/lib/supabase/admin"
import { assertDemoOrigin, DemoError, demoErrorResponse, readDemoBody } from "@/lib/demos/mutations"
import { demoSummaryColumns } from "@/lib/demos/server"
import { logAuditEvent } from "@/lib/audit-log"

type Context = { params: Promise<{ id: string }> }

export async function GET(_request: Request, { params }: Context) {
  const auth = await requireAdminApiUser()
  if (auth.response) return auth.response
  try {
    const id = z.string().uuid().safeParse((await params).id)
    if (!id.success) throw new DemoError("Ongeldig demokenmerk.")
    const { data, error } = await (await createAdminClient()).from("demo_websites").select("design").eq("id", id.data).maybeSingle()
    if (error) throw new DemoError("Het voorbeeld kon niet worden geladen.", 503)
    if (!data) throw new DemoError("Demo niet gevonden.", 404)
    return Response.json(data, { headers: { "Cache-Control": "no-store" } })
  } catch (error) { return demoErrorResponse(error) }
}

export async function PATCH(request: Request, { params }: Context) {
  const auth = await requireAdminApiUser()
  if (auth.response) return auth.response
  try {
    assertDemoOrigin(request)
    const id = z.string().uuid().safeParse((await params).id)
    const body = z.object({ published: z.boolean() }).strict().safeParse(JSON.parse(await readDemoBody(request, 1024)))
    if (!id.success || !body.success) throw new DemoError("Ongeldige demogegevens.")
    const { data, error } = await (await createAdminClient()).from("demo_websites")
      .update({ published: body.data.published, updated_at: new Date().toISOString() }).eq("id", id.data).select(demoSummaryColumns).maybeSingle()
    if (error) throw new DemoError("De status kon niet worden gewijzigd.", 503)
    if (!data) throw new DemoError("Demo niet gevonden.", 404)
    await logAuditEvent({ userId: auth.user.id, action: body.data.published ? "demo.published" : "demo.unpublished", metadata: { demoId: id.data, slug: data.slug }, request })
    return Response.json({ demo: data }, { headers: { "Cache-Control": "no-store" } })
  } catch (error) { return demoErrorResponse(error) }
}

export async function DELETE(request: Request, { params }: Context) {
  const auth = await requireAdminApiUser()
  if (auth.response) return auth.response
  try {
    assertDemoOrigin(request)
    const id = z.string().uuid().safeParse((await params).id)
    if (!id.success) throw new DemoError("Ongeldig demokenmerk.")
    const { data, error } = await (await createAdminClient()).from("demo_websites").delete().eq("id", id.data).select("id,slug").maybeSingle()
    if (error) throw new DemoError("De demo kon niet worden verwijderd.", 503)
    if (!data) throw new DemoError("Demo niet gevonden.", 404)
    await logAuditEvent({ userId: auth.user.id, action: "demo.deleted", metadata: { demoId: data.id, slug: data.slug }, request })
    return Response.json({ success: true }, { headers: { "Cache-Control": "no-store" } })
  } catch (error) { return demoErrorResponse(error) }
}
