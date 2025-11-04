import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { EditorClient } from "@/components/editor/editor-client"

export default async function EditorPage() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect("/auth/login")
  }

  return <EditorClient userId={data.user.id} />
}
