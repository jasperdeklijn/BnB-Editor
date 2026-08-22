import { NextResponse } from "next/server"

import { isOnboardingEnabled } from "@/lib/onboarding/config"
import { isReservedOnboardingSlug, isValidOnboardingSlug, normalizeOnboardingSlug } from "@/lib/onboarding/slug"
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  if (!isOnboardingEnabled()) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const supabase = await createClient()
  const { data: authData, error: authError } = await supabase.auth.getUser()
  if (authError || !authData.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const limit = checkRateLimit(getRateLimitKey(request, `onboarding_slug:${authData.user.id}`), 30, 60_000)
  if (!limit.allowed) return NextResponse.json({ error: "Te veel controles." }, { status: 429 })

  const rawSlug = new URL(request.url).searchParams.get("slug") ?? ""
  const slug = normalizeOnboardingSlug(rawSlug)
  if (!isValidOnboardingSlug(slug) || isReservedOnboardingSlug(slug)) {
    return NextResponse.json({ available: false, slug })
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_website_id")
    .eq("id", authData.user.id)
    .maybeSingle()

  let query = supabase.from("websites").select("id").ilike("slug", slug).limit(1)
  if (profile?.onboarding_website_id) query = query.neq("id", profile.onboarding_website_id)
  const { data, error } = await query
  if (error) return NextResponse.json({ error: "Beschikbaarheid kon niet worden gecontroleerd." }, { status: 500 })

  return NextResponse.json({ available: (data ?? []).length === 0, slug }, { headers: { "Cache-Control": "no-store" } })
}

