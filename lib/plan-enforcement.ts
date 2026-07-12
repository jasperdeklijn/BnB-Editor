export type PlanEnforcementMode = "off" | "warn" | "enforce"

export function getPlanEnforcementMode(): PlanEnforcementMode {
  const configured = process.env.PLAN_ENFORCEMENT_MODE
  if (configured === "off" || configured === "warn" || configured === "enforce") return configured
  return "enforce"
}

export function shouldEnforcePlanEntitlements(mode = getPlanEnforcementMode()): boolean {
  return mode === "enforce"
}
