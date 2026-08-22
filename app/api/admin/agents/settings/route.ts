import { NextResponse } from "next/server"
import { agentSettingsUpdateSchema } from "@/lib/agents/schemas"
import { assertAgentAdminRateLimit, getAgentSettings } from "@/lib/agents/repository"
import { requireAdminApiUser } from "@/lib/mail/admin-api"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET() {
  const auth = await requireAdminApiUser()
  if ("response" in auth) return auth.response
  return NextResponse.json({ settings: await getAgentSettings(await createAdminClient()) })
}

export async function PATCH(request: Request) {
  const auth = await requireAdminApiUser()
  if ("response" in auth) return auth.response
  const parsed = agentSettingsUpdateSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success || Object.keys(parsed.data).length === 0) return NextResponse.json({ error: "Ongeldige instellingen." }, { status: 400 })
  const admin = await createAdminClient()
  try { await assertAgentAdminRateLimit(admin, auth.user.id) } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Actielimiet bereikt." }, { status: 429 }) }
  const current = await getAgentSettings(admin)
  if (current.observe_only && parsed.data.observe_only === false && parsed.data.confirm_execution_enable !== true) {
    return NextResponse.json({ error: "Bevestig expliciet dat echte uitvoering na approval wordt ingeschakeld." }, { status: 400 })
  }
  const supportModel = parsed.data.support_model ?? current.support_model
  const marketingModel = parsed.data.marketing_model ?? current.marketing_model
  if (!current.model_allowlist.includes(supportModel) || !current.model_allowlist.includes(marketingModel)) {
    return NextResponse.json({ error: "Het gekozen model staat niet op de allowlist." }, { status: 400 })
  }
  const settingsUpdate = { ...parsed.data }
  delete settingsUpdate.confirm_execution_enable
  if (Object.keys(settingsUpdate).length === 0) return NextResponse.json({ error: "Geen instellingen gewijzigd." }, { status: 400 })
  const { data, error } = await admin.from("agent_settings").update({ ...settingsUpdate, updated_by: auth.user.id }).eq("singleton_key", true).select("*").single()
  if (error || !data) return NextResponse.json({ error: "Instellingen konden niet worden opgeslagen." }, { status: 500 })
  await admin.from("agent_audit_logs").insert({ actor_type: "admin", actor_id: auth.user.id, event_type: "settings.updated", object_type: "agent_settings", metadata: { changedFields: Object.keys(settingsUpdate) } })
  return NextResponse.json({ settings: data })
}
