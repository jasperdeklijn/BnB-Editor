import type { SupabaseClient } from "@supabase/supabase-js"

import {
  getMinimumPlanForCapability,
  isBookingCapability,
  type EntitlementCapability,
} from "@/lib/entitlements"
import { getUserSubscription, hasSubscriptionCapability } from "@/lib/subscriptions"
import type { PlanId } from "@/lib/types/pricing"
import { shouldEnforcePlanEntitlements } from "@/lib/plan-enforcement"
import { BOOKING_ADDON_NAME, BOOKING_ADDON_MONTHLY_PRICE, formatPrice } from "@/lib/pricing"

export interface RuntimeEntitlementDecision {
  allowed: boolean
  currentPlan: PlanId
  requiredPlan: PlanId
  capability: EntitlementCapability
  requiredAddon?: "bookingAddon"
}

export class RuntimeEntitlementError extends Error {
  readonly code = "RUNTIME_ENTITLEMENT_REQUIRED"

  constructor(readonly decision: RuntimeEntitlementDecision) {
    super(decision.requiredAddon === "bookingAddon"
      ? `Deze actie vereist ${BOOKING_ADDON_NAME} (${formatPrice(BOOKING_ADDON_MONTHLY_PRICE)} per maand exclusief btw).`
      : decision.capability === "service_management"
        ? `Diensten beheren is inbegrepen bij Gold of ${BOOKING_ADDON_NAME}.`
        : `Deze actie vereist het ${decision.requiredPlan}-abonnement.`)
    this.name = "RuntimeEntitlementError"
  }
}

export async function getUserRuntimeEntitlement(
  supabase: SupabaseClient,
  userId: string,
  capability: EntitlementCapability,
): Promise<RuntimeEntitlementDecision> {
  const subscription = await getUserSubscription(supabase, userId)
  const requiredPlan = getMinimumPlanForCapability(capability)
  return {
    allowed: hasSubscriptionCapability(subscription, capability),
    currentPlan: subscription.planId,
    requiredPlan,
    capability,
    ...(isBookingCapability(capability) ? { requiredAddon: "bookingAddon" as const } : {}),
  }
}

export async function assertUserRuntimeEntitlement(
  supabase: SupabaseClient,
  userId: string,
  capability: EntitlementCapability,
): Promise<RuntimeEntitlementDecision> {
  const decision = await getUserRuntimeEntitlement(supabase, userId, capability)
  if (!decision.allowed && shouldEnforcePlanEntitlements()) throw new RuntimeEntitlementError(decision)
  return decision
}

export async function assertCurrentUserRuntimeEntitlement(
  supabase: SupabaseClient,
  capability: EntitlementCapability,
): Promise<RuntimeEntitlementDecision> {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error("Not authenticated")
  return assertUserRuntimeEntitlement(supabase, user.id, capability)
}
