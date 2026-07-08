import { NextResponse } from "next/server"
import { logAuditEvent } from "@/lib/audit-log"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    await logAuditEvent({
      userId: user.id,
      action: "logout",
      request,
    })
  }

  const { error } = await supabase.auth.signOut()

  if (error) {
    return NextResponse.json({ error: "Logout failed" }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
