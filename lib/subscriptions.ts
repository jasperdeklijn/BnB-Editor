import type { SupabaseClient } from "@supabase/supabase-js"
import { hasReviewCollectionAccess } from "@/lib/reviews/shared"

import { getPublishedPageLimit, getMinimumPlanForCapability, isBookingCapability, planMeetsRequirement, type EntitlementCapability } from "@/lib/entitlements"
import type {
  PlanId,
  SubscriptionStatus,
  UserBillingData,
} from "@/lib/types/pricing"

// Temporary access while paid subscriptions are unavailable. Keep stored billing
// records intact; disable together with the matching database policy to restore pricing.
export const DEFAULT_PLAN_ID: PlanId = "bronze"
export const DEFAULT_ALL_FEATURES_INCLUDED = true

export type SubscriptionSource = "subscription" | "default_fallback"

export interface SubscriptionRecord {
  id: string
  user_id: string
  plan_id: PlanId
  status: Exclude<SubscriptionStatus, "none">
  current_price: number
  currency: "EUR"
  current_period_start: string | null
  current_period_end: string | null
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  stripe_price_id: string | null
  booking_addon_active: boolean
  multilingual_addon_active: boolean
  multilingual_addon_price: number
  stripe_multilingual_addon_item_id: string | null
  created_at: string
  updated_at: string
}

export interface ResolvedSubscription {
  userId: string
  planId: PlanId
  storedPlanId: PlanId | null
  status: SubscriptionStatus
  source: SubscriptionSource
  record: SubscriptionRecord | null
}

const SUBSCRIPTION_COLUMNS = [
  "id",
  "user_id",
  "plan_id",
  "status",
  "current_price",
  "currency",
  "current_period_start",
  "current_period_end",
  "stripe_customer_id",
  "stripe_subscription_id",
  "stripe_price_id",
  "booking_addon_active",
  "multilingual_addon_active",
  "multilingual_addon_price",
  "stripe_multilingual_addon_item_id",
  "created_at",
  "updated_at",
].join(", ")

export function isPlanId(value: unknown): value is PlanId {
  return value === "bronze" || value === "silver" || value === "gold"
}

export function resolveEffectivePlan(
  record: Pick<SubscriptionRecord, "plan_id" | "status" | "current_period_end"> | null,
  now = new Date(),
): Pick<ResolvedSubscription, "planId" | "storedPlanId" | "status" | "source"> {
  if (!record) {
    return {
      planId: DEFAULT_ALL_FEATURES_INCLUDED ? "gold" : DEFAULT_PLAN_ID,
      storedPlanId: null,
      status: "none",
      source: "default_fallback",
    }
  }

  const storedPlanId = isPlanId(record.plan_id) ? record.plan_id : DEFAULT_PLAN_ID
  const paidThrough = record.current_period_end ? new Date(record.current_period_end) : null
  const canceledStillPaid =
    record.status === "canceled" &&
    paidThrough !== null &&
    !Number.isNaN(paidThrough.getTime()) &&
    paidThrough.getTime() > now.getTime()

  if (record.status === "active" || record.status === "trial" || canceledStillPaid) {
    return {
      planId: DEFAULT_ALL_FEATURES_INCLUDED ? "gold" : storedPlanId,
      storedPlanId,
      status: record.status,
      source: "subscription",
    }
  }

  return {
    planId: DEFAULT_ALL_FEATURES_INCLUDED ? "gold" : DEFAULT_PLAN_ID,
    storedPlanId,
    status: record.status,
    source: "default_fallback",
  }
}

export async function getUserSubscription(
  supabase: SupabaseClient,
  userId: string,
): Promise<ResolvedSubscription> {
  const querySubscription = (columns: string) => supabase
    .from("subscriptions")
    .select(columns)
    .eq("user_id", userId)
    .maybeSingle()

  let { data, error } = await querySubscription(SUBSCRIPTION_COLUMNS)

  // Allow the editor to load during a rolling schema deployment. Only retry
  // this specific missing column; unrelated database/auth failures still throw.
  const bookingColumnMissing = error && (
    (error.code === "42703" && /column (?:subscriptions\.)?booking_addon_active does not exist/i.test(error.message))
    || (error.code === "PGRST204" && /'booking_addon_active' column of 'subscriptions'/i.test(error.message))
  )
  if (bookingColumnMissing) {
    const legacyColumns = SUBSCRIPTION_COLUMNS.split(", ")
      .filter((column) => column !== "booking_addon_active")
      .join(", ")
    const legacyResult = await querySubscription(legacyColumns)
    data = legacyResult.data
    error = legacyResult.error
  }

  if (error) {
    throw new Error(`Could not resolve subscription: ${error.message}`)
  }

  const record = data ? {
    ...(data as unknown as SubscriptionRecord),
    booking_addon_active: (data as unknown as Record<string, unknown>).booking_addon_active === true,
    multilingual_addon_active: Boolean(
      (data as unknown as Record<string, unknown>).multilingual_addon_active,
    ),
    multilingual_addon_price: Number(
      (data as unknown as Record<string, unknown>).multilingual_addon_price ?? 2.99,
    ),
    stripe_multilingual_addon_item_id:
      typeof (data as unknown as Record<string, unknown>).stripe_multilingual_addon_item_id === "string"
        ? (data as unknown as Record<string, string>).stripe_multilingual_addon_item_id
        : null,
  } : null
  return {
    userId,
    record,
    ...resolveEffectivePlan(record),
  }
}

