import { NextResponse } from "next/server"
import { z } from "zod"
import { logAuditEvent } from "@/lib/audit-log"
import { requireAdminApiUser } from "@/lib/mail/admin-api"
import { generateReplyDraft } from "@/lib/mail/generate-reply"
import { createAdminClient } from "@/lib/supabase/admin"

const bodySchema = z.object({ messageId: z.string().uuid(), force: z.boolean().optional() })

export async function POST(request: Request, context: { params: Promise<{ threadId: string }> }) {
  const auth = await requireAdminApiUser()
  if ("response" in auth) return auth.response
  const { threadId } = await context.params
  if (!z.string().uuid().safeParse(threadId).success) return NextResponse.json({ error: "Ongeldige conversatie." }, { status: 400 })
  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Ongeldig bericht." }, { status: 400 })

  try {
    const admin = await createAdminClient()
    const draft = await generateReplyDraft(admin, { threadId, messageId: parsed.data.messageId, force: parsed.data.force })
    await logAuditEvent({ userId: auth.user.id, action: "mail.draft_generated", request, metadata: { threadId, draftId: draft.id } })
    return NextResponse.json({ draft })
  } catch {
    return NextResponse.json({ error: "Het antwoordvoorstel kon niet worden gemaakt." }, { status: 500 })
  }
}
