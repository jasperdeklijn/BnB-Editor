import { randomUUID } from "node:crypto"
import { NextResponse } from "next/server"
import { logAuditEvent } from "@/lib/audit-log"
import { requireAdminApiUser } from "@/lib/mail/admin-api"
import { getMailConfigurationState } from "@/lib/mail/config"
import { syncMailbox } from "@/lib/mail/sync-mailbox"

export const maxDuration = 300

export async function POST(request: Request) {
  const auth = await requireAdminApiUser()
  if ("response" in auth) return auth.response
  if (!getMailConfigurationState().configured) return NextResponse.json({ error: "MAILBOX_USER en MAILBOX_PASSWORD ontbreken." }, { status: 503 })

  try {
    const result = await syncMailbox({ trigger: "manual", runKey: `mail-manual:${randomUUID()}` })
    await logAuditEvent({ userId: auth.user.id, action: "mail.sync_started", request, metadata: { result } })
    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: "De TransIP-mailbox kon niet worden gesynchroniseerd." }, { status: 500 })
  }
}
