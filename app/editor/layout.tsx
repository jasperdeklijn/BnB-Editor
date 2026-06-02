import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { EditorLayoutClient } from "@/components/editor/editor-layout-client"

export const metadata = {
  title: "Editor | Website Maker",
  description: "Bouw en beheer uw website",
}

export default async function EditorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect("/auth/login")
  }

  // Fetch user profile for avatar and display name, falling back to auth metadata
  let avatarUrl: string | null = null
  let displayName: string | null = null
  const authMetadata = (data.user?.user_metadata as any) || {}

  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("avatar_url, full_name")
      .eq("id", data.user.id)
      .single()

    if (profile) {
      avatarUrl = profile.avatar_url ?? authMetadata.avatar_url ?? null
      displayName = profile.full_name ?? authMetadata.full_name ?? null
    } else {
      avatarUrl = authMetadata.avatar_url ?? null
      displayName = authMetadata.full_name ?? null
    }
  } catch (error) {
    console.error("Failed to fetch user profile:", error)
    avatarUrl = authMetadata.avatar_url ?? null
    displayName = authMetadata.full_name ?? null
  }

  return (
    <EditorLayoutClient
      avatarUrl={avatarUrl}
      displayName={displayName}
    >
      {children}
    </EditorLayoutClient>
  )
}