export function getSubscriptionAccessNotice(resolved: ResolvedSubscription): string | null {
  if (DEFAULT_ALL_FEATURES_INCLUDED) return "Je hebt tijdelijk gratis toegang tot alle Gold-functies, Booking & Facturatie en meertaligheid. Betaalde abonnementen zijn nog niet beschikbaar."
  const paidThrough = resolved.record?.current_period_end
    ? new Date(resolved.record.current_period_end)
    : null
  const formattedPaidThrough = paidThrough && !Number.isNaN(paidThrough.getTime())
    ? paidThrough.toLocaleDateString("nl-NL", { year: "numeric", month: "long", day: "numeric" })
    : null

  if (resolved.status === "canceled" && resolved.source === "subscription" && formattedPaidThrough) {
    return `Je abonnement is opgezegd. De huidige rechten blijven actief tot en met ${formattedPaidThrough}. Daarna gelden de basisrechten van Bronze. Je live content blijft behouden; kies bij een volgende publicatie welke pagina’s live blijven.`
  }

  if (resolved.status === "past_due") {
    return "De betaling is achterstallig. De basisrechten van Bronze gelden; bestaande live content blijft behouden."
  }

  if (resolved.status === "expired" || (resolved.status === "canceled" && resolved.source === "default_fallback")) {
    return "Het eerdere abonnement is niet meer actief. De basisrechten van Bronze gelden; bestaande live content blijft behouden."
  }

  return null
}

export function hasMultilingualWebsiteAccess(resolved: ResolvedSubscription): boolean {
  if (DEFAULT_ALL_FEATURES_INCLUDED) return true
  if (resolved.planId === "gold") return true

  return resolved.source === "subscription" && resolved.record?.multilingual_addon_active === true
}

export function hasBookingAddonAccess(resolved: ResolvedSubscription): boolean {
  if (DEFAULT_ALL_FEATURES_INCLUDED) return true
  return resolved.source === "subscription" && resolved.record?.booking_addon_active === true
}

export function hasSubscriptionCapability(resolved: ResolvedSubscription, capability: EntitlementCapability): boolean {
  if (DEFAULT_ALL_FEATURES_INCLUDED) return true
  if (["advanced_seo", "ga4_configuration", "detailed_analytics", "advanced_analytics"].includes(capability)) return planMeetsRequirement(resolved.planId, getMinimumPlanForCapability(capability))
  if (capability === "multipage_websites") return hasMultipageWebsiteAccess(resolved)
  if (capability === "review_collection") return hasReviewCollectionAccess(resolved)
  if (isBookingCapability(capability)) return hasBookingAddonAccess(resolved)
  if (capability === "service_management") return resolved.planId === "gold" || hasBookingAddonAccess(resolved)
  if (capability === "multilingual_websites") return hasMultilingualWebsiteAccess(resolved)
  return planMeetsRequirement(resolved.planId, getMinimumPlanForCapability(capability))
}

export function hasMultipageWebsiteAccess(resolved: ResolvedSubscription): boolean {
  return planMeetsRequirement(resolved.planId, "bronze")
}

export function getSubscriptionPageLimit(resolved: ResolvedSubscription): number | null {
  if (DEFAULT_ALL_FEATURES_INCLUDED) return null
  return getPublishedPageLimit(resolved.planId)
}

export function toUserBillingData(resolved: ResolvedSubscription): UserBillingData {
  const record = resolved.record

  return {
    userId: resolved.userId,
    currentPlan: resolved.planId,
    defaultFeaturesIncluded: DEFAULT_ALL_FEATURES_INCLUDED,
    storedPlan: resolved.storedPlanId,
    status: resolved.status,
    source: resolved.source,
    accessNotice: getSubscriptionAccessNotice(resolved),
    currentPrice:
      !DEFAULT_ALL_FEATURES_INCLUDED && resolved.source === "subscription" && record
        ? Number(record.current_price)
        : 0,
    nextBillingDate: !DEFAULT_ALL_FEATURES_INCLUDED && resolved.source === "subscription" && record?.status !== "canceled" && record?.current_period_end ? new Date(record.current_period_end) : null,
    addons: {
      bookingAddon: hasBookingAddonAccess(resolved),
      multilingualAddon:
        DEFAULT_ALL_FEATURES_INCLUDED || (resolved.source === "subscription" && record?.multilingual_addon_active === true),
    },
    invoices: [],
    createdAt: record ? new Date(record.created_at) : null,
  }
}
