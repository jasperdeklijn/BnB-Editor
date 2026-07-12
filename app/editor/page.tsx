import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { createClient } from "@/lib/supabase/server"
import { EditorClient } from "@/components/editor/editor-client"
import { getSubscriptionAccessNotice, getUserSubscription } from "@/lib/subscriptions"
import { readTierTestPlan } from "@/lib/tier-test-override"
import { getPlanEnforcementMode } from "@/lib/plan-enforcement"

export default async function EditorPage() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect("/auth/login")
  }

  const subscription = await getUserSubscription(supabase, data.user.id)
  const testPlan = readTierTestPlan(await cookies())

  return (
    <EditorClient
      userId={data.user.id}
      realPlan={subscription.planId}
      currentPlan={testPlan ?? subscription.planId}
      isTierTestOverride={Boolean(testPlan)}
      subscriptionNotice={getSubscriptionAccessNotice(subscription)}
      enforcementMode={getPlanEnforcementMode()}
    />
  )
}
