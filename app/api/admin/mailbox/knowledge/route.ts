import { NextResponse } from "next/server"
import { z } from "zod"
import { logAuditEvent } from "@/lib/audit-log"
import { requireAdminApiUser } from "@/lib/mail/admin-api"
import { createAdminClient } from "@/lib/supabase/admin"

const schema = z.object({
  question: z.string().trim().min(3).max(500),
  answer: z.string().trim().min(3).max(5_000),
  keywords: z.array(z.string().trim().min(2).max(80)).max(30).default([]),
  category: z.string().trim().min(2).max(80).default("algemeen"),
  status: z.enum(["draft", "active"]).default("draft"),
  priority: z.coerce.number().int().min(0).max(100).default(0),
})

export async function GET() {
  const auth = await requireAdminApiUser()
  if ("response" in auth) return auth.response
  const admin = await createAdminClient()
  const { data, error } = await admin.from("mail_knowledge_answers").select("*").order("priority", { ascending: false }).order("updated_at", { ascending: false })
  if (error) return NextResponse.json({ error: "Kennisbank kon niet worden geladen." }, { status: 500 })
  return NextResponse.json({ answers: data ?? [] })
}

export async function POST(request: Request) {
  const auth = await requireAdminApiUser()
  if ("response" in auth) return auth.response
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Controleer vraag, antwoord en trefwoorden." }, { status: 400 })
  const admin = await createAdminClient()
  const { data, error } = await admin.from("mail_knowledge_answers").insert({ ...parsed.data, language: "nl", created_by: auth.user.id, updated_by: auth.user.id }).select("*").single()
  if (error) return NextResponse.json({ error: "Antwoord kon niet worden toegevoegd." }, { status: 500 })
  await logAuditEvent({ userId: auth.user.id, action: "mail.knowledge_changed", request, metadata: { answerId: data.id, operation: "created" } })
  return NextResponse.json({ answer: data }, { status: 201 })
}
