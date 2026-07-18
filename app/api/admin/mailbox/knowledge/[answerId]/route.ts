import { NextResponse } from "next/server"
import { z } from "zod"
import { logAuditEvent } from "@/lib/audit-log"
import { requireAdminApiUser } from "@/lib/mail/admin-api"
import { createAdminClient } from "@/lib/supabase/admin"

const schema = z.object({
  question: z.string().trim().min(3).max(500).optional(),
  answer: z.string().trim().min(3).max(5_000).optional(),
  keywords: z.array(z.string().trim().min(2).max(80)).max(30).optional(),
  category: z.string().trim().min(2).max(80).optional(),
  status: z.enum(["draft", "active", "archived"]).optional(),
  priority: z.coerce.number().int().min(0).max(100).optional(),
}).refine((value) => Object.keys(value).length > 0)

export async function PATCH(request: Request, context: { params: Promise<{ answerId: string }> }) {
  const auth = await requireAdminApiUser()
  if ("response" in auth) return auth.response
  const { answerId } = await context.params
  if (!z.string().uuid().safeParse(answerId).success) return NextResponse.json({ error: "Ongeldig kennisantwoord." }, { status: 400 })
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Ongeldige wijziging." }, { status: 400 })
  const admin = await createAdminClient()
  const { data, error } = await admin.from("mail_knowledge_answers").update({ ...parsed.data, updated_by: auth.user.id }).eq("id", answerId).select("*").maybeSingle()
  if (error) return NextResponse.json({ error: "Kennisantwoord kon niet worden bijgewerkt." }, { status: 500 })
  if (!data) return NextResponse.json({ error: "Kennisantwoord niet gevonden." }, { status: 404 })
  await logAuditEvent({ userId: auth.user.id, action: "mail.knowledge_changed", request, metadata: { answerId, operation: "updated" } })
  return NextResponse.json({ answer: data })
}
