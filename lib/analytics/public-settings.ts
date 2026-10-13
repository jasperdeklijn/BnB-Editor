import "server-only"
import { cache } from "react"
import { createAdminClient } from "@/lib/supabase/admin"
import { resolveEffectivePlan, type SubscriptionRecord } from "@/lib/subscriptions"
import type { WebsiteAnalyticsFields } from "@/lib/seo/metadata"

/** Share privacy/plan reads between metadata and rendering within one request. */
export const publicAnalyticsSettings = cache(async (websiteId: string) => {
  const admin = await createAdminClient()
  const website = await admin.from("websites").select("user_id,analytics").eq("id",websiteId).eq("published",true).maybeSingle()
  if (website.error || !website.data) return { analytics: null, advancedAllowed: false }
  const plan = await admin.from("subscriptions").select("plan_id,status,current_period_end").eq("user_id",website.data.user_id).maybeSingle()
  return {
    analytics: website.data.analytics as WebsiteAnalyticsFields | null,
    advancedAllowed: !plan.error && resolveEffectivePlan(plan.data as Pick<SubscriptionRecord,"plan_id"|"status"|"current_period_end"> | null).planId !== "bronze",
  }
})
