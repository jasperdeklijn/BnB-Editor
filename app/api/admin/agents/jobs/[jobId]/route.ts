import { NextResponse } from "next/server"
import { z } from "zod"
import { requireAdminApiUser } from "@/lib/mail/admin-api"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET(_request: Request, context: { params: Promise<{ jobId: string }> }) {
  const auth = await requireAdminApiUser()
  if ("response" in auth) return auth.response
  const { jobId } = await context.params
  if (!z.string().uuid().safeParse(jobId).success) return NextResponse.json({ error: "Ongeldige taak." }, { status: 400 })
  const admin = await createAdminClient()
  const [{ data: job }, { data: runs }, { data: artifacts }, { data: approvals }, { data: audit }] = await Promise.all([
    admin.from("agent_jobs").select("*").eq("id", jobId).maybeSingle(),
    admin.from("agent_runs").select("*").eq("job_id", jobId).order("created_at"),
    admin.from("agent_artifacts").select("*").eq("job_id", jobId).order("version"),
    admin.from("agent_approvals").select("*").eq("job_id", jobId).order("created_at"),
    admin.from("agent_audit_logs").select("*").eq("object_id", jobId).order("created_at"),
  ])
  if (!job) return NextResponse.json({ error: "Taak niet gevonden." }, { status: 404 })
  return NextResponse.json({ job, runs, artifacts, approvals, audit })
}
