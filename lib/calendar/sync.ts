import "server-only"

import { randomUUID } from "node:crypto"
import { lookup } from "node:dns/promises"
import { isIP } from "node:net"

import { createIcalFeed, parseIcalBusyEvents, type IcalExportEntry } from "@/lib/calendar/ical"
import { assertCurrentUserRuntimeEntitlement } from "@/lib/runtime-entitlements"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

const MAX_FEED_BYTES = 2 * 1024 * 1024
const FETCH_TIMEOUT_MS = 12_000
const MAX_REDIRECTS = 3
const SYNC_LOCK_MINUTES = 5

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

type ImportSourceRow = {
  id: string
  business_id: string
  name: string
  feed_url: string
  enabled: boolean
  last_sync_started_at: string | null
  last_sync_succeeded_at: string | null
  last_sync_failed_at: string | null
  last_error: string | null
  consecutive_failures: number
  last_event_count: number
  last_ignored_count: number
  last_http_etag: string | null
  last_http_modified: string | null
  sync_lock_token: string | null
  sync_lock_expires_at: string | null
  next_sync_at: string
  created_at: string
  updated_at: string
}

type ExportFeedRow = {
  business_id: string
  access_token: string
  token_version: number
  enabled: boolean
  last_rotated_at: string
  created_at: string
  updated_at: string
}

export type CalendarSyncHealth = "never" | "healthy" | "warning" | "stale" | "disabled"

export interface CalendarImportSource {
  id: string
  name: string
  urlHost: string
  enabled: boolean
  health: CalendarSyncHealth
  lastSyncStartedAt: string | null
  lastSyncSucceededAt: string | null
  lastSyncFailedAt: string | null
  lastError: string | null
  consecutiveFailures: number
  eventCount: number
  ignoredCount: number
  nextSyncAt: string
}

export interface CalendarExportFeed {
  enabled: boolean
  url: string
  tokenVersion: number
  lastRotatedAt: string
}

export interface CalendarSyncData {
  exportFeed: CalendarExportFeed | null
  importSources: CalendarImportSource[]
}

export interface CalendarSyncRunResult {
  sourceId: string
  status: "synced" | "unchanged" | "skipped" | "failed"
  eventCount?: number
  ignoredCount?: number
  error?: string
}

function platformOrigin() {
  const configured = process.env.NEXT_PUBLIC_PLATFORM_DOMAIN?.trim() || "FlexPagina.nl"
  return /^https?:\/\//i.test(configured) ? configured.replace(/\/$/, "") : `https://${configured.replace(/\/$/, "")}`
}

function exportUrl(token: string) {
  return `${platformOrigin()}/api/calendar/ical/${encodeURIComponent(token)}`
}

function safeUrlHost(value: string) {
  try {
    return new URL(value).host
  } catch {
    return "Ongeldige URL"
  }
}

function healthForSource(row: ImportSourceRow, now = Date.now()): CalendarSyncHealth {
  if (!row.enabled) return "disabled"
  if (!row.last_sync_succeeded_at) return row.last_error ? "warning" : "never"
  if (row.last_error && (!row.last_sync_failed_at || row.last_sync_failed_at >= row.last_sync_succeeded_at)) return "warning"
  const age = now - new Date(row.last_sync_succeeded_at).getTime()
  return age > 3 * 3_600_000 ? "stale" : "healthy"
}

function parseImportSource(row: ImportSourceRow): CalendarImportSource {
  return {
    id: row.id,
    name: row.name,
    urlHost: safeUrlHost(row.feed_url),
    enabled: row.enabled,
    health: healthForSource(row),
    lastSyncStartedAt: row.last_sync_started_at,
    lastSyncSucceededAt: row.last_sync_succeeded_at,
    lastSyncFailedAt: row.last_sync_failed_at,
    lastError: row.last_error,
    consecutiveFailures: row.consecutive_failures,
    eventCount: row.last_event_count,
    ignoredCount: row.last_ignored_count,
    nextSyncAt: row.next_sync_at,
  }
}

