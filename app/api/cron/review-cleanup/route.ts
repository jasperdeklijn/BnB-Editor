import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
export const dynamic = "force-dynamic"
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const admin = await createAdminClient()
  const { error } = await admin.rpc("expire_unconfirmed_reviews")
  return NextResponse.json(error ? { error: "Opschoning niet uitgevoerd." } : { success: true }, { status: error ? 503 : 200, headers: { "Cache-Control": "no-store" } })
}
