import { NextResponse } from "next/server"
import { z } from "zod"
import { logAuditEvent } from "@/lib/audit-log"
import { requireAdminApiUser } from "@/lib/mail/admin-api"
import { MAIL_THREAD_STATUSES } from "@/lib/mail/types"
import { createAdminClient } from "@/lib/supabase/admin"

const updateSchema = z.object({ status: z.enum(MAIL_THREAD_STATUSES).optional(), markRead: z.boolean().optional() })
  .refine((value) => value.status !== undefined || value.markRead !== undefined)

export async function PATCH(request: Request, context: { params: Promise<{ threadId: string }> }) {
  const auth = await requireAdminApiUser()
  if ("response" in auth) return auth.response
  const { threadId } = await context.params
  if (!z.string().uuid().safeParse(threadId).success) return NextResponse.json({ error: "Ongeldige conversatie." }, { status: 400 })
  const parsed = updateSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Ongeldige wijziging." }, { status: 400 })

  const admin = await createAdminClient()
  const update: Record<string, unknown> = {}
  if (parsed.data.status) update.status = parsed.data.status
  if (parsed.data.markRead) update.unread_count = 0
  const { data, error } = await admin.from("mail_threads").update(update).eq("id", threadId).select("*").maybeSingle()
  if (error) return NextResponse.json({ error: "Conversatie kon niet worden bijgewerkt." }, { status: 500 })
  if (!data) return NextResponse.json({ error: "Conversatie niet gevonden." }, { status: 404 })
  if (parsed.data.markRead) await admin.from("mail_messages").update({ is_read: true }).eq("thread_id", threadId).eq("direction", "inbound")
  await logAuditEvent({ userId: auth.user.id, action: "mail.thread_updated", request, metadata: { threadId, ...parsed.data } })
  return NextResponse.json({ thread: data })
}
