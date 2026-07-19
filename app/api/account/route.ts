import { NextResponse } from "next/server"
import { logAuditEvent } from "@/lib/audit-log"
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { removeDomainFromVercel } from "@/lib/vercel-domains"

const STORAGE_LIST_PAGE_SIZE = 1000
const IMAGE_METADATA_PAGE_SIZE = 1000
const STORAGE_DELETE_BATCH_SIZE = 500

type AdminClient = Awaited<ReturnType<typeof createAdminClient>>

async function listStorageFilePaths(admin: AdminClient, directory: string) {
  const paths: string[] = []

  for (let offset = 0; ; offset += STORAGE_LIST_PAGE_SIZE) {
    const { data, error } = await admin.storage.from("user-images").list(directory, {
      limit: STORAGE_LIST_PAGE_SIZE,
      offset,
      sortBy: { column: "name", order: "asc" },
    })
    if (error) return { paths: [], error }

    const files = data ?? []
    paths.push(
      ...files
        .filter((file) => file.id && file.name !== ".emptyFolderPlaceholder")
        .map((file) => `${directory}/${file.name}`),
    )
    if (files.length < STORAGE_LIST_PAGE_SIZE) return { paths, error: null }
  }
}

async function listManagedImagePaths(admin: AdminClient, userId: string) {
  const paths: string[] = []

  for (let from = 0; ; from += IMAGE_METADATA_PAGE_SIZE) {
    const { data, error } = await admin
      .from("user_images")
      .select("original_path, thumbnail_path")
      .eq("user_id", userId)
      .order("id", { ascending: true })
      .range(from, from + IMAGE_METADATA_PAGE_SIZE - 1)
    if (error) return { paths: [], error }

    const images = data ?? []
    paths.push(
      ...images.flatMap((image) =>
        [image.original_path, image.thumbnail_path].filter((path): path is string => Boolean(path)),
      ),
    )
    if (images.length < IMAGE_METADATA_PAGE_SIZE) return { paths, error: null }
  }
}

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
    listStorageFilePaths(admin, user.id),
    listStorageFilePaths(admin, `${user.id}/avatars`),
    listManagedImagePaths(admin, user.id),
  ])

  if (rootFilesResult.error || avatarFilesResult.error || imageMetadataResult.error) {
    return NextResponse.json({ error: "Bestanden konden niet worden gecontroleerd." }, { status: 500 })
  }

  const filePaths = [
    ...rootFilesResult.paths,
    ...avatarFilesResult.paths,
    ...imageMetadataResult.paths,
  ]

  const uniqueFilePaths = [...new Set(filePaths)]
  for (let index = 0; index < uniqueFilePaths.length; index += STORAGE_DELETE_BATCH_SIZE) {
    const batch = uniqueFilePaths.slice(index, index + STORAGE_DELETE_BATCH_SIZE)
    const { error: storageDeleteError } = await admin.storage.from("user-images").remove(batch)
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