async function currentUserId(supabase: SupabaseServerClient) {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error("Niet ingelogd.")
  return user.id
}

async function assertOwnedBusiness(businessId: string, supabase: SupabaseServerClient) {
  const userId = await currentUserId(supabase)
  const { data, error } = await supabase.from("businesses").select("id").eq("id", businessId).eq("user_id", userId).maybeSingle()
  if (error) throw error
  if (!data) throw new Error("Bedrijf niet gevonden.")
}

async function assertOwnedImportSource(sourceId: string, supabase: SupabaseServerClient) {
  const { data, error } = await supabase.from("calendar_import_sources").select("id, business_id").eq("id", sourceId).maybeSingle()
  if (error) throw error
  if (!data) throw new Error("Kalenderbron niet gevonden.")
  await assertOwnedBusiness((data as { business_id: string }).business_id, supabase)
  return data as { id: string; business_id: string }
}

function validateFeedUrl(value: string) {
  if (value.length > 2048) throw new Error("De iCal-URL is te lang.")
  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new Error("Vul een geldige iCal-URL in.")
  }
  if (url.protocol !== "https:") throw new Error("Alleen beveiligde HTTPS-iCal-links zijn toegestaan.")
  if (url.username || url.password) throw new Error("Gebruikersnamen en wachtwoorden in de iCal-URL zijn niet toegestaan.")
  if (!url.hostname || url.hostname.length > 253) throw new Error("De iCal-hostnaam is ongeldig.")
  return url
}

function isPrivateIpv4(address: string) {
  const parts = address.split(".").map(Number)
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return true
  const [a, b] = parts
  return a === 0 || a === 10 || a === 127 || a >= 224
    || (a === 100 && b >= 64 && b <= 127)
    || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 168)
    || (a === 198 && (b === 18 || b === 19))
}

function isPrivateIp(address: string) {
  const normalized = address.toLowerCase()
  if (isIP(normalized) === 4) return isPrivateIpv4(normalized)
  if (isIP(normalized) !== 6) return true
  if (normalized === "::" || normalized === "::1" || normalized.startsWith("fc") || normalized.startsWith("fd") || normalized.startsWith("fe8") || normalized.startsWith("fe9") || normalized.startsWith("fea") || normalized.startsWith("feb")) return true
  if (normalized.startsWith("::ffff:")) return isPrivateIpv4(normalized.slice(7))
  return false
}

async function assertPublicDestination(url: URL) {
  const host = url.hostname.toLowerCase().replace(/\.$/, "")
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) {
    throw new Error("Deze iCal-host is niet toegestaan.")
  }
  if (isIP(host)) {
    if (isPrivateIp(host)) throw new Error("Privénetwerkadressen zijn niet toegestaan voor iCal-import.")
    return
  }
  const addresses = await lookup(host, { all: true, verbatim: true })
  if (addresses.length === 0 || addresses.some(({ address }) => isPrivateIp(address))) {
    throw new Error("De iCal-host verwijst niet uitsluitend naar openbare adressen.")
  }
}

async function readLimitedBody(response: Response) {
  const declaredLength = Number(response.headers.get("content-length") || 0)
  if (declaredLength > MAX_FEED_BYTES) throw new Error("De iCal-feed is groter dan 2 MB.")
  if (!response.body) return ""
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > MAX_FEED_BYTES) {
      await reader.cancel()
      throw new Error("De iCal-feed is groter dan 2 MB.")
    }
    chunks.push(value)
  }
  const body = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    body.set(chunk, offset)
    offset += chunk.byteLength
  }
  return new TextDecoder("utf-8", { fatal: false }).decode(body)
}

