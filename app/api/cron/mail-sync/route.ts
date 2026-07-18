import { NextResponse } from "next/server"
import { getMailConfigurationState } from "@/lib/mail/config"
import { syncMailbox } from "@/lib/mail/sync-mailbox"

export const dynamic = "force-dynamic"
export const maxDuration = 300

function currentRunKey() {
  const bucket = Math.floor(Date.now() / (5 * 60_000))
  return `mail-cron:${bucket}`
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !getMailConfigurationState().configured) {
    return NextResponse.json({ error: "Mail-agent server configuration is incomplete." }, { status: 503 })
  }

  try {
    return NextResponse.json(await syncMailbox({ trigger: "cron", runKey: currentRunKey() }))
  } catch {
    console.error("[mail-cron] Mail sync failed")
    return NextResponse.json({ error: "De mailsynchronisatie is mislukt." }, { status: 500 })
  }
}
