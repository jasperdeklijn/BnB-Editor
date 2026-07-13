import { NextResponse } from "next/server"
import { logAuditEvent } from "@/lib/audit-log"
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { removeDomainFromVercel } from "@/lib/vercel-domains"

export async function DELETE(request: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const rateLimit = checkRateLimit(getRateLimitKey(request, `account_delete:${user.id}`), 3, 60 * 60 * 1000)
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Te veel verwijderpogingen. Probeer het later opnieuw." }, { status: 429 })
  }

  const body = await request.json().catch(() => null)
  const confirmation = typeof body?.confirmation === "string" ? body.confirmation.trim().toLowerCase() : ""
  if (!user.email || confirmation !== user.email.toLowerCase()) {
    return NextResponse.json({ error: "De bevestiging komt niet overeen met uw e-mailadres." }, { status: 400 })
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Accountverwijdering is nog niet geconfigureerd." }, { status: 503 })
  }

  const admin = await createAdminClient()
  const { data: websites, error: websitesError } = await admin
    .from("websites")
    .select("custom_domain")
    .eq("user_id", user.id)

  if (websitesError) {
    return NextResponse.json({ error: "Accountgegevens konden niet worden gecontroleerd." }, { status: 500 })
  }

  const { data: files, error: storageListError } = await admin.storage
    .from("user-images")
    .list(user.id, { limit: 1000 })

  if (storageListError) {
    return NextResponse.json({ error: "Bestanden konden niet worden gecontroleerd." }, { status: 500 })
  }

  const filePaths = (files ?? [])
    .filter((file) => file.name !== ".emptyFolderPlaceholder")
    .map((file) => `${user.id}/${file.name}`)

  if (filePaths.length) {
    const { error: storageDeleteError } = await admin.storage.from("user-images").remove(filePaths)
    if (storageDeleteError) {
      return NextResponse.json({ error: "Bestanden konden niet worden verwijderd." }, { status: 500 })
    }
  }

  await Promise.all((websites ?? []).map((website) => removeDomainFromVercel(website.custom_domain)))

  const deletedUserId = user.id
  const deletedEmail = user.email
  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id)
  if (deleteError) {
    return NextResponse.json({ error: "Account kon niet worden verwijderd." }, { status: 500 })
  }

  await logAuditEvent({
    action: "account.deleted",
    metadata: { deletedUserId, deletedEmail },
    request,
  })

  return NextResponse.json({ success: true })
}