async function fetchCalendar(source: ImportSourceRow) {
  let url = validateFeedUrl(source.feed_url)
  for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect += 1) {
    await assertPublicDestination(url)
    const headers = new Headers({ Accept: "text/calendar, application/ics;q=0.9, text/plain;q=0.5" })
    if (source.last_http_etag) headers.set("If-None-Match", source.last_http_etag)
    if (source.last_http_modified) headers.set("If-Modified-Since", source.last_http_modified)
    const response = await fetch(url, {
      headers,
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location")
      if (!location || redirect === MAX_REDIRECTS) throw new Error("De iCal-feed verwijst te vaak door.")
      url = validateFeedUrl(new URL(location, url).toString())
      continue
    }
    if (response.status === 304) {
      return { unchanged: true as const, etag: source.last_http_etag, modified: source.last_http_modified }
    }
    if (!response.ok) throw new Error(`De iCal-server antwoordde met status ${response.status}.`)
    const body = await readLimitedBody(response)
    if (!/BEGIN:VCALENDAR/i.test(body)) throw new Error("De URL bevat geen iCal-kalender.")
    return {
      unchanged: false as const,
      body,
      etag: response.headers.get("etag"),
      modified: response.headers.get("last-modified"),
    }
  }
  throw new Error("De iCal-feed kon niet worden opgehaald.")
}

function publicSyncError(error: unknown) {
  if (error instanceof Error && error.name === "TimeoutError") return "De iCal-server reageerde niet binnen 12 seconden."
  if (error instanceof Error) return error.message.slice(0, 500)
  return "De iCal-synchronisatie is mislukt."
}

async function markFailure(source: ImportSourceRow, lockToken: string, error: unknown) {
  const supabase = await createAdminClient()
  const failures = source.consecutive_failures + 1
  const retryMinutes = Math.min(360, 15 * (2 ** Math.min(failures - 1, 5)))
  await supabase.from("calendar_import_sources").update({
    last_sync_failed_at: new Date().toISOString(),
    last_error: publicSyncError(error),
    consecutive_failures: failures,
    next_sync_at: new Date(Date.now() + retryMinutes * 60_000).toISOString(),
    sync_lock_token: null,
    sync_lock_expires_at: null,
  }).eq("id", source.id).eq("sync_lock_token", lockToken)
}

async function claimImportSource(sourceId: string, allowDisabled: boolean) {
  const supabase = await createAdminClient()
  const now = new Date()
  const lockToken = randomUUID()
  let query = supabase.from("calendar_import_sources").update({
    last_sync_started_at: now.toISOString(),
    sync_lock_token: lockToken,
    sync_lock_expires_at: new Date(now.getTime() + SYNC_LOCK_MINUTES * 60_000).toISOString(),
  }).eq("id", sourceId).or(`sync_lock_expires_at.is.null,sync_lock_expires_at.lt.${now.toISOString()}`)
  if (!allowDisabled) query = query.eq("enabled", true)
  const { data, error } = await query.select("*").maybeSingle()
  if (error) throw error
  return data ? { source: data as ImportSourceRow, lockToken } : null
}

async function upsertImportedEntries(source: ImportSourceRow, events: ReturnType<typeof parseIcalBusyEvents>["events"]) {
  const supabase = await createAdminClient()
  const { error } = await supabase.rpc("replace_calendar_import_events", {
    p_source_id: source.id,
    p_events: events.map((event) => ({
      uid: event.uid,
      occurrence_key: event.occurrenceKey,
      start_at: event.startAt,
      end_at: event.endAt,
      all_day: event.allDay,
      summary: event.summary,
    })),
  })
  if (error) throw error
}

