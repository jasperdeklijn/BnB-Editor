import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { BnbDetailsClient } from "@/components/bnb/bnb-details-client"

export const metadata = {
  title: "BnB Details | BnB Builder",
  description: "Manage your BnB property information",
}

export default async function BnbPage() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect("/auth/login")
  }

  return (
    <BnbDetailsClient
      userId={data.user.id}
      initialMeta={data.user.user_metadata ?? {}}
    />
  )
}
