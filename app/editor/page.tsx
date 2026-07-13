import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { EditorClient } from "@/components/editor/editor-client"
import { getSubscriptionAccessNotice, getUserSubscription } from "@/lib/subscriptions"
import { getPlanEnforcementMode } from "@/lib/plan-enforcement"

export default async function EditorPage() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect("/auth/login")
  }

  const subscription = await getUserSubscription(supabase, data.user.id)

  return (
    <EditorClient
      userId={data.user.id}
      currentPlan={subscription.planId}
      subscriptionNotice={getSubscriptionAccessNotice(subscription)}
      enforcementMode={getPlanEnforcementMode()}
    />
  )
}
