import { NextResponse } from "next/server"
import { z } from "zod"
import { isAdmin } from "@/lib/security"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

const settingsSchema = z.object({
  enabled: z.boolean(),
  cities: z.array(z.string().trim().min(2).max(80)).min(1).max(25),
  categories: z.array(z.string().trim().min(2).max(80)).min(1).max(25),
  weeklyLimit: z.coerce.number().int().min(1).max(25),
  emailNotificationsEnabled: z.boolean(),
})

function unique(values: string[]) {
  return [...new Map(values.map((value) => [value.toLocaleLowerCase("nl-NL"), value.trim()])).values()]
}

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: "Log eerst in." }, { status: 401 })
  if (!isAdmin(user)) return NextResponse.json({ error: "Geen beheerderstoegang." }, { status: 403 })
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return NextResponse.json({ error: "Serverconfiguratie ontbreekt." }, { status: 503 })

  const parsed = settingsSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: "Vul minimaal één geldige plaats en branche in. De weeklimiet is 1 tot 25." }, { status: 400 })
  }

  const admin = await createAdminClient()
  const { data, error } = await admin
    .from("lead_agent_settings")
    .upsert({
      singleton_key: true,
      enabled: parsed.data.enabled,
      cities: unique(parsed.data.cities),
      categories: unique(parsed.data.categories),
      weekly_limit: parsed.data.weeklyLimit,
      email_notifications_enabled: parsed.data.emailNotificationsEnabled,
    }, { onConflict: "singleton_key" })
    .select("*")
    .single()

  if (error) {
    console.error("[lead-settings] Settings update failed", { code: error.code })
    return NextResponse.json({ error: "Instellingen konden niet worden opgeslagen." }, { status: 500 })
  }

  return NextResponse.json({ settings: data })
}
