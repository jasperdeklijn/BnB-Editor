import { NextResponse } from "next/server"

import { getEnvironmentReadiness } from "@/lib/environment-readiness"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

export async function GET() {
  const checkedAt = new Date().toISOString()
  const environment = getEnvironmentReadiness()
  let database = false

  if (environment.missing.core.every((name) => name !== "NEXT_PUBLIC_SUPABASE_URL" && name !== "SUPABASE_SERVICE_ROLE_KEY")) {
    try {
      const admin = await createAdminClient()
      const { error } = await admin.from("websites").select("id", { head: true, count: "exact" }).limit(1)
      database = !error
    } catch {
      database = false
    }
  }

  const ready = environment.ready && database
  return NextResponse.json(
    {
      status: ready ? "ready" : "not_ready",
      checkedAt,
      checks: { environment: environment.ready, database },
    },
    {
      status: ready ? 200 : 503,
      headers: { "cache-control": "no-store, max-age=0" },
    },
  )
}
