import "server-only"

import { randomUUID } from "node:crypto"
import { lookup } from "node:dns/promises"
import { request as httpsRequest } from "node:https"
import { isIP } from "node:net"

import { createIcalFeed, parseIcalBusyEvents, type IcalExportEntry } from "@/lib/calendar/ical"
import {
  calendarSecretFingerprint,
  createCalendarAccessToken,
  decryptCalendarSecret,
  encryptCalendarSecret,
  hashCalendarAccessToken,
} from "@/lib/calendar/secrets"
import { assertCurrentUserRuntimeEntitlement } from "@/lib/runtime-entitlements"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

const MAX_FEED_BYTES = 2 * 1024 * 1024
const FETCH_TIMEOUT_MS = 12_000
const MAX_REDIRECTS = 3
const SYNC_LOCK_MINUTES = 5

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

export type CalendarProvider = "booking_com" | "google_calendar" | "other"
export type CalendarExportTarget = "overview" | "booking_com" | "google_calendar"

type ImportSourceRow = {
  id: string
  business_id: string
  service_id: string | null
  provider: CalendarProvider
  name: string
  feed_url: string
  url_host: string
  feed_url_fingerprint: string | null
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
  id: string
  business_id: string
  service_id: string | null
  target_provider: CalendarExportTarget
  access_token: string | null
  token_hash: string | null
  token_prefix: string | null
  token_version: number
  enabled: boolean
  last_rotated_at: string
  created_at: string
  updated_at: string
}

type ExportEntryRow = IcalExportEntry & {
  service_id: string | null
  entry_type: "appointment" | "booking" | "blocked" | "note"
  external_source_id: string | null
  all_day: boolean
  timezone: string
}

export type CalendarSyncHealth = "never" | "healthy" | "warning" | "stale" | "disabled"

export interface CalendarImportSource {
  id: string
  serviceId: string | null
  provider: CalendarProvider
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
  id: string
  serviceId: string | null
  targetProvider: CalendarExportTarget
  enabled: boolean
  url: string | null
  tokenPrefix: string | null
  tokenVersion: number
  lastRotatedAt: string
}

export interface CalendarSyncData {
  overviewFeed: CalendarExportFeed | null
  exportFeeds: CalendarExportFeed[]
  importSources: CalendarImportSource[]
}

export interface CalendarSyncRunResult {
  sourceId: string
  status: "synced" | "unchanged" | "skipped" | "failed"
  eventCount?: number
  ignoredCount?: number
  error?: string
}

function configuredMinutes(name: string, fallback: number, minimum: number, maximum: number) {
  const parsed = Number(process.env[name])
  return Number.isInteger(parsed) ? Math.max(minimum, Math.min(maximum, parsed)) : fallback
}

function healthySyncIntervalMinutes() {
  return configuredMinutes("CALENDAR_SYNC_INTERVAL_MINUTES", 60, 15, 1440)
}

function retryBaseMinutes() {
  return configuredMinutes("CALENDAR_SYNC_RETRY_MINUTES", 15, 5, 360)
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
    return "Verborgen kalenderadres"
  }
}

function healthForSource(row: ImportSourceRow, now = Date.now()): CalendarSyncHealth {
  if (!row.enabled) return "disabled"
  if (!row.last_sync_succeeded_at) return row.last_error ? "warning" : "never"
  if (row.last_error && (!row.last_sync_failed_at || row.last_sync_failed_at >= row.last_sync_succeeded_at)) return "warning"
  const staleAfter = Math.max(3 * healthySyncIntervalMinutes(), 180) * 60_000
  return now - new Date(row.last_sync_succeeded_at).getTime() > staleAfter ? "stale" : "healthy"
}

