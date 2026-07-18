import { NextResponse } from "next/server"
import { z } from "zod"
import { logAuditEvent } from "@/lib/audit-log"
import { requireAdminApiUser } from "@/lib/mail/admin-api"
import { sendReply } from "@/lib/mail/send-reply"
import { createAdminClient } from "@/lib/supabase/admin"

const bodySchema = z.object({
  draftId: z.string().uuid(),
  subject: z.string().trim().min(1).max(500),
  body: z.string().trim().min(1).max(8_000),
  confirm: z.literal(true),
})

export async function POST(request: Request, context: { params: Promise<{ threadId: string }> }) {
  const auth = await requireAdminApiUser()
  if ("response" in auth) return auth.response
  const { threadId } = await context.params
  if (!z.string().uuid().safeParse(threadId).success) return NextResponse.json({ error: "Ongeldige conversatie." }, { status: 400 })
  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Controleer onderwerp, antwoord en bevestiging." }, { status: 400 })

  const admin = await createAdminClient()
  const { data: draft } = await admin.from("mail_drafts").select("thread_id").eq("id", parsed.data.draftId).maybeSingle()
  if (!draft || draft.thread_id !== threadId) return NextResponse.json({ error: "Concept niet gevonden." }, { status: 404 })

  try {
    const result = await sendReply(admin, { draftId: parsed.data.draftId, subject: parsed.data.subject, body: parsed.data.body, userId: auth.user.id })
    await logAuditEvent({ userId: auth.user.id, action: "mail.reply_sent", request, metadata: { threadId, draftId: parsed.data.draftId, messageId: result.messageId } })
    return NextResponse.json({ sent: true, ...result })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Verzenden is mislukt."
    return NextResponse.json({ error: message }, { status: /al verzonden|al verzonden/.test(message) ? 409 : 500 })
  }
}
