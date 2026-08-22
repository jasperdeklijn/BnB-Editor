import { NextResponse } from "next/server"
import { dispatchAgentJobs } from "@/lib/agents/processor"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"
export const maxDuration = 300

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return NextResponse.json({ error: "Agent server configuration is incomplete." }, { status: 503 })
  try {
    return NextResponse.json(await dispatchAgentJobs(await createAdminClient()))
  } catch (error) {
    console.error("[agent-dispatch] dispatch failed", error)
    return NextResponse.json({ error: "Agentdispatch is mislukt." }, { status: 500 })
  }
}
