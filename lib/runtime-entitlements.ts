import type { SupabaseClient } from "@supabase/supabase-js"

import {
  getMinimumPlanForCapability,
  planMeetsRequirement,
  type EntitlementCapability,
} from "@/lib/entitlements"
import { getUserSubscription } from "@/lib/subscriptions"
import type { PlanId } from "@/lib/types/pricing"
import { shouldEnforcePlanEntitlements } from "@/lib/plan-enforcement"

export interface RuntimeEntitlementDecision {
  allowed: boolean
  currentPlan: PlanId
  requiredPlan: PlanId
  capability: EntitlementCapability
}

export class RuntimeEntitlementError extends Error {
  readonly code = "RUNTIME_ENTITLEMENT_REQUIRED"

  constructor(readonly decision: RuntimeEntitlementDecision) {
    super(`Deze actie vereist het ${decision.requiredPlan}-abonnement.`)
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
    allowed: planMeetsRequirement(subscription.planId, requiredPlan),
    currentPlan: subscription.planId,
    requiredPlan,
    capability,
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
