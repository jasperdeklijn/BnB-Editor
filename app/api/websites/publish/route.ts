import { NextResponse } from "next/server"
import { logAuditEvent } from "@/lib/audit-log"
import { createClient } from "@/lib/supabase/server"
import { getUserSubscription } from "@/lib/subscriptions"
import { buildWebsiteLiveSnapshot } from "@/lib/website-snapshot"
import { inspectWebsiteEntitlements } from "@/lib/entitlements"
import { getPlanEnforcementMode, shouldEnforcePlanEntitlements } from "@/lib/plan-enforcement"
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit"

export async function POST(request: Request) {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const rateLimit = checkRateLimit(getRateLimitKey(request, `website_publish:${user.id}`), 12, 10 * 60 * 1000)
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Te veel publicatiepogingen. Probeer het later opnieuw." }, { status: 429 })
  }

  const subscription = await getUserSubscription(supabase, user.id)
  const currentPlan = subscription.planId
  const enforcementMode = getPlanEnforcementMode()

  const body = await request.json().catch(() => null)
  const websiteId = typeof body?.websiteId === "string" ? body.websiteId : null
  const published = typeof body?.published === "boolean" ? body.published : true
  const acknowledgeStaleTranslations = body?.acknowledgeStaleTranslations === true

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
        plan: currentPlan,
      },
      request,
    })

    return NextResponse.json({ success: true, websiteId, published: false })
  }

  let liveSnapshot
  try {
    liveSnapshot = await buildWebsiteLiveSnapshot({
      supabase,
      websiteId,
      userId: user.id,
      ownerEmail: user.email,
    })
  } catch (snapshotError) {
    const snapshotMessage = snapshotError instanceof Error ? snapshotError.message : ""
    const translationsIncomplete = snapshotMessage.includes("vertaling") || snapshotMessage.includes("Vertaling")
    await logAuditEvent({
      userId: user.id,
      websiteId,
      action: "website.publish_denied",
      metadata: {
        reason: "snapshot_build_failed",
        plan: currentPlan,
      },
      request,
    })
    return NextResponse.json(
      {
        error:
          snapshotError instanceof Error
            ? `De live versie kon niet worden opgebouwd: ${snapshotError.message}`
            : "De live versie kon niet worden opgebouwd.",
      },
      { status: translationsIncomplete ? 422 : 500 },
    )
  }

  if (liveSnapshot.translationWarnings?.length && !acknowledgeStaleTranslations) {
    await logAuditEvent({
      userId: user.id,
      websiteId,
      action: "website.publish_denied",
      metadata: {
        reason: "stale_translations_not_acknowledged",
        warningCount: liveSnapshot.translationWarnings.length,
        locales: [...new Set(liveSnapshot.translationWarnings.map((warning) => warning.locale))],
      },
      request,
    })
    return NextResponse.json({
      error: "Een of meer vertalingen zijn verouderd. Controleer de lijst en bevestig dat je toch wilt publiceren.",
      code: "STALE_TRANSLATIONS",
      warnings: liveSnapshot.translationWarnings,
    }, { status: 409 })
  }

  const entitlementResult = inspectWebsiteEntitlements(currentPlan, {
    sections: liveSnapshot.sections,
  })

  if (!entitlementResult.allowed) {
    await logAuditEvent({
      userId: user.id,
      websiteId,
      action: "website.publish_denied",
      metadata: {
        title: targetWebsite.title,
        slug: targetWebsite.slug,
        previousPublished: targetWebsite.published,
        plan: currentPlan,
        requiredPlan: entitlementResult.requiredPlan,
        violationCodes: entitlementResult.violations.map((violation) => violation.code),
        violationCapabilities: entitlementResult.violations
          .map((violation) => violation.capability)
          .filter(Boolean),
        enforcementMode,
      },
      request,
    })

    if (shouldEnforcePlanEntitlements(enforcementMode)) {
      return NextResponse.json(
        {
          error: "Deze conceptversie bevat onderdelen die niet binnen het huidige abonnement live mogen.",
          code: "ENTITLEMENT_VIOLATIONS",
          currentPlan,
          requiredPlan: entitlementResult.requiredPlan,
          violations: entitlementResult.violations,
        },
        { status: 422 },
      )
    }
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
    await logAuditEvent({
      userId: user.id,
      websiteId,
      action: "website.publish_denied",
      metadata: {
        reason: "another_website_is_live",
        plan: currentPlan,
        conflictingWebsiteId: liveWebsite.id,
      },
      request,
    })
    return NextResponse.json(
      {
        error: `Er is al een live website: ${liveWebsite.title || liveWebsite.slug}. Zet die eerst uit of wijzig welke website live moet zijn.`,
        liveWebsite,
      },
      { status: 409 },
    )
  }

  const { data: promotionStatus, error: publishError } = await supabase.rpc(
    "promote_website_live_snapshot",
    {
      p_website_id: websiteId,
      p_expected_draft_version: liveSnapshot.draftVersion,
      p_expected_subscription_updated_at: subscription.record?.updated_at ?? null,
      p_live_snapshot: liveSnapshot,
      p_live_published_at: liveSnapshot.publishedAt,
    },
  )

  if (publishError || promotionStatus !== "published") {
    const stateChanged = promotionStatus === "draft_changed" || promotionStatus === "subscription_changed"
    const liveConflict = promotionStatus === "live_website_exists"
    await logAuditEvent({
      userId: user.id,
      websiteId,
      action: "website.publish_denied",
      metadata: {
        reason: promotionStatus || "live_snapshot_update_failed",
        plan: currentPlan,
      },
      request,
    })
    return NextResponse.json(
      {
        error: stateChanged
          ? "Het concept of abonnement veranderde tijdens de controle. Controleer de nieuwste wijzigingen en probeer opnieuw."
          : liveConflict
            ? "Er is ondertussen een andere website live gezet. Zet die eerst uit."
            : publishError?.message || "De live versie kon niet atomair worden bijgewerkt.",
        code: stateChanged ? "PUBLISH_STATE_CHANGED" : liveConflict ? "LIVE_WEBSITE_CONFLICT" : "PUBLISH_FAILED",
      },
      { status: stateChanged || liveConflict ? 409 : 500 },
    )
  }

  await logAuditEvent({
    userId: user.id,
    websiteId,
    action: "website.published",
    metadata: {
      title: targetWebsite.title,
      slug: targetWebsite.slug,
      previousPublished: targetWebsite.published,
      plan: currentPlan,
      snapshotVersion: liveSnapshot.version,
      livePublishedAt: liveSnapshot.publishedAt,
      draftVersion: liveSnapshot.draftVersion,
      enforcementMode,
    },
    request,
  })

  return NextResponse.json({ success: true, websiteId, published: true })
}