function parseImportSource(row: ImportSourceRow): CalendarImportSource {
  return {
    id: row.id,
    serviceId: row.service_id,
    provider: row.provider,
    name: row.name,
    urlHost: row.url_host || (/^https:\/\//i.test(row.feed_url) ? safeUrlHost(row.feed_url) : "Verborgen kalenderadres"),
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

function parseExportFeed(row: ExportFeedRow): CalendarExportFeed {
  return {
    id: row.id,
    serviceId: row.service_id,
    targetProvider: row.target_provider,
    enabled: row.enabled,
    url: row.access_token ? exportUrl(row.access_token) : null,
    tokenPrefix: row.token_prefix,
    tokenVersion: row.token_version,
    lastRotatedAt: row.last_rotated_at,
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

async function assertOwnedCalendarService(serviceId: string, businessId: string, supabase: SupabaseServerClient) {
  await assertOwnedBusiness(businessId, supabase)
  const [{ data: service, error: serviceError }, { data: settings, error: settingsError }] = await Promise.all([
    supabase.from("services").select("id").eq("id", serviceId).eq("business_id", businessId).maybeSingle(),
    supabase.from("service_booking_settings").select("booking_mode").eq("service_id", serviceId).eq("business_id", businessId).maybeSingle(),
  ])
  if (serviceError) throw serviceError
  if (settingsError) throw settingsError
  if (!service) throw new Error("Accommodatie niet gevonden.")
  if ((settings as { booking_mode?: string } | null)?.booking_mode !== "stay") {
    throw new Error("Kalenderkoppelingen per aanbieder zijn alleen beschikbaar voor accommodaties met boekingstype Verblijf.")
  }
}

async function assertOwnedImportSource(sourceId: string, supabase: SupabaseServerClient) {
  const { data, error } = await supabase.from("calendar_import_sources").select("id, business_id").eq("id", sourceId).maybeSingle()
  if (error) throw error
  if (!data) throw new Error("Kalenderbron niet gevonden.")
  await assertOwnedBusiness((data as { business_id: string }).business_id, supabase)
  return data as { id: string; business_id: string }
}

async function assertOwnedExportFeed(feedId: string, supabase: SupabaseServerClient) {
  const { data, error } = await supabase.from("calendar_export_feeds").select("id, business_id").eq("id", feedId).maybeSingle()
  if (error) throw error
  if (!data) throw new Error("Kalenderexport niet gevonden.")
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
  url.hash = ""
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

async function resolvePublicDestination(url: URL) {
  const host = url.hostname.toLowerCase().replace(/\.$/, "")
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) {
    throw new Error("Deze iCal-host is niet toegestaan.")
  }
  if (isIP(host)) {
    if (isPrivateIp(host)) throw new Error("Privénetwerkadressen zijn niet toegestaan voor iCal-import.")
    return { address: host, family: isIP(host) as 4 | 6 }
  }
  const addresses = await lookup(host, { all: true, verbatim: true })
  if (addresses.length === 0 || addresses.some(({ address }) => isPrivateIp(address))) {
    throw new Error("De iCal-host verwijst niet uitsluitend naar openbare adressen.")
  }
  return { address: addresses[0].address, family: addresses[0].family as 4 | 6 }
}

type CalendarHttpResult = {
  status: number
  location: string | null
  etag: string | null
  modified: string | null
  contentType: string
  body: string
}

async function requestCalendar(url: URL, source: ImportSourceRow): Promise<CalendarHttpResult> {
  const destination = await resolvePublicDestination(url)
  return new Promise((resolve, reject) => {
    const request = httpsRequest(url, {
      method: "GET",
      headers: {
        Accept: "text/calendar, application/ics;q=0.9, text/plain;q=0.5",
        ...(source.last_http_etag ? { "If-None-Match": source.last_http_etag } : {}),
        ...(source.last_http_modified ? { "If-Modified-Since": source.last_http_modified } : {}),
      },
      lookup: (_hostname, _options, callback) => callback(null, destination.address, destination.family),
    }, (response) => {
      const status = response.statusCode ?? 500
      const locationHeader = response.headers.location
      const contentLength = Number(response.headers["content-length"] || 0)
      if (contentLength > MAX_FEED_BYTES) {
        response.destroy()
        reject(new Error("De iCal-feed is groter dan 2 MB."))
        return
      }
      const chunks: Buffer[] = []
      let total = 0
      response.on("data", (chunk: Buffer | string) => {
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
        total += buffer.byteLength
        if (total > MAX_FEED_BYTES) {
          response.destroy(new Error("De iCal-feed is groter dan 2 MB."))
          return
        }
        chunks.push(buffer)
      })
      response.on("error", reject)
      response.on("end", () => resolve({
        status,
        location: Array.isArray(locationHeader) ? locationHeader[0] ?? null : locationHeader ?? null,
        etag: typeof response.headers.etag === "string" ? response.headers.etag : null,
        modified: typeof response.headers["last-modified"] === "string" ? response.headers["last-modified"] : null,
        contentType: typeof response.headers["content-type"] === "string" ? response.headers["content-type"] : "",
        body: Buffer.concat(chunks).toString("utf8"),
      }))
    })
    request.setTimeout(FETCH_TIMEOUT_MS, () => request.destroy(new Error("De iCal-server reageerde niet binnen 12 seconden.")))
    request.on("error", reject)
    request.end()
  })
}

async function fetchCalendar(source: ImportSourceRow, clearFeedUrl: string) {
  let url = validateFeedUrl(clearFeedUrl)
  for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect += 1) {
    const response = await requestCalendar(url, source)
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      if (!response.location || redirect === MAX_REDIRECTS) throw new Error("De iCal-feed verwijst te vaak door.")
      url = validateFeedUrl(new URL(response.location, url).toString())
      continue
    }
    if (response.status === 304) {
      return { unchanged: true as const, etag: source.last_http_etag, modified: source.last_http_modified }
    }
    if (response.status < 200 || response.status >= 300) throw new Error(`De iCal-server antwoordde met status ${response.status}.`)
    const mediaType = response.contentType.split(";", 1)[0].trim().toLowerCase()
    if (mediaType && !["text/calendar", "application/ics", "text/plain", "application/octet-stream"].includes(mediaType)) {
      throw new Error("De kalender-URL heeft geen toegestaan iCal-contenttype.")
    }
    if (!/BEGIN:VCALENDAR/i.test(response.body)) throw new Error("De URL bevat geen iCal-kalender.")
    return { unchanged: false as const, body: response.body, etag: response.etag, modified: response.modified }
  }
  throw new Error("De iCal-feed kon niet worden opgehaald.")
}

function publicSyncError(error: unknown) {
  if (!(error instanceof Error)) return "De iCal-synchronisatie is mislukt."
  return error.message.replace(/https?:\/\/\S+/gi, "[verborgen URL]").slice(0, 500)
}

async function markFailure(source: ImportSourceRow, lockToken: string, error: unknown) {
  const supabase = await createAdminClient()
  const failures = source.consecutive_failures + 1
  const retryMinutes = Math.min(360, retryBaseMinutes() * (2 ** Math.min(failures - 1, 5)))
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

async function encryptLegacySource(source: ImportSourceRow, clearFeedUrl: string) {
  if (!/^https:\/\//i.test(source.feed_url)) return
  const normalized = validateFeedUrl(clearFeedUrl).toString()
  const supabase = await createAdminClient()
  const { error } = await supabase.from("calendar_import_sources").update({
    feed_url: encryptCalendarSecret(normalized),
    feed_url_fingerprint: calendarSecretFingerprint(normalized),
    url_host: safeUrlHost(normalized),
  }).eq("id", source.id).eq("feed_url", source.feed_url)
  if (error && error.code !== "23505") throw error
}

export async function synchronizeCalendarSource(sourceId: string, options: { allowDisabled?: boolean } = {}): Promise<CalendarSyncRunResult> {
  const claim = await claimImportSource(sourceId, options.allowDisabled === true)
  if (!claim) return { sourceId, status: "skipped" }
  const { source, lockToken } = claim
  try {
    const clearFeedUrl = validateFeedUrl(decryptCalendarSecret(source.feed_url)).toString()
    await encryptLegacySource(source, clearFeedUrl)
    const fetched = await fetchCalendar(source, clearFeedUrl)
    const supabase = await createAdminClient()
    if (fetched.unchanged) {
      const { error } = await supabase.from("calendar_import_sources").update({
        last_sync_succeeded_at: new Date().toISOString(), last_error: null, consecutive_failures: 0,
        next_sync_at: new Date(Date.now() + healthySyncIntervalMinutes() * 60_000).toISOString(), sync_lock_token: null, sync_lock_expires_at: null,
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
      next_sync_at: new Date(Date.now() + healthySyncIntervalMinutes() * 60_000).toISOString(), sync_lock_token: null, sync_lock_expires_at: null,
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
  const [{ data: feeds, error: feedError }, { data: sources, error: sourceError }] = await Promise.all([
    supabase.from("calendar_export_feeds").select("*").eq("business_id", businessId).order("created_at", { ascending: true }),
    supabase.from("calendar_import_sources").select("*").eq("business_id", businessId).order("created_at", { ascending: true }),
  ])
  if (feedError) throw feedError
  if (sourceError) throw sourceError
  const parsedFeeds = ((feeds ?? []) as ExportFeedRow[]).map(parseExportFeed)
  return {
    overviewFeed: parsedFeeds.find((feed) => feed.targetProvider === "overview") ?? null,
    exportFeeds: parsedFeeds.filter((feed) => feed.targetProvider !== "overview"),
    importSources: ((sources ?? []) as ImportSourceRow[]).map(parseImportSource),
  }
}

export async function rotateCalendarExportFeed(
  businessId: string,
  input: { serviceId?: string | null; targetProvider?: CalendarExportTarget } = {},
) {
  const supabase = await createClient()
  await assertCurrentUserRuntimeEntitlement(supabase, "booking_management")
  const serviceId = input.serviceId ?? null
  const targetProvider = input.targetProvider ?? "overview"
  if (targetProvider === "overview") {
    if (serviceId) throw new Error("Een overzichtsfeed is bedrijfsbreed.")
    await assertOwnedBusiness(businessId, supabase)
  } else {
    if (!serviceId) throw new Error("Kies eerst een accommodatie.")
    await assertOwnedCalendarService(serviceId, businessId, supabase)
  }

  let existingQuery = supabase.from("calendar_export_feeds").select("id, token_version")
    .eq("business_id", businessId).eq("target_provider", targetProvider)
  existingQuery = serviceId ? existingQuery.eq("service_id", serviceId) : existingQuery.is("service_id", null)
  const { data: existing, error: existingError } = await existingQuery.maybeSingle()
  if (existingError) throw existingError

  const token = createCalendarAccessToken()
  const payload = {
    business_id: businessId,
    service_id: serviceId,
    target_provider: targetProvider,
    access_token: null,
    token_hash: hashCalendarAccessToken(token),
    token_prefix: token.slice(0, 8),
    token_version: Number((existing as { token_version?: number } | null)?.token_version || 0) + 1,
    enabled: true,
    last_rotated_at: new Date().toISOString(),
  }
  const result = existing
    ? await supabase.from("calendar_export_feeds").update(payload).eq("id", (existing as { id: string }).id).select("id").single()
    : await supabase.from("calendar_export_feeds").insert(payload).select("id").single()
  if (result.error) throw result.error
  return {
    data: await getCalendarSyncData(businessId),
    revealedUrl: exportUrl(token),
    feedId: (result.data as { id: string }).id,
  }
}

export async function setCalendarExportEnabled(feedId: string, enabled: boolean) {
  const supabase = await createClient()
  await assertCurrentUserRuntimeEntitlement(supabase, "booking_management")
  const feed = await assertOwnedExportFeed(feedId, supabase)
  const { error } = await supabase.from("calendar_export_feeds").update({ enabled }).eq("id", feedId)
  if (error) throw error
  return getCalendarSyncData(feed.business_id)
}

export async function createCalendarImportSource(
  businessId: string,
  input: { serviceId?: string | null; provider?: CalendarProvider; name: string; feedUrl: string },
) {
  const supabase = await createClient()
  await assertCurrentUserRuntimeEntitlement(supabase, "booking_management")
  const provider = input.provider ?? "other"
  const serviceId = input.serviceId ?? null
  if (provider !== "other" && !serviceId) throw new Error("Kies eerst een accommodatie.")
  if (serviceId) await assertOwnedCalendarService(serviceId, businessId, supabase)
  else await assertOwnedBusiness(businessId, supabase)
  const name = input.name.trim().slice(0, 100)
  if (!name) throw new Error("Geef deze kalenderbron een naam.")
  const feedUrl = validateFeedUrl(input.feedUrl.trim()).toString()
  const fingerprint = calendarSecretFingerprint(feedUrl)

  let duplicateQuery = supabase.from("calendar_import_sources").select("id")
    .eq("business_id", businessId).eq("feed_url_fingerprint", fingerprint)
  duplicateQuery = serviceId ? duplicateQuery.eq("service_id", serviceId) : duplicateQuery.is("service_id", null)
  const { data: duplicate, error: duplicateError } = await duplicateQuery.maybeSingle()
  if (duplicateError) throw duplicateError
  if (duplicate) throw new Error("Deze iCal-link is al toegevoegd aan deze accommodatie.")

  const { data, error } = await supabase.from("calendar_import_sources").insert({
    business_id: businessId,
    service_id: serviceId,
    provider,
    name,
    feed_url: encryptCalendarSecret(feedUrl),
    feed_url_fingerprint: fingerprint,
    url_host: safeUrlHost(feedUrl),
    enabled: true,
    next_sync_at: new Date().toISOString(),
  }).select("id").single()
  if (error?.code === "23505") throw new Error(provider === "other" ? "Deze iCal-link is al toegevoegd." : "Deze aanbieder is al gekoppeld aan de accommodatie.")
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
  if (error?.code === "23505") throw new Error("Deze aanbieder is al actief voor de accommodatie.")
  if (error) throw error
  return getCalendarSyncData(source.business_id)
}

export async function updateCalendarImportSource(sourceId: string, input: { name: string; feedUrl: string }) {
  const supabase = await createClient()
  await assertCurrentUserRuntimeEntitlement(supabase, "booking_management")
  const source = await assertOwnedImportSource(sourceId, supabase)
  const name = input.name.trim().slice(0, 100)
  if (!name) throw new Error("Geef deze kalenderbron een naam.")
  const feedUrl = validateFeedUrl(input.feedUrl.trim()).toString()
  const { error } = await supabase.from("calendar_import_sources").update({
    name,
    feed_url: encryptCalendarSecret(feedUrl),
    feed_url_fingerprint: calendarSecretFingerprint(feedUrl),
    url_host: safeUrlHost(feedUrl),
    last_http_etag: null,
    last_http_modified: null,
    last_error: null,
    consecutive_failures: 0,
    next_sync_at: new Date().toISOString(),
  }).eq("id", sourceId)
  if (error?.code === "23505") throw new Error("Deze iCal-link is al aan de accommodatie gekoppeld.")
  if (error) throw error
  const result = await synchronizeCalendarSource(sourceId, { allowDisabled: true })
  return { data: await getCalendarSyncData(source.business_id), result }
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

async function findExportFeed(token: string) {
  const supabase = await createAdminClient()
  const tokenHash = hashCalendarAccessToken(token)
  const { data: hashedFeed, error: hashError } = await supabase.from("calendar_export_feeds")
    .select("*").eq("token_hash", tokenHash).eq("enabled", true).maybeSingle()
  if (hashError) return null
  if (hashedFeed) return hashedFeed as ExportFeedRow
  if (!/^[0-9a-f-]{36}$/i.test(token)) return null
  const { data: legacyFeed, error: legacyError } = await supabase.from("calendar_export_feeds")
    .select("*").eq("access_token", token).eq("enabled", true).maybeSingle()
  return legacyError || !legacyFeed ? null : legacyFeed as ExportFeedRow
}

export async function getPrivateIcalFeed(token: string) {
  if (!/^[A-Za-z0-9_-]{40,80}$/.test(token) && !/^[0-9a-f-]{36}$/i.test(token)) return null
  const feed = await findExportFeed(token)
  if (!feed) return null
  const supabase = await createAdminClient()
  const oldestExportedEnd = new Date(Date.now() - 365 * 86_400_000).toISOString()
  const [{ data: business }, { data: service }, { data: entries, error: entriesError }] = await Promise.all([
    supabase.from("businesses").select("name").eq("id", feed.business_id).maybeSingle(),
    feed.service_id ? supabase.from("services").select("title").eq("id", feed.service_id).maybeSingle() : Promise.resolve({ data: null }),
    supabase.from("calendar_entries")
      .select("id, service_id, entry_type, title, source, status, start_at, end_at, all_day, timezone, updated_at, external_source_id")
      .eq("business_id", feed.business_id).neq("entry_type", "note").gte("end_at", oldestExportedEnd)
      .order("start_at", { ascending: true }).limit(5_000),
  ])
  if (entriesError) throw entriesError

  const scopedEntries = ((entries ?? []) as ExportEntryRow[]).filter((entry) => {
    if (entry.status === "cancelled" || entry.status === "completed") return false
    if (!(["blocked", "pending", "confirmed"] as string[]).includes(entry.status)) return false
    if (feed.service_id && entry.service_id !== null && entry.service_id !== feed.service_id) return false
    return true
  })
  const externalSourceIds = [...new Set(scopedEntries.flatMap((entry) => entry.external_source_id ? [entry.external_source_id] : []))]
  const providers = new Map<string, CalendarProvider>()
  if (externalSourceIds.length > 0) {
    const { data: sources, error } = await supabase.from("calendar_import_sources").select("id, provider").in("id", externalSourceIds)
    if (error) throw error
    for (const source of (sources ?? []) as Array<{ id: string; provider: CalendarProvider }>) providers.set(source.id, source.provider)
  }
  const exportEntries = scopedEntries.filter((entry) => {
    if (!entry.external_source_id || feed.target_provider === "overview") return true
    return providers.get(entry.external_source_id) !== feed.target_provider
  })

  const businessName = (business as { name?: string } | null)?.name || "FlexPagina kalender"
  const serviceName = (service as { title?: string } | null)?.title
  return createIcalFeed({
    businessId: feed.business_id,
    calendarId: feed.id,
    calendarName: serviceName ? `${serviceName} - ${businessName}` : businessName,
    entries: exportEntries,
    genericSummary: feed.target_provider === "overview" ? null : "Bezet",
    forceDateOnly: feed.service_id !== null,
  })
}
