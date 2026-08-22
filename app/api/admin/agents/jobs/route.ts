import { NextResponse } from "next/server"
import { requireAdminApiUser } from "@/lib/mail/admin-api"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET() {
  const auth = await requireAdminApiUser()
  if ("response" in auth) return auth.response
  const { data, error } = await (await createAdminClient()).from("agent_jobs").select("*").order("created_at", { ascending: false }).limit(100)
  if (error) return NextResponse.json({ error: "Agenttaken konden niet worden geladen." }, { status: 500 })
  return NextResponse.json({ jobs: data })
}
