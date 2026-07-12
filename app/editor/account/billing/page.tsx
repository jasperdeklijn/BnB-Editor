import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { BillingClient } from "@/components/billing/billing-client"
import { EditorPageShell } from "@/components/editor/editor-page-shell"
import { getUserSubscription, toUserBillingData } from "@/lib/subscriptions"

export const metadata = {
  title: "Facturering | Website Maker",
  description: "Beheer je abonnement en facturatiegegevens",
}

/**
 * Billing Page (Server Component)
 * Requires authentication, fetches user subscription data, renders BillingClient
 */
export default async function BillingPage() {
  const supabase = await createClient()

  // Get authenticated user
  const { data, error } = await supabase.auth.getUser()

  // Redirect to login if not authenticated
  if (error || !data?.user) {
    redirect("/auth/login")
  }

  const subscription = await getUserSubscription(supabase, data.user.id)
  const billingData = toUserBillingData(subscription)

  return (
    <EditorPageShell
      title="Facturering"
      description="Beheer uw abonnement, betaalgegevens en factuuroverzicht."
      maxWidth="7xl"
    >
      <BillingClient billingData={billingData} userId={data.user.id} />
    </EditorPageShell>
  )
}