export async function synchronizeCalendarSource(sourceId: string, options: { allowDisabled?: boolean } = {}): Promise<CalendarSyncRunResult> {
  const claim = await claimImportSource(sourceId, options.allowDisabled === true)
  if (!claim) return { sourceId, status: "skipped" }
  const { source, lockToken } = claim
  try {
    const fetched = await fetchCalendar(source)
    const supabase = await createAdminClient()
    if (fetched.unchanged) {
      const { error } = await supabase.from("calendar_import_sources").update({
        last_sync_succeeded_at: new Date().toISOString(), last_error: null, consecutive_failures: 0,
        next_sync_at: new Date(Date.now() + 60 * 60_000).toISOString(), sync_lock_token: null, sync_lock_expires_at: null,
      }).eq("id", source.id).eq("sync_lock_token", lockToken)
      if (error) throw error
      return { sourceId, status: "unchanged", eventCount: source.last_event_count, ignoredCount: source.last_ignored_count }
    }

    const parsed = parseIcalBusyEvents(fetched.body)
    if (parsed.calendarId === source.business_id) throw new Error("U kunt de eigen FlexPagina-export niet als importbron gebruiken.")
    await upsertImportedEntries(source, parsed.events)
    const { error } = await supabase.from("calendar_import_sources").update({
      last_sync_succeeded_at: new Date().toISOString(), last_error: null, consecutive_failures: 0,
      last_event_count: parsed.events.length, last_ignored_count: parsed.ignoredCount,
      last_http_etag: fetched.etag, last_http_modified: fetched.modified,
      next_sync_at: new Date(Date.now() + 60 * 60_000).toISOString(), sync_lock_token: null, sync_lock_expires_at: null,
    }).eq("id", source.id).eq("sync_lock_token", lockToken)
    if (error) throw error
    return { sourceId, status: "synced", eventCount: parsed.events.length, ignoredCount: parsed.ignoredCount }
  } catch (error) {
    await markFailure(source, lockToken, error)
    return { sourceId, status: "failed", error: publicSyncError(error) }
  }
}

export async function synchronizeDueCalendarSources(limit = 10) {
  const supabase = await createAdminClient()
  const { data, error } = await supabase.from("calendar_import_sources")
    .select("id").eq("enabled", true).lte("next_sync_at", new Date().toISOString())
    .order("next_sync_at", { ascending: true }).limit(Math.max(1, Math.min(limit, 25)))
  if (error) throw error
  const results: CalendarSyncRunResult[] = []
  for (const row of (data ?? []) as Array<{ id: string }>) results.push(await synchronizeCalendarSource(row.id))
  return { processed: results.length, results }
}

export async function getCalendarSyncData(businessId: string): Promise<CalendarSyncData> {
  const supabase = await createClient()
  await assertOwnedBusiness(businessId, supabase)
  const [{ data: feed, error: feedError }, { data: sources, error: sourceError }] = await Promise.all([
    supabase.from("calendar_export_feeds").select("*").eq("business_id", businessId).maybeSingle(),
    supabase.from("calendar_import_sources").select("*").eq("business_id", businessId).order("created_at", { ascending: true }),
  ])
  if (feedError) throw feedError
  if (sourceError) throw sourceError
  const exportFeed = feed as ExportFeedRow | null
  return {
    exportFeed: exportFeed ? {
      enabled: exportFeed.enabled,
      url: exportUrl(exportFeed.access_token),
      tokenVersion: exportFeed.token_version,
      lastRotatedAt: exportFeed.last_rotated_at,
    } : null,
    importSources: ((sources ?? []) as ImportSourceRow[]).map(parseImportSource),
  }
}

export async function rotateCalendarExportFeed(businessId: string) {
  const supabase = await createClient()
  await assertCurrentUserRuntimeEntitlement(supabase, "booking_management")
  await assertOwnedBusiness(businessId, supabase)
  const { data: existing, error: existingError } = await supabase.from("calendar_export_feeds")
    .select("token_version").eq("business_id", businessId).maybeSingle()
  if (existingError) throw existingError
  const nextToken = randomUUID()
  const payload = {
    business_id: businessId,
    access_token: nextToken,
    token_version: Number((existing as { token_version?: number } | null)?.token_version || 0) + 1,
    enabled: true,
    last_rotated_at: new Date().toISOString(),
  }
  const { error } = await supabase.from("calendar_export_feeds").upsert(payload, { onConflict: "business_id" })
  if (error) throw error
  return getCalendarSyncData(businessId)
}

