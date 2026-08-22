import { NextResponse } from "next/server"
import { z } from "zod"
import { assertAgentAdminRateLimit } from "@/lib/agents/repository"
import { requireAdminApiUser } from "@/lib/mail/admin-api"
import { createAdminClient } from "@/lib/supabase/admin"

const bodySchema = z.object({ confirm: z.literal(true), note: z.string().trim().max(2_000).optional() })

export async function POST(request: Request, context: { params: Promise<{ approvalId: string }> }) {
  const auth = await requireAdminApiUser()
  if ("response" in auth) return auth.response
  const { approvalId } = await context.params
  if (!z.string().uuid().safeParse(approvalId).success) return NextResponse.json({ error: "Ongeldige goedkeuring." }, { status: 400 })
  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Expliciete bevestiging ontbreekt." }, { status: 400 })
  const admin = await createAdminClient()
  try { await assertAgentAdminRateLimit(admin, auth.user.id) } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Actielimiet bereikt." }, { status: 429 }) }
  const { data, error } = await admin.rpc("decide_agent_approval", { p_approval_id: approvalId, p_decision: "reject", p_decided_by: auth.user.id, p_note: parsed.data.note ?? null })
  if (error) return NextResponse.json({ error: error.message }, { status: 409 })
  return NextResponse.json({ decision: Array.isArray(data) ? data[0] : data })
}
