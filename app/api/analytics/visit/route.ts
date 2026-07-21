import { NextResponse } from "next/server"

import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit"
import { createAdminClient } from "@/lib/supabase/admin"

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function POST(request: Request) {
  const rateLimit = checkRateLimit(getRateLimitKey(request, "website_visit"), 60, 60 * 60 * 1000)
  if (!rateLimit.allowed) return new NextResponse(null, { status: 204 })

  const body = await request.json().catch(() => null)
  const websiteId = typeof body?.websiteId === "string" ? body.websiteId : ""
  if (!UUID_PATTERN.test(websiteId)) {
    return NextResponse.json({ error: "Ongeldige website." }, { status: 400 })
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return new NextResponse(null, { status: 204 })

  const admin = await createAdminClient()
  const { data: website, error: websiteError } = await admin
    .from("websites")
    .select("id")
    .eq("id", websiteId)
    .eq("published", true)
    .maybeSingle()

  if (websiteError || !website) return new NextResponse(null, { status: 204 })

  const { error } = await admin.from("website_visits").insert({ website_id: websiteId })
  if (error) {
    console.warn("[Analytics] Website visit could not be recorded", { websiteId, error: error.message })
  }

  return new NextResponse(null, { status: 204 })
}
