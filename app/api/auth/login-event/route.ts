import { NextResponse } from "next/server"
import { logAuditEvent } from "@/lib/audit-log"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  await logAuditEvent({
    userId: user.id,
    action: "login",
    request,
  })

  return NextResponse.json({ success: true })
}
