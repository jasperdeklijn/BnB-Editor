import type { SupabaseClient } from "@supabase/supabase-js"

import { getPlanById } from "@/lib/pricing"
import type {
  PlanId,
  SubscriptionStatus,
  UserBillingData,
} from "@/lib/types/pricing"

// Temporary product default: accounts without a valid subscription receive Gold.
export const DEFAULT_PLAN_ID: PlanId = "gold"

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
  "multilingual_addon_active",
  "multilingual_addon_price",
  "stripe_multilingual_addon_item_id",
  "created_at",
  "updated_at",
].join(", ")

const LEGACY_SUBSCRIPTION_COLUMNS = [
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
  "created_at",
  "updated_at",
].join(", ")

export function isPlanId(value: unknown): value is PlanId {
  return value === "bronze" || value === "silver" || value === "gold"
}

export function resolveEffectivePlan(
  record: SubscriptionRecord | null,
  now = new Date(),
): Pick<ResolvedSubscription, "planId" | "storedPlanId" | "status" | "source"> {
  if (!record) {
    return {
      planId: DEFAULT_PLAN_ID,
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
      planId: storedPlanId,
      storedPlanId,
      status: record.status,
      source: "subscription",
    }
  }

  return {
    planId: DEFAULT_PLAN_ID,
    storedPlanId,
    status: record.status,
    source: "default_fallback",
  }
}

export async function getUserSubscription(
  supabase: SupabaseClient,
  userId: string,
): Promise<ResolvedSubscription> {
  let { data, error } = await supabase
    .from("subscriptions")
    .select(SUBSCRIPTION_COLUMNS)
    .eq("user_id", userId)
    .maybeSingle()

  if (error?.code === "42703" && error.message.includes("multilingual_addon")) {
    const legacyResult = await supabase
      .from("subscriptions")
      .select(LEGACY_SUBSCRIPTION_COLUMNS)
      .eq("user_id", userId)
      .maybeSingle()
    data = legacyResult.data
    error = legacyResult.error
  }

  if (error) {
    throw new Error(`Could not resolve subscription: ${error.message}`)
  }

  const record = data ? {
    ...(data as unknown as SubscriptionRecord),
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
  const paidThrough = resolved.record?.current_period_end
    ? new Date(resolved.record.current_period_end)
    : null
  const formattedPaidThrough = paidThrough && !Number.isNaN(paidThrough.getTime())
    ? paidThrough.toLocaleDateString("nl-NL", { year: "numeric", month: "long", day: "numeric" })
    : null

  if (resolved.status === "canceled" && resolved.source === "subscription" && formattedPaidThrough) {
    return `Je abonnement is opgezegd. De huidige rechten blijven actief tot en met ${formattedPaidThrough}. Daarna geldt tijdelijk het standaardabonnement Gold.`
  }

  if (resolved.status === "past_due") {
    return "De betaling is achterstallig. Voor nu geldt tijdelijk het standaardabonnement Gold."
  }

  if (resolved.status === "expired" || (resolved.status === "canceled" && resolved.source === "default_fallback")) {
    return "Het eerdere abonnement is niet meer actief. Voor nu geldt tijdelijk het standaardabonnement Gold."
  }

  return null
}

export function hasMultilingualWebsiteAccess(resolved: ResolvedSubscription): boolean {
  if (resolved.planId === "gold") return true

  return resolved.source === "subscription" && resolved.record?.multilingual_addon_active === true
}

export function toUserBillingData(resolved: ResolvedSubscription): UserBillingData {
  const plan = getPlanById(resolved.planId)
  const record = resolved.record

  return {
    userId: resolved.userId,
    currentPlan: resolved.planId,
    storedPlan: resolved.storedPlanId,
    status: resolved.status,
    source: resolved.source,
    accessNotice: getSubscriptionAccessNotice(resolved),
    currentPrice:
      resolved.source === "subscription" && record
        ? Number(record.current_price)
        : plan.monthlyPrice,
    nextBillingDate: record?.current_period_end ? new Date(record.current_period_end) : null,
    addons: {
      bookingAddon: false,
      multilingualAddon:
        resolved.source === "subscription" && record?.multilingual_addon_active === true,
    },
    invoices: [],
    createdAt: record ? new Date(record.created_at) : null,
  }
}
