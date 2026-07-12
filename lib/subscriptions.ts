import type { SupabaseClient } from "@supabase/supabase-js"

import { getPlanById } from "@/lib/pricing"
import type {
  PlanId,
  SubscriptionStatus,
  UserBillingData,
} from "@/lib/types/pricing"

export const DEFAULT_PLAN_ID: PlanId = "bronze"

export type SubscriptionSource = "subscription" | "bronze_fallback"

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
      source: "bronze_fallback",
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
    source: "bronze_fallback",
  }
}

export async function getUserSubscription(
  supabase: SupabaseClient,
  userId: string,
): Promise<ResolvedSubscription> {
  const { data, error } = await supabase
    .from("subscriptions")
    .select(SUBSCRIPTION_COLUMNS)
    .eq("user_id", userId)
    .maybeSingle()

  if (error) {
    throw new Error(`Could not resolve subscription: ${error.message}`)
  }

  const record = data ? (data as unknown as SubscriptionRecord) : null
  return {
    userId,
    record,
    ...resolveEffectivePlan(record),
  }
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
    currentPrice:
      resolved.source === "subscription" && record
        ? Number(record.current_price)
        : plan.monthlyPrice,
    nextBillingDate:
      resolved.source === "subscription" && record?.current_period_end
        ? new Date(record.current_period_end)
        : null,
    addons: { bookingAddon: false },
    invoices: [],
    createdAt: record ? new Date(record.created_at) : null,
  }
}
