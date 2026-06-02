import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getOrCreateBusiness } from "@/lib/supabase/business"
import { getServices } from "@/lib/supabase/services"
import { ServicesClient } from "@/components/business/services-client"

export const metadata = {
  title: "Diensten | Website Maker",
  description: "Beheer de diensten van uw bedrijf",
}

export default async function ServicesPage() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect("/auth/login")
  }

  const business = await getOrCreateBusiness()
  const services = await getServices(business.id)

  return (
    <ServicesClient
      userId={data.user.id}
      businessId={business.id}
      initialServices={services}
    />
  )
}
