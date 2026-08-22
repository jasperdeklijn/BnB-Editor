import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const [profileResult, businessResult, websiteResult, requestResult, subscriptionResult, imageMetadataResult, storageResult] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("businesses").select("*").eq("user_id", user.id),
    supabase.from("websites").select("*").eq("user_id", user.id),
    supabase.from("contact_requests").select("*").eq("user_id", user.id),
    supabase.from("subscriptions").select("*").eq("user_id", user.id).maybeSingle(),
    supabase.from("user_images").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
    supabase.storage.from("user-images").list(user.id, { limit: 1000, sortBy: { column: "name", order: "asc" } }),
  ])

  const primaryError = profileResult.error || businessResult.error || websiteResult.error || requestResult.error || subscriptionResult.error || imageMetadataResult.error || storageResult.error
  if (primaryError) {
    console.warn("[account-export] Primary export query failed", { message: primaryError.message })
    return Response.json({ error: "De gegevens konden niet worden geëxporteerd." }, { status: 500 })
  }

  const businesses = businessResult.data ?? []
  const websites = websiteResult.data ?? []
  const businessIds = businesses.map((business) => business.id)
  const websiteIds = websites.map((website) => website.id)

  const emptyResult = { data: [], error: null }
  const [servicesResult, entriesResult, availabilityResult, sectionsResult, transitionsResult, localesResult, sectionTranslationsResult, businessTranslationsResult] = await Promise.all([
    businessIds.length ? supabase.from("services").select("*").in("business_id", businessIds) : Promise.resolve(emptyResult),
    businessIds.length ? supabase.from("calendar_entries").select("*").in("business_id", businessIds) : Promise.resolve(emptyResult),
    businessIds.length ? supabase.from("calendar_availability_windows").select("*").in("business_id", businessIds) : Promise.resolve(emptyResult),
    websiteIds.length ? supabase.from("website_sections").select("*").in("website_id", websiteIds) : Promise.resolve(emptyResult),
    websiteIds.length ? supabase.from("section_transitions").select("*").in("website_id", websiteIds) : Promise.resolve(emptyResult),
    websiteIds.length ? supabase.from("website_locales").select("*").in("website_id", websiteIds) : Promise.resolve(emptyResult),
    websiteIds.length ? supabase.from("website_section_translations").select("*").in("website_id", websiteIds) : Promise.resolve(emptyResult),
    businessIds.length ? supabase.from("business_translations").select("*").in("business_id", businessIds) : Promise.resolve(emptyResult),
  ])

  const serviceIds = (servicesResult.data ?? []).map((service) => service.id)
  const serviceTranslationsResult = serviceIds.length
    ? await supabase.from("service_translations").select("*").in("service_id", serviceIds)
    : emptyResult

  const relatedError = servicesResult.error || entriesResult.error || availabilityResult.error || sectionsResult.error || transitionsResult.error || localesResult.error || sectionTranslationsResult.error || businessTranslationsResult.error || serviceTranslationsResult.error
  if (relatedError) {
    console.warn("[account-export] Related export query failed", { message: relatedError.message })
    return Response.json({ error: "De gegevens konden niet volledig worden geëxporteerd." }, { status: 500 })
  }

  let auditLogs: unknown[] = []
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const admin = await createAdminClient()
    const { data, error } = await admin
      .from("audit_logs")
      .select("id, user_id, website_id, action, metadata, ip_address, user_agent, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
    if (error) {
      console.warn("[account-export] Audit export query failed", { message: error.message })
    } else {
      auditLogs = data ?? []
    }
  }

  const payload = {
    schemaVersion: "2.0",
    exportedAt: new Date().toISOString(),
    account: {
      id: user.id,
      email: user.email,
      createdAt: user.created_at,
      lastSignInAt: user.last_sign_in_at,
      metadata: user.user_metadata,
    },
    profile: profileResult.data,
    businesses,
    websites,
    websiteSections: sectionsResult.data ?? [],
    sectionTransitions: transitionsResult.data ?? [],
    websiteLocales: localesResult.data ?? [],
    websiteSectionTranslations: sectionTranslationsResult.data ?? [],
    businessTranslations: businessTranslationsResult.data ?? [],
    serviceTranslations: serviceTranslationsResult.data ?? [],
    services: servicesResult.data ?? [],
    contactRequests: requestResult.data ?? [],
    calendarEntries: entriesResult.data ?? [],
    calendarAvailabilityWindows: availabilityResult.data ?? [],
    subscription: subscriptionResult.data,
    userImages: imageMetadataResult.data ?? [],
    auditLogs,
    storageFiles: (storageResult.data ?? [])
      .filter((file) => file.name !== ".emptyFolderPlaceholder")
      .map((file) => ({ name: file.name, metadata: file.metadata, createdAt: file.created_at, updatedAt: file.updated_at })),
  }

  const filename = `flexpagina-export-${new Date().toISOString().slice(0, 10)}.json`
  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  })
}
