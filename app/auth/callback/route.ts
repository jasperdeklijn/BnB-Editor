import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const PASSWORD_UPDATE_PATH = "/auth/update-password"

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const requestedPath = requestUrl.searchParams.get("next")
  const nextPath = requestedPath === PASSWORD_UPDATE_PATH ? requestedPath : PASSWORD_UPDATE_PATH

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      return NextResponse.redirect(new URL(nextPath, requestUrl.origin))
    }
  }

  const errorUrl = new URL("/auth/error", requestUrl.origin)
  errorUrl.searchParams.set(
    "error_description",
    "De herstellink is ongeldig of verlopen. Vraag een nieuwe link aan.",
  )
  return NextResponse.redirect(errorUrl)
}
