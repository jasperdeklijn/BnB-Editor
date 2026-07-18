import "server-only"

import { NextResponse } from "next/server"
import { isAdmin } from "@/lib/security"
import { createClient } from "@/lib/supabase/server"

export async function requireAdminApiUser() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return { response: NextResponse.json({ error: "Log eerst in." }, { status: 401 }) }
  if (!isAdmin(user)) return { response: NextResponse.json({ error: "Geen beheerderstoegang." }, { status: 403 }) }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return { response: NextResponse.json({ error: "Serverconfiguratie ontbreekt." }, { status: 503 }) }
  return { user }
}
