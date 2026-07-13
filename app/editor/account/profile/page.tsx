import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ProfileClient } from "@/components/profile/profile-client"

export const metadata = {
  title: "My Profile | Website Maker",
  description: "Update your personal profile information",
}

export default async function ProfilePage() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect("/auth/login")
  }

  const { data: websites } = await supabase
    .from("websites")
    .select("id, title, slug")
    .eq("user_id", data.user.id)
    .order("created_at", { ascending: true })

  return (
    <ProfileClient
      userId={data.user.id}
      email={data.user.email ?? ""}
      initialMeta={data.user.user_metadata ?? {}}
      initialWebsites={websites ?? []}
    />
  )
}

