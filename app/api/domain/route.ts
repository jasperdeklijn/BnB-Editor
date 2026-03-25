import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// POST /api/domain — save a custom domain for the current user's website
export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const { slug, customDomain } = body as { slug: string; customDomain: string | null }

  if (!slug) {
    return NextResponse.json({ error: "Missing slug" }, { status: 400 })
  }

  // Normalize: strip protocol, www and trailing slash
  const normalized = customDomain
    ? customDomain
        .replace(/^https?:\/\//i, "")
        .replace(/^www\./i, "")
        .replace(/\/$/, "")
        .toLowerCase()
    : null

  const { error } = await supabase
    .from("websites")
    .update({ custom_domain: normalized })
    .eq("slug", slug)
    .eq("user_id", user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, customDomain: normalized })
}
