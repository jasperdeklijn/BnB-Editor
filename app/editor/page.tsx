import { redirect } from "next/navigation"
import { EditorClient } from "@/components/editor/editor-client"
import { getSubscriptionAccessNotice, getUserSubscription, hasMultilingualWebsiteAccess } from "@/lib/subscriptions"
import { getPlanEnforcementMode } from "@/lib/plan-enforcement"
import { getEditorBootstrap } from "@/lib/editor-bootstrap"

export default async function EditorPage() {
  const { supabase, user, businessId, businessCategory } = await getEditorBootstrap()
  if (!user) {
    redirect("/auth/login")
  }

  const subscription = await getUserSubscription(supabase, user.id)

  return (
    <EditorClient
      userId={user.id}
      initialBusinessId={businessId}
      initialBusinessCategory={businessCategory}
      currentPlan={subscription.planId}
      hasMultilingualAccess={hasMultilingualWebsiteAccess(subscription)}
      subscriptionNotice={getSubscriptionAccessNotice(subscription)}
      enforcementMode={getPlanEnforcementMode()}
    />
  )
}
