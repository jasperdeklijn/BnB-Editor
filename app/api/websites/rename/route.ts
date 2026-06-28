import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

function slugifyWebsiteName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export async function POST(request: Request) {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const websiteId = typeof body?.websiteId === "string" ? body.websiteId : null
  const title = typeof body?.title === "string" ? body.title.trim() : ""
  const slug = slugifyWebsiteName(title)

  if (!websiteId) {
    return NextResponse.json({ error: "Missing websiteId" }, { status: 400 })
  }

  if (!title || !slug) {
    return NextResponse.json({ error: "Vul een geldige websitenaam in." }, { status: 400 })
  }

  const { data: website, error: websiteError } = await supabase
    .from("websites")
    .select("id")
    .eq("id", websiteId)
    .eq("user_id", user.id)
    .single()

  if (websiteError || !website) {
    return NextResponse.json({ error: "Website not found" }, { status: 404 })
  }

  const { data: slugOwner, error: slugError } = await supabase
    .from("websites")
    .select("id")
    .eq("slug", slug)
    .neq("id", websiteId)
    .maybeSingle()

  if (slugError) {
    return NextResponse.json({ error: "Kon de websitenaam niet controleren." }, { status: 500 })
  }

  if (slugOwner) {
    return NextResponse.json({ error: "Deze websitenaam is al in gebruik. Kies een unieke naam." }, { status: 409 })
  }

  const { data: updatedWebsite, error: updateError } = await supabase
    .from("websites")
    .update({ title, slug, updated_at: new Date().toISOString() })
    .eq("id", websiteId)
    .eq("user_id", user.id)
    .select("id, title, slug, published, custom_domain, created_at")
    .single()

  if (updateError || !updatedWebsite) {
    return NextResponse.json({ error: updateError?.message || "Website kon niet worden bijgewerkt." }, { status: 500 })
  }

  return NextResponse.json({ success: true, website: updatedWebsite })
}
