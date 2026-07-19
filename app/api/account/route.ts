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
    .select("id")
    .eq("user_id", user.id)

  if (websitesError) {
    return NextResponse.json({ error: "Accountgegevens konden niet worden gecontroleerd." }, { status: 500 })
  }

  const websiteIds = (websites ?? []).map((website) => website.id)
  const { data: domains, error: domainsError } = websiteIds.length
    ? await admin.from("website_domains").select("domain").in("website_id", websiteIds)
    : { data: [], error: null }
  if (domainsError) {
    return NextResponse.json({ error: "Domeinen konden niet worden gecontroleerd." }, { status: 500 })
  }

  const domainCleanup = await Promise.all((domains ?? []).map((domain) => removeDomainFromVercel(domain.domain)))
  const failedDomainIndex = domainCleanup.findIndex((result) => !result.success)
  if (failedDomainIndex >= 0) {
    return NextResponse.json(
      { error: `Account kon niet worden verwijderd omdat ${(domains ?? [])[failedDomainIndex]?.domain ?? "een domein"} niet uit Vercel kon worden verwijderd.` },
      { status: 502 },
    )
  }

  const [rootFilesResult, avatarFilesResult, imageMetadataResult] = await Promise.all([
    admin.storage.from("user-images").list(user.id, { limit: 1000 }),
    admin.storage.from("user-images").list(`${user.id}/avatars`, { limit: 1000 }),
    admin.from("user_images").select("original_path, thumbnail_path").eq("user_id", user.id),
  ])

  if (rootFilesResult.error || avatarFilesResult.error || imageMetadataResult.error) {
    return NextResponse.json({ error: "Bestanden konden niet worden gecontroleerd." }, { status: 500 })
  }

  const filePaths = [
    ...(rootFilesResult.data ?? [])
      .filter((file) => file.id && file.name !== ".emptyFolderPlaceholder")
      .map((file) => `${user.id}/${file.name}`),
    ...(avatarFilesResult.data ?? [])
      .filter((file) => file.id && file.name !== ".emptyFolderPlaceholder")
      .map((file) => `${user.id}/avatars/${file.name}`),
    ...(imageMetadataResult.data ?? []).flatMap((image) => [image.original_path, image.thumbnail_path].filter((path): path is string => Boolean(path))),
  ]

  if (filePaths.length) {
    const { error: storageDeleteError } = await admin.storage.from("user-images").remove([...new Set(filePaths)])
    if (storageDeleteError) {
      return NextResponse.json({ error: "Bestanden konden niet worden verwijderd." }, { status: 500 })
    }
  }

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
