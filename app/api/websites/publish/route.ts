import { NextResponse } from "next/server"
import { logAuditEvent } from "@/lib/audit-log"
import { createClient } from "@/lib/supabase/server"
import { getUserSubscription } from "@/lib/subscriptions"

export async function POST(request: Request) {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const subscription = await getUserSubscription(supabase, user.id)

  const body = await request.json().catch(() => null)
  const websiteId = typeof body?.websiteId === "string" ? body.websiteId : null
  const published = typeof body?.published === "boolean" ? body.published : true

  if (!websiteId) {
    return NextResponse.json({ error: "Missing websiteId" }, { status: 400 })
  }

  const { data: targetWebsite, error: targetError } = await supabase
    .from("websites")
    .select("id, title, slug, published")
    .eq("id", websiteId)
    .eq("user_id", user.id)
    .single()

  if (targetError || !targetWebsite) {
    return NextResponse.json({ error: "Website not found" }, { status: 404 })
  }

  if (!published) {
    const { error: unpublishError } = await supabase
      .from("websites")
      .update({ published: false, updated_at: new Date().toISOString() })
      .eq("id", websiteId)
      .eq("user_id", user.id)

    if (unpublishError) {
      return NextResponse.json({ error: unpublishError.message }, { status: 500 })
    }

    await logAuditEvent({
      userId: user.id,
      websiteId,
      action: "website.unpublished",
      metadata: {
        title: targetWebsite.title,
        slug: targetWebsite.slug,
        previousPublished: targetWebsite.published,
        plan: subscription.planId,
      },
      request,
    })

    return NextResponse.json({ success: true, websiteId, published: false })
  }

  const { data: liveWebsite, error: liveError } = await supabase
    .from("websites")
    .select("id, title, slug")
    .eq("user_id", user.id)
    .eq("published", true)
    .neq("id", websiteId)
    .maybeSingle()

  if (liveError) {
    return NextResponse.json({ error: "Could not check the current live website" }, { status: 500 })
  }

  if (liveWebsite) {
    return NextResponse.json(
      {
        error: `Er is al een live website: ${liveWebsite.title || liveWebsite.slug}. Zet die eerst uit of wijzig welke website live moet zijn.`,
        liveWebsite,
      },
      { status: 409 },
    )
  }

  const { error: publishError } = await supabase
    .from("websites")
    .update({ published: true, updated_at: new Date().toISOString() })
    .eq("id", websiteId)
    .eq("user_id", user.id)

  if (publishError) {
    return NextResponse.json({ error: publishError.message }, { status: 500 })
  }

  await logAuditEvent({
    userId: user.id,
    websiteId,
    action: "website.published",
    metadata: {
      title: targetWebsite.title,
      slug: targetWebsite.slug,
      previousPublished: targetWebsite.published,
      plan: subscription.planId,
    },
    request,
  })

  return NextResponse.json({ success: true, websiteId, published: true })
}
