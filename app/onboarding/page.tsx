import { redirect } from "next/navigation"

import { OnboardingShell } from "@/components/onboarding/onboarding-shell"
import { isOnboardingEnabled } from "@/lib/onboarding/config"
import { getAuthenticatedOnboardingState } from "@/lib/onboarding/queries"
import { getSafeOnboardingReturnTo } from "@/lib/onboarding/return-to"

export const metadata = {
  title: "Account instellen | FlexPagina",
  description: "Stel je FlexPagina-account en eerste website in.",
  robots: { index: false, follow: false },
}

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ returnTo?: string }> }) {
  if (!isOnboardingEnabled()) redirect("/editor")
  const { user, state } = await getAuthenticatedOnboardingState()
  if (!user || !state) redirect("/auth/login?next=/onboarding")
  if (state.completed) redirect("/editor")
  const params = await searchParams
  return <OnboardingShell initialState={state} returnTo={getSafeOnboardingReturnTo(params.returnTo)} />
}
