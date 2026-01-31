import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ImagesClient } from "@/components/images/images-client"

export default async function ImagesPage() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect("/auth/login")
  }

  return <ImagesClient userId={data.user.id} />
}
