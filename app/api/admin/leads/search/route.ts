import { NextResponse } from "next/server"
import { z } from "zod"
import { runLeadSearch } from "@/lib/leads/runLeadSearch"
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit"
import { isAdmin } from "@/lib/security"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export const maxDuration = 300

const searchSchema = z.object({
  city: z.string().trim().min(2).max(80),
  category: z.string().trim().min(2).max(80),
  limit: z.coerce.number().int().min(1).max(25).default(25),
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) return NextResponse.json({ error: "Log eerst in." }, { status: 401 })
  if (!isAdmin(user)) return NextResponse.json({ error: "Geen beheerderstoegang." }, { status: 403 })

  const rateLimit = checkRateLimit(getRateLimitKey(request, `lead_search:${user.id}`), 5, 10 * 60 * 1000)
  if (!rateLimit.allowed) {
    const retryAfter = Math.max(1, Math.ceil((rateLimit.resetAt - Date.now()) / 1_000))
    return NextResponse.json(
      { error: "Te veel zoekopdrachten. Probeer het over enkele minuten opnieuw." },
      { status: 429, headers: { "Retry-After": String(retryAfter) } },
    )
  }

  const body = await request.json().catch(() => null)
  const parsed = searchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Vul een geldige plaats, branche en een aantal van 1 tot 25 in." }, { status: 400 })
  }

  const placesApiKey = process.env.GOOGLE_PLACES_API_KEY?.trim()
  if (!placesApiKey) {
    return NextResponse.json({ error: "GOOGLE_PLACES_API_KEY is niet ingesteld op de server." }, { status: 503 })
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "De server-side Supabase-configuratie ontbreekt." }, { status: 503 })
  }

  try {
    const admin = await createAdminClient()
    const result = await runLeadSearch({
      supabase: admin,
      city: parsed.data.city,
      category: parsed.data.category,
      limit: parsed.data.limit,
    })
    return NextResponse.json(result)
  } catch (error) {
    console.error("[lead-search] Search failed", {
      message: error instanceof Error ? error.message : "Onbekende fout",
    })
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Leads zoeken is mislukt." },
      { status: 502 },
    )
  }
}
