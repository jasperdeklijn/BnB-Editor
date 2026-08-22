import { NextResponse } from "next/server"
import { z } from "zod"
import { assertAgentAdminRateLimit } from "@/lib/agents/repository"
import { requireAdminApiUser } from "@/lib/mail/admin-api"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(request: Request, context: { params: Promise<{ jobId: string }> }) {
  const auth = await requireAdminApiUser()
  if ("response" in auth) return auth.response
  const { jobId } = await context.params
  const body = await request.json().catch(() => null)
  if (!z.string().uuid().safeParse(jobId).success || body?.confirm !== true) return NextResponse.json({ error: "Expliciete bevestiging ontbreekt." }, { status: 400 })
  const admin = await createAdminClient()
  try { await assertAgentAdminRateLimit(admin, auth.user.id) } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Actielimiet bereikt." }, { status: 429 }) }
  const { data, error } = await admin.rpc("retry_agent_job", { p_job_id: jobId, p_actor_id: auth.user.id })
  if (error) return NextResponse.json({ error: error.message }, { status: 409 })
  return NextResponse.json({ job: data })
}
