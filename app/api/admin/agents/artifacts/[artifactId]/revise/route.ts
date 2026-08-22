import { NextResponse } from "next/server"
import { z } from "zod"
import { artifactContentHash, assertAgentAdminRateLimit } from "@/lib/agents/repository"
import { supportArtifactContentSchema } from "@/lib/agents/schemas"
import { requireAdminApiUser } from "@/lib/mail/admin-api"
import { createAdminClient } from "@/lib/supabase/admin"

const bodySchema = z.object({ subject: z.string().trim().min(1).max(500), body: z.string().trim().min(1).max(8_000) })

export async function POST(request: Request, context: { params: Promise<{ artifactId: string }> }) {
  const auth = await requireAdminApiUser()
  if ("response" in auth) return auth.response
  const { artifactId } = await context.params
  const parsedBody = bodySchema.safeParse(await request.json().catch(() => null))
  if (!z.string().uuid().safeParse(artifactId).success || !parsedBody.success) return NextResponse.json({ error: "Ongeldige revisie." }, { status: 400 })
  const admin = await createAdminClient()
  try { await assertAgentAdminRateLimit(admin, auth.user.id) } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Actielimiet bereikt." }, { status: 429 }) }
  const { data: current } = await admin.from("agent_artifacts").select("content").eq("id", artifactId).single()
  const parsedContent = supportArtifactContentSchema.safeParse(current?.content)
  if (!parsedContent.success) return NextResponse.json({ error: "Dit artefact kan niet als supportantwoord worden bewerkt." }, { status: 400 })
  const content = { ...parsedContent.data, subject: parsedBody.data.subject, body: parsedBody.data.body }
  const { data, error } = await admin.rpc("revise_agent_artifact", {
    p_artifact_id: artifactId,
    p_actor_id: auth.user.id,
    p_title: content.subject,
    p_content: content,
    p_content_hash: artifactContentHash(content),
    p_action_type: "support.send_reply",
    p_risk_level: "medium",
    p_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1_000).toISOString(),
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 409 })
  return NextResponse.json({ revision: Array.isArray(data) ? data[0] : data })
}