export async function setCalendarExportEnabled(businessId: string, enabled: boolean) {
  const supabase = await createClient()
  await assertCurrentUserRuntimeEntitlement(supabase, "booking_management")
  await assertOwnedBusiness(businessId, supabase)
  const { error } = await supabase.from("calendar_export_feeds").update({ enabled }).eq("business_id", businessId)
  if (error) throw error
  return getCalendarSyncData(businessId)
}

export async function createCalendarImportSource(businessId: string, input: { name: string; feedUrl: string }) {
  const supabase = await createClient()
  await assertCurrentUserRuntimeEntitlement(supabase, "booking_management")
  await assertOwnedBusiness(businessId, supabase)
  const name = input.name.trim().slice(0, 100)
  if (!name) throw new Error("Geef deze kalenderbron een naam.")
  const feedUrl = validateFeedUrl(input.feedUrl.trim()).toString()
  const { data, error } = await supabase.from("calendar_import_sources").insert({
    business_id: businessId, name, feed_url: feedUrl, enabled: true, next_sync_at: new Date().toISOString(),
  }).select("id").single()
  if (error?.code === "23505") throw new Error("Deze iCal-link is al toegevoegd.")
  if (error) throw error
  const sourceId = (data as { id: string }).id
  const result = await synchronizeCalendarSource(sourceId)
  return { data: await getCalendarSyncData(businessId), result }
}

export async function setCalendarImportSourceEnabled(sourceId: string, enabled: boolean) {
  const supabase = await createClient()
  await assertCurrentUserRuntimeEntitlement(supabase, "booking_management")
  const source = await assertOwnedImportSource(sourceId, supabase)
  const updates: { enabled: boolean; next_sync_at?: string } = { enabled }
  if (enabled) updates.next_sync_at = new Date().toISOString()
  const { error } = await supabase.from("calendar_import_sources").update(updates).eq("id", sourceId)
  if (error) throw error
  return getCalendarSyncData(source.business_id)
}

export async function deleteCalendarImportSource(sourceId: string) {
  const supabase = await createClient()
  await assertCurrentUserRuntimeEntitlement(supabase, "booking_management")
  const source = await assertOwnedImportSource(sourceId, supabase)
  const { error } = await supabase.from("calendar_import_sources").delete().eq("id", sourceId)
  if (error) throw error
  return getCalendarSyncData(source.business_id)
}

export async function manuallySynchronizeCalendarSource(sourceId: string) {
  const supabase = await createClient()
  await assertCurrentUserRuntimeEntitlement(supabase, "booking_management")
  const source = await assertOwnedImportSource(sourceId, supabase)
  const result = await synchronizeCalendarSource(sourceId)
  return { data: await getCalendarSyncData(source.business_id), result }
}

export async function getPrivateIcalFeed(token: string) {
  if (!/^[0-9a-f-]{36}$/i.test(token)) return null
  const supabase = await createAdminClient()
  const { data: feed, error } = await supabase.from("calendar_export_feeds")
    .select("business_id").eq("access_token", token).eq("enabled", true).maybeSingle()
  if (error || !feed) return null
  const businessId = (feed as { business_id: string }).business_id
  const oldestExportedEnd = new Date(Date.now() - 365 * 86_400_000).toISOString()
  const [{ data: business }, { data: entries, error: entriesError }] = await Promise.all([
    supabase.from("businesses").select("name").eq("id", businessId).maybeSingle(),
    supabase.from("calendar_entries").select("id, title, source, status, start_at, end_at, updated_at")
      .eq("business_id", businessId).neq("entry_type", "note").gte("end_at", oldestExportedEnd)
      .order("start_at", { ascending: true }).limit(5_000),
  ])
  if (entriesError) throw entriesError
  return createIcalFeed({
    businessId,
    calendarName: (business as { name?: string } | null)?.name || "FlexPagina kalender",
    entries: (entries ?? []) as IcalExportEntry[],
  })
}
