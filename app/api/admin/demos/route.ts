import { requireAdminApiUser } from "@/lib/mail/admin-api"
import { createAdminClient } from "@/lib/supabase/admin"
import { checkRateLimit } from "@/lib/rate-limit"
import { createDemo, demoErrorResponse } from "@/lib/demos/mutations"
import { logAuditEvent } from "@/lib/audit-log"

export async function POST(request: Request) {
  const auth = await requireAdminApiUser()
  if (auth.response) return auth.response
  try {
    const limit = await checkRateLimit(`demo_import:${auth.user.id}`, 20, 3600000)
    if (!limit.allowed) return Response.json({ error: "Te veel imports. Probeer het later opnieuw." }, { status: 429 })
    const demo = await createDemo(request, await createAdminClient(), auth.user.id)
    await logAuditEvent({ userId: auth.user.id, action: "demo.created", metadata: { demoId: demo.id, slug: demo.slug, published: demo.published }, request })
    return Response.json({ demo }, { status: 201, headers: { "Cache-Control": "no-store" } })
  } catch (error) { return demoErrorResponse(error) }
}
