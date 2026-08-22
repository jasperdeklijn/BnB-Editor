import { NextResponse } from "next/server"
import { z } from "zod"
import { requireAdminApiUser } from "@/lib/mail/admin-api"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET(_request: Request, context: { params: Promise<{ runId: string }> }) {
  const auth = await requireAdminApiUser()
  if ("response" in auth) return auth.response
  const { runId } = await context.params
  if (!z.string().uuid().safeParse(runId).success) return NextResponse.json({ error: "Ongeldige run." }, { status: 400 })
  const admin = await createAdminClient()
  const [{ data: run }, { data: artifacts }] = await Promise.all([
    admin.from("agent_runs").select("*").eq("id", runId).maybeSingle(),
    admin.from("agent_artifacts").select("*").eq("run_id", runId).order("version"),
  ])
  if (!run) return NextResponse.json({ error: "Run niet gevonden." }, { status: 404 })
  return NextResponse.json({ run, artifacts })
}
