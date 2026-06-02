import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getOrCreateBusiness } from "@/lib/supabase/business"
import { BusinessDetailsClient } from "@/components/business/business-details-client"

export const metadata = {
  title: "Bedrijfsgegevens | Website Maker",
  description: "Beheer de gegevens van uw bedrijf",
}

export default async function BusinessPage() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect("/auth/login")
  }

  const business = await getOrCreateBusiness()

  return <BusinessDetailsClient initialBusiness={business} />
}
