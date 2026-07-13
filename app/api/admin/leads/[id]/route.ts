import { NextResponse } from "next/server"
import { z } from "zod"
import { LEAD_STATUSES } from "@/lib/leads/types"
import { isAdmin } from "@/lib/security"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

const updateSchema = z.object({
  status: z.enum(LEAD_STATUSES).optional(),
  notes: z.string().max(5_000).nullable().optional(),
}).refine((value) => value.status !== undefined || value.notes !== undefined)

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) return NextResponse.json({ error: "Log eerst in." }, { status: 401 })
  if (!isAdmin(user)) return NextResponse.json({ error: "Geen beheerderstoegang." }, { status: 403 })
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return NextResponse.json({ error: "Serverconfiguratie ontbreekt." }, { status: 503 })

  const body = await request.json().catch(() => null)
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Ongeldige wijziging." }, { status: 400 })

  const { id } = await context.params
  if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: "Ongeldige lead." }, { status: 400 })

  const admin = await createAdminClient()
  const { data, error } = await admin
    .from("leads")
    .update(parsed.data)
    .eq("id", id)
    .select("id, status, notes, updated_at")
    .maybeSingle()

  if (error) return NextResponse.json({ error: "Lead kon niet worden bijgewerkt." }, { status: 500 })
  if (!data) return NextResponse.json({ error: "Lead niet gevonden." }, { status: 404 })

  return NextResponse.json({ lead: data })
}
